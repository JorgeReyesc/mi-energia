'use strict';

// ---------- Constantes ----------
const STORE = 'energia.v1';
const DEFAULT_SETTINGS = {
  waterGoal: 2000, glassMl: 250, sleepGoal: 7.5,
  supplements: ['Multivitamínico', 'Vitamina D', 'Magnesio', 'Omega 3'],
  caffLimit: 400, bedtime: '23:00', weightKg: 75, liftUnit: 'lb', customLifts: [],
  nut: { kcal: 2200, prot: 90, carb: 250, sugar: 50, fat: 70, sat: 20, fib: 30, na: 2300 },
};
// Nutrientes en el mismo orden que los valores de foods.js.
// goal = conviene llegar; limit = conviene no pasarse; range = referencia
const NUTR = [
  ['kcal', 'Calorías', 'kcal', 'range'], ['prot', 'Proteína', 'g', 'goal'], ['carb', 'Carbohidratos', 'g', 'range'],
  ['sugar', 'Azúcares', 'g', 'limit'], ['fat', 'Grasa', 'g', 'range'], ['sat', 'Grasa saturada', 'g', 'limit'],
  ['fib', 'Fibra', 'g', 'goal'], ['na', 'Sodio', 'mg', 'limit'],
];
const FLAG_TAGS = { h: 'harinas', a: 'azucar', p: 'procesado', f: 'frito', v: 'verduras', i: 'integral', l: 'lacteos' };
const MEAL_TYPES = ['Desayuno', 'Colación', 'Comida', 'Merienda', 'Cena'];
const MEAL_TAGS = [
  ['proteina', '🥩 Proteína'], ['verduras', '🥦 Verdura/fruta'], ['integral', '🌾 Integral'],
  ['harinas', '🍞 Harinas refinadas'], ['azucar', '🍬 Azúcar/dulce'], ['procesado', '🍟 Procesado'],
  ['frito', '🍳 Frito/grasoso'], ['lacteos', '🥛 Lácteos'], ['abundante', '😮‍💨 Muy abundante'],
];
// Productos con cafeína de inicio (mg por unidad). El usuario puede editarlos o agregar los suyos.
const DEFAULT_CAFF = [
  { id: 'sedalmerck', n: 'Sedalmerck', u: '2 tabletas', mg: 100, other: 'Paracetamol 1000 mg, Fenilefrina 10 mg' },
  { id: 'alka-boost', n: 'Alka-Seltzer Boost', u: '2 tabletas', mg: 130, other: 'Ácido acetilsalicílico 1000 mg' },
  { id: 'edge-insanity', n: 'Edge of Insanity (pre-entreno)', u: '1 scoop', mg: 420, other: 'Beta-alanina 3200 mg, L-citrulina 6000 mg' },
  { id: 'sedalmerck-max', n: 'Sedalmerck Max', u: '1 tableta', mg: 65, other: 'Paracetamol 650 mg' },
  { id: 'cafe', n: 'Café americano', u: '1 taza (240 ml)', mg: 95, other: '' },
  { id: 'espresso', n: 'Espresso', u: '1 shot', mg: 63, other: '' },
  { id: 'cafe-soluble', n: 'Café soluble', u: '1 cucharadita', mg: 60, other: '' },
  { id: 'te-negro', n: 'Té negro', u: '1 taza', mg: 47, other: '' },
  { id: 'te-verde', n: 'Té verde', u: '1 taza', mg: 28, other: '' },
  { id: 'cola-lata', n: 'Coca-Cola', u: '1 lata (355 ml)', mg: 34, other: '' },
  { id: 'cola-600', n: 'Coca-Cola', u: '600 ml', mg: 57, other: '' },
  { id: 'energetica', n: 'Bebida energética', u: '1 lata (250 ml)', mg: 80, other: '' },
  { id: 'energetica-grande', n: 'Bebida energética grande', u: '1 lata (473 ml)', mg: 160, other: '' },
  { id: 'chocolate', n: 'Chocolate oscuro', u: '30 g', mg: 20, other: '' },
];
// Registros anteriores (sin mg guardados)
const LEGACY_CAFF_MG = { 'Café': 95, 'Té': 40, 'Energética': 80, 'Refresco cola': 34 };
const CAFF_HALF_LIFE = 5; // horas, promedio en adultos
const ANALG_RE = /paracetamol|acetaminof|acetilsalic|aspirina|ibuprofeno|naproxeno/i;
// Referencias diarias para adultos de otros activos (mg/día).
// limit = máximo diario recomendado sin receta; usual = dosis habitual en suplementos (no es un límite de seguridad)
const ACTIVES = [
  { n: 'Paracetamol', re: /paracetamol|acetaminof/, ref: 3000, kind: 'limit', note: 'máx. sin receta; nunca más de 4000 mg' },
  { n: 'Ácido acetilsalicílico', re: /acetilsalic|aspirina/, ref: 4000, kind: 'limit', note: 'máx. sin receta' },
  { n: 'Ibuprofeno', re: /ibuprofeno/, ref: 1200, kind: 'limit', note: 'máx. sin receta' },
  { n: 'Naproxeno', re: /naproxeno/, ref: 660, kind: 'limit', note: 'máx. sin receta' },
  { n: 'Fenilefrina', re: /fenilefrina/, ref: 60, kind: 'limit', note: 'máx. oral al día' },
  { n: 'Taurina', re: /taurina/, ref: 3000, kind: 'limit', note: 'nivel seguro observado' },
  { n: 'Niacina', re: /niacina/, ref: 35, kind: 'limit', note: 'máx. tolerable en suplementos' },
  { n: 'Beta-alanina', re: /beta.?alanina/, ref: 6400, kind: 'usual', note: 'dosis usual: 3.2–6.4 g' },
  { n: 'L-citrulina', re: /citrulina/, ref: 8000, kind: 'usual', note: 'dosis usual: 6–8 g' },
  { n: 'Creatina', re: /creatina/, ref: 5000, kind: 'usual', note: 'dosis usual: 3–5 g' },
  { n: 'L-arginina', re: /arginina/, ref: 9000, kind: 'usual', note: 'dosis usual: hasta 9 g' },
  { n: 'L-tirosina', re: /tirosina/, ref: 2000, kind: 'usual', note: 'dosis usual: 0.5–2 g' },
  { n: 'L-teanina', re: /teanina/, ref: 400, kind: 'usual', note: 'dosis usual: 100–400 mg' },
];
// Suplementos: unidades y referencias diarias (UL = máximo tolerable para adultos)
const SUPP_UNITS = ['g', 'mg', 'µg', 'UI', 'tableta(s)', 'cápsula(s)', 'scoop', 'gotas', 'ml'];
const DEFAULT_SUPP_DOSE = {
  'Multivitamínico': { dose: 1, unit: 'tableta(s)' }, 'Vitamina D': { dose: 2000, unit: 'UI' },
  'Magnesio': { dose: 300, unit: 'mg' }, 'Omega 3': { dose: 1000, unit: 'mg' }, 'Creatina': { dose: 5, unit: 'g' },
};
const SUPP_REFS = [
  { n: 'Creatina', re: /creatina/, ref: 5000, unit: 'mg', kind: 'usual', note: 'dosis usual: 3–5 g' },
  { n: 'Vitamina D', re: /vitamina d|vit\.? d|colecalciferol/, ref: 4000, unit: 'UI', kind: 'limit', note: 'máx. tolerable (UL)' },
  { n: 'Magnesio', re: /magnesio/, ref: 350, unit: 'mg', kind: 'limit', note: 'máx. en suplementos (UL)' },
  { n: 'Omega 3', re: /omega/, ref: 3000, unit: 'mg', kind: 'usual', note: 'hasta 3 g sin supervisión médica' },
  { n: 'Vitamina C', re: /vitamina c|vit\.? c|ascorbico/, ref: 2000, unit: 'mg', kind: 'limit', note: 'máx. tolerable (UL)' },
  { n: 'Zinc', re: /zinc/, ref: 40, unit: 'mg', kind: 'limit', note: 'máx. tolerable (UL)' },
  { n: 'Hierro', re: /hierro/, ref: 45, unit: 'mg', kind: 'limit', note: 'máx. tolerable (UL)' },
  { n: 'Calcio', re: /calcio/, ref: 2500, unit: 'mg', kind: 'limit', note: 'máx. tolerable (UL)' },
  { n: 'Ashwagandha', re: /ashwagandha/, ref: 600, unit: 'mg', kind: 'usual', note: 'dosis usual: 300–600 mg' },
  { n: 'Melatonina', re: /melatonina/, ref: 5, unit: 'mg', kind: 'usual', note: 'dosis usual: 0.5–5 mg' },
  { n: 'L-teanina', re: /teanina/, ref: 400, unit: 'mg', kind: 'usual', note: 'dosis usual: 100–400 mg' },
  { n: 'Beta-alanina', re: /beta.?alanina/, ref: 6400, unit: 'mg', kind: 'usual', note: 'dosis usual: 3.2–6.4 g' },
  { n: 'L-citrulina', re: /citrulina/, ref: 8000, unit: 'mg', kind: 'usual', note: 'dosis usual: 6–8 g' },
];
// Convierte una dosis a la unidad de la referencia; null si no se puede (cápsulas, scoops…)
function toRefUnit(dose, unit, ref) {
  if (ref.unit === 'UI') return unit === 'UI' ? dose : unit === 'µg' ? dose * 40 : null;
  return { g: dose * 1000, mg: dose, 'µg': dose / 1000 }[unit] ?? null;
}
function suppDose(name) { return S.settings.suppDose[name] || { dose: '', unit: 'mg' }; }
// Registro del día: antes era solo la hora (texto)
function suppEntry(v) {
  if (!v) return null;
  return typeof v === 'string' ? { t: v, dose: null, unit: '' } : v;
}
function fmtDose(dose, unit) { return dose == null || dose === '' ? '' : `${r1(+dose)} ${unit}`; }

