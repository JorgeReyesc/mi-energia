'use strict';

// ---------- Constantes ----------
const STORE = 'energia.v1';
const DEFAULT_SETTINGS = {
  waterGoal: 2000, glassMl: 250, sleepGoal: 7.5,
  supplements: ['Multivitamínico', 'Vitamina D', 'Magnesio', 'Omega 3'],
};
const MEAL_TYPES = ['Desayuno', 'Colación', 'Comida', 'Merienda', 'Cena'];
const MEAL_TAGS = [
  ['proteina', '🥩 Proteína'], ['verduras', '🥦 Verdura/fruta'], ['integral', '🌾 Integral'],
  ['harinas', '🍞 Harinas refinadas'], ['azucar', '🍬 Azúcar/dulce'], ['procesado', '🍟 Procesado'],
  ['frito', '🍳 Frito/grasoso'], ['lacteos', '🥛 Lácteos'], ['abundante', '😮‍💨 Muy abundante'],
];
const CAFF = [['Café', '☕'], ['Té', '🍵'], ['Energética', '⚡'], ['Refresco cola', '🥤']];
const EX_TYPES = ['Caminar', 'Cardio', 'Pesas', 'Deporte', 'Yoga/estiramiento', 'Otro'];
const SYMPTOMS = ['Dolor de cabeza', 'Niebla mental', 'Somnolencia', 'Ansiedad', 'Irritabilidad',
  'Antojos', 'Digestión pesada', 'Dolor muscular', 'Sin motivación', 'Tristeza'];
const MOOD = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_L = ['Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'];
const ENERGY = ['🪫', '😮‍💨', '😐', '💪', '⚡'];
const ENERGY_L = ['Agotado', 'Cansado', 'Normal', 'Bien', 'A tope'];
const LATE_CAFF = '15:00';
const LATE_DINNER = '21:30';

// ---------- Estado ----------
let S;
try { S = JSON.parse(localStorage.getItem(STORE)); } catch (e) { S = null; }
if (!S || typeof S !== 'object') S = {};
S.days ||= {};
S.experiments ||= [];
S.settings = { ...DEFAULT_SETTINGS, ...(S.settings || {}) };

let tab = 'hoy';
let cur = todayKey();
let range = 30;
let outcome = 'energy';
const draft = {
  ci: { mood: 0, energy: 0, note: '', t: '' },
  meal: { type: '', tags: [], desc: '', t: '' },
  caff: { t: '' },
  ex: { kind: 'Caminar', min: '', int: 2, t: '' },
};

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(S)); }
  catch (e) { toast('⚠️ No se pudo guardar'); }
}

// ---------- Utilidades ----------
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
function keyOf(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayKey() { return keyOf(new Date()); }
function shift(k, n) { const [y, m, d] = k.split('-').map(Number); return keyOf(new Date(y, m - 1, d + n)); }
function nowHM() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDate(k, opts = { weekday: 'long', day: 'numeric', month: 'long' }) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', opts);
}
function r1(x) { return x == null || Number.isNaN(x) ? '—' : String(Math.round(x * 10) / 10); }
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; }
function sortByTime(a) { return a.slice().sort((x, y) => (x.t || '').localeCompare(y.t || '')); }
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 1800);
}
function getPath(o, p) { return p.split('.').reduce((a, k) => a?.[k], o); }
function setPath(o, p, v) {
  const ks = p.split('.'); const last = ks.pop();
  ks.reduce((a, k) => (a[k] ||= {}), o)[last] = v;
}

// ---------- Datos del día ----------
function blankDay() {
  return {
    sleep: { bed: '', wake: '', q: 0, wakeups: 0 },
    checkins: [], meals: [], water: 0, caffeine: [], supps: {}, exercise: [],
    sun: 0, stress: 0, alcohol: 0, screens: false, symptoms: [], notes: '',
  };
}
function D() { return (S.days[cur] ||= blankDay()); }
function hasData(d) {
  return !!d && !!(d.checkins.length || d.meals.length || d.water || d.sleep.bed || d.caffeine.length ||
    d.exercise.length || Object.keys(d.supps).length || d.stress || d.alcohol || d.sun ||
    d.symptoms.length || d.notes);
}
function sleepHours(s) {
  if (!s.bed || !s.wake) return null;
  const [bh, bm] = s.bed.split(':').map(Number), [wh, wm] = s.wake.split(':').map(Number);
  let m = (wh * 60 + wm) - (bh * 60 + bm);
  if (m <= 0) m += 1440;
  return m / 60;
}
function dayFlags(d) {
  return {
    lateCaff: d.caffeine.some(x => x.t >= LATE_CAFF),
    lateDinner: d.meals.some(m => m.t >= LATE_DINNER),
  };
}

// Métricas numéricas de un día (lo que usa el análisis)
function metrics(k) {
  const d = S.days[k];
  if (!hasData(d)) return null;
  const c = d.checkins;
  const tagCount = t => d.meals.filter(m => (m.tags || []).includes(t)).length;
  const p = S.days[shift(k, -1)];
  const pf = hasData(p) ? dayFlags(p) : null;
  return {
    k,
    energy: c.length ? mean(c.map(x => x.energy)) : null,
    mood: c.length ? mean(c.map(x => x.mood)) : null,
    sleepH: sleepHours(d.sleep),
    sleepQ: d.sleep.q || null,
    wakeups: d.sleep.bed ? (d.sleep.wakeups || 0) : null,
    waterL: d.water ? d.water / 1000 : null,
    caffeine: d.caffeine.length,
    lateCaff: dayFlags(d).lateCaff,
    exMin: d.exercise.reduce((a, x) => a + (+x.min || 0), 0),
    sun: d.sun,
    stress: d.stress || null,
    alcohol: d.alcohol,
    meals: d.meals.length,
    breakfast: d.meals.length ? d.meals.some(m => m.type === 'Desayuno') : null,
    tags: Object.fromEntries(MEAL_TAGS.map(([t]) => [t, d.meals.length ? tagCount(t) : null])),
    supps: Object.fromEntries(S.settings.supplements.map(s => [s, !!d.supps[s]])),
    symptoms: d.symptoms.length,
    prev: pf ? { lateCaff: pf.lateCaff, lateDinner: pf.lateDinner, alcohol: p.alcohol, screens: !!p.screens } : null,
  };
}

