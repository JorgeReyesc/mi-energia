'use strict';
// ---------- Sincronización entre dispositivos ----------
// Forma principal: iniciar sesión con Google; cada cuenta solo puede leer y escribir su propia fila
// (tabla mi_energia_user_data). Alternativa: enlace privado con código (funciones mi_energia_get/put).
// Cada día y cada sección de ajustes lleva la hora de su último cambio; al combinar gana el más reciente.

const SYNC_URL = 'https://utclwftzsyjrxplzdalt.supabase.co'; // proyecto manos-libres, tabla mi_energia_sync
const SYNC_KEY = 'sb_publishable_ry_cXttEc3PnH8F__sEKhA_Svj-h5gh'; // llave pública: puede ir en el código
const SYNC_STORE = 'energia.sync';
const META_PARTS = ['settings', 'customFoods', 'recipes', 'caffProducts', 'experiments'];

let sync = {};
try { sync = JSON.parse(localStorage.getItem(SYNC_STORE)) || {}; } catch (e) { sync = {}; }
function saveSync() { try { localStorage.setItem(SYNC_STORE, JSON.stringify(sync)); } catch (e) { /* sin espacio */ } }
let syncStatus = '';

// Cliente de Supabase (cargado desde el CDN; sin internet al abrir, la app funciona sin sincronizar)
const sb = window.supabase?.createClient(SYNC_URL, SYNC_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'energia.auth' },
});
let session = null;
function syncMode() { return session ? 'google' : sync.code ? 'link' : null; }

// Partes que se sincronizan por separado ('d:fecha' para cada día). La vista (ui) es de cada dispositivo.
function syncParts(st) {
  const p = {};
  for (const k of Object.keys(st.days || {})) p['d:' + k] = st.days[k];
  for (const k of META_PARTS) p[k] = st[k];
  return p;
}
let snap = null;
function takeSnap() { snap = Object.fromEntries(Object.entries(syncParts(S)).map(([k, v]) => [k, JSON.stringify(v)])); }

// Marca con la hora actual lo que cambió desde la última vez (se llama en cada guardado)
function stampChanges() {
  if (!snap) takeSnap();
  S._u ||= {};
  const now = Date.now();
  for (const [k, v] of Object.entries(syncParts(S))) {
    const j = JSON.stringify(v);
    if (snap[k] === j) continue;
    // Un día vacío que solo se abrió para verlo no cuenta como cambio
    if (k.startsWith('d:') && snap[k] === undefined && !hasData(v)) continue;
    S._u[k] = now;
    snap[k] = j;
  }
}

// Combina dos estados: por cada día / sección gana el cambio más reciente
function mergeState(L, R) {
  const out = { ...L, days: {}, _u: {} };
  const wiped = Math.max(L._wiped || 0, R._wiped || 0);
  if (wiped) out._wiped = wiped;
  const lp = syncParts(L), rp = syncParts(R);
  for (const k of new Set([...Object.keys(lp), ...Object.keys(rp)])) {
    const lv = lp[k], rv = rp[k];
    const lu = L._u?.[k] || 0, ru = R._u?.[k] || 0;
    let v, u;
    if (lv === undefined) { v = rv; u = ru; }
    else if (rv === undefined) { v = lv; u = lu; }
    else if (k.startsWith('d:') && !hasData(lv)) { v = rv; u = ru; }
    else if (k.startsWith('d:') && !hasData(rv)) { v = lv; u = lu; }
    else if (lu !== ru) { [v, u] = lu > ru ? [lv, lu] : [rv, ru]; }
    // Sin hora de cambio en ninguno (datos de antes de sincronizar): se queda el más completo
    else { v = JSON.stringify(lv).length >= JSON.stringify(rv).length ? lv : rv; u = lu; }
    if (k.startsWith('d:')) {
      if (u < wiped) continue; // borrado con "Borrar todos los datos"
      out.days[k.slice(2)] = v;
    } else out[k] = v;
    if (u) out._u[k] = u;
  }
  return out;
}

function syncReady() { return !!(SYNC_URL && SYNC_KEY); }