function activeInfo(name) {
  const k = norm(name);
  return ACTIVES.find(a => a.re.test(k)) || { n: name.replace(/^./, c => c.toUpperCase()), ref: null };
}
const TESSERACT_URL ='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
// MET aproximado por actividad (gasto ≈ MET × peso kg × horas). Los juegos son 2 tiempos de 20 min.
const EX_TYPES = [
  { n: 'Caminar', met: 3.5 }, { n: 'Cardio', met: 7 }, { n: 'Pesas', met: 5 },
  { n: 'Flag QB', met: 5, min: 40 }, { n: 'Flag Receptor', met: 8.5, min: 40 }, { n: 'Futsal', met: 8, min: 40 },
  { n: 'Deporte', met: 7 }, { n: 'Yoga/estiramiento', met: 2.5 }, { n: 'Otro', met: 4 },
];
const INTENSITY = ['Suave', 'Moderada', 'Intensa'];
const INT_FACTOR = [0.8, 1, 1.2];
const LIFTS = {
  Pecho: ['Press de banca', 'Press inclinado con barra', 'Press con mancuernas', 'Press inclinado con mancuernas',
    'Aperturas con mancuernas', 'Cruce de poleas', 'Fondos', 'Lagartijas'],
  Espalda: ['Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna', 'Remo sentado en polea', 'Peso muerto', 'Pullover en polea'],
  Piernas: ['Sentadilla', 'Sentadilla frontal', 'Prensa', 'Zancadas', 'Sentadilla búlgara', 'Extensión de cuádriceps',
    'Curl femoral', 'Peso muerto rumano', 'Hip thrust', 'Elevación de talones'],
  Hombro: ['Press militar', 'Press con mancuernas sentado', 'Elevaciones laterales', 'Elevaciones frontales',
    'Pájaros (deltoide posterior)', 'Face pull', 'Encogimientos'],
  Brazos: ['Curl con barra', 'Curl con mancuernas', 'Curl martillo', 'Curl en polea', 'Extensión de tríceps en polea', 'Press francés', 'Fondos en banco'],
  Core: ['Plancha (segundos)', 'Crunch', 'Elevación de piernas', 'Rueda abdominal', 'Russian twist'],
};
function exKcal(x) {
  const t = EX_TYPES.find(e => e.n === x.kind) || { met: 4 };
  return t.met * (INT_FACTOR[(x.int || 2) - 1] || 1) * S.settings.weightKg * (+x.min || 0) / 60;
}
// Agrupa series por ejercicio conservando el orden: [[ejercicio, [series]]]
function groupSets(sets) {
  const g = new Map();
  (sets || []).forEach(s => { if (!g.has(s.ex)) g.set(s.ex, []); g.get(s.ex).push(s); });
  return [...g];
}
function setsLine(sets) {
  const u = S.settings.liftUnit;
  return sets.map(s => s.kg ? `${s.reps}×${r1(s.kg)} ${s.u || u}` : `${s.reps}`).join(' · ');
}
function volume(sets) { return (sets || []).reduce((a, s) => a + (+s.reps || 0) * (+s.kg || 0), 0); }
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
S.customFoods ||= [];
S.caffProducts ||= DEFAULT_CAFF.map(p => ({ ...p }));
// Productos de inicio que se agregaron en versiones nuevas: se añaden una sola vez (si luego los quitas, no regresan)
const ADDED_LATER = ['edge-insanity'];
S.caffDefaultsSeen ||= [...S.caffProducts.map(p => p.id), ...DEFAULT_CAFF.map(d => d.id).filter(id => !ADDED_LATER.includes(id))];
DEFAULT_CAFF.forEach((def, i) => {
  if (S.caffDefaultsSeen.includes(def.id)) return;
  S.caffProducts.splice(Math.min(i, S.caffProducts.length), 0, { ...def });
  S.caffDefaultsSeen.push(def.id);
});
// Pasa Sedalmerck y Alka-Seltzer Boost de 1 a 2 tabletas si siguen con el valor de inicio anterior
for (const p of S.caffProducts) {
  const def = DEFAULT_CAFF.find(d => d.id === p.id);
  // Refresco de cola → Coca-Cola
  if (def && p.n === 'Refresco de cola') p.n = def.n;
  if (def && def.u === '2 tabletas' && p.u === '1 tableta' && p.mg * 2 === def.mg) Object.assign(p, { u: def.u, mg: def.mg, other: def.other });
}
S.settings = { ...DEFAULT_SETTINGS, ...(S.settings || {}) };
S.settings.nut = { ...DEFAULT_SETTINGS.nut, ...S.settings.nut };
// Dosis de suplementos (versión nueva): agrega Creatina y dosis de inicio
// Pesas en libras por defecto (solo si aún no hay series registradas en kg)
if (!S.settings.liftUnitV2) {
  if (!Object.values(S.days).some(d => d.exercise?.some(x => x.sets?.length))) S.settings.liftUnit = 'lb';
  S.settings.liftUnitV2 = true;
}
if (!S.settings.suppDose) {
  if (!S.settings.supplements.includes('Creatina')) S.settings.supplements.push('Creatina');
  S.settings.suppDose = Object.fromEntries(S.settings.supplements.filter(s => DEFAULT_SUPP_DOSE[s]).map(s => [s, { ...DEFAULT_SUPP_DOSE[s] }]));
}

