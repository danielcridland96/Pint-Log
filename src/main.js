import './style.css';
import { createClient } from '@supabase/supabase-js';

// The anon key is public by design (it ships to every browser); Row Level Security protects the data.
// Environment variables override these defaults if set.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dpxrzxyvisfxomauhlxp.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRweHJ6eHl2aXNmeG9tYXVobHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTM3NzIsImV4cCI6MjEwODg2OTc3Mn0.SrC45Ld2ERUhzCvmBcoxKcPWmFw_yc2I-lrWOmH-LAk';

const $ = (s) => document.querySelector(s);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  document.body.innerHTML =
    '<div class="wrap" style="padding-top:10vh"><h1>Pint Log</h1><p class="banner">Setup isn\'t finished: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the Vercel project\'s environment variables (or a local .env file), then redeploy.</p></div>';
  throw new Error('Missing Supabase environment variables');
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

/* ---------- drinks ---------- */
const DRINKS = [
  { id: 'lager', name: 'Lager', size: 'Pint', ml: 568, abv: 4.5, pint: 1, cat: 'Beer & cider' },
  { id: 'ale', name: 'Ale / bitter', size: 'Pint', ml: 568, abv: 4.0, pint: 1, cat: 'Beer & cider' },
  { id: 'ipa', name: 'IPA', size: 'Pint', ml: 568, abv: 5.5, pint: 1, cat: 'Beer & cider' },
  { id: 'stout', name: 'Guinness', size: 'Pint', ml: 568, abv: 4.2, pint: 1, cat: 'Beer & cider' },
  { id: 'cider', name: 'Cider', size: 'Pint', ml: 568, abv: 4.5, pint: 1, cat: 'Beer & cider' },
  { id: 'half', name: 'Half', size: 'Half pint', ml: 284, abv: 4.5, pint: 0.5, cat: 'Beer & cider' },
  { id: 'bottle', name: 'Bottle / can', size: '330 ml', ml: 330, abv: 5, pint: 0, cat: 'Beer & cider' },
  { id: 'wine175', name: 'Wine', size: '175 ml glass', ml: 175, abv: 12.5, cat: 'Wine' },
  { id: 'wine250', name: 'Wine', size: '250 ml glass', ml: 250, abv: 12.5, cat: 'Wine' },
  { id: 'fizz', name: 'Prosecco', size: '125 ml', ml: 125, abv: 11, cat: 'Wine' },
  { id: 'single', name: 'Spirit', size: 'Single 25 ml', ml: 25, abv: 40, cat: 'Spirits' },
  { id: 'double', name: 'Spirit', size: 'Double 50 ml', ml: 50, abv: 40, cat: 'Spirits' },
  { id: 'cocktail', name: 'Cocktail', size: 'Typical', ml: 200, abv: 10, cat: 'Cocktails' },
  { id: 'af', name: 'Alcohol-free', size: 'Pint', ml: 568, abv: 0, pint: 0, cat: 'Alcohol-free' },
  { id: 'custom', name: 'Other', size: 'Custom', ml: 330, abv: 5, pint: 0, cat: 'Other' },
];
const QUICK = ['lager', 'ale', 'ipa', 'stout', 'cider', 'half', 'bottle', 'wine175', 'wine250', 'fizz', 'single', 'double', 'cocktail', 'af'];
const D = Object.fromEntries(DRINKS.map((d) => [d.id, d]));
const SHIFT = 5 * 3600e3, DAY = 864e5;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const units = (ml, abv) => Math.round((ml * abv) / 100) / 10; // UK units = ml × ABV% ÷ 1000, to 1dp
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const money = (n) => '£' + (n || 0).toFixed(2);
const nightOf = (ts) => { const d = new Date(ts - SHIFT); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const keyOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const weekStart = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const hm = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayName = (d) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
const pintsOf = (e) => (D[e.type] && D[e.type].pint) || 0;
const labelOf = (e) => e.label || (D[e.type] ? D[e.type].name : 'Drink');
const sizeOf = (e) => e.size || (D[e.type] ? D[e.type].size : '');
const fmtPints = (p) => (p % 1 ? p.toFixed(1) : String(p));

/* ---------- store (Supabase) ---------- */
let entries = [];
let user = null;
const fromRow = (r) => ({ id: r.id, type: r.type, label: r.label, size: r.size, ml: +r.ml, abv: +r.abv, units: +r.units, price: +r.price, note: r.note || '', at: new Date(r.at).getTime() });
const toRow = (e) => ({ type: e.type, label: e.label, size: e.size, ml: e.ml, abv: e.abv, units: e.units, price: e.price || 0, note: e.note || '', at: new Date(e.at).toISOString() });
const sortE = () => entries.sort((a, b) => b.at - a.at);

function banner(msg) { const b = $('#banner'); b.textContent = msg || ''; b.hidden = !msg; }

async function loadEntries() {
  const { data, error } = await sb.from('drinks').select('*').order('at', { ascending: false }).limit(5000);
  if (error) { banner("Couldn't load your drinks. Check your connection and pull to refresh."); return; }
  banner('');
  entries = data.map(fromRow);
  render();
}
async function addE(e) {
  const tmp = 'tmp-' + Math.random().toString(36).slice(2);
  entries.push({ id: tmp, ...e }); sortE(); render();
  const { data, error } = await sb.from('drinks').insert(toRow(e)).select().single();
  entries = entries.filter((x) => x.id !== tmp);
  if (error) { render(); banner("That drink didn't save. Check your connection and try again."); return null; }
  entries.push(fromRow(data)); sortE(); render();
  return data.id;
}
async function setE(id, e) {
  const i = entries.findIndex((x) => x.id === id); const prev = entries[i];
  if (i >= 0) entries[i] = { id, ...e }; sortE(); render();
  const { error } = await sb.from('drinks').update(toRow(e)).eq('id', id);
  if (error) { if (prev) { entries[entries.findIndex((x) => x.id === id)] = prev; sortE(); render(); } banner("That change didn't save. Try again."); }
}
async function delE(id) {
  const prev = entries.find((x) => x.id === id);
  entries = entries.filter((x) => x.id !== id); render();
  const { error } = await sb.from('drinks').delete().eq('id', id);
  if (error) { if (prev) { entries.push(prev); sortE(); render(); } banner("Couldn't delete that drink. Try again."); }
}

/* ---------- auth ---------- */
// Email + password. "Create account" goes through the pl_register database function,
// so no confirmation email is ever sent.
function authErr(msg) { $('#authErr').textContent = msg || ''; }
let authMode = 'in';
function setAuthMode(m) {
  authMode = m; const up = m === 'up';
  $('#modeIn').setAttribute('aria-pressed', String(!up)); $('#modeUp').setAttribute('aria-pressed', String(up));
  $('#authIntro').textContent = up ? 'Pick a password (6+ characters) and your log is set up straight away.' : 'Welcome back. Sign in with your email and password.';
  $('#password').placeholder = up ? 'Choose a password' : 'Password';
  $('#password').autocomplete = up ? 'new-password' : 'current-password';
  $('#password2').hidden = !up; $('#password2').required = up;
  $('#authBtn').textContent = up ? 'Create account' : 'Sign in';
  authErr('');
}
$('#modeIn').onclick = () => setAuthMode('in');
$('#modeUp').onclick = () => setAuthMode('up');

$('#authForm').onsubmit = async (ev) => {
  ev.preventDefault();
  const email = $('#email').value.trim().toLowerCase();
  const password = $('#password').value;
  const btn = $('#authBtn'); const label = btn.textContent;
  if (!email || password.length < 6) { authErr('Enter your email and a password of at least 6 characters.'); return; }
  if (authMode === 'up' && password !== $('#password2').value) { authErr("The two passwords don't match."); return; }
  btn.disabled = true; btn.textContent = authMode === 'up' ? 'Creating…' : 'Signing in…'; authErr('');
  try {
    if (authMode === 'up') {
      const { data: result, error: regErr } = await sb.rpc('pl_register', { p_email: email, p_password: password });
      if (regErr) { authErr(/invalid_email/.test(regErr.message) ? "That email address doesn't look right." : "Couldn't create your account. Try again."); return; }
      if (result === 'exists') { setAuthMode('in'); authErr('There is already an account for this email. Sign in with its password.'); return; }
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 429) authErr('Too many attempts. Wait a minute and try again.');
      else if (authMode === 'in' && (error.code === 'invalid_credentials' || error.status === 400)) authErr("Email or password isn't right. New here? Tap Create account.");
      else authErr("Couldn't sign in: " + error.message);
    }
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
};
$('#signOutBtn').onclick = async () => { await sb.auth.signOut(); };

function setUser(u) {
  const changed = (u && u.id) !== (user && user.id);
  user = u;
  $('#v-auth').hidden = !!u; $('#app').hidden = !u; $('#tabs').hidden = !u;
  if (!u) { entries = []; $('#password').value = ''; return; }
  $('#whoami').textContent = 'Signed in as ' + (u.email || '');
  if (changed) { entries = []; render(); loadEntries(); }
}
sb.auth.onAuthStateChange((_evt, session) => setUser(session ? session.user : null));
sb.auth.getSession().then(({ data }) => setUser(data.session ? data.session.user : null));
document.addEventListener('visibilitychange', () => { if (!document.hidden && user) loadEntries(); });

/* ---------- logging ---------- */
function lastPrice(type) { const e = entries.find((x) => x.type === type && x.price > 0); return e ? e.price : 0; }
function makeEntry(type, o = {}) {
  const d = D[type]; const ml = o.ml ?? d.ml, abv = o.abv ?? d.abv;
  return { type, label: o.label || d.name, size: o.size || d.size, ml: +ml, abv: +abv, units: units(ml, abv), price: +(o.price ?? lastPrice(type)) || 0, note: o.note || '', at: o.at || Date.now() };
}
async function quick(type, btn) {
  if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 250); }
  const e = makeEntry(type); const id = await addE(e);
  if (id) toast(`${e.size === 'Pint' ? 'Pint of ' + e.label.toLowerCase() : e.label + ' · ' + e.size} logged · ${f1(e.units)} u`, () => delE(id));
}
let toastT;
function toast(msg, undo) {
  clearTimeout(toastT); const h = $('#toastHost');
  h.innerHTML = `<div class="toast" role="status"><span>${esc(msg)}</span>${undo ? '<button id="undoBtn">Undo</button>' : ''}</div>`;
  if (undo) $('#undoBtn').onclick = () => { undo(); h.innerHTML = ''; toast('Removed'); };
  toastT = setTimeout(() => (h.innerHTML = ''), undo ? 6000 : 2000);
}