// Leer / guardar el estado en el servidor según la forma de sincronizar
async function remoteGet() {
  if (syncMode() === 'google') {
    const { data, error } = await sb.from('mi_energia_user_data').select('data').maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }
  return rpc('mi_energia_get', { p_key: sync.code });
}
async function remotePut(payload) {
  if (syncMode() === 'google') {
    const { error } = await sb.from('mi_energia_user_data')
      .upsert({ user_id: session.user.id, data: payload, updated_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }
  await rpc('mi_energia_put', { p_key: sync.code, p_data: payload });
}
async function rpc(fn, body) {
  const res = await fetch(`${SYNC_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SYNC_KEY, Authorization: `Bearer ${SYNC_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function setSyncStatus(s) {
  syncStatus = s;
  const el = document.getElementById('sync-status');
  if (el) el.textContent = s;
}

let syncing = null, syncAgain = false;
async function syncNow() {
  if (!syncMode() || !syncReady()) return;
  if (syncing) { syncAgain = true; return syncing; }
  syncing = (async () => {
    setSyncStatus('Sincronizando…');
    try {
      const remote = await remoteGet();
      const strip = st => JSON.stringify({ ...st, ui: undefined });
      // Se combina con el estado actual (por si capturaste algo mientras llegaba la respuesta)
      const merged = remote ? mergeState(S, remote) : { ...S };
      merged.ui = S.ui;
      const localChanged = strip(merged) !== strip(S);
      S = merged;
      try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* sin espacio */ }
      takeSnap();
      if (!remote || strip(remote) !== strip({ ...merged, ui: undefined })) {
        const { ui, ...payload } = merged;
        await remotePut(payload);
      }
      sync.last = Date.now(); saveSync();
      setSyncStatus(`Sincronizado ${new Date(sync.last).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`);
      // No redibuja si estás escribiendo, para no perder lo que llevas
      if (localChanged && !document.activeElement?.matches('input, textarea, select')) render();
    } catch (e) {
      setSyncStatus(navigator.onLine === false ? 'Sin conexión: se sincroniza al volver el internet' : 'No se pudo sincronizar; se reintenta en un momento');
    } finally {
      syncing = null;
      if (syncAgain) { syncAgain = false; syncNow(); }
    }
  })();
  return syncing;
}

let syncTimer = null;
function scheduleSync() {
  if (!syncMode()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 2500);
}

function newSyncCode() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return [...b].map(x => 'abcdefghjkmnpqrstuvwxyz23456789'[x % 31]).join('');
}
function syncLink() { return `${location.origin}${location.pathname}#sync=${sync.code}`; }

function syncStatusText() {
  return syncStatus || (sync.last ? `Última sincronización: ${new Date(sync.last).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Pendiente');
}

function syncCard() {
  if (!syncReady()) return '';
  if (session) {
    return `
  <section class="card" id="sync-card">
    <h2>☁️ Sincronizar dispositivos<span class="sub">activa</span></h2>
    <p style="margin-top:0">Conectado con Google como <b>${esc(session.user.email || '')}</b></p>
    <p class="muted" id="sync-status">${esc(syncStatusText())}</p>
    <p class="muted">En tu otro dispositivo abre la app y entra con la misma cuenta de Google. Solo tú puedes ver tus datos.</p>
    <div class="row">
      <button data-act="sync-now">🔄 Sincronizar ahora</button>
      <button class="link danger" data-act="sync-logout">Cerrar sesión</button>
    </div>
  </section>`;
  }
  const google = sb ? `
    <button class="primary google" data-act="sync-google"><span class="g">G</span> Entrar con Google</button>
    <p class="muted">Entra con la misma cuenta en el teléfono y en la computadora y tus datos se combinan solos. Lo que ya tienes en este dispositivo se conserva.</p>`
    : '<p class="muted">Necesitas internet para entrar con Google. Abre la app con conexión.</p>';
  if (!sync.code) {
    return `
  <section class="card" id="sync-card">
    <h2>☁️ Sincronizar dispositivos</h2>
    ${google}
    <details class="mt"><summary class="muted">Otra opción: enlace privado sin cuenta</summary>
      <p class="muted">Activa la sincronización en un dispositivo y abre en el otro el enlace privado que te da.</p>
      <button data-act="sync-on">Activar con enlace</button>
      <h3>¿Ya la activaste en otro dispositivo?</h3>
      <div class="row"><input class="grow" id="sync-input" placeholder="Pega aquí el enlace o el código"><button data-act="sync-link">Vincular</button></div>
    </details>
  </section>`;
  }
  return `
  <section class="card" id="sync-card">
    <h2>☁️ Sincronizar dispositivos<span class="sub">con enlace</span></h2>
    <p class="muted" style="margin-top:0" id="sync-status">${esc(syncStatusText())}</p>
    <h3>Enlace para tu otro dispositivo</h3>
    <input readonly value="${esc(syncLink())}" onclick="this.select()" aria-label="Enlace de sincronización">
    <div class="row mt">
      <button data-act="sync-share">📤 Compartir enlace</button>
      <button data-act="sync-now">🔄 Sincronizar ahora</button>
    </div>
    <p class="muted">⚠️ Este enlace es la llave de tus datos: quien lo tenga puede verlos. Mándatelo solo a ti.</p>
    <button class="link danger" style="padding-left:0" data-act="sync-off">Desvincular este dispositivo</button>
    ${sb ? `<h3>Mejor con tu cuenta</h3>
    <button class="google" data-act="sync-google"><span class="g">G</span> Cambiar a entrar con Google</button>
    <p class="muted">Tus datos del enlace se pasan a tu cuenta. Después entra con Google en tus otros dispositivos.</p>` : ''}
  </section>`;
}

// Vincula este dispositivo con un código existente
function linkSync(code) {
  code = String(code).trim().replace(/^.*#sync=/, '');
  if (!/^[a-z0-9]{16,}$/.test(code)) return toast('Ese enlace o código no es válido');
  sync = { code }; saveSync();
  toast('Dispositivo vinculado ✓ Combinando tus datos…');
  syncNow().then(() => render());
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act^="sync-"]');
  if (!el) return;
  switch (el.dataset.act) {
    case 'sync-on':
      sync = { code: newSyncCode() }; saveSync();
      syncNow().then(() => render());
      render(); toast('Sincronización activada ✓');
      return;
    case 'sync-link': return linkSync(document.getElementById('sync-input').value);
    case 'sync-now': syncNow(); return;
    case 'sync-google':
      if (!sb) return toast('Necesitas internet para entrar con Google');
      sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } })
        .then(({ error }) => { if (error) toast('No se pudo abrir Google: ' + error.message); });
      return;
    case 'sync-logout':
      if (confirm('¿Cerrar sesión? Tus datos se quedan en este dispositivo, pero dejarán de sincronizarse.')) {
        sb.auth.signOut().finally(() => { session = null; syncStatus = ''; render(); });
      }
      return;
    case 'sync-share':
      if (navigator.share) navigator.share({ title: 'Mi Energía: vincular dispositivo', url: syncLink() }).catch(() => {});
      else navigator.clipboard.writeText(syncLink()).then(() => toast('Enlace copiado ✓'), () => toast('Selecciona y copia el enlace'));
      return;
    case 'sync-off':
      if (confirm('¿Desvincular este dispositivo? Tus datos se quedan aquí, pero dejarán de sincronizarse.')) { sync = {}; saveSync(); syncStatus = ''; render(); }
      return;
  }
});

// Al abrir el enlace #sync=… en otro dispositivo
function checkSyncHash() {
  const m = location.hash.match(/^#sync=([a-z0-9]+)$/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  if (!syncReady() || sync.code === m[1]) return;
  if (confirm('¿Vincular este dispositivo? Tus datos de aquí se combinarán con los del otro dispositivo.')) linkSync(m[1]);
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
window.addEventListener('online', () => syncNow());
takeSnap();
checkSyncHash();
if (sb) {
  sb.auth.onAuthStateChange((event, s) => {
    const was = session?.user?.id;
    session = s;
    if (s && s.user.id !== was) {
      // Al entrar con Google: lo del enlace (si había) ya está en este dispositivo y se sube a tu cuenta
      if (sync.code) { sync = { last: sync.last }; saveSync(); }
      if (event === 'SIGNED_IN') toast('Conectado con Google ✓ Combinando tus datos…');
      syncNow().then(() => render());
    } else if (!s && was) render();
  });
} else syncNow();