let tab = 'hoy';
let cur = todayKey();
let range = 30;
let outcome = 'energy';
const draft = {
  ci: { mood: 0, energy: 0, note: '', t: '' },
  meal: { type: '', tags: [], desc: '', t: '', q: '', items: [] },
  food: { n: '', u: '1 porción', v: ['', '', '', '', '', '', '', ''], photo: '', status: '', ocr: '' },
  cp: { id: '', n: '', u: '1 unidad', mg: '', other: '', photo: '', status: '', ocr: '' },
  caff: { t: '' },
  ex: { kind: 'Caminar', min: '', int: 2, t: '', sets: [], lift: { ex: 'Press de banca', reps: '', kg: '' } },
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
// ---------- Nutrición ----------
function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function allFoods() { return [...S.customFoods.map(f => ({ ...f, custom: true })), ...FOODS]; }
function searchFoods(q) {
  const words = norm(q).split(/\s+/).filter(w => w.length > 1 && !['de', 'con', 'la', 'el', 'una', 'un'].includes(w));
  if (!words.length) return [];
  return allFoods().map(f => {
    const name = norm(f.n), all = name + ' ' + norm(f.al || '');
    // Más puntos si la palabra está en el nombre o al inicio
    const score = words.reduce((s, w) => s + (name.startsWith(w) ? 3 : name.includes(w) ? 2 : all.includes(w) ? 1 : 0), 0);
    return { f, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8).map(x => x.f);
}
function sumNut(items) {
  const t = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const it of items) it.v.forEach((x, i) => (t[i] += (+x || 0) * it.q));
  return t;
}
// Totales del día o null si ninguna comida tiene alimentos con porción
function dayNut(d) {
  const items = d.meals.flatMap(m => m.items || []);
  return items.length ? sumNut(items) : null;
}
function fmtN(x, unit) { return unit === 'kcal' || unit === 'mg' ? String(Math.round(x)) : r1(x); }
function fmtQ(q) { return String(Math.round(q * 100) / 100); }

// ---------- Cafeína ----------
function hmToMin(t) { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + m; }
function entryMg(x) { return (x.mg ?? LEGACY_CAFF_MG[x.kind] ?? 0) * (x.q || 1); }
// "Paracetamol 500 mg, Fenilefrina 5 mg" → [{ n, mg }]
function parseOther(s) {
  return [...String(s || '').matchAll(/([A-Za-zÁÉÍÓÚáéíóúñÑ.\- ]+?)\s*(\d+(?:[.,]\d+)?)\s*mg/g)]
    .map(m => ({ n: m[1].replace(/^[\s,;]+/, '').trim(), mg: +m[2].replace(',', '.') })).filter(o => o.n);
}
function bedMin() { const b = hmToMin(S.settings.bedtime); return b < 12 * 60 ? b + 1440 : b; }
// Cafeína que queda en el cuerpo a cierto minuto del día (vida media ~5 h)
function caffAt(d, min) {
  return d.caffeine.reduce((s, x) => {
    const dt = min - hmToMin(x.t);
    return dt < 0 ? s : s + entryMg(x) * Math.pow(0.5, dt / 60 / CAFF_HALF_LIFE);
  }, 0);
}
function dayCaff(d) {
  const others = {};
  d.caffeine.forEach(x => parseOther(x.other).forEach(o => {
    const n = activeInfo(o.n).n;
    others[n] = (others[n] || 0) + o.mg * (x.q || 1);
  }));
  return { mg: d.caffeine.reduce((s, x) => s + entryMg(x), 0), bed: caffAt(d, bedMin()), others };
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
    caffMg: dayCaff(d).mg,
    caffBed: dayCaff(d).bed,
    analg: d.caffeine.some(x => ANALG_RE.test(x.other || '')),
    lateCaff: dayFlags(d).lateCaff,
    exMin: d.exercise.reduce((a, x) => a + (+x.min || 0), 0),
    exKcal: d.exercise.reduce((a, x) => a + exKcal(x), 0),
    sun: d.sun,
    stress: d.stress || null,
    alcohol: d.alcohol,
    meals: d.meals.length,
    breakfast: d.meals.length ? d.meals.some(m => m.type === 'Desayuno') : null,
    tags: Object.fromEntries(MEAL_TAGS.map(([t]) => [t, d.meals.length ? tagCount(t) : null])),
    supps: Object.fromEntries(S.settings.supplements.map(s => [s, !!d.supps[s]])),
    symptoms: d.symptoms.length,
    nut: dayNut(d),
    prev: pf ? { exKcal: p.exercise.reduce((a, x) => a + exKcal(x), 0), caffBed: dayCaff(p).bed, lateCaff: pf.lateCaff, lateDinner: pf.lateDinner, alcohol: p.alcohol, screens: !!p.screens } : null,
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
    { label: 'Cafeína total', unit: ' mg', get: m => m.caffMg,
      more: 'Los días con más cafeína te sientes mejor, pero ojo con la dependencia: no subas la dosis y córtala temprano.',
      less: 'Más cafeína coincide con menos energía (efecto rebote): prueba bajar a 1–2 tomas al día y no en ayunas.' },
    { label: 'Cafeína al dormir (noche anterior)', unit: ' mg', get: m => m.prev ? m.prev.caffBed : null,
      less: 'La cafeína que sigue en tu cuerpo al dormir te quita energía al día siguiente: tu última toma, mínimo 8 h antes de acostarte.' },
    { label: 'Analgésicos con cafeína', bool: true, get: m => m.analg,
      less: 'Los días con analgésicos con cafeína te sientes peor; usarlos seguido puede causar dolor de cabeza por rebote. Coméntalo con tu médico.' },
    { label: 'Cafeína después de las 3 pm', bool: true, get: m => m.lateCaff,
      less: 'Corta la cafeína a partir de las 2–3 pm durante una semana y compara.' },
    { label: 'Cafeína tarde (día anterior)', bool: true, get: m => m.prev?.lateCaff,
      less: 'La cafeína de la tarde afecta tu energía del día siguiente: probablemente te quita sueño profundo.' },
    { label: 'Ejercicio', unit: ' min', get: m => m.exMin,
      more: 'Moverte te da energía: agenda 20–30 min diarios, aunque sea caminar.' },
    { label: 'Sol / aire libre', unit: ' min', get: m => m.sun,
      more: 'Sal 10–20 min a la luz natural en la mañana; ayuda al ritmo circadiano y al ánimo.' },
    { label: 'Gasto en ejercicio', unit: ' kcal', get: m => m.exKcal,
      more: 'Los días que te mueves más tienes más energía: mantén al menos una actividad diaria.',
      less: 'Los días de mucho gasto te dejan con menos energía: cuida comer suficiente proteína y carbohidrato después de jugar o entrenar.' },
    { label: 'Gasto en ejercicio (día anterior)', unit: ' kcal', get: m => m.prev ? m.prev.exKcal : null,
      less: 'Después de un día de mucho gasto amaneces cansado: prioriza sueño, hidratación y comida de recuperación esa noche.' },
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
  const nutTips = {
    kcal: ['Los días que comes más tienes más energía: quizá estás comiendo poco; no te saltes comidas.',
      'Comer de más coincide con menos energía: porciones más moderadas, sobre todo a mediodía.'],
    prot: ['Más proteína = más energía: apunta a 25–30 g en cada comida (huevo, pollo, pescado, frijoles, yogur griego).', null],
    carb: [null, 'Muchos carbohidratos coinciden con bajones: cambia parte por proteína y verdura.'],
    sugar: [null, 'Más azúcar = menos energía: quita refrescos, jugos y pan dulce 2 semanas y compara.'],
    fat: [null, null],
    sat: [null, 'La grasa saturada alta coincide con peor estado: menos frituras, embutidos y quesos grasos.'],
    fib: ['La fibra te ayuda: más verdura, frijoles, avena y fruta entera.', null],
    na: [null, 'Mucho sodio coincide con peor estado: menos procesados, sopas instantáneas y embutidos.'],
  };
  NUTR.forEach(([key, label, unit], i) => {
    f.push({ label: `Nutrición: ${label}`, unit: ' ' + unit, get: m => m.nut ? m.nut[i] : null, more: nutTips[key][0], less: nutTips[key][1] });
  });
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
  <div class="row" style="justify-content:space-between;margin:-4px 0 8px">
    ${isToday ? '<span></span>' : '<button class="link" data-act="today">← Volver a hoy</button>'}
    <span><button class="link" data-act="sec-all" data-v="1">Abrir todo</button><button class="link" data-act="sec-all" data-v="0">Cerrar todo</button></span>
  </div>
  ${[['resumen', summaryCard], ['animo', checkinCard], ['sueno', sleepCard], ['agua', waterCard], ['comidas', mealsCard],
    ['cafeina', caffCard], ['suplementos', suppCard], ['movimiento', activityCard], ['sol', sunCard], ['otros', otherCard]]
    .map(([id, fn]) => collapsible(id, fn(d))).join('')}`;
}

// Convierte una tarjeta en desplegable: el título (con su resumen) abre y cierra; el estado se recuerda
const HOY_SECTIONS = ['resumen', 'animo', 'sueno', 'agua', 'comidas', 'cafeina', 'suplementos', 'movimiento', 'sol', 'otros'];
function collapsible(id, html) {
  const ui = (S.ui ||= { open: ['resumen', 'animo'] });
  const open = ui.open.includes(id);
  return html
    .replace('<section class="card"', `<section class="card sec${open ? ' open' : ''}" data-sec="${id}"`)
    .replace('<h2>', `<h2 data-act="sec" data-v="${id}" role="button" tabindex="0" aria-expanded="${open}">`)
    // Un resumen vacío empuja la flecha a la derecha en tarjetas sin resumen
    .replace(/<\/h2>/, m => (html.slice(0, html.indexOf('</h2>')).includes('class="sub"') ? '' : '<span class="sub"></span>') + m);
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

  if (d.caffeine.length) {
    const cf = dayCaff(d);
    if (cf.mg > st.caffLimit) add('bad', '☕', `Cafeína: ${Math.round(cf.mg)} mg (límite ${st.caffLimit} mg).`);
    if (cf.bed >= 50) add('bad', '🌙', `A tu hora de dormir (${st.bedtime}) aún tendrás ~${Math.round(cf.bed)} mg de cafeína en el cuerpo.`);
    else if (d.caffeine.some(x => x.t >= LATE_CAFF)) add('bad', '☕', 'Cafeína después de las 3 pm: puede afectar tu sueño de hoy.');
    for (const [n, mg] of Object.entries(cf.others)) {
      const a = activeInfo(n);
      if (a.kind === 'limit' && mg > a.ref) add('bad', '💊', `${esc(a.n)}: ${fmtMg(mg)} hoy, arriba del límite de ${fmtMg(a.ref)} (${esc(a.note)}).`);
    }
  }

  if (d.meals.length) {
    if (!d.meals.some(m => m.type === 'Desayuno') && hourNow >= 12) add('bad', '🍳', 'Sin desayuno registrado.');
    const cnt = t => d.meals.filter(m => (m.tags || []).includes(t)).length;
    const junk = cnt('azucar') + cnt('procesado') + cnt('harinas');
    if (junk >= 3) add('bad', '🍬', `${junk} etiquetas de azúcar / procesado / harinas hoy.`);
    if (cnt('verduras')) add('good', '🥦', 'Comiste verdura o fruta.');
    else if (hourNow >= 18) add('bad', '🥦', 'Sin verdura ni fruta hoy.');
    if (cnt('proteina') >= 2) add('good', '🥩', 'Buena presencia de proteína.');
    const n = dayNut(d), g = st.nut;
    if (n) {
      if (n[3] > g.sugar) add('bad', '🍬', `Azúcares: ${Math.round(n[3])} g (límite ${g.sugar} g).`);
      if (n[7] > g.na) add('bad', '🧂', `Sodio: ${Math.round(n[7])} mg (límite ${g.na} mg).`);
      if (n[1] >= g.prot) add('good', '🥩', `Meta de proteína cumplida (${Math.round(n[1])} g).`);
      else if (hourNow >= 18) add('bad', '🥩', `Proteína: ${Math.round(n[1])} g de ${g.prot} g.`);
      if (hourNow >= 18 && n[6] < g.fib * 0.6) add('bad', '🌾', `Poca fibra: ${Math.round(n[6])} g de ${g.fib} g.`);
    }
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
    <h2>🙂 ¿Cómo te sientes ahora?<span class="sub">${d.checkins.length ? `${d.checkins.length} registro${d.checkins.length === 1 ? '' : 's'} · ⚡ ${r1(mean(d.checkins.map(x => x.energy)))}` : 'registra 3–4 veces al día'}</span></h2>
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
    <h2>💧 Agua<span class="sub">${r1(d.water / 1000)} de ${r1(st.waterGoal / 1000)} L</span></h2>
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
    <h2>🍽️ Comidas<span class="sub">${d.meals.length ? `${d.meals.length} · ${dayNut(d) ? Math.round(dayNut(d)[0]) + ' kcal' : ''}` : ''}</span></h2>
    <div class="chips">${MEAL_TYPES.map(t => `<button class="chip ${m.type === t ? 'on' : ''}" data-act="meal-type" data-v="${t}">${t}</button>`).join('')}</div>
    <div class="row mt">
      <input type="time" data-draft="meal.t" value="${esc(m.t || nowHM())}" aria-label="Hora">
      <input class="grow" id="meal-search" type="search" value="${esc(m.q)}" placeholder="Busca: pizza, tacos, refresco…" autocomplete="off">
    </div>
    <div id="food-results">${foodResults()}</div>
    ${m.items.length ? `<ul class="list">${m.items.map((it, i) => `
      <li><span class="grow"><b>${esc(it.n)}</b><br><span class="muted">${fmtQ(it.q)} × ${esc(it.u)} · ${Math.round(it.v[0] * it.q)} kcal · P ${r1(it.v[1] * it.q)} g · Azúcar ${r1(it.v[3] * it.q)} g</span></span>
      <span class="row" style="gap:4px;flex-wrap:nowrap">
        <button class="icon" data-act="item-q" data-i="${i}" data-v="-0.5" aria-label="Menos">−</button>
        <button class="icon" data-act="item-q" data-i="${i}" data-v="0.5" aria-label="Más">+</button>
        <button class="link" data-act="item-del" data-i="${i}" aria-label="Quitar">✕</button>
      </span></li>`).join('')}</ul>
      <p class="muted" style="margin:6px 0 0">Esta comida: <b>${nutLine(sumNut(m.items))}</b></p>` : ''}
    <input class="mt" data-draft="meal.desc" value="${esc(m.desc)}" placeholder="Nota o descripción (opcional)">
    <h3>Etiquetas (se agregan solas según los alimentos; ajusta si quieres)</h3>
    <div class="chips">${MEAL_TAGS.map(([t, l]) => `<button class="chip ${m.tags.includes(t) ? 'on' : ''}" data-act="meal-tag" data-v="${t}">${l}</button>`).join('')}</div>
    <button class="primary mt" data-act="meal-add" style="width:100%">Agregar comida</button>
    ${d.meals.length ? `<ul class="list">${sortByTime(d.meals).map(x => `
      <li><span class="t">${esc(x.t)}</span><span class="grow"><b>${esc(x.type || 'Comida')}</b> ${esc(x.desc)}
      ${x.items?.length ? `<br><span class="muted">${nutLine(sumNut(x.items))}</span>` : ''}
      <br>${(x.tags || []).map(t => `<span class="tag">${(MEAL_TAGS.find(z => z[0] === t) || [, t])[1]}</span>`).join('')}</span>
      <button class="link" data-act="del" data-list="meals" data-id="${x.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>` : ''}
    ${nutritionCard(dayNut(d), 'Nutrición del día')}
  </section>`;
}

let lastResults = [];
function foodResults() {
  const q = draft.meal.q.trim();
  if (!q) return '';
  lastResults = searchFoods(q);
  return `<div class="results">${lastResults.map((f, i) => `
    <button class="result" data-act="food-add" data-i="${i}"><span><b>${esc(f.n)}</b>${f.custom ? ' <span class="tag">mío</span>' : ''}<br><span class="muted">${esc(f.u)}</span></span><span class="muted">${Math.round(f.v[0])} kcal</span></button>`).join('')}
    <button class="link" data-act="food-new">＋ No está: crear "${esc(q)}" con sus valores</button></div>`;
}

function nutLine(n) {
  return `${Math.round(n[0])} kcal · P ${Math.round(n[1])} g · C ${Math.round(n[2])} g · Azúcar ${Math.round(n[3])} g · G ${Math.round(n[4])} g`;
}

// Barras de cada nutriente contra la meta diaria (n = totales de un día o promedio)
function nutritionCard(n, title, note = '') {
  if (!n) return '';
  const g = S.settings.nut;
  const bars = NUTR.map(([key, label, unit, kind], i) => {
    const pct = g[key] ? n[i] / g[key] * 100 : 0;
    const color = kind === 'limit' ? (pct > 100 ? 'var(--bad)' : pct > 80 ? 'var(--warn)' : 'var(--accent)')
      : kind === 'goal' ? (pct >= 100 ? 'var(--good)' : 'var(--accent)')
        : (pct > 115 ? 'var(--bad)' : 'var(--accent)');
    const word = kind === 'limit' ? 'límite' : kind === 'goal' ? 'meta' : 'ref.';
    return `<div class="nut">
      <div class="top"><b>${label}</b><span>${fmtN(n[i], unit)} ${unit} <span class="muted">/ ${g[key]} ${word}</span></span></div>
      <div class="bar"><i style="width:${Math.min(100, pct)}%;background:${color}"></i></div>
    </div>`;
  }).join('');
  // Reparto de calorías entre proteína, carbohidratos y grasa
  const kp = n[1] * 4, kc = n[2] * 4, kf = n[4] * 9, kt = kp + kc + kf || 1;
  return `<h3>📊 ${title}</h3>
    <div class="macro"><i style="width:${kp / kt * 100}%;background:var(--mood)"></i><i style="width:${kc / kt * 100}%;background:var(--accent)"></i><i style="width:${kf / kt * 100}%;background:var(--warn)"></i></div>
    <div class="legend"><span><i style="background:var(--mood)"></i>Proteína ${Math.round(kp / kt * 100)}%</span><span><i style="background:var(--accent)"></i>Carbohidratos ${Math.round(kc / kt * 100)}%</span><span><i style="background:var(--warn)"></i>Grasa ${Math.round(kf / kt * 100)}%</span></div>
    ${bars}
    <p class="muted" style="margin:8px 0 0">${note || 'Valores aproximados por porción típica. Ajusta tus metas en Ajustes.'}</p>`;
}

function caffCard(d) {
  const st = S.settings, cf = dayCaff(d);
  const pct = Math.min(100, cf.mg / st.caffLimit * 100);
  const others = Object.entries(cf.others);
  return `
  <section class="card">
    <h2>☕ Cafeína<span class="sub">${Math.round(cf.mg)} mg hoy</span></h2>
    <div class="row">
      <label class="f">Hora<input type="time" data-draft="caff.t" value="${esc(draft.caff.t || nowHM())}"></label>
      <span class="muted grow">Toca un producto para registrarlo a esa hora.</span>
    </div>
    <div class="chips mt">${S.caffProducts.map(p => `<button class="chip" data-act="caff-add" data-id="${esc(p.id)}">${p.photo ? `<img class="mini" src="${p.photo}" alt="">` : ''}${esc(p.n)} <span class="muted">${esc(p.u)} · ${p.mg} mg</span></button>`).join('')}</div>
    <button class="link mt" style="padding-left:0" data-act="cp-new">📷 Agregar otro producto (pre-entreno, suplemento…) con foto de la etiqueta</button>
    ${d.caffeine.length ? `
    <div class="nut"><div class="top"><b>Total</b><span>${Math.round(cf.mg)} mg <span class="muted">/ ${st.caffLimit} límite</span></span></div>
      <div class="bar"><i style="width:${pct}%;background:${cf.mg > st.caffLimit ? 'var(--bad)' : cf.mg > st.caffLimit * 0.8 ? 'var(--warn)' : 'var(--accent)'}"></i></div></div>
    ${caffCurve(d)}
    ${others.length ? `<h3>🧪 Otros activos del día</h3>${others.map(([n, mg]) => activeBar(n, mg)).join('')}
      <p class="muted" style="margin:8px 0 0">La línea marca el límite diario o la dosis usual. Referencias generales para adultos; tu médico puede indicarte otra cosa.</p>` : ''}
    <ul class="list">${sortByTime(d.caffeine).map(x => `
      <li><span class="t">${esc(x.t)}</span><span class="grow">${esc(x.kind)} <span class="muted">${x.u ? esc(x.u) + ' · ' : ''}${Math.round(entryMg(x))} mg</span>${x.t >= LATE_CAFF ? ' <span class="tag neg">tarde</span>' : ''}</span>
      <button class="link" data-act="del" data-list="caffeine" data-id="${x.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>` : ''}
  </section>`;
}

function fmtMg(mg) { return mg >= 1000 ? `${r1(mg / 1000)} g` : mg < 10 ? `${r1(mg)} mg` : `${Math.round(mg)} mg`; }

// Barra de un activo con la marca del límite / dosis usual (el límite queda al 75% del ancho)
function activeBar(name, mg, extra = '', info = null) {
  const a = info || activeInfo(name);
  const fmt = a.unit === 'UI' ? v => `${Math.round(v)} UI` : fmtMg;
  if (!a.ref) {
    return `<div class="nut"><div class="top"><b>${esc(a.n)}</b><span>${fmt(mg)}</span></div>
      <div class="muted" style="font-size:12px">Sin referencia diaria${extra ? ' · ' + extra : ''}</div></div>`;
  }
  const scale = Math.max(a.ref / 0.75, mg);
  const w = mg / scale * 100, mark = a.ref / scale * 100;
  const over = mg > a.ref;
  const color = a.kind === 'limit' ? (over ? 'var(--bad)' : mg > a.ref * 0.8 ? 'var(--warn)' : 'var(--accent)') : (over ? 'var(--warn)' : 'var(--accent)');
  return `<div class="nut">
    <div class="top"><b>${esc(a.n)}</b><span>${fmt(mg)} <span class="muted">/ ${fmt(a.ref)} ${a.kind === 'limit' ? 'límite' : 'usual'}</span></span></div>
    <div class="lbar"><i style="width:${w}%;background:${color}"></i><s style="left:${mark}%"></s></div>
    <div class="muted" style="font-size:12px">${esc(a.note)}${extra ? ' · ' + extra : ''}${over && a.kind === 'limit' ? ' · <b class="neg">por encima del límite</b>' : ''}</div>
  </div>`;
}

// Curva de cafeína en el cuerpo a lo largo del día, hasta la hora de dormir
function caffCurve(d) {
  const W = 320, H = 110, P = 18;
  const first = Math.min(...d.caffeine.map(x => hmToMin(x.t)));
  const x0 = Math.min(first, 7 * 60), x1 = Math.max(bedMin() + 60, 24 * 60);
  const pts = [];
  for (let m = x0; m <= x1; m += 10) pts.push([m, caffAt(d, m)]);
  const peak = Math.max(100, ...pts.map(p => p[1]));
  const x = m => P + (m - x0) / (x1 - x0) * (W - 2 * P);
  const y = v => H - P - v / peak * (H - 2 * P);
  const path = pts.map(([m, v], i) => `${i ? 'L' : 'M'}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const bx = x(bedMin()), bed = caffAt(d, bedMin());
  const nowM = cur === todayKey() ? hmToMin(nowHM()) : null;
  const lbl = m => `${pad(Math.floor(m / 60) % 24)}:00`;
  return `<svg class="chart mt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cafeína en el cuerpo durante el día">
    <path d="${path}L${x(x1)},${H - P}L${x(x0)},${H - P}Z" fill="var(--accent-soft)"/>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    <line x1="${bx}" x2="${bx}" y1="${P / 2}" y2="${H - P}" stroke="var(--mood)" stroke-dasharray="3 3"/>
    <text x="${bx - 3}" y="${P}" font-size="10" fill="var(--mood)" text-anchor="end">🛏️ ${Math.round(bed)} mg</text>
    ${nowM != null && nowM >= x0 && nowM <= x1 ? `<circle cx="${x(nowM)}" cy="${y(caffAt(d, nowM))}" r="3.5" fill="var(--text)"/>` : ''}
    <text x="${P}" y="${H - 4}" font-size="10" fill="var(--muted)">${lbl(x0)}</text>
    <text x="${W - P}" y="${H - 4}" font-size="10" fill="var(--muted)" text-anchor="end">${lbl(x1)}</text>
    <text x="${P}" y="${P}" font-size="10" fill="var(--muted)">${Math.round(peak)} mg</text>
  </svg>
  <p class="muted" style="margin:4px 0 0">Cafeína en tu cuerpo (se elimina la mitad cada ~${CAFF_HALF_LIFE} h). A las ${esc(S.settings.bedtime)} tendrás ~<b>${Math.round(bed)} mg</b>${bed >= 50 ? ': suficiente para afectar tu sueño profundo.' : '.'}</p>`;
}

function unitSelect(attr, name, unit) {
  return `<select ${attr}="${esc(name)}" style="width:auto" aria-label="Unidad">${SUPP_UNITS.map(u => `<option ${u === unit ? 'selected' : ''}>${u}</option>`).join('')}</select>`;
}

function suppCard(d) {
  const list = S.settings.supplements;
  const taken = list.map(s => [s, suppEntry(d.supps[s])]).filter(([, e]) => e);
  return `
  <section class="card">
    <h2>💊 Suplementos<span class="sub">${taken.length} de ${list.length}</span></h2>
    ${list.length ? `<div class="chips">${list.map(s => { const e = suppEntry(d.supps[s]), def = suppDose(s);
      return `<button class="chip ${e ? 'on' : ''}" data-act="supp" data-v="${esc(s)}">${e ? '✓ ' : ''}${esc(s)} <span class="muted">${e ? `${fmtDose(e.dose, e.unit)} · ${esc(e.t)}` : fmtDose(def.dose, def.unit)}</span></button>`; }).join('')}</div>`
      : '<p class="muted">Agrega tus suplementos en Ajustes.</p>'}
    <p class="muted" style="margin:8px 0 0">Toca para marcar como tomado con tu dosis habitual. Si hoy tomaste otra cantidad, cámbiala abajo.</p>
    ${taken.length ? `<ul class="list">${taken.map(([s, e]) => `<li style="align-items:center">
      <span class="t">${esc(e.t)}</span><span class="grow"><b>${esc(s)}</b></span>
      <input type="number" min="0" step="any" data-supp-dose="${esc(s)}" value="${e.dose ?? ''}" placeholder="dosis" style="width:80px" aria-label="Dosis">
      ${unitSelect('data-supp-unit', s, e.unit || suppDose(s).unit)}</li>`).join('')}</ul>
    ${suppBars(taken.map(([s, e]) => [s, e.dose, e.unit]), '🧪 Dosis del día')}` : ''}
  </section>`;
}

// Barras de suplementos contra su referencia diaria (reutiliza el estilo de "otros activos")
function suppBars(items, title, extras = []) {
  const bars = items.filter(([, dose]) => dose != null && dose !== '').map(([s, dose, unit], i) => {
    const ref = SUPP_REFS.find(r => r.re.test(norm(s)));
    const amt = ref ? toRefUnit(+dose, unit, ref) : null;
    if (!ref || amt == null) {
      return `<div class="nut"><div class="top"><b>${esc(s)}</b><span>${fmtDose(dose, unit)}</span></div>
        <div class="muted" style="font-size:12px">${ref ? 'Usa g, mg, µg o UI para compararlo con la referencia' : 'Sin referencia diaria'}${extras[i] ? ' · ' + extras[i] : ''}</div></div>`;
    }
    return activeBar(s, amt, extras[i] || '', { ...ref, n: s });
  }).join('');
  return bars ? `<h3>${title}</h3>${bars}<p class="muted" style="margin:8px 0 0">La línea marca el máximo tolerable (UL) o la dosis usual para adultos. Si tu médico te indicó otra dosis, sigue su indicación.</p>` : '';
}

function liftOptions(sel) {
  const groups = { ...LIFTS };
  if (S.settings.customLifts.length) groups['Mis ejercicios'] = S.settings.customLifts;
  return Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(n => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>`).join('');
}

function exBtnText() {
  const e = draft.ex;
  const kcal = +e.min > 0 ? Math.round(exKcal({ kind: e.kind, min: e.min, int: +e.int })) : null;
  return `Agregar ${esc(e.kind)}${kcal ? ` · ~${kcal} kcal` : ''}`;
}

function activityCard(d) {
  const e = draft.ex, u = S.settings.liftUnit;
  const totMin = d.exercise.reduce((a, x) => a + (+x.min || 0), 0);
  const totKcal = d.exercise.reduce((a, x) => a + exKcal(x), 0);
  return `
  <section class="card">
    <h2>🏃 Movimiento<span class="sub">${totMin ? `${totMin} min · ~${Math.round(totKcal)} kcal` : ''}</span></h2>
    <div class="chips">${EX_TYPES.map(t => `<button class="chip ${e.kind === t.n ? 'on' : ''}" data-act="ex-kind" data-v="${t.n}">${t.n}</button>`).join('')}</div>
    <div class="row mt">
      <input type="time" data-draft="ex.t" value="${esc(e.t || nowHM())}" aria-label="Hora">
      <input type="number" min="1" max="600" data-draft="ex.min" value="${esc(e.min)}" placeholder="min" style="width:80px" aria-label="Minutos">
      <select data-draft="ex.int" style="width:auto" aria-label="Intensidad">
        ${INTENSITY.map((l, i) => `<option value="${i + 1}" ${+e.int === i + 1 ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    ${EX_TYPES.find(t => t.n === e.kind)?.min ? '<p class="muted" style="margin:6px 0 0">Partido de 2 tiempos de 20 min (ajusta si jugaste menos).</p>' : ''}
    ${e.kind === 'Pesas' ? `
    <h3>🏋️ Series</h3>
    <select data-draft="ex.lift.ex" aria-label="Ejercicio">${liftOptions(e.lift.ex)}</select>
    <div class="row mt">
      <input type="number" min="1" data-draft="ex.lift.reps" value="${esc(e.lift.reps)}" placeholder="reps" style="width:80px" aria-label="Repeticiones">
      <span class="muted">×</span>
      <input type="number" min="0" step="any" data-draft="ex.lift.kg" value="${esc(e.lift.kg)}" placeholder="${u}" style="width:90px" aria-label="Peso">
      <span class="muted">${u}</span>
      <button data-act="set-add">+ Serie</button>
    </div>
    ${e.sets.length ? `<ul class="list">${groupSets(e.sets).map(([ex, sets]) => `
      <li><span class="grow"><b>${esc(ex)}</b><br><span class="muted">${sets.length} series: ${setsLine(sets)}</span></span>
      <button class="link" data-act="set-del" data-v="${esc(ex)}" aria-label="Quitar última serie">↶</button></li>`).join('')}</ul>
      <p class="muted" style="margin:6px 0 0">Volumen: <b>${Math.round(volume(e.sets))} ${u}</b> (reps × peso). ↶ quita la última serie de ese ejercicio.</p>` : ''}` : ''}
    <button class="primary mt" data-act="ex-add" id="ex-add-btn" style="width:100%">${exBtnText()}</button>
    ${d.exercise.length ? `<ul class="list">${sortByTime(d.exercise).map(x => `
      <li><span class="t">${esc(x.t)}</span><span class="grow"><b>${esc(x.kind)}</b> · ${esc(x.min)} min · ${INTENSITY[x.int - 1] || ''} · ~${Math.round(exKcal(x))} kcal
      ${x.sets?.length ? groupSets(x.sets).map(([ex, sets]) => `<br><span class="muted">${esc(ex)}: ${setsLine(sets)}</span>`).join('') + `<br><span class="muted">Volumen: ${Math.round(volume(x.sets))} ${u}</span>` : ''}</span>
      <button class="link" data-act="del" data-list="exercise" data-id="${x.id}" aria-label="Borrar">✕</button></li>`).join('')}</ul>` : ''}
    <p class="muted" style="margin:8px 0 0">Calorías estimadas con tu peso (${S.settings.weightKg} kg, cámbialo en Ajustes).</p>
  </section>`;
}

function sunCard(d) {
  return `
  <section class="card">
    <h2>☀️ Sol / aire libre<span class="sub">${d.sun ? d.sun + ' min' : ''}</span></h2>
    <div class="stepper">
      <button class="icon" data-act="inc" data-path="sun" data-v="-10" aria-label="Menos">−</button>
      <div class="val">${d.sun} min</div>
      <button data-act="inc" data-path="sun" data-v="10">+10 min</button>
    </div>
    <p class="muted" style="margin:8px 0 0">Luz natural directa, idealmente en la mañana: ayuda al ritmo de sueño, al ánimo y a la vitamina D. Cuenta también el tiempo de juego al aire libre.</p>
  </section>`;
}

function otherCard(d) {
  return `
  <section class="card">
    <h2>🧩 Otros factores<span class="sub">${[d.stress ? `estrés ${d.stress}/5` : '', d.alcohol ? `${d.alcohol} alcohol` : '', d.symptoms.length ? `${d.symptoms.length} síntoma${d.symptoms.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}</span></h2>
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

// ----- Análisis: nutrición acumulada -----
function nutritionAnalysis(rows) {
  const nr = rows.filter(r => r.nut);
  if (!nr.length) return `<section class="card"><h2>🍽️ Nutrición</h2><p class="muted" style="margin:0">Cuando registres comidas usando el buscador de alimentos, aquí verás tu promedio diario de calorías, proteína, azúcares y más.</p></section>`;
  const g = S.settings.nut;
  const avg = NUTR.map((_, i) => mean(nr.map(r => r.nut[i])));
  const over = (i, key) => nr.filter(r => r.nut[i] > g[key]).length;
  const totals = NUTR.map((_, i) => nr.reduce((s, r) => s + r.nut[i], 0));

  // Barras diarias de calorías divididas en proteína / carbohidratos / grasa
  const W = 320, H = 130, P = 18, n = nr.length;
  const maxK = Math.max(g.kcal * 1.2, ...nr.map(r => r.nut[1] * 4 + r.nut[2] * 4 + r.nut[4] * 9));
  const bw = Math.min(24, (W - 2 * P) / n * 0.7);
  const x = i => P + (n === 1 ? (W - 2 * P) / 2 : i / (n - 1) * (W - 2 * P - bw) + bw / 2);
  const h = k => k / maxK * (H - 2 * P);
  const bars = nr.map((r, i) => {
    let y = H - P;
    return [[r.nut[1] * 4, 'var(--mood)'], [r.nut[2] * 4, 'var(--accent)'], [r.nut[4] * 9, 'var(--warn)']].map(([k, c]) => {
      y -= h(k);
      return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h(k).toFixed(1)}" fill="${c}"/>`;
    }).join('');
  }).join('');
  const goalY = H - P - h(g.kcal);
  const chart = `<svg class="chart mt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Calorías por día">
    ${bars}
    <line x1="${P}" x2="${W - P}" y1="${goalY}" y2="${goalY}" stroke="var(--muted)" stroke-dasharray="3 3"/>
    <text x="${W - P}" y="${goalY - 3}" font-size="10" fill="var(--muted)" text-anchor="end">meta ${g.kcal} kcal</text>
    <text x="${P}" y="${H - 4}" font-size="10" fill="var(--muted)">${esc(fmtDate(nr[0].k, { day: 'numeric', month: 'short' }))}</text>
    <text x="${W - P}" y="${H - 4}" font-size="10" fill="var(--muted)" text-anchor="end">${esc(fmtDate(nr[n - 1].k, { day: 'numeric', month: 'short' }))}</text>
  </svg>`;

  // Alimentos que más aportan calorías y azúcar en el periodo
  const byFood = {};
  nr.forEach(r => S.days[r.k].meals.forEach(m => (m.items || []).forEach(it => {
    const f = (byFood[it.n] ||= { n: it.n, times: 0, kcal: 0, sugar: 0 });
    f.times += it.q; f.kcal += it.v[0] * it.q; f.sugar += it.v[3] * it.q;
  })));
  const top = Object.values(byFood).sort((a, b) => b.kcal - a.kcal).slice(0, 8);
  const topSugar = Object.values(byFood).filter(f => f.sugar > 0).sort((a, b) => b.sugar - a.sugar).slice(0, 5);

  return `
  <section class="card">
    <h2>🍽️ Nutrición<span class="sub">${nr.length} días con alimentos</span></h2>
    <div class="stats">
      <div class="stat"><b>${over(3, 'sugar')} / ${nr.length}</b><span>Días sobre límite de azúcar</span></div>
      <div class="stat"><b>${nr.filter(r => r.nut[1] >= g.prot).length} / ${nr.length}</b><span>Días con meta de proteína</span></div>
      <div class="stat"><b>${over(7, 'na')} / ${nr.length}</b><span>Días sobre límite de sodio</span></div>
      <div class="stat"><b>${Math.round(totals[3])} g</b><span>Azúcar acumulada</span></div>
    </div>
    ${n > 1 ? chart + `<div class="legend"><span><i style="background:var(--mood)"></i>Proteína</span><span><i style="background:var(--accent)"></i>Carbohidratos</span><span><i style="background:var(--warn)"></i>Grasa</span><span>kcal por día</span></div>` : ''}
    ${nutritionCard(avg, 'Promedio por día', 'Promedio de los días en que registraste alimentos. Valores aproximados.')}
    ${top.length ? `<h3>🏆 Lo que más calorías te aporta</h3><ul class="list">${top.map(f => `<li><span class="grow">${esc(f.n)} <span class="muted">× ${fmtQ(f.times)}</span></span><span class="muted">${Math.round(f.kcal)} kcal</span></li>`).join('')}</ul>` : ''}
    ${topSugar.length ? `<h3>🍬 De dónde viene tu azúcar</h3><ul class="list">${topSugar.map(f => `<li><span class="grow">${esc(f.n)} <span class="muted">× ${fmtQ(f.times)}</span></span><span class="muted">${Math.round(f.sugar)} g</span></li>`).join('')}</ul>` : ''}
  </section>`;
}

// ----- Análisis: ejercicio acumulado -----
function exerciseAnalysis(rows) {
  const er = rows.filter(r => S.days[r.k].exercise.length);
  if (!er.length) return '';
  const u = S.settings.liftUnit;
  const byType = {};
  const lifts = {};
  er.forEach(r => S.days[r.k].exercise.forEach(x => {
    const t = (byType[x.kind] ||= { n: x.kind, times: 0, min: 0, kcal: 0 });
    t.times++; t.min += +x.min || 0; t.kcal += exKcal(x);
    groupSets(x.sets).forEach(([ex, sets]) => {
      const best = Math.max(...sets.map(s => +s.kg || 0));
      (lifts[ex] ||= []).push({ k: r.k, best, reps: Math.max(...sets.map(s => +s.reps || 0)), vol: volume(sets) });
    });
  }));
  const types = Object.values(byType).sort((a, b) => b.kcal - a.kcal);
  const maxK = Math.max(...types.map(t => t.kcal));
  const weeks = Math.max(1, (new Date(er[er.length - 1].k) - new Date(rows[0].k)) / 864e5 / 7 + 1 / 7);
  const totalMin = types.reduce((a, t) => a + t.min, 0), totalKcal = types.reduce((a, t) => a + t.kcal, 0);
  return `
  <section class="card">
    <h2>🏃 Ejercicio<span class="sub">${er.length} días activos</span></h2>
    <div class="stats">
      <div class="stat"><b>${Math.round(totalMin / weeks)} min</b><span>Por semana (meta 150+)</span></div>
      <div class="stat"><b>~${Math.round(totalKcal / weeks)} kcal</b><span>Gasto por semana</span></div>
    </div>
    <h3>Por actividad</h3>
    ${types.map(t => `<div class="nut"><div class="top"><b>${esc(t.n)}</b><span>${t.times}× · ${t.min} min · ~${Math.round(t.kcal)} kcal</span></div>
      <div class="bar"><i style="width:${t.kcal / maxK * 100}%"></i></div></div>`).join('')}
    ${Object.keys(lifts).length ? `<h3>🏋️ Progreso en pesas</h3><ul class="list">${Object.entries(lifts).map(([ex, s]) => {
      const first = s[0], last = s[s.length - 1], top = Math.max(...s.map(x => x.best));
      const delta = last.best - first.best;
      return `<li><span class="grow"><b>${esc(ex)}</b> <span class="muted">· ${s.length} ${s.length === 1 ? 'sesión' : 'sesiones'}</span><br>
        <span class="muted">Mejor: ${r1(top)} ${u} · Última: ${r1(last.best)} ${u} × ${last.reps} reps</span></span>
        ${s.length > 1 ? `<b class="${delta >= 0 ? 'pos' : 'neg'}">${delta >= 0 ? '+' : ''}${r1(delta)} ${u}</b>` : ''}</li>`;
    }).join('')}</ul><p class="muted" style="margin:6px 0 0">El cambio compara el peso más alto de tu primera y tu última sesión del periodo.</p>` : ''}
  </section>`;
}

// ----- Análisis: cafeína acumulada -----
function caffeineAnalysis(rows) {
  const cr = rows.filter(r => S.days[r.k].caffeine.length);
  if (!cr.length) return '';
  const st = S.settings;
  const src = {};
  cr.forEach(r => S.days[r.k].caffeine.forEach(x => {
    const s = (src[x.kind] ||= { n: x.kind, times: 0, mg: 0 });
    s.times += x.q || 1; s.mg += entryMg(x);
  }));
  // Por cada activo: total por día para promedio, máximo y días sobre el límite
  const perDay = {};
  cr.forEach(r => Object.entries(dayCaff(S.days[r.k]).others).forEach(([n, mg]) => (perDay[n] ||= []).push(mg)));
  const others = Object.entries(perDay).map(([n, v]) => {
    const a = activeInfo(n), maxDay = Math.max(...v);
    const over = a.ref ? v.filter(mg => mg > a.ref).length : 0;
    return activeBar(n, mean(v), `${v.length} día${v.length === 1 ? "" : "s"} · máx. ${fmtMg(maxDay)}${a.kind === 'limit' && over ? ` · <b class="neg">${over} días sobre el límite</b>` : ''}`);
  });
  const sources = Object.values(src).sort((a, b) => b.mg - a.mg);
  const total = sources.reduce((s, x) => s + x.mg, 0);
  const analgDays = cr.filter(r => r.analg).length;

  // Barras de mg por día con la línea del límite
  const W = 320, H = 110, P = 18, n = cr.length;
  const max = Math.max(st.caffLimit * 1.2, ...cr.map(r => r.caffMg));
  const bw = Math.min(24, (W - 2 * P) / n * 0.7);
  const x = i => P + (n === 1 ? (W - 2 * P) / 2 : i / (n - 1) * (W - 2 * P - bw) + bw / 2);
  const h = v => v / max * (H - 2 * P);
  const ly = H - P - h(st.caffLimit);
  const chart = n > 1 ? `<svg class="chart mt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cafeína por día">
    ${cr.map((r, i) => `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(H - P - h(r.caffMg)).toFixed(1)}" width="${bw.toFixed(1)}" height="${h(r.caffMg).toFixed(1)}" rx="2" fill="${r.caffMg > st.caffLimit ? 'var(--bad)' : 'var(--accent)'}"/>
      <rect x="${(x(i) - bw / 2).toFixed(1)}" y="${(H - P - h(r.caffBed)).toFixed(1)}" width="${bw.toFixed(1)}" height="${h(r.caffBed).toFixed(1)}" rx="2" fill="var(--mood)" opacity=".8"/>`).join('')}
    <line x1="${P}" x2="${W - P}" y1="${ly}" y2="${ly}" stroke="var(--muted)" stroke-dasharray="3 3"/>
    <text x="${W - P}" y="${ly - 3}" font-size="10" fill="var(--muted)" text-anchor="end">límite ${st.caffLimit} mg</text>
    <text x="${P}" y="${H - 4}" font-size="10" fill="var(--muted)">${esc(fmtDate(cr[0].k, { day: 'numeric', month: 'short' }))}</text>
    <text x="${W - P}" y="${H - 4}" font-size="10" fill="var(--muted)" text-anchor="end">${esc(fmtDate(cr[n - 1].k, { day: 'numeric', month: 'short' }))}</text>
  </svg>
  <div class="legend"><span><i style="background:var(--accent)"></i>mg en el día</span><span><i style="background:var(--mood)"></i>mg que quedan al dormir</span></div>` : '';

  return `
  <section class="card">
    <h2>☕ Cafeína<span class="sub">${cr.length} días con registro</span></h2>
    <div class="stats">
      <div class="stat"><b>${Math.round(mean(cr.map(r => r.caffMg)))} mg</b><span>Promedio por día</span></div>
      <div class="stat"><b>${Math.round(mean(cr.map(r => r.caffBed)))} mg</b><span>Promedio al dormir</span></div>
      <div class="stat"><b>${cr.filter(r => r.caffMg > st.caffLimit).length} / ${cr.length}</b><span>Días sobre el límite</span></div>
      <div class="stat"><b>${analgDays} / ${cr.length}</b><span>Días con analgésico con cafeína</span></div>
    </div>
    ${chart}
    <h3>De dónde viene tu cafeína</h3>
    <ul class="list">${sources.map(s => `<li><span class="grow">${esc(s.n)} <span class="muted">× ${fmtQ(s.times)}</span></span><span class="muted">${Math.round(s.mg)} mg · ${Math.round(s.mg / total * 100)}%</span></li>`).join('')}</ul>
    ${others.length ? `<h3>🧪 Otros activos: promedio en los días que los tomaste</h3>${others.join('')}` : ''}
    ${analgDays >= 8 ? `<div class="flag bad mt"><span>💊</span><span>Tomaste analgésicos con cafeína ${analgDays} días en este periodo. Usarlos más de 10–15 días al mes puede causar dolor de cabeza por rebote y más cansancio. Vale la pena comentarlo con tu médico.</span></div>` : ''}
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
      <div class="stat"><b>${fmtN(avg(r => r.caffMg) ?? 0, 'mg')} mg</b><span>Cafeína / día</span></div>
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

  return head + stats + nutritionAnalysis(rows) + exerciseAnalysis(rows) + caffeineAnalysis(rows) + factorsCard + recCard + timeOfDayCard(rows) + experimentsCard() + symptomsCard(rows) + suppAdherenceCard(rows) + healthCard();
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
  // Dosis promedio en los días que lo tomaste (convertida a la unidad habitual de cada suplemento)
  const avgDose = list.map(s => {
    const unit = suppDose(s).unit;
    const doses = rows.map(r => suppEntry(S.days[r.k].supps[s])).filter(e => e && e.dose != null && e.dose !== '' && (e.unit || unit) === unit).map(e => +e.dose);
    return doses.length ? [s, mean(doses), unit, `${doses.length} día${doses.length === 1 ? "" : "s"} · máx. ${fmtDose(Math.max(...doses), unit)}`] : null;
  }).filter(Boolean);
  return `<section class="card"><h2>💊 Suplementos</h2>
    <h3>Constancia</h3>
    ${list.map(s => { const n = rows.filter(r => S.days[r.k].supps[s]).length; return `<div class="factor"><div class="top"><b>${esc(s)}</b><span>${n} de ${rows.length} días</span></div><div class="bar"><i style="width:${n / rows.length * 100}%"></i></div></div>`; }).join('')}
    ${suppBars(avgDose.map(([s, d, u]) => [s, d, u]), '🧪 Dosis promedio en los días que lo tomaste', avgDose.map(x => x[3]))}
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
      <label class="f">Cafeína máx. (mg)<input type="number" min="50" step="25" data-setting="caffLimit" value="${st.caffLimit}" style="width:110px"></label>
      <label class="f">Hora habitual de dormir<input type="time" data-setting-str="bedtime" value="${esc(st.bedtime)}"></label>
    </div>
  </section>
  <section class="card">
    <h2>🏋️ Ejercicio</h2>
    <div class="row">
      <label class="f">Tu peso (kg)<input type="number" min="30" max="250" step="0.5" data-setting="weightKg" value="${st.weightKg}" style="width:100px"></label>
      <label class="f">Unidad de pesas<select data-setting-str="liftUnit" style="width:auto">${['kg', 'lb'].map(x => `<option ${x === st.liftUnit ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    </div>
    <p class="muted">Tu peso se usa para estimar las calorías de cada actividad.</p>
    <h3>Mis ejercicios de gimnasio</h3>
    <p class="muted" style="margin-top:0">Se agregan a la lista de ejercicios al registrar Pesas, en el grupo "Mis ejercicios".</p>
    ${st.customLifts.length ? `<ul class="list">${st.customLifts.map(n => `<li><span class="grow">${esc(n)}</span><button class="link danger" data-act="lift-del" data-v="${esc(n)}">Quitar</button></li>`).join('')}</ul>` : ''}
    <div class="row mt"><input class="grow" id="new-lift" placeholder="ej. Press Arnold, Remo T, Hack squat"><button class="primary" data-act="lift-new">Agregar</button></div>
  </section>
  ${caffProductsCard()}
  <section class="card">
    <h2>💊 Mis suplementos</h2>
    <p class="muted" style="margin-top:0">Tu dosis habitual se usa cada vez que marcas el suplemento como tomado.</p>
    <ul class="list">${st.supplements.map(s => { const d = suppDose(s); return `<li style="align-items:center"><span class="grow">${esc(s)}</span>
      <input type="number" min="0" step="any" data-sdose="${esc(s)}" value="${d.dose}" placeholder="dosis" style="width:80px" aria-label="Dosis habitual">
      ${unitSelect('data-sunit', s, d.unit)}
      <button class="link danger" data-act="supp-del" data-v="${esc(s)}">Quitar</button></li>`; }).join('')}</ul>
    <div class="row mt">
      <input class="grow" id="new-supp" placeholder="ej. Hierro, B12, Ashwagandha">
      <input type="number" min="0" step="any" id="new-supp-dose" placeholder="dosis" style="width:80px" aria-label="Dosis">
      <select id="new-supp-unit" style="width:auto" aria-label="Unidad">${SUPP_UNITS.map(u => `<option>${u}</option>`).join('')}</select>
      <button class="primary" data-act="supp-new">Agregar</button>
    </div>
  </section>
  <section class="card">
    <h2>🍽️ Metas de nutrición (por día)</h2>
    <div class="row">${NUTR.map(([key, label, unit]) => `<label class="f">${label} (${unit})<input type="number" min="0" data-nut="${key}" value="${st.nut[key]}" style="width:110px"></label>`).join('')}</div>
    <p class="muted">Referencias generales para un adulto. Si tienes un plan de un nutriólogo, usa sus cifras.</p>
  </section>
  <section class="card" id="custom-foods">
    <h2>🥫 Mis alimentos</h2>
    <p class="muted" style="margin-top:0">Agrega lo que comes seguido y no aparece en el buscador. Los valores vienen en la etiqueta nutrimental.</p>
    ${photoPicker('food')}
    <div class="row mt">
      <label class="f grow">Nombre<input data-draft="food.n" value="${esc(draft.food.n)}" placeholder="ej. Yogur Lala griego"></label>
      <label class="f grow">Porción<input data-draft="food.u" value="${esc(draft.food.u)}" placeholder="ej. 1 vaso, 100 g"></label>
    </div>
    <div class="row mt">${NUTR.map(([, label, unit], i) => `<label class="f">${label} (${unit})<input type="number" min="0" step="any" data-draft="food.v.${i}" value="${esc(draft.food.v[i])}" style="width:100px"></label>`).join('')}</div>
    <button class="primary mt" data-act="food-save">Guardar alimento</button>
    ${S.customFoods.length ? `<ul class="list">${S.customFoods.map((f, i) => `<li><span class="grow"><b>${esc(f.n)}</b> <span class="muted">${esc(f.u)}</span><br><span class="muted">${nutLine(f.v)}</span></span><button class="link danger" data-act="food-del" data-i="${i}">Quitar</button></li>`).join('')}</ul>` : ''}
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

function caffProductsCard() {
  const c = draft.cp;
  return `
  <section class="card" id="caff-products">
    <h2>☕ Mis productos con cafeína</h2>
    <p class="muted" style="margin-top:0">Toma o elige una foto de la etiqueta (fórmula o tabla nutrimental) y la app intentará leer los mg de cafeína y otros ingredientes. Revisa siempre los valores.</p>
    ${photoPicker('cp')}
    <div class="row mt">
      <label class="f grow">Nombre<input data-draft="cp.n" value="${esc(c.n)}" placeholder="ej. Pre-entreno C4"></label>
      <label class="f">Porción<input data-draft="cp.u" value="${esc(c.u)}" placeholder="1 scoop" style="width:120px"></label>
      <label class="f">Cafeína (mg)<input type="number" min="0" step="any" data-draft="cp.mg" value="${esc(c.mg)}" style="width:100px"></label>
    </div>
    <label class="f mt">Otros ingredientes activos (opcional)<input data-draft="cp.other" value="${esc(c.other)}" placeholder="ej. Paracetamol 500 mg, Beta-alanina 1600 mg"></label>
    <div class="row mt">
      <button class="primary" data-act="cp-save">${c.id ? 'Guardar cambios' : 'Guardar producto'}</button>
      ${c.id || c.n || c.photo ? '<button data-act="cp-cancel">Cancelar</button>' : ''}
    </div>
    <ul class="list">${S.caffProducts.map(p => `<li>
      ${p.photo ? `<img class="thumb" src="${p.photo}" alt="">` : ''}
      <span class="grow"><b>${esc(p.n)}</b> <span class="muted">${esc(p.u)} · ${p.mg} mg</span>${p.other ? `<br><span class="muted">${esc(p.other)}</span>` : ''}</span>
      <button class="link" data-act="cp-edit" data-id="${esc(p.id)}">Editar</button>
      <button class="link danger" data-act="cp-del" data-id="${esc(p.id)}">Quitar</button></li>`).join('')}</ul>
    <button class="link mt" data-act="cp-reset">Restaurar productos de inicio</button>
  </section>`;
}

// ---------- Foto de etiqueta + lectura (OCR) ----------
function photoPicker(target) {
  const t = draft[target];
  return `<div class="photo-row">
    <label class="btn">📷 Foto de la etiqueta<input type="file" accept="image/*" data-photo="${target}" hidden></label>
    ${t.photo ? `<img class="thumb" src="${t.photo}" alt="Foto de la etiqueta">` : ''}
    <span class="muted grow" id="ocr-${target}">${esc(t.status)}</span>
  </div>
  ${t.ocr ? `<details class="mt"><summary class="muted">Texto leído de la foto</summary><pre class="ocr">${esc(t.ocr)}</pre></details>` : ''}`;
}

function loadScript(src) {
  return new Promise((ok, fail) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = fail;
    document.head.appendChild(s);
  });
}

// Devuelve una miniatura para guardar y una imagen más grande para leer el texto
async function prepareImage(file) {
  const img = await createImageBitmap(file);
  const draw = max => {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  };
  return { thumb: draw(240).toDataURL('image/jpeg', 0.7), big: draw(1800) };
}

// Busca valores comunes en el texto de una etiqueta (en español)
function parseLabel(text) {
  const t = norm(text).replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, ' ');
  const num = '(\\d+(?:\\.\\d+)?)';
  const find = (re) => { const m = t.match(re); return m ? +m[1] : null; };
  const out = {
    caf: find(new RegExp(`cafeina[^0-9]{0,40}${num}\\s*mg`)),
    kcal: find(new RegExp(`${num}\\s*kcal`)) ?? find(new RegExp(`(?:contenido energetico|energia)[^0-9]{0,30}${num}`)),
    prot: find(new RegExp(`proteinas?[^0-9]{0,25}${num}\\s*g`)),
    carb: find(new RegExp(`(?:carbohidratos|hidratos de carbono)[^0-9]{0,30}${num}\\s*g`)),
    sugar: find(new RegExp(`azucares[^0-9]{0,25}${num}\\s*g`)),
    fat: find(new RegExp(`(?:grasas? totales|lipidos|grasas?)[^0-9]{0,25}${num}\\s*g`)),
    sat: find(new RegExp(`saturadas?[^0-9]{0,25}${num}\\s*g`)),
    fib: find(new RegExp(`fibra[^0-9]{0,25}${num}\\s*g`)),
    na: find(new RegExp(`sodio[^0-9]{0,25}${num}\\s*mg`)),
  };
  const actives = ['paracetamol', 'acetaminofen', 'acido acetilsalicilico', 'fenilefrina', 'taurina', 'beta.?alanina',
    'creatina', '(?:l.?)?teanina', '(?:l.?)?citrulina', '(?:l.?)?arginina', '(?:l.?)?tirosina', 'yohimbina', 'guarana', 'teacrina', 'niacina'];
  out.other = actives.map(a => {
    const m = t.match(new RegExp(`(${a})[^0-9]{0,30}${num}\\s*(mg|g)\\b`));
    return m ? `${m[1].replace(/^./, c => c.toUpperCase())} ${m[3] === 'g' ? +m[2] * 1000 : +m[2]} mg` : null;
  }).filter(Boolean).join(', ');
  return out;
}

async function readLabel(file, target) {
  const t = draft[target];
  const setStatus = s => { t.status = s; const el = document.getElementById('ocr-' + target); if (el) el.textContent = s; };
  let big;
  try {
    const img = await prepareImage(file);
    t.photo = img.thumb; big = img.big;
  } catch (e) { return setStatus('No se pudo abrir la imagen.'); }
  t.ocr = '';
  render();
  setStatus('Leyendo la etiqueta… la primera vez descarga el lector (~10 MB), puede tardar.');
  try {
    await loadScript(TESSERACT_URL);
    const worker = await Tesseract.createWorker('spa');
    const { data } = await worker.recognize(big);
    await worker.terminate();
    const p = parseLabel(data.text);
    t.ocr = data.text.trim();
    // Si no tiene nombre, propone la primera línea con texto
    if (!t.n.trim()) t.n = (t.ocr.split('\n').find(l => /[a-záéíóúñ]{4,}/i.test(l)) || '').trim().slice(0, 40);
    let found = 0;
    if (target === 'cp') {
      if (p.caf != null) { t.mg = String(p.caf); found++; }
      if (p.other) { t.other = p.other; found++; }
    } else {
      ['kcal', 'prot', 'carb', 'sugar', 'fat', 'sat', 'fib', 'na'].forEach((k, i) => { if (p[k] != null) { t.v[i] = String(p[k]); found++; } });
    }
    t.status = found ? `Detecté ${found} valor(es). Revísalos contra la foto antes de guardar.` : 'No encontré valores claros. Captúralos a mano viendo la foto.';
  } catch (e) {
    t.status = 'No se pudo leer la foto (¿sin internet?). La foto quedó guardada; captura los valores a mano.';
  }
  render();
  document.getElementById(target === 'cp' ? 'caff-products' : 'custom-foods')?.scrollIntoView();
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
  const head = ['fecha', 'energia', 'animo', 'checkins', 'sueno_h', 'calidad_sueno', 'despertares', 'agua_l', 'cafeina_tomas', 'cafeina_mg', 'cafeina_al_dormir_mg', 'cafeina_tarde',
    'ejercicio_min', 'ejercicio_kcal', 'sol_min', 'estres', 'alcohol', 'pantallas_noche', 'comidas', 'desayuno', ...MEAL_TAGS.map(t => 'comida_' + t[0]),
    ...supps.map(s => 'sup_' + s), ...NUTR.map(([k, , u]) => `${k}_${u}`), 'sintomas', 'detalle_comidas', 'detalle_cafeina', 'detalle_ejercicio', 'notas'];
  const q = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = Object.keys(S.days).sort().filter(k => hasData(S.days[k])).map(k => {
    const d = S.days[k], m = metrics(k);
    return [k, r1(m.energy), r1(m.mood), d.checkins.length, r1(m.sleepH), m.sleepQ, m.wakeups, r1(m.waterL), m.caffeine, Math.round(m.caffMg), Math.round(m.caffBed), m.lateCaff ? 1 : 0,
      m.exMin, Math.round(m.exKcal), m.sun, m.stress, m.alcohol, d.screens ? 1 : 0, m.meals, m.breakfast == null ? '' : m.breakfast ? 1 : 0,
      ...MEAL_TAGS.map(t => m.tags[t[0]] ?? ''), ...supps.map(s => { const e = suppEntry(d.supps[s]); return e ? (e.dose != null ? `${e.dose} ${e.unit}` : 1) : 0; }), ...NUTR.map((_, i) => m.nut ? r1(m.nut[i]) : ''), d.symptoms.join(' | '),
      sortByTime(d.meals).map(x => `${x.t} ${x.type}: ${x.desc}`).join(' | '),
      sortByTime(d.caffeine).map(x => `${x.t} ${x.kind} ${Math.round(entryMg(x))} mg`).join(' | '),
      sortByTime(d.exercise).map(x => `${x.t} ${x.kind} ${x.min} min${x.sets?.length ? ' (' + groupSets(x.sets).map(([e, s]) => `${e}: ${setsLine(s)}`).join('; ') + ')' : ''}`).join(' | '), d.notes].map(v => q(v === '—' ? '' : v)).join(',');
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
    case 'sec': {
      const ui = (S.ui ||= { open: ['resumen', 'animo'] });
      const i = ui.open.indexOf(v);
      i >= 0 ? ui.open.splice(i, 1) : ui.open.push(v);
      el.closest('.sec').classList.toggle('open', i < 0);
      el.setAttribute('aria-expanded', i < 0);
      save(); return;
    }
    case 'sec-all': (S.ui ||= { open: [] }).open = v === '1' ? HOY_SECTIONS.slice() : []; save(); render(); return;
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
    case 'food-add': {
      const f = lastResults[+el.dataset.i];
      if (!f) return;
      const m = draft.meal;
      const same = m.items.find(it => it.n === f.n && it.u === f.u);
      if (same) same.q += 1; else m.items.push({ n: f.n, u: f.u, q: 1, v: f.v.slice(), fl: f.fl || '' });
      // Etiquetas automáticas según el alimento
      for (const c of f.fl || '') if (FLAG_TAGS[c] && !m.tags.includes(FLAG_TAGS[c])) m.tags.push(FLAG_TAGS[c]);
      const n = sumNut(m.items);
      if (n[1] >= 15 && !m.tags.includes('proteina')) m.tags.push('proteina');
      if (n[0] >= 900 && !m.tags.includes('abundante')) m.tags.push('abundante');
      m.q = '';
      render();
      document.getElementById('meal-search')?.focus();
      return;
    }
    case 'item-q': {
      const it = draft.meal.items[+el.dataset.i];
      it.q = Math.max(0.5, it.q + +v); render(); return;
    }
    case 'item-del': draft.meal.items.splice(+el.dataset.i, 1); render(); return;
    case 'food-new':
      draft.food = { n: draft.meal.q.trim(), u: '1 porción', v: ['', '', '', '', '', '', '', ''] };
      tab = 'ajustes'; render();
      document.getElementById('custom-foods')?.scrollIntoView();
      return;
    case 'food-save': {
      const f = draft.food;
      if (!f.n.trim()) return toast('Ponle nombre al alimento');
      if (f.v[0] === '') return toast('Indica al menos las calorías');
      S.customFoods.push({ n: f.n.trim(), u: f.u.trim() || '1 porción', v: f.v.map(x => +x || 0), fl: '', photo: f.photo || '' });
      draft.food = { n: '', u: '1 porción', v: ['', '', '', '', '', '', '', ''], photo: '', status: '', ocr: '' };
      return commit('Alimento guardado ✓ Ya aparece en el buscador');
    }
    case 'food-del':
      if (confirm('¿Quitar este alimento? (las comidas ya registradas no cambian)')) { S.customFoods.splice(+el.dataset.i, 1); commit(); }
      return;
    case 'meal-add': {
      const m = draft.meal;
      if (!m.desc.trim() && !m.type && !m.items.length) return toast('Busca un alimento o escribe qué comiste');
      const desc = m.desc.trim() || m.items.map(it => `${fmtQ(it.q)} ${it.n}`).join(', ');
      d.meals.push({ id: uid(), t: m.t || nowHM(), type: m.type, desc, tags: m.tags.slice(),
        items: m.items.map(({ n, u, q, v }) => ({ n, u, q, v })) });
      draft.meal = { type: '', tags: [], desc: '', t: '', q: '', items: [] };
      return commit('Comida agregada ✓');
    }

    case 'caff-add': {
      const p = S.caffProducts.find(p => p.id === el.dataset.id);
      if (!p) return;
      d.caffeine.push({ id: uid(), t: draft.caff.t || nowHM(), kind: p.n, u: p.u, mg: p.mg, other: p.other || '' });
      draft.caff.t = '';
      return commit(`${p.n} registrado ✓ (${p.mg} mg)`);
    }
    case 'cp-new':
      draft.cp = { id: '', n: '', u: '1 unidad', mg: '', other: '', photo: '', status: '', ocr: '' };
      tab = 'ajustes'; render();
      document.getElementById('caff-products')?.scrollIntoView();
      return;
    case 'cp-edit': {
      const p = S.caffProducts.find(p => p.id === el.dataset.id);
      draft.cp = { ...p, photo: p.photo || '', status: '', ocr: '' };
      render(); document.getElementById('caff-products')?.scrollIntoView();
      return;
    }
    case 'cp-cancel': draft.cp = { id: '', n: '', u: '1 unidad', mg: '', other: '', photo: '', status: '', ocr: '' }; render(); return;
    case 'cp-save': {
      const c = draft.cp;
      if (!c.n.trim()) return toast('Ponle nombre al producto');
      if (c.mg === '' || !(+c.mg >= 0)) return toast('Indica los mg de cafeína por unidad');
      const p = { id: c.id || uid(), n: c.n.trim(), u: c.u.trim() || '1 unidad', mg: +c.mg, other: c.other.trim(), photo: c.photo || '' };
      const i = S.caffProducts.findIndex(x => x.id === p.id);
      if (i >= 0) S.caffProducts[i] = p; else S.caffProducts.unshift(p);
      draft.cp = { id: '', n: '', u: '1 unidad', mg: '', other: '', photo: '', status: '', ocr: '' };
      return commit('Producto guardado ✓ Ya aparece en Cafeína');
    }
    case 'cp-del':
      if (confirm('¿Quitar este producto? (lo ya registrado no cambia)')) { S.caffProducts = S.caffProducts.filter(p => p.id !== el.dataset.id); commit(); }
      return;
    case 'cp-reset':
      if (confirm('¿Restaurar los productos de inicio? Tus productos propios se conservan.')) {
        const ids = new Set(S.caffProducts.map(p => p.id));
        S.caffProducts.push(...DEFAULT_CAFF.filter(p => !ids.has(p.id)).map(p => ({ ...p })));
        commit('Listo ✓');
      }
      return;

    case 'supp':
      if (d.supps[v]) delete d.supps[v];
      else { const def = suppDose(v); d.supps[v] = { t: nowHM(), dose: def.dose === '' ? null : def.dose, unit: def.unit }; }
      return commit();

    case 'ex-kind': {
      const prev = EX_TYPES.find(t => t.n === draft.ex.kind), next = EX_TYPES.find(t => t.n === v);
      // Los partidos traen sus 40 min; al cambiar de un partido a otra cosa se limpia
      if (next.min && (!draft.ex.min || prev?.min)) draft.ex.min = String(next.min);
      else if (!next.min && prev?.min && +draft.ex.min === prev.min) draft.ex.min = '';
      draft.ex.kind = v; render(); return;
    }
    case 'set-add': {
      const l = draft.ex.lift;
      if (!(+l.reps > 0)) return toast('Indica las repeticiones');
      draft.ex.sets.push({ ex: l.ex, reps: +l.reps, kg: l.kg === '' ? 0 : +l.kg, u: S.settings.liftUnit });
      render(); return; // reps y peso se quedan para registrar la siguiente serie rápido
    }
    case 'set-del': {
      const i = draft.ex.sets.map(s => s.ex).lastIndexOf(v);
      if (i >= 0) draft.ex.sets.splice(i, 1);
      render(); return;
    }
    case 'ex-add': {
      const e = draft.ex;
      if (!(+e.min > 0)) return toast('Indica los minutos');
      if (e.kind === 'Pesas' && (e.lift.reps || e.lift.kg) && !e.sets.length) return toast('Toca "+ Serie" para guardar la serie antes de agregar');
      d.exercise.push({ id: uid(), t: e.t || nowHM(), kind: e.kind, min: +e.min, int: +e.int || 2, ...(e.sets.length ? { sets: e.sets.slice() } : {}) });
      draft.ex = { kind: e.kind, min: EX_TYPES.find(t => t.n === e.kind)?.min ? e.min : '', int: 2, t: '', sets: [], lift: { ex: e.lift.ex, reps: '', kg: '' } };
      return commit('Actividad agregada ✓');
    }

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

    case 'lift-new': {
      const name = document.getElementById('new-lift').value.trim();
      if (!name) return;
      if (S.settings.customLifts.includes(name) || Object.values(LIFTS).flat().includes(name)) return toast('Ese ejercicio ya está en la lista');
      S.settings.customLifts.push(name);
      return commit('Ejercicio agregado ✓');
    }
    case 'lift-del':
      if (confirm(`¿Quitar ${v} de tus ejercicios? (lo ya registrado se conserva)`)) { S.settings.customLifts = S.settings.customLifts.filter(n => n !== v); commit(); }
      return;
    case 'supp-new': {
      const name = document.getElementById('new-supp').value.trim();
      if (!name) return;
      if (S.settings.supplements.includes(name)) return toast('Ya existe');
      S.settings.supplements.push(name);
      const dose = document.getElementById('new-supp-dose').value;
      S.settings.suppDose[name] = { dose: dose === '' ? '' : +dose, unit: document.getElementById('new-supp-unit').value };
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
        S = { days: {}, experiments: [], customFoods: S.customFoods, caffProducts: S.caffProducts, settings: { ...S.settings } }; commit('Datos borrados');
      }
      return;
  }
});

// Enter o espacio sobre un título desplegable lo abre/cierra
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('h2[data-act="sec"]')) { e.preventDefault(); e.target.click(); }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'meal-search') {
    // Solo se actualizan los resultados para no perder el foco del teclado
    draft.meal.q = el.value;
    document.getElementById('food-results').innerHTML = foodResults();
  } else if (el.dataset.draft) {
    setPath(draft, el.dataset.draft, el.value);
    // Actualiza la estimación de calorías sin redibujar (no se pierde el foco)
    if (/^ex\.(min|int)$/.test(el.dataset.draft)) document.getElementById('ex-add-btn').innerHTML = exBtnText();
  }
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
  } else if (el.dataset.suppDose != null || el.dataset.suppUnit != null) {
    // Dosis o unidad de un suplemento tomado hoy
    const s = el.dataset.suppDose ?? el.dataset.suppUnit, d = D();
    const e = suppEntry(d.supps[s]);
    if (!e) return;
    if (el.dataset.suppDose != null) e.dose = el.value === '' ? null : +el.value; else e.unit = el.value;
    d.supps[s] = e; commit();
  } else if (el.dataset.sdose != null || el.dataset.sunit != null) {
    // Dosis habitual en Ajustes
    const s = el.dataset.sdose ?? el.dataset.sunit;
    const cur = (S.settings.suppDose[s] ||= { dose: '', unit: 'mg' });
    if (el.dataset.sdose != null) cur.dose = el.value === '' ? '' : +el.value; else cur.unit = el.value;
    commit('Guardado ✓');
  } else if (el.dataset.settingStr) {
    if (el.value) { S.settings[el.dataset.settingStr] = el.value; commit('Guardado ✓'); }
  } else if (el.dataset.photo && el.files[0]) {
    readLabel(el.files[0], el.dataset.photo);
  } else if (el.dataset.nut) {
    const n = +el.value;
    if (n > 0) { S.settings.nut[el.dataset.nut] = n; commit('Guardado ✓'); }
  } else if (el.id === 'import' && el.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.days) throw new Error();
        if (!confirm('Esto reemplazará tus datos actuales con el respaldo. ¿Continuar?')) return;
        S = { days: data.days, experiments: data.experiments || [], customFoods: data.customFoods || [],
          caffProducts: data.caffProducts || DEFAULT_CAFF.map(p => ({ ...p })),
          settings: { ...DEFAULT_SETTINGS, ...data.settings, nut: { ...DEFAULT_SETTINGS.nut, ...data.settings?.nut } } };
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