/* ---------- sheet (add / edit) ---------- */
function toLocalInput(ts) { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function openSheet(existing) {
  const e = existing || makeEntry('lager');
  const opts = DRINKS.map((d) => `<option value="${d.id}" ${d.id === e.type ? 'selected' : ''}>${esc(d.name)} · ${esc(d.size)}</option>`).join('');
  $('#sheetHost').innerHTML = `<div class="scrim" id="scrim"><form class="sheet" id="form" aria-label="${existing ? 'Edit drink' : 'Add a drink'}">
    <div class="top"><h2>${existing ? 'Edit drink' : 'Add a drink'}</h2><span class="num" id="fUnits" style="color:var(--amber)"></span></div>
    <div class="fields">
      <label class="f full">Drink<select id="fType">${opts}</select></label>
      <label class="f full">Name<input id="fLabel" value="${esc(e.label)}" placeholder="e.g. Guinness, Neck Oil"></label>
      <label class="f">Volume (ml)<input id="fMl" type="number" inputmode="decimal" min="0" step="1" value="${e.ml}"></label>
      <label class="f">Strength (% ABV)<input id="fAbv" type="number" inputmode="decimal" min="0" max="100" step="0.1" value="${e.abv}"></label>
      <label class="f">Price (£)<input id="fPrice" type="number" inputmode="decimal" min="0" step="0.01" value="${e.price || ''}" placeholder="optional"></label>
      <label class="f">When<input id="fAt" type="datetime-local" value="${toLocalInput(e.at)}"></label>
      <label class="f full">Note<input id="fNote" value="${esc(e.note)}" placeholder="pub, occasion… (optional)"></label>
    </div>
    <div id="confirmArea"></div>
    <div class="actions">${existing ? '<button type="button" class="btn danger" id="fDel">Delete</button>' : ''}<span class="sp"></span><button type="button" class="btn" id="fCancel">Cancel</button><button type="submit" class="btn primary">${existing ? 'Save' : 'Log drink'}</button></div>
  </form></div>`;
  const upd = () => ($('#fUnits').textContent = f1(units(+$('#fMl').value || 0, +$('#fAbv').value || 0)) + ' units');
  $('#fType').onchange = () => { const d = D[$('#fType').value]; $('#fMl').value = d.ml; $('#fAbv').value = d.abv; $('#fLabel').value = d.name; const p = lastPrice(d.id); $('#fPrice').value = p || ''; upd(); };
  $('#fMl').oninput = upd; $('#fAbv').oninput = upd; upd();
  const close = () => ($('#sheetHost').innerHTML = '');
  $('#fCancel').onclick = close;
  $('#scrim').onclick = (ev) => { if (ev.target.id === 'scrim') close(); };
  if (existing) $('#fDel').onclick = () => {
    $('#confirmArea').innerHTML = '<div class="confirm"><span>Delete this drink?</span><button type="button" class="btn danger" id="fDelYes">Delete</button><button type="button" class="btn" id="fDelNo">Keep</button></div>';
    $('#fDelYes').onclick = () => { delE(existing.id); close(); toast('Deleted'); };
    $('#fDelNo').onclick = () => ($('#confirmArea').innerHTML = '');
  };
  $('#form').onsubmit = async (ev) => {
    ev.preventDefault();
    const t = $('#fType').value, d = D[t]; const at = new Date($('#fAt').value).getTime() || Date.now();
    const ml = +$('#fMl').value || 0, abv = +$('#fAbv').value || 0;
    const ne = { type: t, label: $('#fLabel').value.trim() || d.name, size: ml === d.ml ? d.size : ml + ' ml', ml, abv, units: units(ml, abv), price: +$('#fPrice').value || 0, note: $('#fNote').value.trim(), at };
    close();
    if (existing) { await setE(existing.id, ne); toast('Saved'); }
    else { const id = await addE(ne); if (id) toast(`${ne.label} logged · ${f1(ne.units)} u`, () => delE(id)); }
  };
}

/* ---------- tabs ---------- */
let tab = 'log';
function show(t) {
  tab = t;
  ['log', 'report', 'history'].forEach((x) => ($('#v-' + x).hidden = x !== t));
  document.querySelectorAll('nav.tabs button').forEach((b) => (b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  window.scrollTo(0, 0); render();
}
const hashTab = () => (['report', 'history'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'log');
document.querySelectorAll('nav.tabs button').forEach((b) => (b.onclick = () => {
  if (b.dataset.tab === 'log') history.replaceState(null, '', location.pathname); else location.hash = b.dataset.tab;
  show(b.dataset.tab);
}));
window.addEventListener('hashchange', () => show(hashTab()));

/* ---------- aggregation ---------- */
const sum = (list) => list.reduce((a, e) => ({ n: a.n + 1, u: a.u + (e.units || 0), p: a.p + pintsOf(e), s: a.s + (e.price || 0) }), { n: 0, u: 0, p: 0, s: 0 });
const inRange = (a, b) => entries.filter((e) => { const n = nightOf(e.at).getTime(); return n >= a && n < b; });
const rowHtml = (e) => `<button class="row" data-id="${e.id}"><span class="t num">${hm(e.at)}</span><span class="d"><b>${esc(labelOf(e))}</b><small>${esc(sizeOf(e))}${e.abv ? ' · ' + e.abv + '%' : ''}${e.note ? ' · ' + esc(e.note) : ''}</small></span><span class="r"><span class="num">${f1(e.units)} u</span>${e.price ? '<br><span class="muted num">' + money(e.price) + '</span>' : ''}</span></button>`;
function bindRows(root) { root.querySelectorAll('.row[data-id]').forEach((r) => (r.onclick = () => { const e = entries.find((x) => x.id === r.dataset.id); if (e && !String(e.id).startsWith('tmp-')) openSheet(e); })); }

/* ---------- render: log ---------- */
function renderLog() {
  const tonight = nightOf(Date.now()); const t0 = tonight.getTime();
  $('#nightLabel').textContent = dayName(tonight);
  const tl = inRange(t0, t0 + DAY); const s = sum(tl);
  $('#matCount').textContent = s.n; $('#tUnits').textContent = f1(s.u); $('#tPints').textContent = fmtPints(s.p); $('#tSpend').textContent = money(s.s);
  const ws = weekStart(tonight).getTime(); const wu = sum(inRange(ws, ws + 7 * DAY)).u;
  $('#wUnits').textContent = f1(wu); const m = $('#wMeter'); m.firstElementChild.style.width = Math.min(100, (wu / 14) * 100) + '%';
  m.classList.toggle('over', wu > 14); m.classList.toggle('near', wu > 10.5 && wu <= 14);
  const counts = {}; tl.forEach((e) => (counts[e.type] = (counts[e.type] || 0) + 1));
  $('#quick').innerHTML = QUICK.map((id) => { const d = D[id]; return `<button class="q ${d.pint === 1 ? 'pint' : ''}" data-q="${id}" aria-label="Log ${esc(d.name)} ${esc(d.size)}">${counts[id] ? '<span class="cnt num">×' + counts[id] + '</span>' : ''}<span class="nm">${esc(d.name)}</span><span class="sz">${esc(d.size)}</span><span class="u num">${f1(units(d.ml, d.abv))} u</span></button>`; }).join('');
  document.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => quick(b.dataset.q, b)));
  const L = $('#tonightList');
  L.innerHTML = tl.length ? tl.map(rowHtml).join('') : '<div class="empty">Nothing yet tonight. Tap a drink above when you order it, and it lands here with the time.</div>';
  bindRows(L);
}

/* ---------- render: report ---------- */
let period = 'week';
const PERIODS = [['night', 'Tonight'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['all', 'All time']];
function periodRange(p) {
  const t = nightOf(Date.now()); let a;
  if (p === 'night') a = t; else if (p === 'week') a = weekStart(t); else if (p === 'month') a = new Date(t.getFullYear(), t.getMonth(), 1);
  else if (p === 'year') a = new Date(t.getFullYear(), 0, 1); else a = entries.length ? nightOf(entries[entries.length - 1].at) : t;
  return [a.getTime(), t.getTime() + DAY];
}
function renderReport() {
  $('#periodSeg').innerHTML = PERIODS.map(([k, l]) => `<button data-p="${k}" aria-pressed="${k === period}">${l}</button>`).join('');
  document.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { period = b.dataset.p; renderReport(); }));
  const [a, b] = periodRange(period); const list = inRange(a, b); const s = sum(list);
  const days = Math.max(1, Math.round((b - a) / DAY)); const nights = new Set(list.map((e) => keyOf(nightOf(e.at)))).size;
  const perWeek = days >= 7 ? (s.u / days) * 7 : null;
  const tiles = [
    [s.n, 'Drinks'], [fmtPints(s.p), 'Pints'], [f1(s.u), 'Units'], [money(s.s), 'Spent'],
    [period === 'night' ? (s.n ? f1(s.u / s.n) : '0.0') : days - nights, period === 'night' ? 'Units per drink' : 'Dry days'],
    [perWeek == null ? nights : f1(perWeek), perWeek == null ? 'Nights out' : 'Units / week avg'],
  ];
  $('#tiles').innerHTML = tiles.map(([v, k]) => `<div class="tile"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
  const ws = weekStart(nightOf(Date.now())).getTime(); const weeks = [];
  for (let i = 11; i >= 0; i--) { const st = ws - i * 7 * DAY; weeks.push({ st, u: sum(inRange(st, st + 7 * DAY)).u }); }
  $('#weekChart').innerHTML = barChart(weeks.map((w) => ({ v: w.u, l: new Date(w.st).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) })), { guide: 14, labelEvery: 3, hiLast: true });
  const cats = {}; list.forEach((e) => { const c = (D[e.type] || D.custom).cat; (cats[c] = cats[c] || { n: 0, u: 0 }); cats[c].n++; cats[c].u += e.units || 0; });
  const cl = Object.entries(cats).sort((x, y) => y[1].u - x[1].u || y[1].n - x[1].n); const mx = Math.max(1e-9, ...cl.map((c) => c[1].u));
  $('#cats').innerHTML = cl.length ? cl.map(([k, v]) => `<div class="cat"><span>${esc(k)}</span><span class="bar"><span style="width:${(v.u / mx) * 100}%"></span></span><span class="num">${v.n} · ${f1(v.u)} u</span></div>`).join('') : '<div class="empty">No drinks in this period.</div>';
  const dow = [0, 0, 0, 0, 0, 0, 0]; list.forEach((e) => { dow[(nightOf(e.at).getDay() + 6) % 7] += e.units || 0; });
  $('#dowChart').innerHTML = barChart(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((l, i) => ({ v: dow[i], l })), { labelEvery: 1 });
}
function niceMax(v) { if (v <= 0) return 4; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function barChart(data, o) {
  const W = 340, H = 170, L = 26, R = 8, T = 12, B = 22, iw = W - L - R, ih = H - T - B;
  const max = niceMax(Math.max(o.guide ? o.guide * 1.15 : 0, ...data.map((d) => d.v)));
  const y = (v) => T + ih - (v / max) * ih, bw = iw / data.length;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">`;
  [0, max / 2, max].forEach((t) => { s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 5}" y="${y(t) + 3}" text-anchor="end">${+t.toFixed(1)}</text>`; });
  data.forEach((d, i) => {
    const h = Math.max(0, ih - (y(d.v) - T)); const x = L + i * bw + bw * 0.18, w = bw * 0.64;
    const over = o.guide && d.v > o.guide; const last = o.hiLast && i === data.length - 1;
    const fill = over ? 'var(--bad)' : last ? 'var(--amber)' : 'var(--malt)';
    if (d.v > 0) s += `<rect x="${x}" y="${y(d.v)}" width="${w}" height="${h}" rx="3" fill="${fill}" opacity="${o.hiLast && !last && !over ? 0.75 : 1}"><title>${d.l}: ${f1(d.v)} units</title></rect>`;
    if (i % o.labelEvery === (o.labelEvery > 1 ? (data.length - 1) % o.labelEvery : 0)) s += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${d.l}</text>`;
  });
  if (o.guide) s += `<line x1="${L}" x2="${W - R}" y1="${y(o.guide)}" y2="${y(o.guide)}" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="4 3"/><text x="${W - R}" y="${y(o.guide) - 4}" text-anchor="end" style="fill:var(--ink)">14 units</text>`;
  return s + '</svg>';
}

/* ---------- render: history ---------- */
function renderHistory() {
  $('#histCount').textContent = entries.length ? entries.length + ' drinks logged' : '';
  if (!entries.length) { $('#history').innerHTML = '<div class="list"><div class="empty">Your drinks will be listed here by night. Head to Log and tap one to start.</div></div>'; return; }
  const groups = []; let cur = null;
  entries.forEach((e) => { const k = keyOf(nightOf(e.at)); if (!cur || cur.k !== k) { cur = { k, d: nightOf(e.at), list: [] }; groups.push(cur); } cur.list.push(e); });
  $('#history').innerHTML = groups.slice(0, 120).map((g) => { const s = sum(g.list); return `<div><div class="dayhead"><h2>${dayName(g.d)}</h2><span class="note num">${s.n} · ${f1(s.u)} u${s.s ? ' · ' + money(s.s) : ''}</span></div><div class="list">${g.list.slice().reverse().map(rowHtml).join('')}</div></div>`; }).join('');
  bindRows($('#history'));
}

/* ---------- export ---------- */
$('#csvBtn').onclick = () => {
  if (!entries.length) { toast('Nothing to export yet'); return; }
  const q = (v) => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const rows = [['Night', 'Date', 'Time', 'Drink', 'Size', 'ml', 'ABV %', 'Units', 'Price £', 'Note']].concat(
    entries.slice().reverse().map((e) => [keyOf(nightOf(e.at)), keyOf(new Date(e.at)), hm(e.at), labelOf(e), sizeOf(e), e.ml, e.abv, f1(e.units), (e.price || 0).toFixed(2), e.note || '']));
  const blob = new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pint-log-' + keyOf(new Date()) + '.csv';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/* ---------- boot ---------- */
function render() { if (!user) return; if (tab === 'log') renderLog(); else if (tab === 'report') renderReport(); else renderHistory(); }
$('#otherBtn').onclick = () => openSheet(null);
show(hashTab());
setInterval(() => { if (user && tab === 'log' && !document.querySelector('.scrim')) renderLog(); }, 60000);