// ---------- Factores para el análisis ----------
function factors() {
  const f = [
    { label: 'Horas de sueño', unit: ' h', get: m => m.sleepH,
      more: 'Prioriza dormir más: fija una hora de acostarte y apunta a 7.5–8 h durante 2 semanas.',
      less: 'Dormir más horas no te está ayudando; enfócate en la calidad y en horarios regulares.' },
    { label: 'Calidad de sueño', unit: '/5', get: m => m.sleepQ,
      more: 'La calidad del sueño pesa mucho: cuarto oscuro y fresco, misma hora diario, nada de pantallas la última hora.' },
    { label: 'Despertares nocturnos', unit: '', get: m => m.wakeups,
      less: 'Los despertares te afectan: evita líquidos, alcohol y cenas pesadas 2–3 h antes de dormir.' },
    { label: 'Agua', unit: ' L', get: m => m.waterL,
      more: 'Rindes mejor hidratado: toma un vaso grande al despertar y carga una botella todo el día.' },
    { label: 'Bebidas con cafeína', unit: '', get: m => m.caffeine,
      less: 'Más cafeína coincide con menos energía (efecto rebote): prueba bajar a 1–2 al día y no en ayunas.' },
    { label: 'Cafeína después de las 3 pm', bool: true, get: m => m.lateCaff,
      less: 'Corta la cafeína a partir de las 2–3 pm durante una semana y compara.' },
    { label: 'Cafeína tarde (día anterior)', bool: true, get: m => m.prev?.lateCaff,
      less: 'La cafeína de la tarde afecta tu energía del día siguiente: probablemente te quita sueño profundo.' },
    { label: 'Ejercicio', unit: ' min', get: m => m.exMin,
      more: 'Moverte te da energía: agenda 20–30 min diarios, aunque sea caminar.' },
    { label: 'Sol / aire libre', unit: ' min', get: m => m.sun,
      more: 'Sal 10–20 min a la luz natural en la mañana; ayuda al ritmo circadiano y al ánimo.' },
    { label: 'Estrés', unit: '/5', get: m => m.stress,
      less: 'El estrés te drena: prueba pausas de respiración, caminatas cortas y poner límites al trabajo.' },
    { label: 'Alcohol (mismo día)', unit: '', get: m => m.alcohol,
      less: 'El alcohol coincide con peor estado: prueba 2 semanas sin alcohol.' },
    { label: 'Alcohol (día anterior)', unit: '', get: m => m.prev ? m.prev.alcohol : null,
      less: 'El alcohol de ayer te pasa factura hoy (sueño fragmentado). Prueba 2 semanas sin alcohol.' },
    { label: 'Desayunar', bool: true, get: m => m.breakfast,
      more: 'Desayunar te ayuda: que incluya proteína (huevo, yogur griego, frijoles, queso).',
      less: 'Desayunar no te está ayudando; prueba un desayuno más ligero o con más proteína y menos harina.' },
    { label: 'Cena tarde (noche anterior)', bool: true, get: m => m.prev?.lateDinner,
      less: 'Cenar tarde te afecta al día siguiente: intenta cenar 3 h antes de dormir.' },
    { label: 'Pantallas antes de dormir (noche anterior)', bool: true, get: m => m.prev?.screens,
      less: 'Las pantallas antes de dormir te afectan: deja el celular fuera del cuarto la última hora.' },
  ];
  const tagTips = {
    proteina: ['Las comidas con proteína te sientan bien: inclúyela en cada comida.', null],
    verduras: ['Comer más verdura y fruta coincide con más energía: agrega una porción a cada comida.', null],
    integral: ['Los integrales te ayudan: cambia pan/tortilla de harina por integrales.', null],
    harinas: [null, 'Las harinas refinadas coinciden con bajones: prueba reducirlas una semana.'],
    azucar: [null, 'El azúcar coincide con menos energía (picos y caídas de glucosa): prueba quitar dulces y refrescos 2 semanas.'],
    procesado: [null, 'Los procesados te afectan: cocina más en casa y lleva colaciones simples.'],
    frito: [null, 'Lo frito/grasoso te deja pesado: prueba versiones al horno o a la plancha.'],
    lacteos: [null, 'Los lácteos podrían no sentarte bien: prueba quitarlos 10 días y compara.'],
    abundante: [null, 'Las comidas muy abundantes te tumban: porciones más pequeñas y más frecuentes.'],
  };
  for (const [t, name] of MEAL_TAGS) {
    f.push({ label: `Comidas: ${name.replace(/^\S+\s/, '')}`, unit: '', get: m => m.tags[t], more: tagTips[t][0], less: tagTips[t][1] });
  }
  for (const s of S.settings.supplements) {
    f.push({ label: `Suplemento: ${s}`, bool: true, get: m => m.supps[s],
      more: `Te va mejor los días que tomas ${s}: sé constante.`,
      less: `Los días con ${s} no muestran mejor energía; revisa dosis y horario con tu médico.` });
  }
  return f;
}

// Compara el resultado (energía/ánimo) entre días "con más" y "con menos" de un factor
function impact(f, rows, o) {
  const pts = rows.map(m => ({ v: f.get(m), y: m[o] })).filter(p => p.v != null && p.y != null);
  if (pts.length < 4) return null;
  let A, B, cut = null;
  if (f.bool) {
    A = pts.filter(p => p.v); B = pts.filter(p => !p.v);
  } else {
    const vals = pts.map(p => p.v).sort((a, b) => a - b);
    if (vals[0] === vals[vals.length - 1]) return null;
    cut = vals[Math.floor((vals.length - 1) / 2)];
    A = pts.filter(p => p.v > cut); B = pts.filter(p => p.v <= cut);
  }
  if (A.length < 2 || B.length < 2) return null;
  const a = mean(A.map(p => p.y)), b = mean(B.map(p => p.y));
  return { diff: a - b, a, b, nA: A.length, nB: B.length, cut };
}

// ---------- Render ----------
const view = document.getElementById('view');
function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
  view.innerHTML = { hoy: viewHoy, analisis: viewAnalisis, historial: viewHistorial, ajustes: viewAjustes }[tab]();
}

// ----- Hoy -----
function viewHoy() {
  const d = D();
  const isToday = cur === todayKey();
  return `
  <div class="datebar">
    <button class="icon" data-act="day" data-v="-1" aria-label="Día anterior">◀</button>
    <div class="d">${isToday ? 'Hoy · ' : ''}${esc(fmtDate(cur))}</div>
    <button class="icon" data-act="day" data-v="1" aria-label="Día siguiente" ${isToday ? 'disabled' : ''}>▶</button>
  </div>
  ${isToday ? '' : '<button class="link" data-act="today">← Volver a hoy</button>'}
  ${summaryCard(d)}
  ${checkinCard(d)}
  ${sleepCard(d)}
  ${waterCard(d)}
  ${mealsCard(d)}
  ${caffCard(d)}
  ${suppCard(d)}
  ${activityCard(d)}
  ${otherCard(d)}`;
}

function summaryCard(d) {
  const st = S.settings;
  const flags = [];
  const add = (cls, icon, txt) => flags.push(`<div class="flag ${cls}"><span>${icon}</span><span>${txt}</span></div>`);
  const sh = sleepHours(d.sleep);
  const hourNow = cur === todayKey() ? new Date().getHours() : 24;

  if (sh == null) add('info', '🛏️', 'Registra cómo dormiste anoche.');
  else if (sh < st.sleepGoal - 0.25) add('bad', '🛏️', `Dormiste ${r1(sh)} h (meta ${st.sleepGoal} h).`);
  else add('good', '🛏️', `Dormiste ${r1(sh)} h.`);
  if (d.sleep.q && d.sleep.q <= 2) add('bad', '😴', 'Calidad de sueño baja.');
  if (d.sleep.wakeups >= 2) add('bad', '🌙', `${d.sleep.wakeups} despertares en la noche.`);

  const waterPct = d.water / st.waterGoal;
  if (waterPct >= 1) add('good', '💧', `Meta de agua cumplida (${r1(d.water / 1000)} L).`);
  else if (hourNow >= 14 && waterPct < 0.5) add('bad', '💧', `Vas en ${r1(d.water / 1000)} L de ${r1(st.waterGoal / 1000)} L.`);

  if (d.caffeine.some(x => x.t >= LATE_CAFF)) add('bad', '☕', 'Cafeína después de las 3 pm: puede afectar tu sueño de hoy.');
  if (d.caffeine.length >= 4) add('bad', '☕', `${d.caffeine.length} bebidas con cafeína.`);

  if (d.meals.length) {
    if (!d.meals.some(m => m.type === 'Desayuno') && hourNow >= 12) add('bad', '🍳', 'Sin desayuno registrado.');
    const cnt = t => d.meals.filter(m => (m.tags || []).includes(t)).length;
    const junk = cnt('azucar') + cnt('procesado') + cnt('harinas');
    if (junk >= 3) add('bad', '🍬', `${junk} etiquetas de azúcar / procesado / harinas hoy.`);
    if (cnt('verduras')) add('good', '🥦', 'Comiste verdura o fruta.');
    else if (hourNow >= 18) add('bad', '🥦', 'Sin verdura ni fruta hoy.');
    if (cnt('proteina') >= 2) add('good', '🥩', 'Buena presencia de proteína.');
  } else if (hourNow >= 11) add('info', '🍽️', 'Aún no registras comidas.');

  const ex = d.exercise.reduce((a, x) => a + (+x.min || 0), 0);
  if (ex >= 20) add('good', '🏃', `${ex} min de ejercicio.`);
  else if (hourNow >= 18) add('bad', '🏃', 'Poco o nada de movimiento hoy.');
  if (d.sun >= 15) add('good', '☀️', `${d.sun} min de sol / aire libre.`);
  if (d.stress >= 4) add('bad', '🧠', 'Estrés alto.');
  if (d.alcohol) add('bad', '🍷', `${d.alcohol} bebida(s) con alcohol.`);
  const prev = S.days[shift(cur, -1)];
  if (prev?.screens) add('bad', '📱', 'Anoche usaste pantallas antes de dormir.');

  const c = d.checkins;
  const e = c.length ? mean(c.map(x => x.energy)) : null;
  const m = c.length ? mean(c.map(x => x.mood)) : null;
  const top = topFactorHint();
  return `
  <section class="card">
    <h2>📋 Resumen del día</h2>
    <div class="stats">
      <div class="stat"><b>${r1(e)}</b><span>Energía prom. (1–5)</span></div>
      <div class="stat"><b>${r1(m)}</b><span>Ánimo prom. (1–5)</span></div>
      <div class="stat"><b>${sh == null ? '—' : r1(sh) + ' h'}</b><span>Sueño</span></div>
      <div class="stat"><b>${r1(d.water / 1000)} L</b><span>Agua</span></div>
    </div>
    ${c.length > 1 ? energyDayChart(c) : ''}
    ${flags.join('')}
    ${top ? `<div class="flag info"><span>🔎</span><span>${top}</span></div>` : ''}
  </section>`;
}

function topFactorHint() {
  const rows = Object.keys(S.days).map(metrics).filter(Boolean);
  if (rows.filter(r => r.energy != null).length < 7) return '';
  const ranked = factors().map(f => ({ f, r: impact(f, rows, 'energy') }))
    .filter(x => x.r && Math.min(x.r.nA, x.r.nB) >= 3).sort((a, b) => Math.abs(b.r.diff) - Math.abs(a.r.diff));
  if (!ranked.length || Math.abs(ranked[0].r.diff) < 0.3) return '';
  const { f, r } = ranked[0];
  return `Según tu historial, <b>${esc(f.label)}</b> es lo que más se relaciona con tu energía (${r.diff > 0 ? '+' : ''}${r1(r.diff)} puntos).`;
}

function energyDayChart(c) {
  const pts = sortByTime(c);
  const W = 300, H = 70, P = 6;
  const toMin = t => { const [h, m] = (t || '12:00').split(':').map(Number); return h * 60 + m; };
  const x0 = Math.min(...pts.map(p => toMin(p.t))), x1 = Math.max(...pts.map(p => toMin(p.t)));
  const x = t => P + (x1 === x0 ? (W - 2 * P) / 2 : (toMin(t) - x0) / (x1 - x0) * (W - 2 * P));
  const y = v => H - P - (v - 1) / 4 * (H - 2 * P);
  const line = k => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
  return `<svg class="chart mt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Energía y ánimo durante el día">
    <path d="${line('energy')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    <path d="${line('mood')}" fill="none" stroke="var(--mood)" stroke-width="2" stroke-dasharray="4 3"/>
    ${pts.map(p => `<circle cx="${x(p.t)}" cy="${y(p.energy)}" r="3" fill="var(--accent)"/>`).join('')}
  </svg>
  <div class="legend"><span><i style="background:var(--accent)"></i>Energía</span><span><i style="background:var(--mood)"></i>Ánimo</span><span>${esc(pts[0].t)} → ${esc(pts[pts.length - 1].t)}</span></div>`;
}

function scale(act, val, icons, labels) {
  return `<div class="scale">${icons.map((ic, i) =>
    `<button data-act="${act}" data-v="${i + 1}" class="${val === i + 1 ? 'on' : ''}" aria-label="${labels[i]}">${ic}<small>${labels[i]}</small></button>`).join('')}</div>`;
}

function checkinCard(d) {
  const c = draft.ci;
  return `
  <section class="card">
    <h2>🙂 ¿Cómo te sientes ahora?<span class="sub">registra 3–4 veces al día</span></h2>
    <h3>Ánimo</h3>${scale('ci-mood', c.mood, MOOD, MOOD_L)}
    <h3>Energía</h3>${scale('ci-energy', c.energy, ENERGY, ENERGY_L)}
    <div class="row mt">
      <input type="time" data-draft="ci.t" value="${esc(c.t || nowHM())}" aria-label="Hora">
      <input class="grow" data-draft="ci.note" value="${esc(c.note)}" placeholder="Nota (opcional): después de comer, en el trabajo…">
    </div>
    <button class="primary mt" data-act="ci-add" style="width:100%">Registrar estado</button>
    ${d.checkins.length ? `<ul class="list">${sortByTime(d.checkins).map(x => `
      <li><span class="t">${esc(x.t)}</span><span class="grow">${MOOD[x.mood - 1]} Ánimo ${x.mood} · ${ENERGY[x.energy - 1]} Energía ${x.energy}${x.note ? `<br><span class="muted">${esc(x.note)}</span>` : ''}</span>
      <button class="link" data-act="del" data-list="checkins" data-id="${x.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>` : ''}
  </section>`;
}

function sleepCard(d) {
  const s = d.sleep, h = sleepHours(s);
  return `
  <section class="card">
    <h2>🛏️ Sueño de anoche<span class="sub">${h == null ? '' : r1(h) + ' h'}</span></h2>
    <div class="row">
      <label class="f">Me dormí<input type="time" data-bind="sleep.bed" value="${esc(s.bed)}"></label>
      <label class="f">Me desperté<input type="time" data-bind="sleep.wake" value="${esc(s.wake)}"></label>
      <label class="f">Despertares<input type="number" min="0" max="20" data-bind="sleep.wakeups" value="${s.wakeups || 0}" style="width:80px"></label>
    </div>
    <h3>Calidad (¿descansaste?)</h3>
    ${scale('sleepq', s.q, ['😫', '😕', '😐', '🙂', '😌'], ['Pésima', 'Mala', 'Regular', 'Buena', 'Excelente'])}
  </section>`;
}

function waterCard(d) {
  const st = S.settings, pct = Math.min(100, d.water / st.waterGoal * 100);
  return `
  <section class="card">
    <h2>💧 Agua<span class="sub">meta ${r1(st.waterGoal / 1000)} L</span></h2>
    <div class="stepper">
      <button class="icon" data-act="water" data-v="-${st.glassMl}" aria-label="Quitar vaso">−</button>
      <div class="val">${r1(d.water / 1000)} L</div>
      <button class="primary" data-act="water" data-v="${st.glassMl}">+ Vaso (${st.glassMl} ml)</button>
      <button data-act="water" data-v="500">+500 ml</button>
    </div>
    <div class="bar mt"><i style="width:${pct}%"></i></div>
  </section>`;
}

function mealsCard(d) {
  const m = draft.meal;
  return `
  <section class="card">
    <h2>🍽️ Comidas</h2>
    <div class="chips">${MEAL_TYPES.map(t => `<button class="chip ${m.type === t ? 'on' : ''}" data-act="meal-type" data-v="${t}">${t}</button>`).join('')}</div>
    <div class="row mt">
      <input type="time" data-draft="meal.t" value="${esc(m.t || nowHM())}" aria-label="Hora">
      <input class="grow" data-draft="meal.desc" value="${esc(m.desc)}" placeholder="¿Qué comiste? ej. 2 tacos de pollo, agua de jamaica">
    </div>
    <h3>Etiquetas (las que apliquen)</h3>
    <div class="chips">${MEAL_TAGS.map(([t, l]) => `<button class="chip ${m.tags.includes(t) ? 'on' : ''}" data-act="meal-tag" data-v="${t}">${l}</button>`).join('')}</div>
    <button class="primary mt" data-act="meal-add" style="width:100%">Agregar comida</button>
    ${d.meals.length ? `<ul class="list">${sortByTime(d.meals).map(x => `
      <li><span class="t">${esc(x.t)}</span><span class="grow"><b>${esc(x.type || 'Comida')}</b> ${esc(x.desc)}<br>${(x.tags || []).map(t => `<span class="tag">${(MEAL_TAGS.find(z => z[0] === t) || [, t])[1]}</span>`).join('')}</span>
      <button class="link" data-act="del" data-list="meals" data-id="${x.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>` : ''}
  </section>`;
}

function caffCard(d) {
  return `
  <section class="card">
    <h2>☕ Cafeína<span class="sub">${d.caffeine.length} hoy</span></h2>
    <div class="row">
      <input type="time" data-draft="caff.t" value="${esc(draft.caff.t || nowHM())}" aria-label="Hora">
      ${CAFF.map(([n, ic]) => `<button data-act="caff-add" data-v="${n}">${ic} ${n}</button>`).join('')}
    </div>
    ${d.caffeine.length ? `<ul class="list">${sortByTime(d.caffeine).map(x => `
      <li><span class="t">${esc(x.t)}</span><span class="grow">${esc(x.kind)}${x.t >= LATE_CAFF ? ' <span class="tag neg">tarde</span>' : ''}</span>
      <button class="link" data-act="del" data-list="caffeine" data-id="${x.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>` : ''}
  </section>`;
}

function suppCard(d) {
  const list = S.settings.supplements;
  return `
  <section class="card">
    <h2>💊 Suplementos</h2>
    ${list.length ? `<div class="chips">${list.map(s => `<button class="chip ${d.supps[s] ? 'on' : ''}" data-act="supp" data-v="${esc(s)}">${d.supps[s] ? '✓ ' : ''}${esc(s)}${d.supps[s] ? ` <span class="muted">${esc(d.supps[s])}</span>` : ''}</button>`).join('')}</div>`
      : '<p class="muted">Agrega tus suplementos en Ajustes.</p>'}
    <p class="muted" style="margin:8px 0 0">Toca para marcar como tomado (guarda la hora).</p>
  </section>`;
}

function activityCard(d) {
  const e = draft.ex;
  return `
  <section class="card">
    <h2>🏃 Movimiento y sol</h2>
    <div class="chips">${EX_TYPES.map(t => `<button class="chip ${e.kind === t ? 'on' : ''}" data-act="ex-kind" data-v="${t}">${t}</button>`).join('')}</div>
    <div class="row mt">
      <input type="time" data-draft="ex.t" value="${esc(e.t || nowHM())}" aria-label="Hora">
      <input type="number" min="1" max="600" data-draft="ex.min" value="${esc(e.min)}" placeholder="min" style="width:80px" aria-label="Minutos">
      <select data-draft="ex.int" style="width:auto" aria-label="Intensidad">
        ${['Suave', 'Moderada', 'Intensa'].map((l, i) => `<option value="${i + 1}" ${+e.int === i + 1 ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
      <button class="primary" data-act="ex-add">Agregar</button>
    </div>
    ${d.exercise.length ? `<ul class="list">${sortByTime(d.exercise).map(x => `
      <li><span class="t">${esc(x.t)}</span><span class="grow">${esc(x.kind)} · ${esc(x.min)} min · ${['Suave', 'Moderada', 'Intensa'][x.int - 1] || ''}</span>
      <button class="link" data-act="del" data-list="exercise" data-id="${x.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>` : ''}
    <h3>Sol / aire libre</h3>
    <div class="stepper">
      <button class="icon" data-act="inc" data-path="sun" data-v="-10" aria-label="Menos">−</button>
      <div class="val">${d.sun} min</div>
      <button data-act="inc" data-path="sun" data-v="10">+10 min</button>
    </div>
  </section>`;
}

function otherCard(d) {
  return `
  <section class="card">
    <h2>🧩 Otros factores</h2>
    <h3>Nivel de estrés hoy</h3>
    ${scale('stress', d.stress, ['😌', '🙂', '😐', '😣', '🤯'], ['Nada', 'Poco', 'Medio', 'Alto', 'Muy alto'])}
    <h3>Alcohol (bebidas)</h3>
    <div class="stepper">
      <button class="icon" data-act="inc" data-path="alcohol" data-v="-1" aria-label="Menos">−</button>
      <div class="val">${d.alcohol}</div>
      <button class="icon" data-act="inc" data-path="alcohol" data-v="1" aria-label="Más">+</button>
    </div>
    <h3>Esta noche</h3>
    <button class="chip ${d.screens ? 'on' : ''}" data-act="toggle" data-path="screens">📱 Usé pantallas la última hora antes de dormir</button>
    <h3>Síntomas</h3>
    <div class="chips">${SYMPTOMS.map(s => `<button class="chip ${d.symptoms.includes(s) ? 'on' : ''}" data-act="sym" data-v="${s}">${s}</button>`).join('')}</div>
    <h3>Notas del día</h3>
    <textarea data-bind="notes" placeholder="Eventos, discusiones, viajes, enfermedad, menstruación, medicamentos…">${esc(d.notes)}</textarea>
  </section>`;
}

// ----- Análisis -----
function viewAnalisis() {
  const all = Object.keys(S.days).sort().map(metrics).filter(Boolean);
  const from = range === 'all' ? '' : shift(todayKey(), -(range - 1));
  const rows = all.filter(r => r.k >= from);
  const withOut = rows.filter(r => r[outcome] != null);
  const oLabel = outcome === 'energy' ? 'energía' : 'ánimo';
  const avg = f => { const v = rows.map(f).filter(x => x != null); return v.length ? mean(v) : null; };

  const head = `
  <section class="card">
    <div class="chips">${[[7, '7 días'], [30, '30 días'], [90, '90 días'], ['all', 'Todo']].map(([v, l]) =>
      `<button class="chip ${range === v ? 'on' : ''}" data-act="range" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="chips mt">${[['energy', '⚡ Energía'], ['mood', '🙂 Ánimo']].map(([v, l]) =>
      `<button class="chip ${outcome === v ? 'on' : ''}" data-act="outcome" data-v="${v}">Analizar ${l}</button>`).join('')}</div>
  </section>`;

  if (!rows.length) return head + `<section class="card"><p>Aún no hay registros en este periodo. Empieza en la pestaña <b>Hoy</b>.</p></section>`;

  const stats = `
  <section class="card">
    <h2>📈 Promedios<span class="sub">${rows.length} días con registro</span></h2>
    <div class="stats">
      <div class="stat"><b>${r1(avg(r => r.energy))}</b><span>Energía (1–5)</span></div>
      <div class="stat"><b>${r1(avg(r => r.mood))}</b><span>Ánimo (1–5)</span></div>
      <div class="stat"><b>${r1(avg(r => r.sleepH))} h</b><span>Sueño</span></div>
      <div class="stat"><b>${r1(avg(r => r.sleepQ))}</b><span>Calidad sueño</span></div>
      <div class="stat"><b>${r1(avg(r => r.waterL))} L</b><span>Agua</span></div>
      <div class="stat"><b>${r1(avg(r => r.caffeine))}</b><span>Cafeína / día</span></div>
      <div class="stat"><b>${r1(avg(r => r.exMin))} min</b><span>Ejercicio</span></div>
      <div class="stat"><b>${r1(avg(r => r.stress))}</b><span>Estrés (1–5)</span></div>
    </div>
    ${trendChart(rows)}
  </section>`;

  // Factores
  let fx = '';
  const ranked = factors().map(f => ({ f, r: impact(f, rows, outcome) })).filter(x => x.r)
    .sort((a, b) => Math.abs(b.r.diff) - Math.abs(a.r.diff));
  if (withOut.length < 5) {
    fx = `<p class="muted">Necesitas al menos 5 días con registros de estado (idealmente 14+) para ver patrones. Llevas ${withOut.length}.</p>`;
  } else if (!ranked.length) {
    fx = `<p class="muted">Todavía no hay suficiente variación en tus datos. Sigue registrando.</p>`;
  } else {
    fx = ranked.slice(0, 12).map(({ f, r }) => {
      const w = Math.min(50, Math.abs(r.diff) / 2 * 50);
      const pos = r.diff > 0;
      const conf = Math.min(r.nA, r.nB) >= 5 ? '' : ' · pocos datos';
      const yesNo = f.bool || r.cut === 0;
      const hiTxt = yesNo ? 'Con' : `Más de ${r1(r.cut)}${f.unit}`;
      const loTxt = yesNo ? 'Sin' : `Hasta ${r1(r.cut)}${f.unit}`;
      return `<div class="factor">
        <div class="top"><b>${esc(f.label)}</b><span class="${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${r1(r.diff)}</span></div>
        <div class="det">${hiTxt}: ${r1(r.a)} (${r.nA} d) · ${loTxt}: ${r1(r.b)} (${r.nB} d)${conf}</div>
        <div class="dbar"><i style="${pos ? `left:50%;width:${w}%;background:var(--good)` : `left:${50 - w}%;width:${w}%;background:var(--bad)`}"></i></div>
      </div>`;
    }).join('') + `<p class="muted mt">Verde = más de esto coincide con más ${oLabel}. Rojo = más de esto coincide con menos ${oLabel}. Es correlación, no causa: úsalo para elegir qué probar.</p>`;
  }
  const factorsCard = `<section class="card"><h2>🔎 Qué se relaciona con tu ${oLabel}</h2>${fx}</section>`;

  // Recomendaciones
  const recs = ranked.filter(x => Math.abs(x.r.diff) >= 0.3 && Math.min(x.r.nA, x.r.nB) >= 3)
    .map(x => ({ ...x, tip: x.r.diff > 0 ? x.f.more : x.f.less })).filter(x => x.tip).slice(0, 3);
  const recCard = withOut.length >= 5 ? `
  <section class="card">
    <h2>🧪 Cambios sugeridos para probar</h2>
    ${recs.length ? recs.map((x, i) => `<div class="flag info"><span>${i + 1}.</span><span>${esc(x.tip)}
      <br><button class="link" style="padding-left:0" data-act="exp-from" data-v="${esc(x.f.label)}">＋ Iniciar como experimento</button></span></div>`).join('')
      : '<p class="muted">Aún no hay un patrón claro. Sigue registrando unos días más.</p>'}
    <p class="muted mt">Cambia una sola cosa a la vez durante 1–2 semanas, así sabrás qué funcionó.</p>
  </section>` : '';

  return head + stats + factorsCard + recCard + timeOfDayCard(rows) + experimentsCard() + symptomsCard(rows) + suppAdherenceCard(rows) + healthCard();
}

function trendChart(rows) {
  if (rows.length < 2) return '';
  const W = 320, H = 150, P = 20;
  const n = rows.length;
  const x = i => P + (n === 1 ? 0 : i / (n - 1) * (W - 2 * P));
  const y = v => H - P - (v - 1) / 4 * (H - 2 * P);
  const line = k => {
    let d = '', pen = false;
    rows.forEach((r, i) => { if (r[k] == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`; pen = true; });
    return d;
  };
  const bw = Math.max(2, (W - 2 * P) / n * 0.6);
  const bars = rows.map((r, i) => r.sleepH == null ? '' :
    `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(H - P - Math.min(10, r.sleepH) / 10 * (H - 2 * P)).toFixed(1)}" width="${bw.toFixed(1)}" height="${(Math.min(10, r.sleepH) / 10 * (H - 2 * P)).toFixed(1)}" fill="var(--line)" rx="1"/>`).join('');
  const grid = [1, 3, 5].map(v => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="4" y="${y(v) + 4}" font-size="10" fill="var(--muted)">${v}</text>`).join('');
  return `<svg class="chart mt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tendencia de energía, ánimo y sueño">
    ${bars}${grid}
    <path d="${line('energy')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="${line('mood')}" fill="none" stroke="var(--mood)" stroke-width="2" stroke-dasharray="4 3" stroke-linejoin="round"/>
    <text x="${P}" y="${H - 4}" font-size="10" fill="var(--muted)">${esc(fmtDate(rows[0].k, { day: 'numeric', month: 'short' }))}</text>
    <text x="${W - P}" y="${H - 4}" font-size="10" fill="var(--muted)" text-anchor="end">${esc(fmtDate(rows[n - 1].k, { day: 'numeric', month: 'short' }))}</text>
  </svg>
  <div class="legend"><span><i style="background:var(--accent)"></i>Energía</span><span><i style="background:var(--mood)"></i>Ánimo</span><span><i style="background:var(--line)"></i>Horas de sueño (0–10)</span></div>`;
}

function timeOfDayCard(rows) {
  const buckets = [['Mañana', '00:00', '11:00'], ['Mediodía', '11:00', '14:00'], ['Tarde', '14:00', '18:00'], ['Noche', '18:00', '24:00']];
  const cis = rows.flatMap(r => S.days[r.k].checkins);
  if (cis.length < 6) return '';
  const res = buckets.map(([l, a, b]) => {
    const v = cis.filter(c => c.t >= a && c.t < b);
    return { l, n: v.length, e: v.length ? mean(v.map(c => c[outcome])) : null };
  });
  const valid = res.filter(r => r.n);
  const low = valid.reduce((a, b) => (b.e < a.e ? b : a), valid[0]);
  return `
  <section class="card">
    <h2>🕒 ${outcome === 'energy' ? 'Energía' : 'Ánimo'} según la hora</h2>
    ${res.map(r => `<div class="factor"><div class="top"><b>${r.l}</b><span>${r1(r.e)} <span class="muted">(${r.n})</span></span></div>
      <div class="bar"><i style="width:${r.e ? (r.e / 5 * 100) : 0}%"></i></div></div>`).join('')}
    ${low && valid.length > 1 ? `<p class="muted mt">Tu punto más bajo suele ser: <b>${low.l}</b>. Revisa qué comes antes de ese horario y cómo está tu hidratación.</p>` : ''}
  </section>`;
}

function experimentsCard() {
  const items = S.experiments.slice().sort((a, b) => b.start.localeCompare(a.start)).map(x => {
    const before = [], during = [];
    for (let i = 1; i <= 14; i++) { const m = metrics(shift(x.start, -i)); if (m?.[outcome] != null) before.push(m[outcome]); }
    for (let k = x.start; k <= (x.end || todayKey()); k = shift(k, 1)) { const m = metrics(k); if (m?.[outcome] != null) during.push(m[outcome]); }
    const a = mean(before), b = mean(during);
    const diff = a != null && b != null ? b - a : null;
    return `<li><span class="grow"><b>${esc(x.name)}</b><br><span class="muted">Desde ${esc(fmtDate(x.start, { day: 'numeric', month: 'short' }))}${x.end ? ` hasta ${esc(fmtDate(x.end, { day: 'numeric', month: 'short' }))}` : ' · en curso'}</span><br>
      Antes: ${r1(a)} (${before.length} d) → Durante: ${r1(b)} (${during.length} d)
      ${diff != null ? ` <b class="${diff >= 0 ? 'pos' : 'neg'}">${diff >= 0 ? '+' : ''}${r1(diff)}</b>` : ''}</span>
      <span class="row" style="flex-direction:column">${x.end ? '' : `<button class="link" data-act="exp-end" data-id="${x.id}">Terminar</button>`}
      <button class="link" data-act="exp-del" data-id="${x.id}" aria-label="Borrar">✕</button></span></li>`;
  });
  return `
  <section class="card">
    <h2>🧪 Mis experimentos</h2>
    <p class="muted" style="margin-top:0">Registra un cambio (ej. "sin café después de las 2 pm") y compara tu ${outcome === 'energy' ? 'energía' : 'ánimo'} de los 14 días previos vs. desde que empezaste.</p>
    <div class="row">
      <input class="grow" id="exp-name" placeholder="Nuevo experimento…">
      <input type="date" id="exp-start" value="${todayKey()}" aria-label="Fecha de inicio">
      <button class="primary" data-act="exp-add">Iniciar</button>
    </div>
    ${items.length ? `<ul class="list">${items.join('')}</ul>` : ''}
  </section>`;
}

function symptomsCard(rows) {
  const cnt = {};
  rows.forEach(r => S.days[r.k].symptoms.forEach(s => (cnt[s] = (cnt[s] || 0) + 1)));
  const list = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  if (!list.length) return '';
  return `<section class="card"><h2>🩺 Síntomas frecuentes</h2>
    ${list.map(([s, n]) => `<div class="factor"><div class="top"><b>${esc(s)}</b><span>${n} de ${rows.length} días</span></div><div class="bar"><i style="width:${n / rows.length * 100}%;background:var(--bad)"></i></div></div>`).join('')}
  </section>`;
}

function suppAdherenceCard(rows) {
  const list = S.settings.supplements;
  if (!list.length) return '';
  return `<section class="card"><h2>💊 Constancia con suplementos</h2>
    ${list.map(s => { const n = rows.filter(r => S.days[r.k].supps[s]).length; return `<div class="factor"><div class="top"><b>${esc(s)}</b><span>${n} de ${rows.length} días</span></div><div class="bar"><i style="width:${n / rows.length * 100}%"></i></div></div>`; }).join('')}
  </section>`;
}

function healthCard() {
  return `<section class="card"><h2>🩺 Importante</h2>
    <p class="muted" style="margin:0">Si el cansancio o el ánimo bajo duran más de 2 semanas, consulta a un médico. El cansancio persistente muchas veces tiene causas medibles: anemia o ferritina baja, tiroides (TSH), vitamina D, B12, glucosa, apnea del sueño o depresión. Lleva esta app a tu cita: puedes exportar tus datos en Ajustes.</p>
  </section>`;
}

// ----- Historial -----
function viewHistorial() {
  const keys = Object.keys(S.days).filter(k => hasData(S.days[k])).sort().reverse();
  if (!keys.length) return `<section class="card"><p>Aún no hay días registrados.</p></section>`;
  return `<section class="card"><h2>📅 Días registrados<span class="sub">${keys.length}</span></h2>
    ${keys.map(k => {
      const m = metrics(k);
      return `<div class="hist" data-act="open" data-v="${k}">
        <div class="grow"><div class="d">${esc(fmtDate(k, { weekday: 'short', day: 'numeric', month: 'short' }))}</div>
        <div class="row" style="gap:4px;margin-top:4px">
          <span class="pill">⚡ ${r1(m.energy)}</span><span class="pill">🙂 ${r1(m.mood)}</span>
          <span class="pill">🛏️ ${m.sleepH == null ? '—' : r1(m.sleepH) + ' h'}</span>
          <span class="pill">💧 ${r1(m.waterL ?? 0)} L</span><span class="pill">🍽️ ${m.meals}</span>
          ${m.symptoms ? `<span class="pill">🩺 ${m.symptoms}</span>` : ''}
        </div></div><span class="muted">›</span>
      </div>`;
    }).join('')}
  </section>`;
}

// ----- Ajustes -----
function viewAjustes() {
  const st = S.settings;
  return `
  <section class="card">
    <h2>🎯 Metas</h2>
    <div class="row">
      <label class="f">Agua diaria (ml)<input type="number" min="500" step="250" data-setting="waterGoal" value="${st.waterGoal}" style="width:120px"></label>
      <label class="f">Tamaño de vaso (ml)<input type="number" min="50" step="50" data-setting="glassMl" value="${st.glassMl}" style="width:120px"></label>
      <label class="f">Sueño (horas)<input type="number" min="4" max="12" step="0.5" data-setting="sleepGoal" value="${st.sleepGoal}" style="width:100px"></label>
    </div>
  </section>
  <section class="card">
    <h2>💊 Mis suplementos</h2>
    <ul class="list">${st.supplements.map(s => `<li><span class="grow">${esc(s)}</span><button class="link danger" data-act="supp-del" data-v="${esc(s)}">Quitar</button></li>`).join('')}</ul>
    <div class="row mt"><input class="grow" id="new-supp" placeholder="ej. Hierro, B12, Creatina, Ashwagandha"><button class="primary" data-act="supp-new">Agregar</button></div>
  </section>
  <section class="card">
    <h2>💾 Tus datos</h2>
    <p class="muted" style="margin-top:0">Todo se guarda solo en este dispositivo. Haz respaldos de vez en cuando.</p>
    <div class="row">
      <button data-act="export-json">⬇️ Respaldo (JSON)</button>
      <button data-act="export-csv">⬇️ Exportar CSV</button>
      <button data-act="copy-csv">📋 Copiar CSV</button>
      <label class="btn">⬆️ Restaurar respaldo<input type="file" accept="application/json,.json" id="import" hidden></label>
    </div>
    <p class="muted">El CSV lo puedes abrir en Excel o pegarlo en un chat con Claude para un análisis más profundo.</p>
    <button class="danger mt" data-act="wipe">Borrar todos los datos</button>
  </section>`;
}

// ---------- Exportar ----------
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function toCSV() {
  const supps = S.settings.supplements;
  const head = ['fecha', 'energia', 'animo', 'checkins', 'sueno_h', 'calidad_sueno', 'despertares', 'agua_l', 'cafeina', 'cafeina_tarde',
    'ejercicio_min', 'sol_min', 'estres', 'alcohol', 'pantallas_noche', 'comidas', 'desayuno', ...MEAL_TAGS.map(t => 'comida_' + t[0]),
    ...supps.map(s => 'sup_' + s), 'sintomas', 'detalle_comidas', 'notas'];
  const q = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = Object.keys(S.days).sort().filter(k => hasData(S.days[k])).map(k => {
    const d = S.days[k], m = metrics(k);
    return [k, r1(m.energy), r1(m.mood), d.checkins.length, r1(m.sleepH), m.sleepQ, m.wakeups, r1(m.waterL), m.caffeine, m.lateCaff ? 1 : 0,
      m.exMin, m.sun, m.stress, m.alcohol, d.screens ? 1 : 0, m.meals, m.breakfast == null ? '' : m.breakfast ? 1 : 0,
      ...MEAL_TAGS.map(t => m.tags[t[0]] ?? ''), ...supps.map(s => d.supps[s] ? 1 : 0), d.symptoms.join(' | '),
      sortByTime(d.meals).map(x => `${x.t} ${x.type}: ${x.desc}`).join(' | '), d.notes].map(v => q(v === '—' ? '' : v)).join(',');
  });
  return [head.map(q).join(','), ...lines].join('\n');
}

// ---------- Eventos ----------
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function commit(msg) { save(); render(); if (msg) toast(msg); }

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, v = el.dataset.v;
  const d = tab === 'hoy' ? D() : null;
  switch (a) {
    case 'tab': tab = v; render(); window.scrollTo(0, 0); return;
    case 'day': cur = shift(cur, +v); if (cur > todayKey()) cur = todayKey(); render(); return;
    case 'today': cur = todayKey(); render(); return;
    case 'open': cur = v; tab = 'hoy'; render(); window.scrollTo(0, 0); return;

    case 'ci-mood': draft.ci.mood = +v; render(); return;
    case 'ci-energy': draft.ci.energy = +v; render(); return;
    case 'ci-add':
      if (!draft.ci.mood || !draft.ci.energy) return toast('Elige ánimo y energía');
      d.checkins.push({ id: uid(), t: draft.ci.t || nowHM(), mood: draft.ci.mood, energy: draft.ci.energy, note: draft.ci.note.trim() });
      draft.ci = { mood: 0, energy: 0, note: '', t: '' };
      return commit('Estado registrado ✓');

    case 'sleepq': d.sleep.q = d.sleep.q === +v ? 0 : +v; return commit();
    case 'water': d.water = Math.max(0, d.water + +v); return commit();

    case 'meal-type': draft.meal.type = draft.meal.type === v ? '' : v; render(); return;
    case 'meal-tag': {
      const t = draft.meal.tags; const i = t.indexOf(v);
      i >= 0 ? t.splice(i, 1) : t.push(v); render(); return;
    }
    case 'meal-add':
      if (!draft.meal.desc.trim() && !draft.meal.type) return toast('Escribe qué comiste');
      d.meals.push({ id: uid(), t: draft.meal.t || nowHM(), type: draft.meal.type, desc: draft.meal.desc.trim(), tags: draft.meal.tags.slice() });
      draft.meal = { type: '', tags: [], desc: '', t: '' };
      return commit('Comida agregada ✓');

    case 'caff-add':
      d.caffeine.push({ id: uid(), t: draft.caff.t || nowHM(), kind: v });
      draft.caff.t = '';
      return commit(`${v} registrado ✓`);

    case 'supp':
      if (d.supps[v]) delete d.supps[v]; else d.supps[v] = nowHM();
      return commit();

    case 'ex-kind': draft.ex.kind = v; render(); return;
    case 'ex-add':
      if (!(+draft.ex.min > 0)) return toast('Indica los minutos');
      d.exercise.push({ id: uid(), t: draft.ex.t || nowHM(), kind: draft.ex.kind, min: +draft.ex.min, int: +draft.ex.int || 2 });
      draft.ex = { kind: draft.ex.kind, min: '', int: 2, t: '' };
      return commit('Actividad agregada ✓');

    case 'inc': setPath(d, el.dataset.path, Math.max(0, (getPath(d, el.dataset.path) || 0) + +v)); return commit();
    case 'stress': d.stress = d.stress === +v ? 0 : +v; return commit();
    case 'toggle': setPath(d, el.dataset.path, !getPath(d, el.dataset.path)); return commit();
    case 'sym': { const i = d.symptoms.indexOf(v); i >= 0 ? d.symptoms.splice(i, 1) : d.symptoms.push(v); return commit(); }
    case 'del': {
      const list = d[el.dataset.list]; const i = list.findIndex(x => x.id === el.dataset.id);
      if (i >= 0 && confirm('¿Borrar este registro?')) { list.splice(i, 1); commit(); }
      return;
    }

    case 'range': range = v === 'all' ? 'all' : +v; render(); return;
    case 'outcome': outcome = v; render(); return;
    case 'exp-from': {
      const name = prompt('Nombre del experimento', `Mejorar: ${v}`);
      if (!name) return;
      S.experiments.push({ id: uid(), name, start: todayKey() });
      return commit('Experimento iniciado ✓');
    }
    case 'exp-add': {
      const name = document.getElementById('exp-name').value.trim();
      const start = document.getElementById('exp-start').value || todayKey();
      if (!name) return toast('Ponle nombre al experimento');
      S.experiments.push({ id: uid(), name, start });
      return commit('Experimento iniciado ✓');
    }
    case 'exp-end': { const x = S.experiments.find(x => x.id === el.dataset.id); if (x) x.end = todayKey(); return commit(); }
    case 'exp-del':
      if (confirm('¿Borrar este experimento?')) { S.experiments = S.experiments.filter(x => x.id !== el.dataset.id); commit(); }
      return;

    case 'supp-new': {
      const name = document.getElementById('new-supp').value.trim();
      if (!name) return;
      if (S.settings.supplements.includes(name)) return toast('Ya existe');
      S.settings.supplements.push(name);
      return commit('Suplemento agregado ✓');
    }
    case 'supp-del':
      if (confirm(`¿Quitar ${v} de la lista? (el historial se conserva)`)) { S.settings.supplements = S.settings.supplements.filter(s => s !== v); commit(); }
      return;
    case 'export-json': download(`mi-energia-${todayKey()}.json`, JSON.stringify(S, null, 2), 'application/json'); return;
    case 'export-csv': download(`mi-energia-${todayKey()}.csv`, '﻿' + toCSV(), 'text/csv'); return;
    case 'copy-csv':
      navigator.clipboard.writeText(toCSV()).then(() => toast('CSV copiado ✓'), () => toast('No se pudo copiar'));
      return;
    case 'wipe':
      if (confirm('¿Borrar TODOS tus registros? No se puede deshacer.') && confirm('¿Seguro? Te recomiendo descargar un respaldo antes.')) {
        S = { days: {}, experiments: [], settings: { ...S.settings } }; commit('Datos borrados');
      }
      return;
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.draft) setPath(draft, el.dataset.draft, el.value);
  else if (el.dataset.bind && el.tagName === 'TEXTAREA') { setPath(D(), el.dataset.bind, el.value); save(); }
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.bind && el.tagName !== 'TEXTAREA') {
    setPath(D(), el.dataset.bind, el.type === 'number' ? Math.max(0, +el.value || 0) : el.value);
    commit();
  } else if (el.dataset.setting) {
    const n = +el.value;
    if (n > 0) { S.settings[el.dataset.setting] = n; commit('Guardado ✓'); }
  } else if (el.id === 'import' && el.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.days) throw new Error();
        if (!confirm('Esto reemplazará tus datos actuales con el respaldo. ¿Continuar?')) return;
        S = { days: data.days, experiments: data.experiments || [], settings: { ...DEFAULT_SETTINGS, ...data.settings } };
        commit('Respaldo restaurado ✓');
      } catch (err) { toast('Archivo no válido'); }
    };
    r.readAsText(el.files[0]);
  }
});

// Al volver a la app otro día, que "Hoy" sea hoy
let lastToday = todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && todayKey() !== lastToday) {
    if (cur === lastToday) cur = todayKey();
    lastToday = todayKey(); render();
  }
});

render();
navigator.storage?.persist?.();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
