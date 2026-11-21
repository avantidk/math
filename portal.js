/* अंक-IT · Mathematics Dashboard · account pages, tests and results.
   Everything here reads and writes Supabase (tables with row-level security, and database functions).
   Routes (address bar hash):
     #/profile  #/membership  #/tests  #/reports  #/report/<attempt>  #/t/<code> (take a test)
     #/create  #/edit/<test>  #/my-tests  #/results/<test>  #/worksheets */
(function () {
'use strict';
const h = window.AvantiUtil.h;
const AU = () => window.AvantiAuth;
const TE = () => window.AvantiTeacher;
const sb = () => AU().sb;
/* Page loads: if the user opens another page while one is still loading, the old one stops quietly instead of drawing over
   the new page (STALE). Clicks and saves after a page has loaded are never affected. */
let NAV = 0, LOADING = 0;
const STALE = new Error('stale page');
async function fresh(p) { const tok = NAV, during = LOADING === tok; const r = await p; if (during && tok !== NAV) throw STALE; return r; }
const rpc = (n, a) => fresh(AU().rpc(n, a));
const $ = (s, r) => (r || document).querySelector(s);
function toast(m) { if (TE()) TE().toast(m); else window.alert(m); }
const esc = window.AvantiUtil.esc;
const num = (v, d) => (v == null || isNaN(v) ? '—' : (+v).toFixed(d == null ? 0 : d).replace(/\.0+$/, ''));
const pct = v => (v == null ? '—' : num(v, 1) + '%');
const mmss = s => (s == null ? '—' : Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0'));
const when = d => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const day = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const testLink = code => location.origin + location.pathname + '#/t/' + code;
const CLASSES = ['11', '12', 'Dropper'];
const STREAMS = ['JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)'];
const sessionFor = c => { const d = new Date(); d.setMonth(d.getMonth() - 3); const y = d.getFullYear(); return c === '11' ? y + '-' + String((y + 2) % 100).padStart(2, '0') : c ? y + '-' + String((y + 1) % 100).padStart(2, '0') : ''; };
const SESSIONS = (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); const y = d.getFullYear(), out = []; for (let k = y - 2; k <= y + 1; k++) { out.push(k + '-' + String((k + 1) % 100).padStart(2, '0'), k + '-' + String((k + 2) % 100).padStart(2, '0')); } return [...new Set(out)].sort().reverse(); })();
/* common spellings in uploads: 11th, XI, Class 12, PCM, NEET ... */
const normClass = v => { const t = String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return /^(11|11th|xi|class11|class11th|classxi|eleven|eleventh)$/.test(t) ? '11' : /^(12|12th|xii|class12|class12th|classxii|twelve|twelfth)$/.test(t) ? '12' : /^(dropper|drop|droppers|repeater|repeaters)$/.test(t.replace(/[0-9]/g, '')) ? 'Dropper' : String(v || '').trim(); };
const normCategory = v => { const t = String(v || '').toLowerCase().replace(/[^a-z]/g, ''); return /^(general|gen|gn|ur|open|oc|unreserved)$/.test(t) ? 'General' : /^(ews|genews|generalews|gnews|urews|economicallyweakersection)$/.test(t) ? 'Gen-EWS' : /^(obc|obcncl|obcnoncreamylayer|bc|obcn)$/.test(t) ? 'OBC-NCL' : /^(sc|scheduledcaste)$/.test(t) ? 'SC' : /^(st|scheduledtribe)$/.test(t) ? 'ST' : String(v || '').trim(); };
const normGender = v => { const t = String(v || '').toLowerCase().replace(/[^a-z]/g, ''); return /^(female|f|girl|woman)$/.test(t) ? 'Female' : /^(male|m|boy|man)$/.test(t) ? 'Male' : /^(other|o|transgender|thirdgender)$/.test(t) ? 'Other' : /^(prefernottosay|notsay|na|notspecified)$/.test(t) ? 'Other' : String(v || '').trim(); };
const normStream = v => { const t = String(v || '').toLowerCase().replace(/[^a-z]/g, ''); return /^(jee|pcm|pcmb|jeemain|jeemains|jeeadvanced|engineering|iit|iitjee)$/.test(t) ? 'JEE' : /^(neet|pcb|medical|neetug)$/.test(t) ? 'NEET' : /^(kcetpcm|kcet|cetpcm|kcetengineering)$/.test(t) ? 'KCET (PCM)' : /^(kcetpcb|cetpcb|kcetmedical)$/.test(t) ? 'KCET (PCB)' : String(v || '').trim(); };
const CATEGORIES = ['General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST'];
const GENDERS = ['Male', 'Female', 'Other'];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/* ---------- maths ---------- */
let katexP = null;
function ensureKatex() {
  if (!katexP) {
    const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
    katexP = window.AvantiBoot.katex()
      .then(() => (window.renderMathInElement ? null : load('vendor/katex-auto-render-0.16.9.min.js')))
      .then(() => { if (!document.getElementById('kcss')) return fetch('katex.css').then(r => r.text()).then(c => { if (!document.getElementById('kcss')) { const st = h('style', { text: c }); st.id = 'kcss'; document.head.append(st); } }); })
      .catch(() => { katexP = null; });
  }
  return katexP || Promise.resolve();
}
function mathIn(node) {
  return ensureKatex().then(() => {
    if (!window.renderMathInElement) return;
    try { window.renderMathInElement(node, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) { /* raw text stays */ }
  });
}
const qText = t => esc(t).replace(/[ \t]*\n[ \t]*(\\\[)/g, '$1').replace(/(\\\])[ \t]*\n[ \t]*/g, '$1').replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');   /* **bold** in question text */
function figure(f) {
  if (!f || !f.svg) return null;
  return h('img', { class: 'pt-fig', alt: 'Figure', src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.svg) });
}

/* ---------- page frame ---------- */
function view() { return $('#viewPortal'); }
function show(...nodes) {
  const v = view(); if (!v) return null;
  if (TE()) TE().hideViews();
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  v.hidden = false; v.textContent = ''; v.append(...nodes.filter(Boolean));
  v.classList.toggle('pt-full', /^#\/students?\b/.test(location.hash));   /* My Students: wide tables use the whole width */
  window.scrollTo(0, 0);
  return v;
}
function head(title, sub, ...actions) {
  return h('div', { class: 'pt-head' }, h('div', {}, h('h1', { text: title }), sub ? h('p', { class: 'pt-sub', text: sub }) : null), actions.length ? h('div', { class: 'pt-actions' }, actions) : null);
}
const loading = t => h('div', { class: 'pt-state' }, h('div', { class: 'spin' }), h('p', { text: t || 'Loading…' }));
function errorBox(msg, retry) {
  return h('div', { class: 'pt-state pt-bad', role: 'alert' }, h('p', { class: 'pt-st-t', text: 'Something went wrong' }), h('p', { text: msg }),
    retry ? h('button', { type: 'button', class: 'btn', text: 'Try again', onclick: retry }) : null);
}
const empty = (title, text, ...act) => h('div', { class: 'pt-state' }, h('p', { class: 'pt-st-t', text: title }), text ? h('p', { text }) : null, act.length ? h('div', { class: 'pt-actions' }, act) : null);
const card = (...kids) => h('section', { class: 'pt-card' }, ...kids);
const link = (href, text, cls) => h('a', { class: cls || 'btn', href, text });
function stat(label, value, sub) { return h('div', { class: 'pt-stat' }, h('span', { class: 'pt-stat-l', text: label }), h('strong', { text: value }), sub ? h('span', { class: 'pt-stat-s', text: sub }) : null); }
function badge(text, kind) { return h('span', { class: 'pt-badge' + (kind ? ' pt-b-' + kind : ''), text }); }
function bar(p, kind) { return h('span', { class: 'pt-bar' }, h('span', { class: 'pt-bar-f' + (kind ? ' ' + kind : ''), style: 'width:' + Math.max(0, Math.min(100, p || 0)) + '%' })); }
function modal(title, body, buttons) {
  const back = h('div', { class: 'pt-modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  back.append(h('div', { class: 'pt-modal' }, h('h2', { text: title }), body, h('div', { class: 'pt-actions' }, (buttons || []).map(b => h('button', { type: 'button', class: 'btn' + (b.pri ? ' pri' : '') + (b.bad ? ' pt-danger' : ''), text: b.text, onclick: () => { if (b.onclick(close) !== false) close(); } })))));
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  const f = back.querySelector('input,select,textarea,button.pri'); if (f) f.focus();
  return close;
}
function confirmBox(title, text, okText, bad) { return new Promise(res => modal(title, h('p', { text }), [{ text: 'Cancel', onclick: () => res(false) }, { text: okText, pri: !bad, bad, onclick: () => res(true) }])); }
function promptBox(title, label, value) {
  return new Promise(res => {
    const inp = h('input', { type: 'text', class: 'pt-in', value: value || '', maxlength: 200 });
    modal(title, h('label', { class: 'pt-fld' }, h('span', { text: label }), inp), [{ text: 'Cancel', onclick: () => res(null) }, { text: 'Save', pri: true, onclick: () => { const v = inp.value.trim(); if (!v) { inp.focus(); return false; } res(v); } }]);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.closest('.pt-modal').querySelector('.btn.pri').click(); } });
  });
}
async function copy(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg || 'Copied'); }
  catch (e) { promptBox('Copy this link', 'Select and copy', text); }
}
function nope(title, text) { show(card(empty(title, text, link('#/membership', 'Upgrade to Premium', 'btn pt-gold')))); }
const P = () => AU().profile || {};
const can = k => !!(AU().perm && AU().perm[k]);

/* ---------- router ---------- */
let curRoute = '';
function route() {
  if (!AU() || !AU().profile || !view()) return;
  const m = location.hash.match(/^#\/([a-z-]+)(?:\/([^?]+))?/);
  if (!m) { if (curRoute) { curRoute = ''; leave(true); } return; }
  const r = m[1], arg = m[2] ? decodeURIComponent(m[2]) : '';
  if (r === 'home') return;   /* the public home page: auth.js switches the view, nothing to draw here */
  if (r !== 't') exitExam();
  curRoute = location.hash;
  const pages = { profile: pageProfile, membership: pageMembership, tests: pageAvailable, reports: pageReports, report: pageReport, t: pageTake,
    create: pageCreate, edit: pageCreate, students: pageStudents, student: pageStudent, personal: pagePersonal, modes: pageModes, school: pageSchool, 'add-student': pageAddStudent, help: pageHelp, approvals: pageApprovals, 'my-tests': pageMyTests, results: pageResults, worksheets: pageWorksheets, 'ws-edit': pageWsEdit };
  const fn = pages[r];
  if (!fn) { leave(); return; }
  const tok = ++NAV; LOADING = tok;
  Promise.resolve(fn(arg, r)).catch(e => { if (e !== STALE && tok === NAV) show(errorBox(e.message || String(e), route)); })
    .finally(() => { if (LOADING === tok) LOADING = 0; });
}
function leave(keepTab) {
  ++NAV;   /* any page still loading must not draw over what the user opened now */
  if (/^#\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  curRoute = '';
  const v = view(); if (v) { v.hidden = true; v.textContent = ''; }
  if (keepTab === true && TE()) TE().setTab('qb');
}
window.addEventListener('hashchange', route);

/* ---------- Edit profile ---------- */
let SCHOOLS_P = null;
function schools(fresh) { if (!SCHOOLS_P || fresh) SCHOOLS_P = rpc('list_schools').catch(e => { SCHOOLS_P = null; throw e; }); return SCHOOLS_P; }
const OTHER = '__other__';
/* School dropdown from the database. With allowOther, a teacher can pick "Other" and type a school that is not on the list. */
/* School picker: one dropdown; the search box appears inside it when it is opened. A hidden <select> keeps the value. */
/* "Not Working": a built-in choice for teachers who are not at any school now. It is always the last school in the list for
   teachers (and the admin's teacher boxes) and never offered for students (the server refuses it for students too). */
const NOT_WORKING = 'Not Working';
const isNotWorking = v => String(v || '').trim().toLowerCase() === NOT_WORKING.toLowerCase();
const NO_SCHOOL = 'Not in School';
const isNoSchool = v => String(v || '').trim().toLowerCase() === NO_SCHOOL.toLowerCase();
const isBuiltin = v => isNotWorking(v) || isNoSchool(v);   /* the two built-in schools need no approval */
function schoolSelect(id, val, first, allowOther, opt) {
  const withNW = !!(opt && opt.notWorking), withNS = !!(opt && opt.noSchool);
  const s = h('select', { id: id + 'Value', hidden: true, tabindex: '-1', 'aria-hidden': 'true' }, h('option', { value: '', text: first }));
  const label = h('span', { class: 'pt-combo-txt', text: first });
  const btn = h('button', { type: 'button', id, class: 'pt-in pt-combo-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, label, h('span', { class: 'pt-caret', 'aria-hidden': 'true', text: '▾' }));
  const find = h('input', { type: 'search', class: 'pt-in pt-combo-find', placeholder: 'Search schools…', 'aria-label': 'Search schools', autocomplete: 'off' });
  const listEl = h('ul', { class: 'pt-combo-list', role: 'listbox', id: id + 'List' });
  const pop = h('div', { class: 'pt-combo-pop', hidden: true }, find, listEl);
  const other = allowOther ? h('input', { type: 'text', class: 'pt-in', id: id + 'Other', maxlength: 160, placeholder: 'Type your school name', hidden: true, 'aria-label': 'Your school name' }) : null;
  let ALL = [], active = -1;
  const setValue = (v, silent) => {
    if (![...s.options].some(o => o.value === v)) s.append(h('option', { value: v, text: v }));
    s.value = v;
    label.textContent = v === OTHER ? 'Other (my school is not in the list)' : (v || first); btn.classList.toggle('empty', !v);
    if (other) { other.hidden = v !== OTHER; if (!other.hidden) setTimeout(() => other.focus(), 0); }
    if (!silent) s.dispatchEvent(new Event('change'));
  };
  const items = () => [...listEl.querySelectorAll('[role=option]')];
  const mark = i => { const it = items(); active = Math.max(0, Math.min(it.length - 1, i)); it.forEach((x, k) => x.classList.toggle('on', k === active)); if (it[active]) it[active].scrollIntoView({ block: 'nearest' }); };
  const draw = () => {
    const t = find.value.trim().toLowerCase(), base = ALL.filter(x => !isBuiltin(x)).concat(withNW ? [NOT_WORKING] : []).concat(withNS ? [NO_SCHOOL] : []);
    const shown = t ? base.filter(x => x.toLowerCase().includes(t) || isBuiltin(x)) : base;   /* the built-in schools always stay visible, at the end */
    listEl.textContent = '';
    if (!shown.length) listEl.append(h('li', { class: 'pt-combo-none', text: ALL.length ? 'No school matches "' + find.value.trim() + '"' : 'No schools in the database yet' }));
    shown.concat(allowOther ? [OTHER] : []).forEach(v => listEl.append(h('li', { role: 'option', class: 'pt-combo-opt' + (v === OTHER ? ' other' : '') + (isBuiltin(v) ? ' nw' : ''), 'aria-selected': String(v === s.value), text: v === OTHER ? 'Other (my school is not in the list)…' : v,
      onmousedown: e => e.preventDefault(), onclick: e => { e.preventDefault(); e.stopPropagation(); setValue(v); close(); if (v !== OTHER) btn.focus(); } })));
    mark(0);
  };
  const outside = e => { if (!wrap.contains(e.target)) close(); };
  function open() { if (!pop.hidden) return; pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); find.value = ''; draw(); setTimeout(() => find.focus(), 0); document.addEventListener('mousedown', outside, true); }
  function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', outside, true); }
  btn.addEventListener('click', () => (pop.hidden ? open() : close()));
  btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  find.addEventListener('input', draw);
  find.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); mark(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mark(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items()[active]; if (it) it.click(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); }
  });
  schools().then(list => {
    ALL = list.filter(x => !isBuiltin(x)); if (val && !ALL.includes(val) && !isBuiltin(val)) ALL.unshift(val);
    if (val) setValue(val, true); else btn.classList.add('empty');
  }).catch(() => { label.textContent = 'Could not load schools'; });
  const wrap = h('div', { class: 'pt-school pt-combo' }, btn, pop, s, other);
  wrap.value = () => (s.value === OTHER ? (other.value || '').trim().replace(/\s+/g, ' ') : s.value);
  wrap.sel = s; wrap.focusId = id;
  return wrap;
}
/* Chapter multi-select for the test question picker (nothing ticked = all chapters) */
function chapterMulti(chs, set, onChange) {
  const label = h('span', { class: 'pt-combo-txt', text: 'All chapters' });
  const btn = h('button', { type: 'button', class: 'pt-in pt-combo-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-label': 'Chapters' }, label, h('span', { class: 'pt-caret', 'aria-hidden': 'true', text: '▾' }));
  const find = h('input', { type: 'search', class: 'pt-in pt-combo-find', placeholder: 'Search chapters…', 'aria-label': 'Search chapters', autocomplete: 'off' });
  const listEl = h('div', { class: 'pt-multi-list' }), pop = h('div', { class: 'pt-combo-pop', hidden: true }, find, listEl);
  const byC = new Map(chs.map(x => [x.c, x]));
  const sync = () => { label.textContent = !set.size ? 'All chapters' : set.size === 1 ? (byC.get([...set][0]) ? [...set][0] + ' ' + byC.get([...set][0]).n : [...set][0]) : set.size + ' chapters selected'; };
  const draw = () => {
    const t = find.value.trim().toLowerCase(); listEl.textContent = '';
    listEl.append(h('label', { class: 'pt-multi-opt pt-multi-all' }, h('input', { type: 'radio', name: 'chall', checked: !set.size, onchange: () => { set.clear(); sync(); draw(); onChange(); } }), h('span', { text: 'All chapters' })));
    [11, 12].forEach(c => { const rows = chs.filter(x => +x.cl === c && (!t || (x.c + ' ' + x.n).toLowerCase().includes(t))); if (!rows.length) return;
      listEl.append(h('p', { class: 'pt-multi-grp', text: 'Class ' + c }));
      rows.forEach(x => listEl.append(h('label', { class: 'pt-multi-opt' }, h('input', { type: 'checkbox', checked: set.has(x.c), onchange: e => { if (e.target.checked) set.add(x.c); else set.delete(x.c); sync(); draw(); onChange(); } }), h('span', { text: x.c + ' ' + x.n })))); });
  };
  const outside = e => { if (!wrap.contains(e.target)) close(); };
  function open() { if (!pop.hidden) return; pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); find.value = ''; draw(); setTimeout(() => find.focus(), 0); document.addEventListener('mousedown', outside, true); }
  function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', outside, true); }
  btn.addEventListener('click', () => (pop.hidden ? open() : close()));
  find.addEventListener('input', draw);
  find.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); } });
  const wrap = h('div', { class: 'pt-combo pt-chpick' }, btn, pop); sync();
  return wrap;
}
/* Admin: pick one or more schools for a new test (nothing ticked = all schools). A test belongs to one school, so one test is made for each. */
function schoolMulti(id, initial) {
  const chosen = new Set((initial || []).filter(Boolean)); let ALL = [];
  const label = h('span', { class: 'pt-combo-txt', text: 'All schools' });
  const btn = h('button', { type: 'button', id, class: 'pt-in pt-combo-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, label, h('span', { class: 'pt-caret', 'aria-hidden': 'true', text: '▾' }));
  const find = h('input', { type: 'search', class: 'pt-in pt-combo-find', placeholder: 'Search schools…', 'aria-label': 'Search schools', autocomplete: 'off' });
  const listEl = h('div', { class: 'pt-multi-list' }), tags = h('div', { class: 'pt-tags' });
  const pop = h('div', { class: 'pt-combo-pop', hidden: true }, find, listEl);
  const sync = () => {
    label.textContent = !chosen.size ? 'All schools' : chosen.size === 1 ? [...chosen][0] : chosen.size + ' schools selected'; btn.classList.toggle('empty', false);
    tags.textContent = ''; [...chosen].forEach(v => tags.append(h('span', { class: 'pt-tag' }, v, h('button', { type: 'button', 'aria-label': 'Remove ' + v, text: '✕', onclick: () => { chosen.delete(v); sync(); if (!pop.hidden) draw(); } }))));
  };
  const draw = () => {
    const t = find.value.trim().toLowerCase(), shown = ALL.filter(x => !isNotWorking(x) && (!t || x.toLowerCase().includes(t)));
    listEl.textContent = '';
    listEl.append(h('label', { class: 'pt-multi-opt pt-multi-all' }, h('input', { type: 'radio', name: id + 'all', checked: !chosen.size, onchange: () => { chosen.clear(); sync(); draw(); } }), h('span', { text: 'All schools (every school)' })));
    if (!shown.length) listEl.append(h('p', { class: 'pt-hint', text: ALL.length ? 'No school matches "' + find.value.trim() + '"' : 'No schools in the database yet' }));
    shown.forEach(v => listEl.append(h('label', { class: 'pt-multi-opt' }, h('input', { type: 'checkbox', checked: chosen.has(v), onchange: e => { if (e.target.checked) chosen.add(v); else chosen.delete(v); sync(); draw(); } }), h('span', { text: v }))));
  };
  const outside = e => { if (!wrap.contains(e.target)) close(); };
  function open() { if (!pop.hidden) return; pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); find.value = ''; draw(); setTimeout(() => find.focus(), 0); document.addEventListener('mousedown', outside, true); }
  function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', outside, true); }
  btn.addEventListener('click', () => (pop.hidden ? open() : close()));
  find.addEventListener('input', draw);
  find.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); } });
  schools().then(list => { ALL = list.filter(x => !isNotWorking(x)); }).catch(() => { label.textContent = 'Could not load schools'; });
  const wrap = h('div', { class: 'pt-school pt-combo' }, btn, pop, tags); sync();
  wrap.values = () => [...chosen]; wrap.value = () => (chosen.size === 1 ? [...chosen][0] : ''); wrap.focusId = id; wrap.multi = true;
  return wrap;
}
/* The profile form: every field is required. Teachers give name and school; students give name, school, class, stream, category and gender.
   For Avanti ID students, details that come from the Avanti list are shown but cannot be changed; only missing ones can be filled. */
function profileForm(p, o) {
  const student = p.role === 'student', avanti = !!p.avanti_id, admin = !!(AU().perm && AU().perm.isAdmin);
  /* the school is chosen once and approved by the admin; after that it changes only by request (the admin excepted) */
  const locked = k => ((student || avanti) && !!p[k]) || (k === 'school' && !!p.school && !admin);
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const ro = (label, value) => h('div', { class: 'pt-fld' }, h('span', { text: label }), h('div', { class: 'pt-ro', text: value || '—' }));
  const fld = (label, input, hint) => h(input.focusId ? 'div' : 'label', { class: 'pt-fld', for: input.focusId ? null : input.id }, h('span', {}, label, h('b', { class: 'pt-req', text: ' *' })), input, hint ? h('small', { text: hint }) : null);
  const sel = (id, list, val) => { const x = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: 'Choose…' }), list.map(v => h('option', { value: v, text: v }))); x.value = val || ''; return x; };
  const F = {
    full_name: h('input', { id: 'pfName', class: 'pt-in', type: 'text', maxlength: 120, value: p.full_name || '', autocomplete: 'name' }),
    school: schoolSelect('pfSchool', p.school || (student ? NO_SCHOOL : ''), 'Choose your school…', !student, { notWorking: !student, noSchool: student }),
    class: sel('pfClass', CLASSES, p.class), stream: sel('pfStream', STREAMS, p.stream),
    category: sel('pfCat', CATEGORIES, p.category), gender: sel('pfGender', GENDERS, p.gender)
  };
  const val = k => (locked(k) ? p[k] : k === 'school' ? F.school.value() : F[k].value.trim());
  const LBL = { full_name: 'Full name', school: 'School', class: 'Class', stream: 'Stream', category: 'Category', gender: 'Gender' };
  const keys = student ? ['full_name', 'school', 'class', 'stream', 'category', 'gender'] : ['full_name', 'school'];
  const box = k => (k === 'school' && locked(k) ? schoolBox(p) : locked(k) ? ro(LBL[k], p[k]) : fld(LBL[k], F[k], k === 'school' ? (student ? 'Used for your rank within your school.' : 'Not in the list? Choose "Other" and type it.') : null));
  const btn = h('button', { type: 'submit', class: 'btn pri' + (o.big ? ' pt-big' : ''), text: o.submitText || 'Save profile' });
  return h('form', { class: 'pt-form', onsubmit: async e => {
    e.preventDefault(); msg.textContent = ''; msg.className = 'pt-msg';
    const miss = keys.filter(k => !val(k));
    if (miss.length) { msg.textContent = 'Please fill in: ' + miss.map(k => LBL[k]).join(', ') + '. All details are required.'; msg.classList.add('bad'); return; }
    btn.disabled = true; const t0 = btn.textContent; btn.textContent = 'Saving…';
    try {
      await rpc('update_my_profile', { p_full_name: val('full_name'), p_school: val('school'), p_class: student ? val('class') : (p.class || null), p_stream: student ? val('stream') : (p.stream || null), p_category: student ? val('category') : null, p_gender: student ? val('gender') : null });
      schools(true); await AU().refresh(); msg.textContent = 'Saved.'; msg.classList.add('ok');
      if (o.onSaved) o.onSaved();
    } catch (x) { msg.textContent = 'Could not save: ' + x.message; msg.classList.add('bad'); }
    btn.disabled = false; btn.textContent = t0;
  } },
    box('full_name'), box('school'),
    student ? h('div', { class: 'pt-row2' }, box('class'), box('stream')) : null,
    student ? h('div', { class: 'pt-row2' }, box('category'), box('gender')) : null,
    student && keys.some(k => locked(k)) ? h('p', { class: 'pt-hint', text: 'Saved details cannot be changed here. To move to another school, use "Request a school change" above. For other details, ask your teacher.' }) : null,
    student && keys.some(k => !locked(k)) ? h('div', { class: 'pt-note pt-warnnote', role: 'note' }, h('b', { text: 'Please check carefully before you continue. ' }), 'Once saved, you cannot change these details yourself. Only the admin can correct them.') : null,
    keys.some(k => !locked(k)) || !student ? h('div', { class: 'pt-actions' }, btn) : null, msg);
}
/* School once chosen: read-only, with a request to change it (approved by the admin). Only the admin changes their own directly. */
function schoolBox(p) {
  const wrap = h('div', { class: 'pt-fld' }, h('span', { text: 'School' }), h('div', { class: 'pt-ro', text: p.school }));
  if (p.school_request) {
    wrap.append(h('div', { class: 'pt-schreq' }, h('span', {}, 'Change requested to ', h('b', { text: p.school_request }), ' · waiting for approval by अंक-IT.'),
      h('button', { type: 'button', class: 'btn pt-mini', text: 'Cancel request', onclick: async e => {
        e.currentTarget.disabled = true;
        try { await rpc('request_school_change', { p_school: null }); await AU().refresh(); toast('Request cancelled'); pageProfile(); } catch (x) { toast(x.message); e.currentTarget.disabled = false; } } })));
  } else {
    if (p.school_note) wrap.append(h('p', { class: 'pt-note pt-warnnote', text: p.school_note }));
    wrap.append(h('small', {}, 'Your school can be changed only with approval. ',
      h('button', { type: 'button', class: 'pt-linkbtn', text: 'Request a school change', onclick: () => requestSchoolChange(p) })));
  }
  return wrap;
}
function requestSchoolChange(p) {
  const pick = schoolSelect('rqSchool', '', 'Choose the new school…', true, { notWorking: P().role !== 'student', noSchool: P().role === 'student' });
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  modal('Request a school change', h('div', { class: 'pt-form' },
    h('p', {}, 'Your school now: ', h('b', { text: p.school })),
    h('div', { class: 'pt-fld' }, h('span', { text: 'New school' }), pick),
    h('p', { class: 'pt-hint', text: 'अंक-IT will check and approve the change. Until then your school stays the same.' + (p.role === 'teacher' ? ' After the change, your new school needs approval like before.' : '') }), msg),
    [{ text: 'Cancel', onclick: () => {} }, { text: 'Send request', pri: true, onclick: close => {
      const v = pick.value(); msg.className = 'pt-msg';
      if (!v) { msg.textContent = 'Choose the new school.'; msg.classList.add('bad'); return false; }
      rpc('request_school_change', { p_school: v }).then(async () => { close(); await AU().refresh(); toast('Request sent. You will see the new school after approval.'); pageProfile(); })
        .catch(x => { msg.textContent = x.message; msg.classList.add('bad'); });
      return false;
    } }]);
}
function profileMissing(p) {
  const keys = p.role === 'student' ? ['full_name', 'school', 'class', 'stream', 'category', 'gender'] : ['full_name', 'school'];
  return keys.filter(k => !p[k]);
}
/* Full-page step right after sign-in, shown until every required detail is filled. */
function onboard(root, done) {
  const p = P();
  root.textContent = '';
  root.append(h('div', { class: 'lg' },
    h('header', { class: 'lg-head' }, h('img', { src: 'img/ankit-logo-dark-sm.png?v=920', alt: 'अंक-IT', width: 139, height: 52 }), h('h1', { text: 'Welcome' + (p.full_name ? ', ' + p.full_name.split(' ')[0] : '') }),
      h('p', { text: p.role === 'student' ? 'Tell us about yourself to continue. All details are required.' : 'Tell us your school to continue.' })),
    h('main', { class: 'lg-main lg-wide' }, h('section', { class: 'lg-card pt-onb' }, h('h2', { text: 'Complete your profile' }),
      p.school_note && !p.school ? h('p', { class: 'pt-note pt-warnnote', text: p.school_note }) : null,
      profileForm(p, { big: true, submitText: 'Continue', onSaved: () => { if (!profileMissing(P()).length) done(); } }),
      h('button', { type: 'button', class: 'lg-btn lg-ghost', text: 'Sign out', onclick: () => AU().signOut() })))));
}
async function pageProfile() {
  const p = P(), avanti = !!p.avanti_id, plan = AU().perm.plan;
  /* Free accounts can ask the admin to switch Teacher <-> Student (for a wrong choice at sign-in). Premium and Avanti accounts cannot. */
  const eligible = plan === 'free' && !p.is_avanti && !avanti && !AU().perm.staff && !AU().perm.isAdmin && !!p.role;
  const rr = eligible ? await rpc('my_role_request').catch(() => null) : null;
  const toRole = p.role === 'teacher' ? 'Student' : 'Teacher';
  const roleBox = h('div', { class: 'pt-fld' }, h('p', { class: 'pt-hint', text: 'Your role is chosen once and cannot be edited.' + (eligible ? '' : ' Premium and Avanti accounts keep their role.') }),
    eligible ? (rr && rr.status === 'pending' ? h('p', { class: 'pt-note', text: 'You asked to become a ' + (rr.to_role === 'teacher' ? 'Teacher' : 'Student') + '. The admin will answer soon.' })
      : h('button', { type: 'button', class: 'pt-linkbtn', text: 'Chose the wrong role? Ask to become a ' + toRole, onclick: () => {
        const note = h('textarea', { class: 'pt-in', rows: 2, maxlength: 300, placeholder: 'Optional: tell us what happened' }), msg = h('p', { class: 'pt-msg', role: 'status' });
        modal('Ask to become a ' + toRole, h('div', { class: 'pt-form' }, h('p', { text: 'The admin will check and change your role. Only Free accounts can ask, and only if the role was chosen by mistake.' }), note, msg),
          [{ text: 'Cancel', onclick: () => {} }, { text: 'Send request', pri: true, onclick: close => { rpc('request_role_change', { p_note: note.value.trim() || null }).then(() => { close(); toast('Request sent'); pageProfile(); }).catch(x => { msg.textContent = x.message; msg.className = 'pt-msg bad'; }); return false; } }]);
      } })) : null);
  const ro = (label, value) => h('div', { class: 'pt-fld' }, h('span', { text: label }), h('div', { class: 'pt-ro', text: value || '—' }));
  const account = card(h('h2', { text: 'Account' }),
    ro('Signed in as', avanti ? p.avanti_id : p.email),
    ro('Role', p.role === 'teacher' ? 'Teacher' : 'Student'),
    !AU().perm.isAdmin && p.school ? ro('School approval', p.school_approved ? 'Approved by अंक-IT' : 'Waiting for approval by अंक-IT. ' + (p.role === 'teacher' ? 'Until then you cannot see or add students or make tests.' : 'Until then tests are not shown.')) : null,
    ro('Plan', { free: 'Free', premium: 'Premium', staff: 'Staff (full access)' }[plan] + (plan === 'premium' && p.premium_until ? ' · until ' + day(p.premium_until) : '')),
    roleBox,
    h('div', { class: 'pt-actions' }, plan === 'free' ? link('#/membership', '★ Purchase membership', 'btn pt-gold') : null, h('button', { type: 'button', class: 'btn', text: 'Logout', onclick: () => AU().signOut() })));
  show(head(avanti ? 'Your profile' : 'Edit profile', avanti ? 'These details come from Avanti records.' : 'Your name and school appear on test results. All details are required.'),
    h('div', { class: 'pt-grid2' }, card(h('h2', { text: 'Your details' }), profileForm(p, { onSaved: () => {} })), account));
}

/* ---------- Membership (Razorpay) ---------- */
/* ---------- Membership: a pricing page for teachers and for students ---------- */
const MI = (d) => '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const MICON = {
  pdf: MI('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>'),
  share: MI('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
  folder: MI('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 13h8"/>'),
  users: MI('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 19a5 5 0 0 0-2.5-4.3"/>'),
  upload: MI('<path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
  chart: MI('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  copy: MI('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  trophy: MI('<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>'),
  target: MI('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>'),
  print: MI('<path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>'),
  phone: MI('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>'),
  bolt: MI('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  lock: MI('<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>'),
  cal: MI('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
  upi: MI('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>')
};
const HERO_ART = `<svg viewBox="0 0 320 240" role="img" aria-label="PDF worksheets, a results chart and a crown" class="mb-art">
  <defs><linearGradient id="mbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e1a11c"/></linearGradient></defs>
  <g transform="rotate(-8 120 130)"><rect x="40" y="46" width="128" height="166" rx="12" fill="#ffffff" opacity=".18"/></g>
  <g><rect x="62" y="38" width="132" height="172" rx="12" fill="#ffffff"/><rect x="62" y="38" width="132" height="34" rx="12" fill="#1f3f95"/><rect x="62" y="60" width="132" height="12" fill="#1f3f95"/>
    <text x="78" y="61" font-family="Inter,system-ui,sans-serif" font-size="13" font-weight="700" fill="#ffffff">DPP · 12M18</text>
    <rect x="78" y="86" width="98" height="7" rx="3.5" fill="#d6dcec"/><rect x="78" y="100" width="76" height="7" rx="3.5" fill="#d6dcec"/>
    <circle cx="84" cy="124" r="5" fill="#1f3f95"/><rect x="95" y="120" width="80" height="7" rx="3.5" fill="#e6eaf4"/>
    <circle cx="84" cy="142" r="5" fill="#d6dcec"/><rect x="95" y="138" width="64" height="7" rx="3.5" fill="#e6eaf4"/>
    <circle cx="84" cy="160" r="5" fill="#d6dcec"/><rect x="95" y="156" width="72" height="7" rx="3.5" fill="#e6eaf4"/>
    <rect x="78" y="182" width="44" height="16" rx="8" fill="#e5484d"/><text x="88" y="194" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="800" fill="#fff">PDF</text></g>
  <g><rect x="176" y="104" width="118" height="96" rx="12" fill="#ffffff"/>
    <rect x="194" y="160" width="14" height="26" rx="3" fill="#8aa9ff"/><rect x="214" y="146" width="14" height="40" rx="3" fill="#5b7fe0"/><rect x="234" y="130" width="14" height="56" rx="3" fill="#1f3f95"/><rect x="254" y="118" width="14" height="68" rx="3" fill="url(#mbg)"/>
    <text x="194" y="124" font-family="Inter,system-ui,sans-serif" font-size="10" font-weight="700" fill="#66728b">RANK</text></g>
  <g transform="translate(232 22)"><circle cx="34" cy="34" r="34" fill="url(#mbg)"/><path d="M14 44l5-20 10 9 5-13 5 13 10-9 5 20z" fill="#fff"/><rect x="14" y="46" width="40" height="5" rx="2.5" fill="#fff"/></g>
</svg>`;
function membershipContent(teacher) {
  return teacher ? {
    eyebrow: 'Premium for teachers', title: 'Teach more. Prepare less.',
    lead: 'Every DPP, PYQ paper and handout as a ready-to-print PDF, your whole school\'s students in one place, and results you can act on.',
    feats: [
      ['pdf', 'Every PDF, print-ready', 'DPPs, chapterwise and shift-wise PYQ papers, Must Solve lists, handouts and your own Question Bank picks, with answer keys and full explanations.'],
      ['share', 'Share in one tap', 'Send any PDF to your class on WhatsApp, by email or through any app on your phone.'],
      ['folder', 'Saved worksheets', 'Keep the question sets you build and reuse them for tests or downloads whenever you need them.'],
      ['users', 'My Students', 'Every student of your school by class, stream and session, with sign-in status, tests taken, average and last test.'],
      ['chart', 'Deeper results', 'Open any student\'s test history and report, and export your results to CSV.'],
      ['copy', 'Copy questions', 'Copy question text and IDs straight into your own notes and slides.']
    ],
    rows: [['View Question Bank, DPPs, PYQs, Must Solve and handouts', 1, 1], ['Create online tests for your school (one test link as a trial)', 1, 1], ['Results of your own tests', 1, 1],
      ['Download and print every PDF', 0, 1], ['Share PDFs on WhatsApp and email', 0, 1], ['Copy question text', 0, 1], ['Saved worksheets', 0, 1], ['My Students with performance', 0, 1],
      ['Unlimited test links for your school', 0, 1], ['Student-wise test history', 0, 1], ['Export results to CSV', 0, 1]],
    faq: [['Do my students need Premium to take my tests?', 'Yes. Only Premium students of your school, class and batch can take tests made by teachers. Free students can take past papers from Practice Tests & Results.'], ['Can I use it on my phone?', 'Yes. Everything works on phones, and PDFs can be shared straight from the phone.']]
  } : {
    eyebrow: 'Premium for students', title: 'Practise anywhere. Know where you stand.',
    lead: 'Download every DPP, PYQ paper and handout to practise offline, and see your rank among every student who took the test.',
    feats: [
      ['pdf', 'Every PDF to keep', 'DPPs, PYQ papers, Must Solve lists and handouts with answer keys and full explanations.'],
      ['phone', 'Practise offline', 'Keep the PDFs on your phone and practise on the bus, at home or without the internet.'],
      ['print', 'Print and share', 'Print sheets for your notebook, or share them with friends on WhatsApp.'],
      ['trophy', 'Rank among all students', 'See where you stand among everyone who took the test, not just your school.'],
      ['target', 'Compare with the top', 'See the average and the top score of all students on every test you take.'],
      ['copy', 'Copy questions', 'Copy questions into your own notes for revision.']
    ],
    rows: [['View Question Bank, DPPs, PYQs, Must Solve and handouts', 1, 1], ['Take your school\'s tests', 1, 1], ['Question-wise review and topic analysis', 1, 1], ['Rank in your school', 1, 1],
      ['Rank among all students', 0, 1], ['Average and top score of all students', 0, 1], ['Download and print every PDF', 0, 1], ['Share PDFs', 0, 1], ['Copy question text', 0, 1]],
    faq: [['I am on the Avanti list. Do I need to pay?', 'No. Students on the Avanti list get Premium free. Sign in with your Avanti ID.'], ['Can I use it on my phone?', 'Yes. Everything works on phones, and PDFs open in any PDF app.']]
  };
}
async function pageMembership() {
  const p = P(), plan = AU().perm.plan;
  show(loading());
  const { data: pays } = await fresh(sb().from('payments').select('order_id,payment_id,amount_paise,status,created_at,paid_at').order('created_at', { ascending: false }).limit(20));
  const teacher = p.role === 'teacher', price = Math.round((p.price_paise || (teacher ? 59900 : 29900)) / 100), perDay = (price / 365).toFixed(2).replace(/\.?0+$/, '');
  const C = membershipContent(teacher);
  const included = plan === 'staff' || p.is_avanti, active = plan === 'premium' && !p.is_avanti;
  const daysLeft = active && p.premium_until ? Math.max(0, Math.ceil((Date.parse(p.premium_until) - Date.now()) / 864e5)) : 0;
  const msg = h('p', { class: 'pt-msg mb-msg', role: 'status' });
  const payBtn = () => h('button', { type: 'button', class: 'btn pt-gold mb-cta', onclick: e => pay(e.currentTarget, msg) }, active ? 'Renew for 1 more year · ₹' + price : 'Get Premium · ₹' + price);
  const trust = h('ul', { class: 'mb-trust' }, [['lock', 'Secure payment by Razorpay'], ['upi', 'UPI, cards, net banking'], ['bolt', 'Starts instantly'], ['cal', '1 year · no auto-renewal']].map(([i, t]) => h('li', {}, h('span', { html: MICON[i] }), t)));
  const heroText = included
    ? [h('span', { class: 'mb-eyebrow', text: plan === 'staff' ? 'अंक-IT' : 'Avanti student' }), h('h1', { text: 'Premium is included for you' }),
       h('p', { class: 'mb-lead', text: plan === 'staff' ? 'Your @avantifellows.org account has full access to everything. No payment is needed.' : 'Students on the Avanti list get Premium free. Everything below is already yours.' })]
    : active
      ? [h('span', { class: 'mb-eyebrow', text: C.eyebrow }), h('h1', { text: 'You are on Premium' }),
         h('p', { class: 'mb-lead', text: 'Active until ' + day(p.premium_until) + ' (' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left). Renewing adds one more year on top of the time you have left.' }), h('div', { class: 'mb-buy' }, payBtn(), msg)]
      : [h('span', { class: 'mb-eyebrow', text: C.eyebrow }), h('h1', { text: C.title }), h('p', { class: 'mb-lead', text: C.lead }),
         h('div', { class: 'mb-price' }, h('span', { class: 'mb-cur', text: '₹' }), h('strong', { text: price }), h('span', { class: 'mb-per' }, h('b', { text: 'for 1 year' }), h('small', { text: 'about ₹' + perDay + ' a day' }))),
         h('div', { class: 'mb-buy' }, payBtn(), msg)];
  const hero = h('section', { class: 'mb-hero' }, h('div', { class: 'mb-hero-text' }, heroText, included ? null : trust), h('div', { class: 'mb-hero-art', html: HERO_ART }));
  const feats = h('section', { class: 'mb-sec' }, h('h2', { class: 'mb-h2', text: included || active ? 'What you get with Premium' : 'Everything you get with Premium' }),
    h('div', { class: 'mb-feats' }, C.feats.map(([i, t, d]) => h('article', { class: 'mb-feat' }, h('span', { class: 'mb-ic', html: MICON[i] }), h('h3', { text: t }), h('p', { text: d })))));
  const tick = v => h('td', { class: v ? 'mb-yes' : 'mb-no', 'aria-label': v ? 'Included' : 'Not included', text: v ? '✓' : '—' });
  const compare = h('section', { class: 'mb-sec' }, h('h2', { class: 'mb-h2', text: 'Free and Premium, side by side' }),
    h('div', { class: 'pt-tw mb-tw' }, h('table', { class: 'mb-table' }, h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { text: 'Free' }), h('th', { class: 'mb-prem' }, 'Premium', h('small', { text: '₹' + price + ' / year' })))),
      h('tbody', {}, C.rows.map(([t, f, pr]) => h('tr', { class: f ? null : 'mb-only' }, h('td', { text: t }), tick(f), tick(pr)))))));
  const steps = h('section', { class: 'mb-sec mb-steps' }, [['1', 'Pay with UPI or card', 'Razorpay opens. Pay ₹' + price + ' with GPay, PhonePe, Paytm, a card or net banking.'], ['2', 'Premium starts at once', 'The server checks the payment and switches your account to Premium in seconds.'], ['3', 'Use it for a full year', 'Valid for 365 days. It does not renew by itself, and no card details are saved.']]
    .map(([n, t, d]) => h('div', { class: 'mb-step' }, h('span', { class: 'mb-n', text: n }), h('div', {}, h('h3', { text: t }), h('p', { text: d })))));
  const faq = h('section', { class: 'mb-sec' }, h('h2', { class: 'mb-h2', text: 'Questions' }), h('div', { class: 'pt-faq' },
    C.faq.concat([['Will it renew automatically?', 'No. Premium lasts one year from the day you pay. Renew whenever you want; extra time is added on top.'],
      ['Money was taken but I am still on Free.', 'Wait two minutes and refresh the page. If it is still Free, write to us from Help & Support with the payment ID shown below in Payment history.']])
      .map(([q, a]) => h('details', {}, h('summary', { text: q }), h('p', { text: a })))));
  const band = included || active ? null : h('section', { class: 'mb-band' }, h('div', {}, h('h2', { text: teacher ? 'Ready for a better teaching year?' : 'Ready to practise smarter?' }), h('p', { text: '₹' + price + ' for a full year · about ₹' + perDay + ' a day' })), payBtn());
  const hist = (pays || []).length ? h('section', { class: 'mb-sec' }, h('h2', { class: 'mb-h2', text: 'Payment history' }), h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Date', 'Amount', 'Status', 'Payment ID'].map(t => h('th', { text: t })))),
    h('tbody', {}, pays.map(x => h('tr', {}, h('td', { text: when(x.created_at) }), h('td', { text: '₹' + num(x.amount_paise / 100, 2) }), h('td', {}, badge({ paid: 'Paid', failed: 'Failed', created: 'Not completed' }[x.status], { paid: 'ok', failed: 'bad' }[x.status])), h('td', { class: 'pt-mono', text: x.payment_id || '—' }))))))) : null;
  show(h('div', { class: 'mb' }, hero, feats, included ? null : compare, included ? null : steps, faq, band, hist));
}
let rzpP = null;
async function callPay(body) {
  const { data } = await sb().auth.getSession();
  const tok = data.session && data.session.access_token;
  const r = await fetch(AU().url + '/functions/v1/razorpay', { method: 'POST', headers: { apikey: AU().key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Payment service error (' + r.status + ')');
  return j;
}
async function pay(btn, msg) {
  msg.className = 'pt-msg'; msg.textContent = 'Starting payment…'; btn.disabled = true;
  try {
    if (!rzpP) rzpP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = () => { rzpP = null; rej(new Error('Could not load Razorpay. Check your internet connection.')); }; document.head.append(s); });
    await rzpP;
    const o = await callPay({ action: 'create-order' });
    msg.textContent = 'Complete the payment in the Razorpay window.';
    const rz = new window.Razorpay({
      key: o.key_id, order_id: o.order_id, amount: o.amount, currency: o.currency, name: 'अंक-IT', description: 'Mathematics Dashboard · Premium (1 year)',
      prefill: { name: o.name || '', email: o.email || '' }, theme: { color: '#1f3f95' },
      handler: async resp => {
        msg.textContent = 'Confirming your payment with the server…';
        try { const v = await callPay(Object.assign({ action: 'verify' }, resp)); await waitPremium(v.status === 'paid'); msg.textContent = 'Payment confirmed. Premium is now active.'; msg.classList.add('ok'); toast('Premium is active. Thank you!'); setTimeout(() => location.reload(), 1200); }
        catch (e) { msg.textContent = 'We could not confirm the payment yet: ' + e.message + '. If money was taken, Premium starts automatically within a few minutes.'; msg.classList.add('bad'); btn.disabled = false; }
      },
      modal: { ondismiss: () => { msg.textContent = 'Payment was not completed. You are still on the Free plan.'; btn.disabled = false; } }
    });
    rz.on('payment.failed', r => { msg.textContent = 'Payment failed: ' + ((r && r.error && r.error.description) || 'please try again') + '. You are still on the Free plan.'; msg.classList.add('bad'); btn.disabled = false; });
    rz.open();
  } catch (e) { msg.textContent = e.message; msg.classList.add('bad'); btn.disabled = false; }
}
async function waitPremium(sure) {
  for (let i = 0; i < (sure ? 2 : 10); i++) {
    const p = await AU().refresh();
    if (p.plan === 'premium' || p.plan === 'staff') return;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('the server has not confirmed it yet');
}

/* ---------- Saved worksheets ---------- */
async function myWorksheets() {
  const { data, error } = await fresh(sb().from('worksheets').select('id,title,question_ids,updated_at').order('updated_at', { ascending: false }));
  if (error) throw new Error(error.message);
  return data || [];
}
/* a small pop-up menu under a button (Export, More) */
function dropMenu(btn, items) {
  const old = document.querySelector('.pt-dmenu'); if (old) { const same = old.owner === btn; old.remove(); if (same) return; }
  const m = h('div', { class: 'pt-dmenu', role: 'menu' }, items.filter(Boolean).map(it => it === '-' ? h('div', { class: 'pt-dsep', role: 'separator' })
    : h('button', { type: 'button', role: 'menuitem', class: 'pt-ditem' + (it.bad ? ' bad' : '') + (it.good ? ' good' : '') + (it.red ? ' red' : ''), onclick: () => { close(); it.onclick(); } }, it.icon ? h('span', { class: 'pt-dic', html: it.icon }) : null, h('span', { class: 'pt-dtx' }, h('b', { text: it.text }), it.sub ? h('small', { text: it.sub }) : null))));
  m.owner = btn; document.body.append(m);
  const r = btn.getBoundingClientRect(), w = m.offsetWidth;
  m.style.top = Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  const out = e => { if (!m.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); }, key = e => { if (e.key === 'Escape') { close(); btn.focus(); } };
  function close() { m.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', out, true); document.removeEventListener('keydown', key, true); window.removeEventListener('scroll', close, true); }
  setTimeout(() => { document.addEventListener('click', out, true); document.addEventListener('keydown', key, true); window.addEventListener('scroll', close, true); }, 0);
  const first = m.querySelector('button'); if (first) first.focus();
}
const IC = {
  pdf: '<img src="img/pdf.png" width="22" height="22" alt="">', docx: '<img src="img/word.png" width="22" height="20" alt="">', pptx: '<img src="img/ppt.png" width="22" height="20" alt="">',
  share: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  del: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>',
  rename: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V5h16v2M12 5v14M9 19h6"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  power: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v9"/><path d="M18.4 6.6a8 8 0 1 1-12.8 0"/></svg>',
  more: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'
};
/* Share a worksheet as a PDF: the phone's share sheet when it can attach files, otherwise download + WhatsApp / email */
async function shareWorksheet(w) {
  if (!can('share')) { toast('Sharing needs a Premium membership.'); return; }
  toast('Preparing the PDF…');
  let r; try { r = await TE().pdfIds(w.question_ids, w.title, w.label, w.info, w.subLine); } catch (e) { toast('Could not make the PDF: ' + (e && e.message ? e.message : 'try again')); return; }
  if (r) shareReady(r.blob, r.file, w.title);
}
/* "PDF ready" box used by every share button on the site. The share sheet needs a fresh click, so it opens from here. */
function shareReady(blob, fileName, title) {
  if (!can('share')) { toast('Sharing needs a Premium membership.'); return; }
  const file = new File([blob], fileName, { type: 'application/pdf' }), url = URL.createObjectURL(blob), text = title + ' (अंक-IT)';
  const canFiles = !!(navigator.canShare && (() => { try { return navigator.canShare({ files: [file] }); } catch (e) { return false; } })());
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const sizeKb = Math.max(1, Math.round(blob.size / 1024));
  modal('Share "' + title + '"', h('div', { class: 'pt-form pt-share' },
    h('div', { class: 'pt-sharefile' }, h('span', { html: IC.pdf }), h('div', {}, h('b', { text: fileName }), h('small', { text: (sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB') + ' · PDF' }))),
    canFiles ? h('button', { type: 'button', class: 'btn pri pt-big', onclick: async () => { try { await navigator.share({ files: [file], title, text }); msg.textContent = 'Shared.'; msg.className = 'pt-msg ok'; } catch (e) { if (!e || e.name !== 'AbortError') { msg.textContent = 'This device could not open the share sheet. Download the PDF and attach it instead.'; msg.className = 'pt-msg bad'; } } } }, h('span', { html: IC.share }), 'Share with an app…') : null,
    h('div', { class: 'pt-actions' },
      h('a', { class: 'btn' + (canFiles ? '' : ' pri'), href: url, download: fileName }, h('span', { html: IC.down }), 'Download PDF'),
      h('a', { class: 'btn', href: 'https://wa.me/?text=' + encodeURIComponent(text), target: '_blank', rel: 'noopener', text: 'WhatsApp' }),
      h('a', { class: 'btn', href: 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(text) + '&body=' + encodeURIComponent('Please find the PDF attached: ' + fileName), target: '_blank', rel: 'noopener', text: 'Gmail' })),
    h('p', { class: 'pt-hint', text: canFiles ? '"Share with an app" sends the PDF itself. WhatsApp and Gmail open a message: attach the downloaded PDF there.' : 'Download the PDF first, then attach it in the WhatsApp or Gmail message that opens.' }), msg),
    [{ text: 'Done', pri: false, onclick: () => { setTimeout(() => URL.revokeObjectURL(url), 120000); } }]);
}
async function pageWorksheets() {
  if (!can('worksheets')) return nope('Saved worksheets are for Premium teachers', 'Upgrade to keep question lists as worksheets and reuse them in tests.');
  show(head('Saved worksheets', 'Question lists you kept from the Question Bank or the test maker.'), loading());
  const list = await myWorksheets();
  const rename = async w => { const t = await promptBox('Rename worksheet', 'Title', w.title); if (!t) return; const { error } = await sb().from('worksheets').update({ title: t, updated_at: new Date().toISOString() }).eq('id', w.id); if (error) toast('Could not rename: ' + error.message); else pageWorksheets(); };
  const del = async w => { if (!await confirmBox('Delete worksheet?', '"' + w.title + '" will be deleted. Tests made from it are not affected.', 'Delete', true)) return; const { error } = await sb().from('worksheets').delete().eq('id', w.id); if (error) toast('Could not delete: ' + error.message); else { toast('Worksheet deleted'); pageWorksheets(); AU().renderMenu(); } };
  const exportBtn = w => can('pdf') ? h('button', { type: 'button', class: 'btn pt-split', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: e => dropMenu(e.currentTarget, [
      { icon: IC.pdf, text: 'Download PDF', sub: 'Print-ready, with the Avanti header', onclick: () => TE().exportIds(w.question_ids, w.title, 'pdf') },
      can('docx') ? { icon: IC.docx, text: 'Download Word', sub: 'Editable document', onclick: () => TE().exportIds(w.question_ids, w.title, 'docx') } : null,
      can('pptx') ? { icon: IC.pptx, text: 'Download PowerPoint', sub: 'One question per slide', onclick: () => TE().exportIds(w.question_ids, w.title, 'pptx') } : null,
      can('share') ? '-' : null,
      can('share') ? { icon: IC.share, text: 'Share PDF…', sub: 'WhatsApp, email or your phone’s apps', onclick: () => shareWorksheet(w) } : null]) },
    h('span', { html: IC.down }), 'Export', h('span', { class: 'pt-caret', 'aria-hidden': 'true', text: '▾' })) : null;
  const moreBtn = w => h('button', { type: 'button', class: 'btn pt-iconbtn', title: 'More', 'aria-label': 'More actions for ' + w.title, 'aria-haspopup': 'menu', 'aria-expanded': 'false', html: IC.more,
    onclick: e => dropMenu(e.currentTarget, [{ icon: IC.edit, text: 'Edit questions', onclick: () => { location.hash = '#/ws-edit/' + w.id; } }, { icon: IC.rename, text: 'Rename', onclick: () => rename(w) }, { icon: IC.del, text: 'Delete', bad: true, onclick: () => del(w) }]) });
  const body = list.length ? h('div', { class: 'pt-cards' }, list.map(w => card(
    h('div', { class: 'pt-ct' }, h('h3', { text: w.title }), moreBtn(w)),
    h('p', { class: 'pt-meta' }, h('b', { text: w.question_ids.length }), ' questions · updated ' + when(w.updated_at)),
    h('div', { class: 'pt-actions pt-wsact' },
      h('button', { type: 'button', class: 'btn', text: 'View questions', onclick: () => previewIds(w.title, w.question_ids) }),
      exportBtn(w))))) :
    empty('No saved worksheets yet', 'In the Question Bank, tick questions and press "Save as worksheet". You can also save the questions of a test while creating it.', h('button', { type: 'button', class: 'btn pri', text: 'Open Question Bank', onclick: () => { leave(); TE().setTab('qb'); } }));
  show(head('Saved worksheets', list.length + ' worksheet' + (list.length === 1 ? '' : 's') + ' · question lists you kept from the Question Bank or the test maker'), body);
}
async function saveWorksheet(ids, name) {
  if (!can('worksheets')) { toast('Saved worksheets are for Premium teachers.'); return; }
  let list = []; try { list = await myWorksheets(); } catch (e) { /* save as new */ }
  const title = h('input', { type: 'text', class: 'pt-in', value: name || 'Worksheet', maxlength: 200 });
  const pick = h('select', { class: 'pt-in' }, h('option', { value: '', text: 'A new worksheet' }), list.map(w => h('option', { value: w.id, text: 'Add to: ' + w.title + ' (' + w.question_ids.length + ')' })));
  const tf = h('label', { class: 'pt-fld' }, h('span', { text: 'Worksheet title' }), title);
  pick.addEventListener('change', () => { tf.hidden = !!pick.value; });
  const body = h('div', { class: 'pt-form' }, list.length ? h('label', { class: 'pt-fld' }, h('span', { text: 'Save in' }), pick) : null, tf,
    h('p', { class: 'pt-hint', text: ids.length + ' question' + (ids.length === 1 ? '' : 's') + ' ticked. A worksheet can hold up to 300 questions.' }));
  modal('Save as worksheet', body, [{ text: 'Cancel', onclick: () => {} }, { text: 'Save', pri: true, onclick: () => {
    if (pick.value) {
      const w = list.find(x => x.id === pick.value); if (!w) return false;
      const merged = w.question_ids.concat(ids.filter(i => !w.question_ids.includes(i)));
      const added = Math.min(merged.length, 300) - w.question_ids.length;
      sb().from('worksheets').update({ question_ids: merged.slice(0, 300), updated_at: new Date().toISOString() }).eq('id', w.id)
        .then(({ error }) => toast(error ? 'Could not save: ' + error.message : added > 0 ? 'Added ' + added + ' question' + (added === 1 ? '' : 's') + ' to "' + w.title + '".' + (merged.length > 300 ? ' (Limit of 300 reached.)' : '') : 'These questions are already in "' + w.title + '".'));
      return;
    }
    const t = title.value.trim(); if (!t) { title.focus(); return false; }
    sb().from('worksheets').insert({ title: t, question_ids: ids.slice(0, 300) }).then(({ error }) => {
      if (error) toast('Could not save the worksheet: ' + error.message); else { toast('Saved "' + t + '" (' + Math.min(ids.length, 300) + ' questions' + (ids.length > 300 ? ', the first 300 of ' + ids.length : '') + ') in Saved worksheets.'); AU().renderMenu(); }
    });
  } }]);
}
/* Edit a saved worksheet: title, order of questions, remove questions, add questions by ID */
async function pageWsEdit(id) {
  if (!can('worksheets')) return nope('Saved worksheets are for Premium teachers', 'Upgrade to keep question lists as worksheets and reuse them in tests.');
  show(head('Edit worksheet', ''), loading());
  const { data: w, error } = await fresh(sb().from('worksheets').select('id,title,question_ids,updated_at').eq('id', id).maybeSingle());
  if (error) throw new Error(error.message);
  if (!w) return show(head('Edit worksheet', ''), empty('Worksheet not found', 'It may have been deleted.', h('button', { type: 'button', class: 'btn pri', text: 'Back to Saved worksheets', onclick: () => { location.hash = '#/worksheets'; } })));
  const B = await fresh(TE().bank());
  let ids = w.question_ids.slice(), dirty = false;
  const title = h('input', { type: 'text', class: 'pt-in', value: w.title, maxlength: 200, oninput: () => { dirty = true; } });
  const count = h('span', { class: 'pt-wse-count' });
  const list = h('div', { class: 'pt-plist pt-wse-list' });
  const addIn = h('input', { type: 'text', class: 'pt-in', placeholder: 'Question IDs, separated by commas or spaces' });
  const addMsg = h('p', { class: 'pt-hint' });
  const ctl = (label, text, fn, dis, bad) => h('button', { type: 'button', class: 'btn pt-wse-b' + (bad ? ' bad' : ''), title: label, 'aria-label': label, text, disabled: dis || null, onclick: fn });
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; dirty = true; draw(); };
  function draw() {
    count.textContent = ids.length + ' question' + (ids.length === 1 ? '' : 's');
    list.textContent = '';
    if (!ids.length) list.append(h('p', { class: 'pt-hint', text: 'No questions left. Add some by ID below, or from the Question Bank.' }));
    ids.forEach((qid, i) => {
      const q = B.byId.get(qid);
      const tools = h('span', { class: 'pt-wse-tools' }, ctl('Move up', '↑', () => move(i, -1), i === 0), ctl('Move down', '↓', () => move(i, 1), i === ids.length - 1),
        ctl('Remove question ' + (i + 1), 'Remove', () => { ids.splice(i, 1); dirty = true; draw(); }, false, true));
      list.append(q ? qCard(snap(q), i, { right: tools, answer: q.a, extra: h('p', { class: 'pt-hint', text: 'ID ' + qid }) })
        : h('article', { class: 'pt-q' }, h('div', { class: 'pt-qh' }, h('strong', { text: 'Q' + (i + 1) }), h('span', { class: 'pt-hint', text: 'Question ' + qid + ' is no longer in the Question Bank' }), tools)));
    });
    mathIn(list);
  }
  const add = () => {
    const want = addIn.value.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean);
    const ok = [], bad = [], dup = [];
    want.forEach(x => { const q = B.byId.get(x) || B.byId.get(x.toUpperCase()); const k = q ? q.i : null; if (!k) bad.push(x); else if (ids.includes(k) || ok.includes(k)) dup.push(x); else ok.push(k); });
    const room = 300 - ids.length, take = ok.slice(0, Math.max(0, room));
    ids = ids.concat(take); if (take.length) dirty = true;
    addMsg.textContent = [take.length ? 'Added ' + take.length + '.' : '', dup.length ? 'Already in the worksheet: ' + dup.join(', ') + '.' : '', bad.length ? 'Not found: ' + bad.join(', ') + '.' : '', ok.length > take.length ? 'The limit is 300 questions.' : ''].filter(Boolean).join(' ');
    if (take.length) addIn.value = bad.join(', ');
    draw();
  };
  addIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  const save = async btn => {
    const t = title.value.trim(); if (!t) { title.focus(); toast('Give the worksheet a title'); return; }
    if (!ids.length) { toast('A worksheet needs at least one question. Delete it from Saved worksheets instead.'); return; }
    btn.disabled = true;
    const { error: e } = await sb().from('worksheets').update({ title: t, question_ids: ids, updated_at: new Date().toISOString() }).eq('id', w.id);
    btn.disabled = false;
    if (e) { toast('Could not save: ' + e.message); return; }
    dirty = false; toast('Worksheet saved'); location.hash = '#/worksheets';
  };
  const cancel = async () => { if (dirty && !await confirmBox('Discard changes?', 'Your changes to this worksheet will be lost.', 'Discard', true)) return; location.hash = '#/worksheets'; };
  show(head('Edit worksheet', 'Change the title, reorder or remove questions, or add more.'),
    card(h('label', { class: 'pt-fld' }, h('span', { text: 'Title' }), title),
      h('div', { class: 'pt-fld' }, h('span', { text: 'Add questions by ID' }), h('div', { class: 'pt-wse-add' }, addIn, h('button', { type: 'button', class: 'btn', text: 'Add', onclick: add })), addMsg),
      h('p', { class: 'pt-hint', text: 'To add questions from the Question Bank, tick them there and press "Save as worksheet", then choose this worksheet.' })),
    h('div', { class: 'pt-wse-head' }, h('h3', { text: 'Questions' }), count), list,
    h('div', { class: 'pt-wse-bar' }, h('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: cancel }), h('button', { type: 'button', class: 'btn pri', text: 'Save changes', onclick: e => save(e.currentTarget) })));
  draw();
}
let PREFILL = null;
function createTestFrom(ids, name) {
  if (!can('createTests')) { toast('Creating tests needs a Premium teacher membership.'); return; }
  PREFILL = { ids: ids.slice(), title: name || '' };
  if (location.hash === '#/create') route(); else location.hash = '#/create';
}
async function previewIds(title, ids) {
  const B = await fresh(TE().bank());
  const qs = ids.map(i => B.byId.get(i)).filter(Boolean).map(snap);
  previewQs(title, qs, true);
}
function previewQs(title, qs, withAns) {
  const body = h('div', { class: 'pt-plist' }, qs.map((q, i) => qCard(q, i, { answer: withAns ? q.a : null })));
  modal(title + ' · ' + qs.length + ' questions', body, [{ text: 'Close', pri: true, onclick: () => {} }]);
  mathIn(body);
}

/* one question rendered (preview, report and exam) */
function qCard(q, i, o) {
  o = o || {};
  const opts = (q.o || []).map((t, k) => {
    const L = LETTERS[k], chosen = o.response && String(o.response).split(',').includes(L), right = o.answer && String(o.answer).toUpperCase().split(',').map(x => x.trim()).includes(L);
    return h('li', { class: 'pt-opt' + (right ? ' right' : '') + (chosen ? ' chosen' : '') }, h('b', { text: L }), h('span', { html: qText(t) }));
  });
  return h('article', { class: 'pt-q' + (o.status ? ' st-' + o.status : '') },
    h('div', { class: 'pt-qh' }, h('strong', { text: 'Q' + (i + 1) }), o.code ? h('span', { class: 'pt-code', title: 'Question code', text: o.code }) : null, badge(q.type || 'MCQ'), q.tp ? h('span', { class: 'pt-hint', text: q.tp }) : null, o.right),
    h('div', { class: 'pt-qt', html: qText(q.q) }), figure(q.f),
    opts.length ? h('ol', { class: 'pt-opts' }, opts) : null,
    o.answer != null && !(q.o || []).length ? h('p', { class: 'pt-ans' }, 'Answer: ', h('b', { text: o.answer })) : null,
    o.extra);
}

/* ---------- Create / edit test ---------- */
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const EXN = { Main: 'JEE Main', Adv: 'JEE Advanced', KCET: 'KCET', IAT: 'IAT', NDA: 'NDA' };
const paperKey = x => x.e + '|' + (x.y || '') + '|' + x.p;
function paperInfo(x) {
  const p = String(x.p || ''), m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})/.exec(p), y = (/\b(19|20)\d{2}\b/.exec(p) || [])[0] || x.y;
  const t = m && MON[m[2].toLowerCase()] != null ? Date.UTC(+m[3], MON[m[2].toLowerCase()], +m[1]) : y ? Date.UTC(+y, 4, 15) : 0;
  const sh = +((/shift\s*(\d)/i.exec(p) || /paper\s*(\d)/i.exec(p) || [])[1] || 0);
  const label = (/\b(19|20)\d{2}\b/.test(p) ? p : (EXN[x.e] || x.e) + ' ' + (x.y || '') + ' · ' + p).trim();
  return { key: paperKey(x), e: x.e, label, t, sh };
}
const gradable = q => { if (!q || !q.a) return false; if (q.t === 'Numerical') return /^-?\d+(\.\d+)?$/.test(q.a.trim()) || /^-?\d+(\.\d+)?\s*to\s*-?\d+(\.\d+)?$/i.test(q.a.trim()); return (q.t === 'MCQ' || q.t === 'MSQ') && (q.o || []).length > 0 && /^[A-D](,[A-D])*$/.test(q.a); };
let CHN = new Map();
function snap(q) { const ch = CHN.get(q.cc); return { id: q.i, type: q.t, q: q.q, o: q.o || [], a: q.a, ch: q.cc, chn: ch ? ch.n : q.cc, tp: q.tp || '', f: q.f && q.f.svg ? { svg: q.f.svg } : null, d: q.d, src: q.s === 'P' ? (q.e === 'Main' ? 'JEE Main' : q.e === 'Adv' ? 'JEE Advanced' : q.e) + (q.y ? ' ' + q.y : '') : 'Practice' }; }
async function pageCreate(arg, r) {
  if (!can('createTests')) return nope('Creating tests is for teachers', 'Sign in as a teacher to create tests.');
  show(head(r === 'edit' ? 'Edit test' : 'Create Test', 'Loading the question bank…'), loading('Loading the question bank…'));
  const B = await fresh(TE().bank()); CHN = B.chapters;
  const all = B.qs.filter(gradable);
  const S = { title: '', mins: 60, pos: 4, neg: 1, cls: new Set(), streams: new Set(), school: '', active: true, sel: [], id: null, locked: false };
  if (r === 'edit') {
    const { data: t, error } = await fresh(sb().from('tests').select('*').eq('id', arg).maybeSingle());
    if (error || !t) { show(errorBox(error ? error.message : 'Test not found.', null)); return; }
    Object.assign(S, { id: t.id, code: t.code, title: t.title, mins: t.duration_min, pos: +t.marks_correct, neg: +t.marks_wrong, cls: new Set(t.target_classes || []), streams: new Set(t.target_streams || []), school: t.school || '', schoolList: [t.school].concat(t.schools || []).filter(Boolean), active: t.is_active, sel: t.questions });
    const { data: mt } = await sb().rpc('my_tests'); const me = (mt || []).find(x => x.id === t.id); S.locked = !!(me && me.submitted > 0);
  } else if (PREFILL) {
    S.sel = PREFILL.ids.map(i => B.byId.get(i)).filter(gradable).map(snap); S.title = PREFILL.title || '';
    const skipped = PREFILL.ids.length - S.sel.length; if (skipped) setTimeout(() => toast(skipped + ' question(s) were left out: tests use only MCQ, MSQ and numerical questions with an answer key.'), 300);
    PREFILL = null;
  }
  const F = { src: 'all', exam: '', paper: '', chs: new Set(), tp: '', lv: new Set(), ty: new Set(), q: '', ws: '', page: 0 };
  const selIds = () => new Set(S.sel.map(x => x.id));
  const inp = (id, type, val, attrs) => h('input', Object.assign({ id, type, class: 'pt-in', value: val }, attrs || {}));
  const fTitle = inp('ctTitle', 'text', S.title, { maxlength: 200, placeholder: 'e.g. Quadratic Equations · Weekly test 3', required: true });
  const fMins = inp('ctMins', 'number', S.mins, { min: 1, max: 600 }), fPos = inp('ctPos', 'number', S.pos, { min: 0.5, max: 100, step: 'any' }), fNeg = inp('ctNeg', 'number', S.neg, { min: 0, max: 100, step: 'any' });
  const mkSel = (id, first, list, val) => { const s = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: first }), list.map(x => h('option', { value: x, text: x }))); s.value = val; return s; };
  const chipSet = (id, list, set) => { const box = h('div', { class: 'chips', id, role: 'group' }); const draw = () => { box.textContent = ''; list.forEach(v => box.append(h('button', { type: 'button', class: 'chip', 'aria-pressed': String(set.has(v)), text: id === 'ctCls' && v !== 'Dropper' ? 'Class ' + v : v, onclick: () => { set.has(v) ? set.delete(v) : set.add(v); draw(); } }))); }; draw(); return box; };
  const fCls = chipSet('ctCls', CLASSES, S.cls), fStr = chipSet('ctStr', STREAMS, S.streams);
  const fSchool = can('isAdmin') ? schoolMulti('ctSchool', S.schoolList) : (() => { const nw = isNotWorking(P().school); const d = h('div', { class: 'pt-ro', id: 'ctSchool', text: nw ? 'Any student with the test link (you are not at a school)' : (P().school || '—') }); d.value = () => (nw ? null : P().school); return d; })();
  const fAct = h('input', { type: 'checkbox', id: 'ctAct', role: 'switch' }); fAct.checked = S.active;
  const fld = (label, el, hint) => h(el.focusId ? 'div' : 'label', { class: 'pt-fld', for: el.focusId ? null : el.id }, h('span', { text: label }), el, hint ? h('small', { text: hint }) : null);
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const selBox = h('div', { class: 'pt-sel' }), selHead = h('h2', {});
  const results = h('div', { class: 'pt-plist' }), resHead = h('div', { class: 'pt-rh' }), pager = h('div', { class: 'pt-pager' });
  const filt = h('div', { class: 'pt-filters' });
  let wsList = null;

  function pool() {
    if (F.src === 'ws') { const w = (wsList || []).find(x => x.id === F.ws); return w ? w.question_ids.map(i => B.byId.get(i)).filter(gradable) : []; }
    const q = F.q.trim().toLowerCase();
    return all.filter(x => (F.src === 'all' || (F.src === 'pyq' ? x.s === 'P' : x.s === 'N'))
      && (!F.exam || x.e === F.exam) && (!F.paper || paperKey(x) === F.paper) && (!F.chs.size || F.chs.has(x.cc)) && (!F.tp || x.tp === F.tp)
      && (!F.lv.size || F.lv.has(x.d)) && (!F.ty.size || F.ty.has(x.t))
      && (!q || x.i.toLowerCase().includes(q) || x.q.toLowerCase().includes(q)));
  }
  function drawFilters() {
    filt.textContent = '';
    const seg = h('div', { class: 'seg pt-seg' }, [['all', 'Question Bank'], ['dpp', 'DPPs (practice)'], ['pyq', 'PYQs'], ['ws', 'Saved worksheet']].map(([k, t]) =>
      h('button', { type: 'button', 'aria-pressed': String(F.src === k), text: t, onclick: async () => { F.src = k; F.page = 0; F.paper = ''; if (k === 'ws' && !wsList) { wsList = await myWorksheets().catch(() => []); } drawFilters(); drawResults(); } })));
    filt.append(seg);
    if (F.src === 'ws') {
      const s = h('select', { class: 'pt-in', 'aria-label': 'Worksheet', onchange: e => { F.ws = e.target.value; F.page = 0; drawResults(); } }, h('option', { value: '', text: (wsList || []).length ? 'Choose a saved worksheet…' : 'No saved worksheets yet' }), (wsList || []).map(w => h('option', { value: w.id, text: w.title + ' (' + w.question_ids.length + ')' })));
      s.value = F.ws; filt.append(s); return;
    }
    const chs = [...CHN.values()].sort((a, b) => a.cl - b.cl || a.o - b.o);
    const tpSel = h('select', { class: 'pt-in', 'aria-label': 'Topic', onchange: e => { F.tp = e.target.value; F.page = 0; drawResults(); } });
    const fillTopics = () => {
      const oneCh = F.chs.size === 1 ? [...F.chs][0] : '', tps = oneCh ? [...new Set(all.filter(x => x.cc === oneCh && x.tp).map(x => x.tp))].sort() : [];
      tpSel.textContent = ''; tpSel.disabled = !oneCh; tpSel.append(h('option', { value: '', text: oneCh ? 'All topics' : 'Pick one chapter for topics' }), tps.map(t => h('option', { value: t, text: t }))); tpSel.value = F.tp;
    };
    const chSel = chapterMulti(chs, F.chs, () => { F.tp = ''; F.page = 0; fillTopics(); drawResults(); });
    fillTopics();
    const search = h('input', { type: 'search', class: 'pt-in pt-search', placeholder: 'Search question text or ID', value: F.q, 'aria-label': 'Search', oninput: e => { F.q = e.target.value; F.page = 0; clearTimeout(drawFilters.t); drawFilters.t = setTimeout(drawResults, 250); } });
    const row = h('div', { class: 'pt-frow' }, search, chSel);
    if (F.src === 'pyq') {
      const exSel = h('select', { class: 'pt-in', 'aria-label': 'Exam', onchange: e => { F.exam = e.target.value; F.paper = ''; F.page = 0; drawFilters(); drawResults(); } }, h('option', { value: '', text: 'All exams' }), [['Main', 'JEE Main / AIEEE'], ['Adv', 'JEE Advanced / IIT'], ['KCET', 'KCET'], ['IAT', 'IAT'], ['NDA', 'NDA']].map(([v, t]) => h('option', { value: v, text: t })));
      exSel.value = F.exam;
      const pm = new Map(); all.forEach(x => { if (x.s === 'P' && x.p && (!F.exam || x.e === F.exam)) { const k = paperKey(x); if (!pm.has(k)) pm.set(k, paperInfo(x)); } });
      const papers = [...pm.values()].sort((a, b) => b.t - a.t || a.sh - b.sh || a.label.localeCompare(b.label));
      const pSel = h('select', { class: 'pt-in', 'aria-label': 'Paper', onchange: e => { F.paper = e.target.value; F.page = 0; drawFilters(); drawResults(); } }, h('option', { value: '', text: 'Any paper (newest first)' }), papers.map(p => h('option', { value: p.key, text: (F.exam ? '' : (EXN[p.e] || p.e) + ' · ') + p.label.replace(/^JEE (Main|Advanced) (?=\d{4} ·)/, '') })));
      pSel.value = F.paper;
      row.append(exSel, pSel);
    }
    const chip = (set, k, t) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(set.has(k)), text: t, onclick: () => { set.has(k) ? set.delete(k) : set.add(k); F.page = 0; drawFilters(); drawResults(); } });
    const nMore = (F.tp ? 1 : 0) + F.lv.size + F.ty.size;
    const more = h('details', { class: 'pt-more' }, h('summary', { text: 'More filters' + (nMore ? ' (' + nMore + ' on)' : '') }),
      h('div', { class: 'pt-frow' }, tpSel),
      h('div', { class: 'pt-frow' }, h('span', { class: 'pt-hint', text: 'Level' }), h('div', { class: 'chips' }, chip(F.lv, 'L1', 'L1 easy'), chip(F.lv, 'L2', 'L2 medium'), chip(F.lv, 'L3', 'L3 hard'))),
      h('div', { class: 'pt-frow' }, h('span', { class: 'pt-hint', text: 'Type' }), h('div', { class: 'chips' }, chip(F.ty, 'MCQ', 'MCQ'), chip(F.ty, 'MSQ', 'MSQ'), chip(F.ty, 'Numerical', 'Numerical'))));
    more.open = !!F.more || !!nMore; more.addEventListener('toggle', () => { F.more = more.open; });
    filt.append(row, more);
  }
  const PER = 12;
  function drawResults() {
    const P0 = pool(), have = selIds(), pages = Math.max(1, Math.ceil(P0.length / PER)); F.page = Math.min(F.page, pages - 1);
    const slice = P0.slice(F.page * PER, F.page * PER + PER);
    resHead.textContent = '';
    resHead.append(h('span', { text: P0.length + ' question' + (P0.length === 1 ? '' : 's') + ' match' }),
      h('span', { class: 'pt-actions' },
        h('button', { type: 'button', class: 'btn', text: 'Add this page', disabled: !slice.length, onclick: () => add(slice) }),
        h('button', { type: 'button', class: 'btn', text: 'Add 10 random', disabled: !P0.length, onclick: () => add(P0.filter(x => !have.has(x.i)).sort(() => Math.random() - 0.5).slice(0, 10)) }),
        F.paper || F.src === 'ws' ? h('button', { type: 'button', class: 'btn pri', text: F.paper ? 'Add whole paper' : 'Add whole worksheet', disabled: !P0.length, onclick: () => add(P0) }) : null));
    results.textContent = '';
    if (!P0.length) results.append(empty('No questions match', F.src === 'ws' ? 'Pick a worksheet above.' : 'Loosen a filter above. Only MCQ, MSQ and numerical questions with an answer key can be used in online tests.'));
    slice.forEach(q => {
      const on = have.has(q.i), s = snap(q);
      const b = h('button', { type: 'button', class: 'btn' + (on ? '' : ' pri'), text: on ? 'Added ✓' : 'Add', disabled: on || S.locked, onclick: () => add([q]) });
      results.append(qCard(s, 0, { right: h('span', { class: 'pt-qmeta' }, h('span', { class: 'pt-hint', text: s.id + ' · ' + s.src + ' · ' + (q.d || '') }), b) }));
    });
    results.querySelectorAll('.pt-qh strong').forEach(x => x.remove());
    pager.textContent = '';
    if (pages > 1) pager.append(h('button', { type: 'button', class: 'btn', text: '‹ Previous', disabled: F.page === 0, onclick: () => { F.page--; drawResults(); } }), h('span', { text: 'Page ' + (F.page + 1) + ' of ' + pages }), h('button', { type: 'button', class: 'btn', text: 'Next ›', disabled: F.page >= pages - 1, onclick: () => { F.page++; drawResults(); } }));
    mathIn(results);
  }
  function add(qs) {
    if (S.locked) { toast('Students have submitted this test, so its questions cannot change.'); return; }
    const have = selIds(); let n = 0;
    qs.forEach(q => { if (!have.has(q.i) && S.sel.length < 200) { S.sel.push(snap(q)); have.add(q.i); n++; } });
    if (S.sel.length >= 200) toast('A test can have at most 200 questions.');
    if (n) toast(n + ' question' + (n === 1 ? '' : 's') + ' added');
    drawSel(); drawResults(); drawFoot();
  }
  function drawSel() {
    const pos = parseFloat(fPos.value) || 0;
    selHead.textContent = 'Selected questions · ' + S.sel.length + (S.sel.length ? ' · ' + num(S.sel.length * pos, 1) + ' marks' : '');
    selBox.textContent = '';
    if (!S.sel.length) { selBox.append(empty('No questions yet', 'Add questions from the list.')); return; }
    S.sel.forEach((q, i) => selBox.append(h('div', { class: 'pt-si' }, h('b', { text: i + 1 }), h('span', { class: 'pt-si-t', html: qText(String(q.q).slice(0, 160)) + (String(q.q).length > 160 ? '…' : '') }),
      h('span', { class: 'pt-hint', text: q.type + (q.tp ? ' · ' + q.tp : '') }),
      S.locked ? null : h('span', { class: 'pt-si-b' },
        h('button', { type: 'button', class: 'pt-ib', title: 'Move up', 'aria-label': 'Move question ' + (i + 1) + ' up', text: '↑', disabled: i === 0, onclick: () => { [S.sel[i - 1], S.sel[i]] = [S.sel[i], S.sel[i - 1]]; drawSel(); } }),
        h('button', { type: 'button', class: 'pt-ib', title: 'Move down', 'aria-label': 'Move question ' + (i + 1) + ' down', text: '↓', disabled: i === S.sel.length - 1, onclick: () => { [S.sel[i + 1], S.sel[i]] = [S.sel[i], S.sel[i + 1]]; drawSel(); } }),
        h('button', { type: 'button', class: 'pt-ib', title: 'Remove', 'aria-label': 'Remove question ' + (i + 1), text: '✕', onclick: () => { S.sel.splice(i, 1); drawSel(); drawResults(); drawFoot(); drawSum(); } })))));
    mathIn(selBox);
  }
  async function save() {
    msg.className = 'pt-msg'; msg.textContent = '';
    const row = { title: fTitle.value.trim(), duration_min: parseInt(fMins.value, 10), marks_correct: parseFloat(fPos.value), marks_wrong: parseFloat(fNeg.value) || 0,
      target_classes: [...S.cls], target_streams: [...S.streams], school: fSchool.multi ? (fSchool.values()[0] || null) : (fSchool.value() || null), schools: fSchool.multi && fSchool.values().length > 1 ? fSchool.values().slice(1) : null, is_active: fAct.checked, questions: S.sel.map(q => ({ id: q.id, type: q.type, q: q.q, o: q.o, a: q.a, ch: q.ch, chn: q.chn, tp: q.tp, f: q.f || null })) };
    const bad = !row.title ? 'Give the test a title.' : !S.cls.size ? 'Choose the class (or classes) that should take this test.' : !S.streams.size ? 'Choose the stream (or streams) that should take this test.' : !(row.duration_min >= 1 && row.duration_min <= 600) ? 'Duration must be 1 to 600 minutes.' : !(row.marks_correct > 0) ? 'Marks for a correct answer must be more than 0.' : row.marks_wrong < 0 ? 'Negative marks cannot be below 0.' : !S.sel.length ? 'Add at least one question.' : '';
    if (bad) { const st = /questions?\.$|^Add at least/.test(bad) ? 2 : 1; if (st === 1) { m1.textContent = bad; m1.className = 'pt-msg bad'; } else { toast(bad); } goStep(st); return; }
    if (S.locked) { delete row.questions; delete row.marks_correct; delete row.marks_wrong; }
    if (!S.id && !row.schools) delete row.schools;   /* a new single-school test does not need the column (older databases lack it) */
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    const q = S.id ? sb().from('tests').update(row).eq('id', S.id).select('id,code').single() : sb().from('tests').insert(row).select('id,code').single();
    let { data, error } = await q;
    if (error && row.schools && /schools/i.test(error.message || '')) {
      /* the database has not been updated for several schools yet: make one test per school instead */
      const all = [row.school].concat(row.schools);
      const r2 = await sb().from('tests').insert(all.map(sc => Object.assign({}, row, { school: sc, schools: null }))).select('id,code,school');
      saveBtn.disabled = false; saveBtn.textContent = 'Save test';
      if (r2.error) { msg.textContent = 'Could not save: ' + r2.error.message; msg.classList.add('bad'); return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Saved';
      modal(r2.data.length + ' tests saved', h('div', {}, h('p', { text: 'The database is not yet set up for one link across several schools (the admin needs to run the updated supabase/schema.sql once), so one test was made for each school. Share the matching link with each school.' }),
        h('div', { class: 'pt-multilinks' }, r2.data.map(d => h('div', { class: 'pt-link' }, h('b', { text: d.school }), h('code', { text: testLink(d.code) }))))),
        [{ text: 'My Tests', onclick: () => { location.hash = '#/my-tests'; } }, { text: 'Copy all links', pri: true, onclick: () => { copy(r2.data.map(d => d.school + '\n' + testLink(d.code)).join('\n\n'), 'Links copied'); return false; } }]);
      return;
    }
    saveBtn.disabled = false; saveBtn.textContent = S.id ? 'Save changes' : 'Save test';
    if (error) { msg.textContent = 'Could not save: ' + error.message; msg.classList.add('bad'); return; }
    S.id = data.id; S.code = data.code;
    const url = testLink(data.code);
    modal('Test saved', h('div', {}, h('p', { text: 'Share this link with your students. They sign in, then take the test.' }), h('div', { class: 'pt-link' }, h('code', { text: url }))),
      [{ text: 'My Tests', onclick: () => { location.hash = '#/my-tests'; } }, { text: 'Copy link', pri: true, onclick: () => { copy(url, 'Link copied'); return false; } }]);
  }
  const saveBtn = h('button', { type: 'button', class: 'btn pri', text: S.id ? 'Save changes' : 'Save test', onclick: save });
  fPos.addEventListener('input', () => { drawSel(); drawFoot(); }); fMins.addEventListener('input', drawFoot);
  /* three steps: 1 details, 2 add questions, 3 review and save */
  let step = 1;
  const m1 = h('p', { class: 'pt-msg', role: 'alert' });
  const check1 = () => !fTitle.value.trim() ? 'Give the test a title.' : !S.cls.size ? 'Choose the class (or classes) that should take this test.' : !S.streams.size ? 'Choose the stream (or streams) that should take this test.'
    : !(parseInt(fMins.value, 10) >= 1 && parseInt(fMins.value, 10) <= 600) ? 'Duration must be 1 to 600 minutes.' : !(parseFloat(fPos.value) > 0) ? 'Marks for a correct answer must be more than 0.' : (parseFloat(fNeg.value) || 0) < 0 ? 'Negative marks cannot be below 0.' : '';
  const sec1 = h('div', { class: 'pt-step pt-s1' },
    card(h('h2', { text: 'Who is this test for?' }),
      fld('Test title', fTitle),
      h('div', { class: 'pt-fld' }, h('span', {}, 'Class', h('b', { class: 'pt-req', text: ' *' })), fCls), h('div', { class: 'pt-fld' }, h('span', {}, 'Stream', h('b', { class: 'pt-req', text: ' *' })), fStr),
      fld('School', fSchool, can('isAdmin') ? 'Tick one or more schools: one test, one link, open to all the schools you tick. Leave it on All schools for a test that every school can take.' : 'Only students of your school, in the classes and streams chosen above, can see and take this test.')),
    h('div', { class: 'pt-s1-right' }, card(h('h2', { text: 'Time and marking' }),
      h('div', { class: 'pt-row3' }, fld('Duration (minutes)', fMins), fld('Marks if correct', fPos), fld('Negative marks', fNeg, 'For a wrong MCQ answer')),
      h('label', { class: 'pt-switch', for: 'ctAct' }, fAct, h('span', { text: 'Active: students can open the test now' })),
      S.locked ? h('p', { class: 'pt-note', text: 'Students have already submitted this test, so the questions and marks are locked. You can still change the title, class, school and on/off.' }) : null, m1)));
  const sec2 = h('div', { class: 'pt-step pt-q2' },
    h('aside', { class: 'pt-q2-side' }, card(h('h2', { text: 'Find questions' }), filt)),
    h('div', { class: 'pt-q2-main' }, card(h('h2', { text: 'Add questions' }), h('p', { class: 'pt-hint', text: 'Tap Add on a question. Only MCQ, MSQ and numerical questions with an answer key can be used.' }), resHead, results, pager)));
  const reviewCard = card(h('h2', { text: 'Review' }), h('div', { class: 'pt-sum', id: 'ctSum' }));
  const sec3 = h('div', { class: 'pt-step pt-s3' }, reviewCard,
    card(selHead, selBox, h('div', { class: 'pt-actions' },
      h('button', { type: 'button', class: 'btn', text: 'Save as worksheet', onclick: () => { if (!S.sel.length) { toast('Add questions first'); return; } saveWorksheet(S.sel.map(x => x.id), fTitle.value.trim() || 'Worksheet'); } }),
      S.sel.length && !S.locked ? h('button', { type: 'button', class: 'btn', text: 'Clear all', onclick: async () => { if (await confirmBox('Remove all questions?', 'The selected list will be emptied.', 'Clear', true)) { S.sel = []; drawSel(); drawResults(); drawFoot(); } } }) : null), msg));
  const stepper = h('ol', { class: 'pt-steps', 'aria-label': 'Steps' }), foot = h('div', { class: 'pt-foot' });
  const secs = [sec1, sec2, sec3], NAMES = ['Details', 'Questions', 'Review and save'];
  function drawSum() {
    const box = document.getElementById('ctSum'); if (!box) return; const pos = parseFloat(fPos.value) || 0, neg = parseFloat(fNeg.value) || 0;
    box.textContent = '';
    [['Title', fTitle.value.trim() || '—'], ['For', [...S.cls].map(c => c === 'Dropper' ? c : 'Class ' + c).join(', ') + (S.streams.size ? ' · ' + [...S.streams].join(', ') : '') + (fSchool.multi ? ' · ' + (fSchool.values().length ? (fSchool.values().length === 1 ? fSchool.values()[0] : fSchool.values().length + ' schools') : 'all schools') : '') || '—'],
      ['Time', (fMins.value || '—') + ' minutes'], ['Marking', '+' + num(pos, 2) + ' correct · −' + num(neg, 2) + ' wrong'], ['Questions', S.sel.length + ' · ' + num(S.sel.length * pos, 1) + ' marks in total']]
      .forEach(([k, v]) => box.append(h('div', { class: 'pt-sumrow' }, h('span', { class: 'pt-hint', text: k }), h('b', { text: v }))));
  }
  function drawFoot() {
    const pos = parseFloat(fPos.value) || 0;
    foot.textContent = '';
    foot.append(h('span', { class: 'pt-footinfo', text: S.sel.length + ' question' + (S.sel.length === 1 ? '' : 's') + (S.sel.length ? ' · ' + num(S.sel.length * pos, 1) + ' marks' : '') + (fMins.value ? ' · ' + fMins.value + ' min' : '') }),
      h('span', { class: 'pt-actions' },
        step > 1 ? h('button', { type: 'button', class: 'btn', text: '← Back', onclick: () => goStep(step - 1) }) : null,
        step === 1 ? h('button', { type: 'button', class: 'btn pri', text: 'Next: add questions →', onclick: () => goStep(2) }) : null,
        step === 2 ? h('button', { type: 'button', class: 'btn pri', text: 'Review' + (S.sel.length ? ' (' + S.sel.length + ')' : '') + ' →', onclick: () => goStep(3) }) : null,
        step === 3 ? saveBtn : null));
  }
  function goStep(n) {
    if (n >= 2) { const e = check1(); if (e) { m1.textContent = e; m1.className = 'pt-msg bad'; n = 1; } else { m1.textContent = ''; } }
    if (n === 3 && !S.sel.length) { toast('Add at least one question first'); n = 2; }
    step = n; secs.forEach((x, i) => { x.hidden = i + 1 !== n; });
    wiz.append(foot);
    stepper.textContent = '';
    NAMES.forEach((t, i) => stepper.append(h('li', {}, h('button', { type: 'button', class: 'pt-stp' + (i + 1 === n ? ' on' : '') + (i + 1 < n ? ' done' : ''), 'aria-current': i + 1 === n ? 'step' : null, onclick: () => goStep(i + 1) }, h('span', { class: 'pt-stn', text: i + 1 < n ? '✓' : String(i + 1) }), h('span', { class: 'pt-stt', text: t })))));
    if (n === 2) drawResults(); if (n === 3) { drawSel(); drawSum(); } drawFoot();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* older browser */ }
  }
  const wiz = h('div', { class: 'pt-wizard' }, stepper, sec1, sec2, sec3, foot);
  show(head(S.id ? 'Edit test' : 'Create Test', S.id ? 'Link: ' + testLink(S.code) : 'Three quick steps: details, questions, review. Then share the link.', link('#/my-tests', 'My Tests', 'btn')),
    wiz);
  /* the bar is fixed to the bottom of the screen and lined up with the page block (sticky can fail inside scrolling parents) */
  const alignFoot = () => { if (!wiz.isConnected) { window.removeEventListener('resize', alignFoot); return; } const r = wiz.getBoundingClientRect(); foot.style.left = Math.max(0, r.left) + 'px'; foot.style.width = r.width + 'px'; };
  window.addEventListener('resize', alignFoot); if (window.ResizeObserver) new ResizeObserver(alignFoot).observe(wiz);
  drawFilters(); drawSel(); goStep(1); alignFoot();
}

/* ---------- My Tests ---------- */
async function pageMyTests() {
  if (!can('createTests')) return nope('My Tests is for teachers', 'Sign in as a teacher to create tests.');
  show(head('My Tests and Results', ''), loading());
  const list = await rpc('my_tests');
  const top = head('My Tests and Results', list.length ? list.length + ' test' + (list.length === 1 ? '' : 's') : '', link('#/create', '+ Create Test', 'btn pri'));
  if (!list.length) { show(top, card(empty('No tests yet', 'Create your first test from the Question Bank, DPPs or PYQs.', link('#/create', 'Create Test', 'btn pri')))); return; }
  const toggle = async t => { const { error } = await sb().from('tests').update({ is_active: !t.is_active }).eq('id', t.id); if (error) toast('Could not change: ' + error.message); else { toast(t.is_active ? 'Test deactivated: students cannot start it.' : 'Test activated.'); pageMyTests(); } };
  const del = async t => {
    if (!await confirmBox('Delete "' + t.title + '"?', 'The test, its link and ' + (t.submitted ? 'all ' + t.submitted + ' student results' : 'any results') + ' will be deleted for good. Export the CSV first if you need it.', 'Delete', true)) return;
    const { error } = await sb().from('tests').delete().eq('id', t.id); if (error) toast('Could not delete: ' + error.message); else { toast('Test deleted'); pageMyTests(); }
  };
  const preview = async t => { const { data, error } = await sb().from('tests').select('title,questions').eq('id', t.id).single(); if (error) { toast(error.message); return; } previewQs(data.title, data.questions, true); };
  const rename = async t => { const nt = await promptBox('Rename test', 'Title', t.title); if (!nt || nt === t.title) return; const { error } = await sb().from('tests').update({ title: nt }).eq('id', t.id); if (error) toast('Could not rename: ' + error.message); else { toast('Test renamed'); pageMyTests(); } };
  /* the question IDs of a test: the same export / share menu as Saved worksheets */
  const idsOf = async t => { const { data, error } = await sb().from('tests').select('questions').eq('id', t.id).single(); if (error) { toast(error.message); return null; } return (data.questions || []).map(q => q.id).filter(Boolean); };
  /* the line under the title of an exported test: questions, time, marks, +/- marking and the date it was created */
  const infoOf = t => { const n = +t.n_questions || 0, pos = +t.marks_correct || 0, neg = +t.marks_wrong || 0; return ['Questions: ' + n, 'Time: ' + t.duration_min + ' min', 'Maximum marks: ' + num(n * pos, 2), 'Marking: +' + num(pos, 2) + ' / \u2212' + num(neg, 2), 'Date: ' + day(t.created_at)]; };
  /* under the title: class, batch and school, e.g. "11 · JEE · All schools" */
  const subOf = t => [(t.target_classes || []).join(', '), (t.target_streams || []).join(', '), [t.school].concat(t.schools || []).filter(Boolean).join(', ') || 'All schools'].filter(Boolean).join(' \u00b7 ');
  const exp = (t, kind) => async () => { const ids = await idsOf(t); if (ids) TE().exportIds(ids, t.title, kind, 'Test paper', infoOf(t), subOf(t)); };
  const exportBtn = t => can('pdf') ? h('button', { type: 'button', class: 'btn pt-split', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: e => dropMenu(e.currentTarget, [
      { icon: IC.pdf, text: 'Download PDF', sub: 'Print-ready, with the Avanti header', onclick: exp(t, 'pdf') },
      can('docx') ? { icon: IC.docx, text: 'Download Word', sub: 'Editable document', onclick: exp(t, 'docx') } : null,
      can('pptx') ? { icon: IC.pptx, text: 'Download PowerPoint', sub: 'One question per slide', onclick: exp(t, 'pptx') } : null,
      can('share') ? '-' : null,
      can('share') ? { icon: IC.share, text: 'Share PDF…', sub: 'WhatsApp, email or your phone’s apps', onclick: async () => { const ids = await idsOf(t); if (ids) shareWorksheet({ title: t.title, question_ids: ids, label: 'Test paper', info: infoOf(t), subLine: subOf(t) }); } } : null]) },
    h('span', { html: IC.down }), 'Export', h('span', { class: 'pt-caret', 'aria-hidden': 'true', text: '▾' })) : null;
  const moreBtn = t => h('button', { type: 'button', class: 'btn pt-iconbtn pt-ctmore', title: 'More', 'aria-label': 'More actions for ' + t.title, 'aria-haspopup': 'menu', 'aria-expanded': 'false', html: IC.more,
    onclick: e => dropMenu(e.currentTarget, t.mine === false ? [{ icon: IC.eye, text: 'Preview', onclick: () => preview(t) }]
      : [{ icon: IC.eye, text: 'Preview', onclick: () => preview(t) }, { icon: IC.edit, text: 'Edit', onclick: () => { location.hash = '#/edit/' + t.id; } }, { icon: IC.rename, text: 'Rename', onclick: () => rename(t) },
         { icon: IC.power, text: t.is_active ? 'Deactivate' : 'Activate', red: t.is_active, good: !t.is_active, sub: t.is_active ? 'Students cannot start it' : 'Students can start it', onclick: () => toggle(t) }, '-', { icon: IC.del, text: 'Delete', bad: true, onclick: () => del(t) }]) });
  show(top, h('div', { class: 'pt-cards' }, list.map(t => card(
    h('div', { class: 'pt-ct pt-cthead' }, h('div', { class: 'pt-tt' }, h('h3', { text: t.title }), t.is_active ? badge('Active', 'ok') : badge('Inactive', 'mute')), moreBtn(t)),
    t.mine === false ? h('p', { class: 'pt-meta' }, 'By ', h('b', { text: t.owner_name || 'Teacher' }), ' · ' + ([t.school].concat(t.schools || []).filter(Boolean).join(', ') || 'All schools')) : null,
    h('p', { class: 'pt-meta', text: [t.n_questions + ' questions', t.duration_min + ' min', '+' + num(t.marks_correct, 2) + ' / −' + num(t.marks_wrong, 2), 'Class ' + (t.target_classes || []).join(', '), (t.target_streams || []).join(', '), [t.school].concat(t.schools || []).filter(Boolean).join(', ') || 'All schools'].join(' · ') }),
    h('p', { class: 'pt-meta' }, h('b', { text: t.submitted }), ' submitted', t.in_progress ? ' · ' + t.in_progress + ' writing now' : '', ' · created ' + day(t.created_at)),
    h('button', { type: 'button', class: 'pt-link pt-linkcopy', title: 'Tap to copy the link', 'aria-label': 'Copy the test link', onclick: () => copy(testLink(t.code), 'Link copied') }, h('code', { text: testLink(t.code) })),
    h('div', { class: 'pt-actions pt-tact' },
      link('#/results/' + t.id, 'Results', 'btn'),
      t.mine === false ? null : exportBtn(t))))));
}

/* ---------- Practice Tests & Results: every account takes past papers for itself ---------- */
const PAPER_EXAMS = ['JEE Main', 'JEE Advanced', 'IIT-JEE', 'AIEEE', 'KCET', 'NDA', 'IAT'];
const examOfQ = x => x.e === 'KCET' ? 'KCET' : x.e === 'IAT' ? 'IAT' : x.e === 'NDA' ? 'NDA' : x.e === 'Adv' ? (x.y < 2013 ? 'IIT-JEE' : 'JEE Advanced') : (x.y < 2013 ? 'AIEEE' : 'JEE Main');
/* Time and marking of every exam come from the database (table marking_schemes, one row per exam and effective year, so a yearly change never
   touches old results). These are used only if that table cannot be read. */
const SCHEME_FALLBACK = {
  'JEE Main': { duration_min: 75, n_questions: 25, rules: { types: { MCQ: { c: 4, w: 1 }, MSQ: { c: 4, w: 1 }, Numerical: { c: 4, w: 1 } }, mix: { MCQ: 20, Numerical: 5 } } },
  'JEE Advanced': { duration_min: 65, n_questions: 18, rules: { types: { MCQ: { c: 3, w: 1 }, MSQ: { c: 4, w: 1, p: true }, Numerical: { c: 4, w: 0 } }, mix: { MCQ: 4, MSQ: 5, Numerical: 5 } } },
  'KCET': { duration_min: 80, n_questions: 60, rules: { types: { MCQ: { c: 1, w: 0 } }, mix: { MCQ: 60 } } },
  'NDA': { duration_min: 150, n_questions: 120, rules: { types: { MCQ: { c: 2.5, w: 0.83 } }, mix: { MCQ: 120 } } },
  'IAT': { duration_min: 50, n_questions: 15, rules: { types: { MCQ: { c: 4, w: 1 } }, mix: { MCQ: 15 } } },
  'CUET': { duration_min: 60, n_questions: 50, rules: { types: { MCQ: { c: 5, w: 1 } }, mix: { MCQ: 50 } } } };
let SCHEMES = null;
async function schemes() {
  if (SCHEMES) return SCHEMES;
  SCHEMES = Object.assign({}, SCHEME_FALLBACK);
  try { (await rpc('marking_schemes') || []).forEach(r => { if (!SCHEMES[r.exam] || SCHEMES[r.exam].fb !== false || r.effective_year >= (SCHEMES[r.exam].effective_year || 0)) SCHEMES[r.exam] = Object.assign({ fb: false }, r); }); } catch (e) { /* the built-in values stay */ }
  return SCHEMES;
}
const schemeExam = e => ({ 'IIT-JEE': 'JEE Advanced', 'AIEEE': 'JEE Main' }[e] || e);
const mcqRule = sc => (sc.rules && sc.rules.types && sc.rules.types.MCQ) || { c: 4, w: 1 };
const markText = sc => { const r = mcqRule(sc); return '+' + num(r.c, 2) + (r.w ? ' / −' + num(r.w, 2) : ''); };
/* a question as it is stored inside a test (the answer key stays on the server; students never get ids or keys) */
const tq = q => { const x = snap(q); return { id: x.id, type: x.type, q: x.q, o: x.o, a: x.a, ch: x.ch, chn: x.chn, tp: x.tp, f: x.f || null, s: q.s === 'P' ? 'P' : 'N' }; };
const shuffled = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const AUD_NAME = { self: 'Only me', teachers_link: 'Link for Premium teachers', all_teachers: 'All teachers', all_students: 'All students' };
function papersOf(B, exam) {
  const pm = new Map();
  B.qs.forEach(x => { if (x.s === 'P' && x.p && examOfQ(x) === exam && gradable(x)) { const k = paperKey(x); if (!pm.has(k)) pm.set(k, Object.assign(paperInfo(x), { exam, qs: [] })); pm.get(k).qs.push(x); } });
  return [...pm.values()].sort((a, b) => b.t - a.t || a.sh - b.sh || a.label.localeCompare(b.label));
}
async function showMyRank(testId) {
  try {
    const r = await rpc('my_rank', { p_test: testId });
    if (!r) { toast('Your rank appears after you submit the test.'); return; }
    modal('Your rank', h('div', { class: 'pt-stats' }, stat('Rank', '#' + r.rank + ' of ' + r.of), stat('Your score', num(r.score, 2) + ' / ' + num(r.max_score, 2)), stat('Top score', num(r.top, 2))),
      [{ text: 'Close', pri: true, onclick: () => {} }]);
  } catch (e) { toast(e.message); }
}
async function showLinkRanking(testId, title) {
  try {
    const list = await rpc('link_ranking', { p_test: testId });
    modal('Ranking · ' + title, list.length ? h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Rank', 'Teacher', 'School', 'Score', 'Time'].map(x => h('th', { text: x })))),
      h('tbody', {}, list.map(x => h('tr', {}, h('td', { class: 'pt-num', text: '#' + x.rank }), h('td', {}, h('b', { text: x.name || '—' })), h('td', { text: x.school || '—' }),
        h('td', { class: 'pt-num', text: num(x.score, 2) + ' / ' + num(x.max_score, 2) }), h('td', { class: 'pt-num', text: mmss(x.time_taken_sec) })))))) : empty('Nobody has taken it yet', 'Share the link with other Premium teachers.'),
      [{ text: 'Close', pri: true, onclick: () => {} }]);
  } catch (e) { toast(e.message); }
}
async function pagePersonal(arg) {
  const onlyPicker = arg === 'pyq';   /* #/modes/pyq: the paper picker alone (Previous Year Actual Exam) */
  show(head(onlyPicker ? 'Previous Year Actual Exam' : 'Practice Tests & Results', onlyPicker ? 'Full past papers with the real time and marking.' : 'Your tests and results stay in your own account.'), loading('Loading the question papers…'));
  const [ov, B] = await Promise.all([rpc('personal_overview'), fresh(TE().bank())]);
  CHN = B.chapters;
  const perm = AU().perm, isAdm = !!perm.isAdmin, premT = !isAdm && (perm.staff || (P().role === 'teacher' && perm.plan === 'premium'));
  const audOpts = isAdm ? [['self', 'Only me'], ['all_teachers', 'All teachers (this exam is for teachers only)'], ['all_students', 'All students']]
    : premT ? [['self', 'Only me'], ['teachers_link', 'Share a link with Premium teachers']] : null;
  let aud = 'self', exam = PAPER_EXAMS.find(e => papersOf(B, e).length) || PAPER_EXAMS[0];
  const paperBox = h('div', { class: 'pp-papers' }), examBar = h('div', { class: 'pp-exams', role: 'group', 'aria-label': 'Exam' }), audBar = audOpts ? h('div', { class: 'pp-exams', role: 'group', 'aria-label': 'Who is it for' }) : null;
  const SC = await schemes();
  const startPaper = async (paper, btn) => {
    const ex = schemeExam(paper.exam), sc = SC[ex] || SC['JEE Main'], rule = mcqRule(sc);
    const qs = paper.qs.map(tq);
    btn.disabled = true;
    try {
      const r = await rpc('create_personal_test', { p_title: paper.label, p_duration_min: null, p_marks_correct: rule.c, p_marks_wrong: rule.w, p_questions: qs, p_paper_key: paper.key, p_audience: aud, p_exam: ex });
      if (aud === 'self') { try { sessionStorage.setItem('avanti-auto', r.code); } catch (e) { /* no storage */ } location.hash = '#/t/' + r.code; return; }
      if (aud === 'teachers_link') copy(testLink(r.code), 'Link copied. Send it to Premium teachers.'); else toast('Done. The test is live for ' + (aud === 'all_teachers' ? 'all teachers.' : 'all students.'));
      pagePersonal();
    } catch (e) { toast(e.message); btn.disabled = false; }
  };
  const drawPapers = () => {
    examBar.textContent = '';
    PAPER_EXAMS.forEach(e => { const n = papersOf(B, e).length; if (n) examBar.append(h('button', { type: 'button', class: 'pp-chip', 'aria-pressed': String(e === exam), text: e + ' (' + n + ')', onclick: () => { exam = e; drawPapers(); } })); });
    paperBox.textContent = '';
    const sc = SC[schemeExam(exam)] || SC['JEE Main'];
    papersOf(B, exam).forEach(pp => paperBox.append(h('button', { type: 'button', class: 'pp-card', onclick: e => startPaper(pp, e.currentTarget) },
      h('b', { text: pp.label }), h('small', { text: pp.qs.length + ' questions · ' + sc.duration_min + ' min · ' + markText(sc) }), h('span', { class: 'pp-go', text: 'Start ›' }))));
    if (audBar) { audBar.textContent = ''; audOpts.forEach(([k, t]) => audBar.append(h('button', { type: 'button', class: 'pp-chip', 'aria-pressed': String(k === aud), text: t, onclick: () => { aud = k; drawPapers(); } }))); }
  };
  const status = x => !x.attempt_id ? badge('Not started', 'mute') : x.attempt_status === 'submitted' ? badge('Submitted', 'ok') : badge('In progress', 'mid');
  const mineRows = ov.mine.map(x => h('tr', {},
    h('td', {}, h('b', { text: x.title }), h('div', { class: 'pt-hint', text: day(x.created_at) + ' · ' + x.n_questions + ' questions · ' + x.duration_min + ' min' })),
    h('td', {}, badge(AUD_NAME[x.audience] || x.audience, x.audience === 'self' ? 'mute' : 'mid'), x.audience !== 'self' ? h('div', { class: 'pt-hint', text: x.takers + ' taken' }) : null),
    h('td', {}, status(x)), h('td', { class: 'pt-num', text: x.attempt_status === 'submitted' ? num(x.score, 2) + ' / ' + num(x.max_score, 2) : '—' }),
    h('td', {}, h('div', { class: 'pt-actions pt-nowrap' },
      x.attempt_status === 'submitted' ? [link('#/report/' + x.attempt_id, 'Report', 'btn'), h('button', { type: 'button', class: 'btn', text: 'Export', onclick: () => exportResult(x.attempt_id, x.title) })] : ['self', 'teachers_link'].includes(x.audience) ? h('button', { type: 'button', class: 'btn pri', text: x.attempt_id ? 'Resume' : 'Start', onclick: () => { try { sessionStorage.setItem('avanti-auto', x.code); } catch (e) { /* no storage */ } location.hash = '#/t/' + x.code; } }) : null,
      x.audience === 'teachers_link' ? h('button', { type: 'button', class: 'btn', text: 'Copy link', onclick: () => copy(testLink(x.code), 'Link copied') }) : null,
      x.audience === 'teachers_link' ? h('button', { type: 'button', class: 'btn', text: 'Ranking', onclick: () => showLinkRanking(x.id, x.title) }) : null,
      x.audience === 'all_teachers' || x.audience === 'all_students' ? link('#/results/' + x.id, 'Results', 'btn') : null))));
  const takenRows = ov.taken.map(x => h('tr', {},
    h('td', {}, h('b', { text: x.title }), h('div', { class: 'pt-hint', text: AUD_NAME[x.audience] || '' })), h('td', {}, status(x)),
    h('td', { class: 'pt-num', text: x.attempt_status === 'submitted' ? num(x.score, 2) + ' / ' + num(x.max_score, 2) : '—' }),
    h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, x.attempt_status === 'submitted' ? link('#/report/' + x.attempt_id, 'Report', 'btn') : h('button', { type: 'button', class: 'btn pri', text: 'Resume', onclick: () => { location.hash = '#/t/' + x.code; } }),
      x.attempt_status === 'submitted' && ['teachers_link', 'all_teachers'].includes(x.audience) ? h('button', { type: 'button', class: 'btn', text: 'My rank', onclick: () => showMyRank(x.test_id) }) : null))));
  const table = (rows, cols) => h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, cols.map(x => h('th', { text: x })))), h('tbody', {}, rows)));
  drawPapers();
  const startCard = card(h('h2', { text: 'Start a test' }), h('p', { class: 'pt-hint', text: 'Choose the exam, then the paper. The test starts at once with the real time and marking of that paper.' }),
    audBar ? h('div', { class: 'pt-fld' }, h('span', { text: 'Who is it for?' }), audBar) : null, examBar, paperBox);
  if (onlyPicker) { show(head('Previous Year Actual Exam', 'Full past papers with the real time and marking.', link('#/modes', '‹ Tests', 'btn')), startCard); return; }
  show(head('Practice Tests & Results', 'Your tests and results stay in your own account.', link('#/modes', 'Start a new test', 'btn pri')),
    ov.offered.length ? card(h('h2', { text: 'Tests for you' }), h('p', { class: 'pt-hint', text: 'Made by अंक-IT for ' + (P().role === 'student' ? 'students' : 'teachers') + '. Teachers see their own rank only.' }),
      h('div', { class: 'pp-papers' }, ov.offered.map(x => h('button', { type: 'button', class: 'pp-card', onclick: () => { try { sessionStorage.setItem('avanti-auto', x.code); } catch (e) { /* no storage */ } location.hash = '#/t/' + x.code; } },
        h('b', { text: x.title }), h('small', { text: x.n_questions + ' questions · ' + x.duration_min + ' min' }), h('span', { class: 'pp-go', text: 'Start ›' }))))) : null,
    card(h('h2', { text: 'My tests and results' }), ov.mine.length ? table(mineRows, ['Test', 'For', 'Status', 'Score', '']) : empty('No tests yet', 'Open Tests to start your first one.', link('#/modes', 'Tests', 'btn pri'))),
    ov.taken.length ? card(h('h2', { text: 'Tests I took by link' }), table(takenRows, ['Test', 'Status', 'Score', ''])) : null);
}
/* ---------- Tests: five ways to start a test (v975) ----------
   1 Create Your Personal Test · 2 Previous Year Actual Exam · 3 Chapterwise Mock Test · 4 Repeated & Sure-Shot Questions · 5 Full-Length Mock.
   Every test is made for the person alone and starts at once. The marks and the time come from the exam's official scheme (table
   marking_schemes); the server stamps them on each question, so they cannot be changed from the browser. */
const isFree = () => { const p = AU().perm; return !(p.premium || p.staff || p.isAdmin); };
async function launchTest(o) {
  const SC = await schemes(), sc = SC[o.exam] || SC['JEE Main'], rule = mcqRule(sc);
  const r = await rpc('create_personal_test', { p_title: o.title, p_duration_min: o.mins == null ? null : o.mins, p_marks_correct: rule.c, p_marks_wrong: rule.w,
    p_questions: o.qs.map(tq), p_paper_key: o.key || null, p_audience: 'self', p_exam: o.exam });
  try { sessionStorage.setItem('avanti-auto', r.code); } catch (e) { /* no storage */ }
  location.hash = '#/t/' + r.code;
}
/* pick n questions, chapters mixed evenly when asked */
function pickN(pool, n, even, used) {
  const list = pool.filter(q => !used.has(q.i)); let out = [];
  if (even) {
    const g = new Map(); shuffled(list).forEach(q => { if (!g.has(q.cc)) g.set(q.cc, []); g.get(q.cc).push(q); });
    const lists = shuffled([...g.values()]); for (let i = 0; out.length < n && lists.some(l => l.length); i++) { const l = lists[i % lists.length]; if (l.length) out.push(l.pop()); }
  } else out = shuffled(list).slice(0, n);
  out.forEach(q => used.add(q.i)); return out;
}
/* the questions of a test: for each type in mix (for example MCQ 20, Numerical 5) about ratioP of them from PYQs and the rest from practice questions */
function compose(poolP, poolN, mix, ratioP, even) {
  const used = new Set(), out = [];
  Object.entries(mix).forEach(([type, n]) => {
    const tp = poolP.filter(q => q.t === type), tn = poolN.filter(q => q.t === type), nP = Math.min(tp.length, Math.round(n * ratioP));
    let got = pickN(tp, nP, even, used).concat(pickN(tn, n - nP, even, used));
    if (got.length < n) got = got.concat(pickN(tp, n - got.length, even, used));
    if (got.length < n) got = got.concat(pickN(tn, n - got.length, even, used));
    out.push(...got);
  });
  return out;
}
const MODES = [
  { k: 'custom', t: 'Create Your Personal Test', d: 'Choose chapters, source, difficulty and how many questions.', mark: 'YOU' },
  { k: 'pyq', t: 'Previous Year Actual Exam', d: 'Full shift-wise past papers with the real time and marking.', mark: 'PYQ' },
  { k: 'chapter', t: 'Chapterwise Mock Test', d: 'Pick a chapter and get a mixed test of PYQs and practice questions.', mark: 'CH', np: true },
  { k: 'sure', t: 'Repeated & Sure-Shot Questions', d: 'Only the questions that came again and again, plus the sure-shot ones.', mark: 'TOP' },
  { k: 'full', t: 'Full-Length Mock', d: 'Mixed chapters, PYQs and practice questions, with the official duration and marking.', mark: 'MOCK', np: true }];
async function pageModes(arg) {
  if (arg === 'pyq') return pagePersonal('pyq');
  if (arg === 'custom') return modeCustom();
  if (arg === 'chapter') return modeChapter();
  if (arg === 'sure') return modeSure();
  if (arg === 'full') return modeFull();
  const free = isFree();
  show(head('Tests', 'Choose how you want to be tested. The test starts at once; your result is saved in Practice Tests & Results.', link('#/personal', 'Practice Tests & Results', 'btn')),
    h('div', { class: 'md-grid' }, MODES.map(m => { const off = free && m.np;
      return h('a', { class: 'md-card' + (off ? ' is-off' : ''), href: off ? '#/membership' : '#/modes/' + m.k, 'aria-label': m.t + (off ? ' (Premium)' : '') },
        h('span', { class: 'md-mark', text: m.mark }), h('b', { text: m.t }), h('small', { text: m.d }),
        off ? h('span', { class: 'md-lock', text: '🔒 Premium' }) : h('span', { class: 'pp-go', text: 'Open ›' })); })));
}
const modeHead = (t, sub) => head(t, sub, link('#/modes', '‹ Tests', 'btn'));
const chip = (text, on, fn, dis) => h('button', { type: 'button', class: 'pp-chip', 'aria-pressed': String(!!on), text, disabled: !!dis, onclick: fn });
async function modeCustom() {
  show(modeHead('Create Your Personal Test', 'Choose what to practise.'), loading('Loading the question bank…'));
  const [B, SC] = await Promise.all([fresh(TE().bank()), schemes()]); CHN = B.chapters;
  const free = isFree(), S = { chs: new Set(), src: new Set(['P']), lv: new Set(['L1', 'L2', 'L3']), n: 20, mins: 60, auto: true };
  const all = B.qs.filter(gradable), chapters = [...CHN.values()].filter(c => all.some(q => q.cc === c.c));
  const pool = () => all.filter(q => (!S.chs.size || S.chs.has(q.cc)) && S.src.has(q.s) && S.lv.has(q.d) && (!free || q.s === 'P'));
  const chBox = h('div', { class: 'pp-exams' }), srcBox = h('div', { class: 'pp-exams' }), lvBox = h('div', { class: 'pp-exams' }), info = h('p', { class: 'pt-hint', role: 'status' });
  const nSel = h('select', { class: 'pt-in', 'aria-label': 'Number of questions', onchange: e => { S.n = +e.target.value; if (S.auto) S.mins = S.n * 3; mins.value = S.mins; draw(); } }, [10, 15, 20, 25, 30, 40, 50].map(n => h('option', { value: n, text: n + ' questions', selected: n === 20 })));
  const mins = h('input', { type: 'number', class: 'pt-in', min: 5, max: 300, value: 60, 'aria-label': 'Time in minutes', oninput: e => { S.auto = false; S.mins = Math.max(5, Math.min(300, +e.target.value || 0)); } });
  const go = h('button', { type: 'button', class: 'btn pri pt-big', text: 'Start test', onclick: async () => {
    go.disabled = true;
    try { const P2 = pool(), qs = shuffled(P2).slice(0, S.n); await launchTest({ title: 'Personal test · ' + (S.chs.size === 1 ? (CHN.get([...S.chs][0]) || {}).n : S.chs.size ? S.chs.size + ' chapters' : 'all chapters'), qs, exam: 'JEE Main', mins: S.mins, key: 'custom' }); }
    catch (e) { toast(e.message); go.disabled = false; } } });
  function draw() {
    chBox.textContent = ''; chapters.forEach(c => chBox.append(chip(c.c + ' ' + c.n, S.chs.has(c.c), () => { S.chs.has(c.c) ? S.chs.delete(c.c) : S.chs.add(c.c); draw(); })));
    srcBox.textContent = ''; srcBox.append(chip('PYQs', S.src.has('P'), () => { S.src.has('P') && S.src.size > 1 ? S.src.delete('P') : S.src.add('P'); draw(); }),
      chip(free ? '🔒 Practice questions (Premium)' : 'Practice questions', S.src.has('N'), () => { if (free) { location.hash = '#/membership'; return; } S.src.has('N') && S.src.size > 1 ? S.src.delete('N') : S.src.add('N'); draw(); }));
    lvBox.textContent = ''; [['L1', 'Level 1 · Easy'], ['L2', 'Level 2 · Moderate'], ['L3', 'Level 3 · Tough']].forEach(([k, t]) => lvBox.append(chip(t, S.lv.has(k), () => { S.lv.has(k) && S.lv.size > 1 ? S.lv.delete(k) : S.lv.add(k); draw(); })));
    const n = pool().length; info.textContent = n + ' matching questions' + (n < S.n ? '. The test will have ' + n + '.' : '.') + ' Marking: ' + markText(SC['JEE Main']) + '.';
    go.disabled = n < 3;
  }
  draw();
  show(modeHead('Create Your Personal Test', 'Choose chapters, source, difficulty and the number of questions.'),
    card(h('h2', { text: 'Chapters' }), h('p', { class: 'pt-hint', text: 'Leave all unselected for every chapter.' }), chBox),
    card(h('h2', { text: 'Source' }), srcBox, h('h2', { text: 'Difficulty' }), lvBox),
    card(h('div', { class: 'pt-fld' }, h('span', { text: 'Number of questions' }), nSel), h('div', { class: 'pt-fld' }, h('span', { text: 'Time (minutes)' }), mins), info, go));
}
async function modeChapter() {
  if (isFree()) { location.hash = '#/membership'; return; }
  show(modeHead('Chapterwise Mock Test', 'Choose a chapter.'), loading('Loading the question bank…'));
  const [B, SC] = await Promise.all([fresh(TE().bank()), schemes()]); CHN = B.chapters;
  const all = B.qs.filter(gradable), sc = SC['JEE Main'];
  const cards = [...CHN.values()].map(c => { const p = all.filter(q => q.cc === c.c); return { c, n: p.length, np: p.filter(q => q.s === 'N').length, py: p.filter(q => q.s === 'P').length }; }).filter(x => x.n >= 10);
  show(modeHead('Chapterwise Mock Test', 'Pick a chapter. You get ' + sc.n_questions + ' questions: PYQs and practice questions mixed. ' + sc.duration_min + ' minutes, ' + markText(sc) + '.'),
    h('div', { class: 'pp-papers' }, cards.map(x => h('button', { type: 'button', class: 'pp-card', onclick: async e => {
      const b = e.currentTarget; b.disabled = true;
      try {
        const p = all.filter(q => q.cc === x.c.c), qs = compose(p.filter(q => q.s === 'P'), p.filter(q => q.s === 'N'), sc.rules.mix, 0.5, false), n = qs.length;
        await launchTest({ title: x.c.n + ' · chapterwise mock', qs, exam: 'JEE Main', mins: Math.max(10, Math.round(sc.duration_min * n / sc.n_questions)), key: 'chapter-' + x.c.c });
      } catch (err) { toast(err.message); b.disabled = false; } } },
      h('b', { text: x.c.c + ' ' + x.c.n }), h('small', { text: x.py + ' PYQs · ' + x.np + ' practice questions' }), h('span', { class: 'pp-go', text: 'Start ›' })))));
}
async function modeSure() {
  show(modeHead('Repeated & Sure-Shot Questions', 'Only the questions that came again and again, and the ones sure to come.'), loading('Loading…'));
  const [B, SC] = await Promise.all([fresh(TE().bank()), schemes()]); CHN = B.chapters;
  let must = []; try { must = await window.AvantiContent.get('must.json'); } catch (e) { must = []; }
  const sc = SC['JEE Main'], byCh = new Map();
  (must || []).forEach(m => { const qs = (m.i || []).map(it => B.byId.get(it.r)).filter(q => q && gradable(q)); if (qs.length) byCh.set(m.c, qs); });
  if (!byCh.size) { show(modeHead('Repeated & Sure-Shot Questions', ''), card(empty('Not available yet', 'The repeated-question list could not be loaded.'))); return; }
  let cur = '';   /* '' = all chapters */
  const chips = h('div', { class: 'pp-exams' }), info = h('p', { class: 'pt-hint', role: 'status' });
  const pool = () => (cur ? byCh.get(cur) || [] : [...byCh.values()].flat());
  const go = h('button', { type: 'button', class: 'btn pri pt-big', text: 'Start test', onclick: async () => {
    go.disabled = true;
    try { const p = pool(), n = Math.min(sc.n_questions, p.length), qs = compose(p, [], { MCQ: Math.min(20, p.filter(q => q.t === 'MCQ').length), Numerical: Math.min(5, p.filter(q => q.t === 'Numerical').length) }, 1, !cur);
      const more = pickN(p, n - qs.length, !cur, new Set(qs.map(q => q.i))); await launchTest({ title: 'Repeated & sure-shot · ' + (cur ? (CHN.get(cur) || {}).n : 'all chapters'), qs: qs.concat(more), exam: 'JEE Main', mins: Math.max(10, Math.round(sc.duration_min * n / sc.n_questions)), key: 'sure-' + (cur || 'all') }); }
    catch (e) { toast(e.message); go.disabled = false; } } });
  function draw() {
    chips.textContent = ''; chips.append(chip('All chapters', cur === '', () => { cur = ''; draw(); }));
    [...byCh.keys()].forEach(c => chips.append(chip(c + ' ' + ((CHN.get(c) || {}).n || ''), cur === c, () => { cur = c; draw(); })));
    const n = pool().length; info.textContent = n + ' repeated and sure-shot questions here. The test has up to ' + sc.n_questions + ' of them (' + sc.duration_min + ' min, ' + markText(sc) + ').'; go.disabled = n < 3;
  }
  draw(); show(modeHead('Repeated & Sure-Shot Questions', 'Choose a chapter, or all of them.'), card(chips, info, go));
}
const FULL_EXAMS = [['JEE Main', 'Main'], ['JEE Advanced', 'Adv'], ['KCET', 'KCET'], ['NDA', 'NDA'], ['IAT', 'IAT'], ['CUET', null]];
async function modeFull() {
  if (isFree()) { location.hash = '#/membership'; return; }
  show(modeHead('Full-Length Mock', 'Official duration and marking.'), loading('Loading the question bank…'));
  const [B, SC] = await Promise.all([fresh(TE().bank()), schemes()]); CHN = B.chapters;
  const all = B.qs.filter(gradable);
  const cards = FULL_EXAMS.map(([ex, code]) => { const sc = SC[ex]; if (!sc) return null;
    return h('button', { type: 'button', class: 'pp-card', onclick: async e => {
      const b = e.currentTarget; b.disabled = true;
      try {
        const pyq = all.filter(q => q.s === 'P' && (code ? q.e === code : q.cc.startsWith('12'))), np = all.filter(q => q.s === 'N' && (code ? true : q.cc.startsWith('12')));
        const mix = Object.assign({}, sc.rules.mix), qs = compose(pyq, np, mix, 0.6, true);
        if (qs.length < 5) throw new Error('Not enough questions for this mock yet.');
        await launchTest({ title: ex + ' full-length mock', qs, exam: ex, mins: null, key: 'full-' + ex });
      } catch (err) { toast(err.message); b.disabled = false; } } },
      h('b', { text: ex }), h('small', { text: (sc.n_questions || '') + ' questions · ' + sc.duration_min + ' min · ' + markText(sc) }),
      sc.rules.notes && ex === 'JEE Advanced' ? h('small', { class: 'pt-hint', text: '14 questions today: Section 4 needs paragraph questions.' }) : null, h('span', { class: 'pp-go', text: 'Start ›' })); }).filter(Boolean);
  cards.push(h('div', { class: 'pp-card is-off', 'aria-disabled': 'true' }, h('b', { text: 'CBSE Class 12 Boards' }), h('small', { text: 'Code 041 · 3 hours · coming soon' })));
  show(modeHead('Full-Length Mock', 'Mixed chapters. PYQs and practice questions together, with the official duration and marking of the exam.'), h('div', { class: 'pp-papers' }, cards));
}
/* Export the questions of a finished test as a PDF: only questions, with the answer key, or with the key and full explanations */
async function exportResult(attemptId, title) {
  let mode = 'k';
  const opts = [['q', 'Questions only'], ['k', 'Questions + Answer Key'], ['e', 'Questions + Answer Key + Full Explanations']];
  const rows = opts.map(([k, t]) => h('label', { class: 'pt-radio' }, h('input', { type: 'radio', name: 'expmode', value: k, checked: k === mode, onchange: () => { mode = k; } }), h('span', { text: t })));
  modal('Export "' + title + '"', h('div', { class: 'pt-form' }, h('p', { class: 'pt-hint', text: 'Choose what the PDF should contain.' }), rows),
    [{ text: 'Cancel', onclick: () => {} }, { text: 'Download PDF', pri: true, onclick: async () => {
      try {
        const R = await rpc('attempt_report', { p_attempt: attemptId }), ids = (R.items || []).map(i => i.qid).filter(Boolean);
        if (!ids.length) { toast('The questions of this test are not available.'); return; }
        await TE().exportIds(ids, title, 'pdf', 'Test', '', '', { key: mode !== 'q', exp: mode === 'e' });
      } catch (e) { toast(e.message || 'Could not export'); } } }]);
}
/* My School: Premium students and Premium teachers of one school see each other (basic details only) */
async function pageSchool() {
  show(head('My School', ''), loading());
  const list = await rpc('school_people');
  const p = P();
  show(head('My School', (p.school || '') + ' · ' + list.length + ' Premium member' + (list.length === 1 ? '' : 's')),
    card(h('p', { class: 'pt-hint', text: 'Premium teachers and Premium students of your school. Only basic details are shown.' }),
      list.length ? h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Name', 'Role', 'Class', 'Stream / batch'].map(x => h('th', { text: x })))),
        h('tbody', {}, list.map(x => h('tr', {}, h('td', {}, h('b', { text: x.name || '—' })), h('td', { text: x.role }), h('td', { text: x.class || '—' }), h('td', { text: [x.stream, x.batch].filter(Boolean).join(' · ') || '—' })))))) : empty('Nobody else yet', 'Other Premium members of your school appear here.')));
}

/* ---------- Teacher results ---------- */
function csv(rows) { return rows.map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n'); }
function saveCsv(name, rows) {
  const blob = new Blob(['﻿' + csv(rows)], { type: 'text/csv;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function pageResults(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) { location.hash = '#/my-tests'; return; }
  show(head('Results', ''), loading('Loading results…'));
  const R = await rpc('test_results', { p_test: id });
  const t = R.test, s = R.summary || {}, st = R.students || [];
  const fname = t.title.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const exportStudents = () => saveCsv(fname + '_results.csv', [['Rank', 'School rank', 'Name', 'Avanti ID', 'School', 'Class', 'Stream', 'Category', 'Gender', 'Score', 'Max score', 'Correct', 'Wrong', 'Skipped', 'Accuracy %', 'Time (min:sec)', 'Tab switches', 'Submitted at']]
    .concat(st.map(x => [x.rank, x.school_rank, x.name, x.avanti_id, x.school, x.class, x.stream, x.category, x.gender, x.score, x.max_score, x.correct, x.wrong, x.skipped, x.accuracy, mmss(x.time_taken_sec), x.tab_switches, when(x.submitted_at)])));
  const exportQs = () => saveCsv(fname + '_questions.csv', [['Q', 'Question ID', 'Chapter', 'Topic', 'Students', 'Correct', 'Wrong', 'Skipped', 'Correct %', 'Average seconds']]
    .concat((R.questions || []).map(q => [q.pos, q.qid, q.chapter, q.topic, q.total, q.correct, q.wrong, q.skipped, q.correct_pct, q.avg_time_sec])));
  const top = head(t.title, t.n_questions + ' questions · ' + t.duration_min + ' min · max ' + num(t.max_score, 2) + ' marks' + (t.is_active ? '' : ' · inactive'),
    h('button', { type: 'button', class: 'btn', text: 'Copy link', onclick: () => copy(testLink(t.code), 'Link copied') }),
    can('pdf') ? h('button', { type: 'button', class: 'btn pri', text: 'Export CSV', disabled: !st.length, onclick: exportStudents }) : link('#/membership', 'Export CSV (Premium)', 'btn'),
    link('#/my-tests', 'My Tests', 'btn'));
  if (!st.length) { show(top, card(empty('No results yet', (s.in_progress ? s.in_progress + ' student(s) are writing the test now. ' : '') + 'Results appear here when students submit. Share the link: ' + testLink(t.code)))); return; }
  const maxD = Math.max(1, ...R.distribution.map(d => d.count));
  const dist = card(h('h2', { text: 'Score distribution' }), h('p', { class: 'pt-hint', text: 'Students by percentage of the maximum score' }),
    h('div', { class: 'pt-hist', role: 'img', 'aria-label': 'Score distribution chart' }, R.distribution.map(d => h('div', { class: 'pt-hcol', title: d.from + '–' + d.to + '%: ' + d.count + ' students' },
      h('span', { class: 'pt-hv', text: d.count || '' }), h('span', { class: 'pt-hb', style: 'height:' + (d.count / maxD * 100) + '%' }), h('span', { class: 'pt-hl', text: d.from + (d.from === 90 ? '+' : '') })))));
  let filter = '';
  const tbody = h('tbody', {});
  const drawRows = () => {
    tbody.textContent = '';
    st.filter(x => !filter || (String(x.name || '') + ' ' + (x.school || '') + ' ' + (x.avanti_id || '')).toLowerCase().includes(filter)).forEach(x => tbody.append(h('tr', { class: 'pt-click', tabindex: '0', onclick: () => { location.hash = '#/report/' + x.attempt_id; }, onkeydown: e => { if (e.key === 'Enter') location.hash = '#/report/' + x.attempt_id; } },
      h('td', { class: 'pt-num', text: x.rank }), h('td', {}, h('b', { text: x.name || 'Unnamed' }), x.avanti_id ? h('div', { class: 'pt-hint', text: x.avanti_id }) : null),
      h('td', {}, x.school || '—', h('div', { class: 'pt-hint', text: '#' + x.school_rank + ' in school' })), h('td', {}, [x.class, x.stream].filter(Boolean).join(' · ') || '—', h('div', { class: 'pt-hint', text: [x.category, x.gender].filter(Boolean).join(' · ') })),
      h('td', { class: 'pt-num' }, h('b', { text: num(x.score, 2) }), ' / ' + num(x.max_score, 2)), h('td', { class: 'pt-num', text: x.correct + ' / ' + x.wrong + ' / ' + x.skipped }),
      h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-num', text: mmss(x.time_taken_sec) }), h('td', { class: 'pt-num' + (x.tab_switches > 2 ? ' pt-warnc' : ''), text: x.tab_switches }))));
  };
  const table = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Students (ranked)' }), h('input', { type: 'search', class: 'pt-in pt-search', placeholder: 'Search name, school or Avanti ID', 'aria-label': 'Search students', oninput: e => { filter = e.target.value.trim().toLowerCase(); drawRows(); } })),
    h('p', { class: 'pt-hint', text: 'Rank: higher score first, then less time. Click a student to open their report.' }),
    h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Rank', 'Student', 'School', 'Class / category', 'Score', 'C / W / S', 'Accuracy', 'Time', 'Tab switches'].map(x => h('th', { text: x })))), tbody)));
  drawRows();
  const qs = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Question-wise correctness' }), can('pdf') ? h('button', { type: 'button', class: 'btn', text: 'Export CSV', onclick: exportQs }) : null),
    h('div', { class: 'pt-legend' }, h('span', { class: 'lg-c', text: 'Correct' }), h('span', { class: 'lg-w', text: 'Wrong' }), h('span', { class: 'lg-s', text: 'Skipped' })),
    h('div', { class: 'pt-qbars' }, (R.questions || []).map(q => h('div', { class: 'pt-qbar' }, h('b', { text: 'Q' + q.pos }),
      h('span', { class: 'pt-hstack', title: q.correct + ' correct, ' + q.wrong + ' wrong, ' + q.skipped + ' skipped' },
        h('span', { class: 'c', style: 'width:' + (100 * q.correct / q.total) + '%' }), h('span', { class: 'w', style: 'width:' + (100 * q.wrong / q.total) + '%' }), h('span', { class: 's', style: 'width:' + (100 * q.skipped / q.total) + '%' })),
      h('span', { class: 'pt-num', text: pct(q.correct_pct) }), h('span', { class: 'pt-hint pt-qtp', text: q.topic || '' })))));
  const tps = card(h('h2', { text: 'Topic-wise weak areas' }), h('p', { class: 'pt-hint', text: 'Weakest first: share of all answers in the topic that were correct.' }),
    h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Topic', 'Chapter', 'Correct', 'Accuracy (attempted)', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, (R.topics || []).map(x => h('tr', {}, h('td', {}, h('b', { text: x.topic })), h('td', { text: x.chapter || '—' }), h('td', { class: 'pt-num', text: pct(x.correct_pct) }), h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-barcell' }, bar(x.correct_pct, x.correct_pct < 40 ? 'bad' : x.correct_pct < 70 ? 'mid' : 'ok'))))))));
  const maxAvg = Math.max(1, ...(R.schools || []).map(x => Math.max(0, x.average || 0)));
  const sch = card(h('h2', { text: 'Schools compared' }), h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['School', 'Students', 'Average', 'Top', 'Accuracy', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, (R.schools || []).map(x => h('tr', {}, h('td', {}, h('b', { text: x.school })), h('td', { class: 'pt-num', text: x.students }), h('td', { class: 'pt-num', text: num(x.average, 2) }), h('td', { class: 'pt-num', text: num(x.top, 2) }), h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-barcell' }, bar(100 * Math.max(0, x.average) / maxAvg))))))));
  show(top,
    h('div', { class: 'pt-stats' }, stat('Submitted', s.submitted, s.in_progress ? s.in_progress + ' writing now' : null), stat('Average', num(s.average, 2), 'of ' + num(t.max_score, 2)), stat('Highest', num(s.top, 2)), stat('Median', num(s.median, 2)), stat('Accuracy', pct(s.accuracy)), stat('Average time', mmss(s.avg_time_sec))),
    h('div', { class: 'pt-grid2' }, dist, sch), table, qs, tps);
}

/* ---------- Student: available tests, reports ---------- */
async function pageAvailable() {
  show(head('Available tests', ''), loading());
  const [list, past] = await Promise.all([rpc('list_available_tests'), rpc('my_attempts').catch(() => [])]);
  const pastCard = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Past tests' }), past.length ? h('span', { class: 'pt-meta', text: past.filter(a => a.status === 'submitted').length + ' submitted' }) : null),
    past.length ? pastTable(past) : empty('No tests taken yet', 'Your past tests and reports appear here after you submit a test.'));
  const codeIn = h('input', { type: 'text', class: 'pt-in', placeholder: 'Test code or link', 'aria-label': 'Test code or link' });
  const go = h('form', { class: 'pt-frow', onsubmit: e => { e.preventDefault(); const v = codeIn.value.trim(); const m = v.match(/#\/t\/([a-z0-9]+)/i) || v.match(/^([a-z0-9]{6,12})$/i); if (m) location.hash = '#/t/' + m[1].toLowerCase(); else toast('Paste the test link or its code'); } }, codeIn, h('button', { type: 'submit', class: 'btn', text: 'Open' }));
  const p = P();
  const top = head('Available tests', p.role === 'student' ? 'Tests for ' + [p.class ? 'Class ' + p.class : '', p.stream, p.school].filter(Boolean).join(' · ') : 'Tests open to students of ' + (p.school || 'your school') + '. Your own tests are in My Tests and Results.');
  const open = list.filter(t => t.attempt_status !== 'submitted');
  if (!open.length) { show(top, card(empty('No new tests for you right now', 'When your teacher shares a test for your class and stream, it appears here. Got a link? Open it, or paste it below.'), go), pastCard); return; }
  show(top, h('div', { class: 'pt-cards' }, open.map(t => card(
    h('div', { class: 'pt-ct' }, h('h3', { text: t.title }), t.attempt_status === 'submitted' ? badge('Done', 'ok') : t.attempt_status === 'in_progress' ? badge('In progress', 'mid') : badge('New')),
    h('p', { class: 'pt-meta', text: [t.n_questions + ' questions', t.duration_min + ' min', '+' + num(t.marks_correct, 2) + ' / −' + num(t.marks_wrong, 2), 'by ' + t.teacher].join(' · ') }),
    t.attempt_status === 'submitted' ? h('p', { class: 'pt-meta' }, 'Your score: ', h('b', { text: num(t.score, 2) + ' / ' + num(t.max_score, 2) })) : null,
    h('div', { class: 'pt-actions' }, t.attempt_status === 'submitted' ? link('#/report/' + t.attempt_id, 'View report', 'btn pri') : link('#/t/' + t.code, t.attempt_status ? 'Resume test' : 'Start test', 'btn pri'))))),
  pastCard, card(h('h2', { text: 'Have a test link?' }), go));
}
function pastTable(list) {
  return h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', 'Correct / Wrong / Skipped', 'Time', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, list.map(a => h('tr', {}, h('td', {}, h('b', { text: a.title })), h('td', { text: when(a.submitted_at || a.started_at) }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? num(a.score, 2) + ' / ' + num(a.max_score, 2) : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? a.correct + ' / ' + a.wrong + ' / ' + a.skipped : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? mmss(a.time_taken_sec) : '—' }),
      h('td', {}, a.status === 'submitted' ? link('#/report/' + a.id, 'Open report', 'btn pri') : link('#/t/' + a.code, 'Resume', 'btn')))))));
}
async function pageReports() {
  show(head('My Reports', ''), loading());
  const list = await rpc('my_attempts');
  const top = head('My Reports', 'Every test you have taken', link('#/tests', 'Available tests', 'btn'));
  if (!list.length) { show(top, card(empty('No tests taken yet', 'Your reports appear here after you submit a test.', link('#/tests', 'See available tests', 'btn pri')))); return; }
  show(top, card(h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', 'Correct / Wrong / Skipped', 'Time', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, list.map(a => h('tr', {}, h('td', {}, h('b', { text: a.title })), h('td', { text: when(a.submitted_at || a.started_at) }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? num(a.score, 2) + ' / ' + num(a.max_score, 2) : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? a.correct + ' / ' + a.wrong + ' / ' + a.skipped : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? mmss(a.time_taken_sec) : '—' }),
      h('td', {}, a.status === 'submitted' ? link('#/report/' + a.id, 'Open report', 'btn pri') : link('#/t/' + a.code, 'Resume', 'btn')))))))));
}
async function pageReport(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) { location.hash = '#/reports'; return; }
  show(head('Report', ''), loading('Loading the report…'));
  const R = await rpc('attempt_report', { p_attempt: id });
  const a = R.attempt, t = R.test, rk = R.rank || {};
  const att = a.correct + a.wrong, acc = att ? 100 * a.correct / att : null;
  const mine = AU().profile.id && P().role === 'student';
  const top = head(t.title, (mine ? '' : (a.student_name || 'Student') + (a.school ? ' · ' + a.school : '') + ' · ') + 'Submitted ' + when(a.submitted_at),
    ...(mine ? [link('#/reports', 'My Reports', 'btn'), h('button', { type: 'button', class: 'btn', text: 'Export', onclick: () => exportResult(id, t.title) })] : [h('button', { type: 'button', class: 'btn', text: '‹ Back to results', onclick: () => history.back() })]));
  const items = R.items || [];
  /* the student sees the correct answers 3 hours after starting the test (so they cannot be passed on during the test) */
  const keysAt = R.answers_at ? new Date(R.answers_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  const st = { correct: ['Correct', 'ok'], partial: ['Partly correct', 'mid'], wrong: ['Wrong', 'bad'], skipped: ['Not answered', 'mute'] };
  const review = h('div', { class: 'pt-plist' }, items.map(it => qCard({ type: it.type, q: it.q, o: it.o, f: it.f, tp: it.topic }, it.pos - 1, {
    status: it.status, response: it.response, answer: it.correct_answer, code: it.qid,   /* question codes are shown only here, after the test */
    right: h('span', { class: 'pt-qmeta' }, it.status ? badge(st[it.status][0], st[it.status][1]) : badge(it.response ? 'Answered' : 'Not answered', 'mute'), h('span', { class: 'pt-hint', text: (it.marks == null ? '' : (it.marks > 0 ? '+' : '') + num(it.marks, 2) + ' marks · ') + mmss(it.time_sec) })),
    extra: h('p', { class: 'pt-yours' }, 'Your answer: ', h('b', { text: it.response || '—' }), ' · Correct answer: ', h('b', { text: keysAt ? 'shown at ' + keysAt : (it.correct_answer || '—') })) })));
  let only = 'all';
  const filt = h('div', { class: 'seg pt-seg' }, [['all', 'All'], ['wrong', 'Wrong'], ['skipped', 'Not answered'], ['correct', 'Correct']].map(([k, tx]) => h('button', { type: 'button', 'aria-pressed': String(k === only), text: tx, onclick: e => { only = k; filt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target))); review.querySelectorAll('.pt-q').forEach(q => { q.hidden = only !== 'all' && !q.classList.contains('st-' + only); }); } })));
  show(top,
    keysAt ? h('div', { class: 'pt-note', role: 'note' }, h('b', { text: 'Correct answers appear at ' + keysAt + '. ' }), 'They are shown 3 hours after you started the test, so they cannot be shared while others are still writing it. Until then you see your total score and ranks; which answers were right or wrong appears at the same time.') : null,
    !R.full ? h('div', { class: 'pt-upsell' }, h('span', { text: 'You see how you did within your school. Premium students also see their rank among all students who took this test.' }), link('#/membership', 'Upgrade to Premium', 'btn pt-gold')) : null,
    h('div', { class: 'pt-stats' }, stat('Score', num(a.score, 2) + ' / ' + num(a.max_score, 2), R.full && R.stats ? 'Average ' + num(R.stats.average, 2) + ' · Top ' + num(R.stats.top, 2) : 'School average ' + num(R.school_stats && R.school_stats.average, 2) + ' · Top ' + num(R.school_stats && R.school_stats.top, 2)),
      stat('Accuracy', pct(acc), a.correct + ' correct of ' + att + ' attempted'), stat('Time taken', mmss(a.time_taken_sec), 'of ' + t.duration_min + ' min'),
      R.full ? stat('Rank (all students)', rk.overall ? rk.overall + ' of ' + rk.overall_of : '—') : null, stat('Rank in school', rk.school ? rk.school + ' of ' + rk.school_of : '—', a.school || ''),
      stat('Answers', a.correct + ' / ' + a.wrong + ' / ' + a.skipped, 'correct / wrong / not answered')),
    card(h('h2', { text: 'Topic-wise performance' }), h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Topic', 'Questions', 'Correct', 'Wrong', 'Not answered', 'Marks', 'Accuracy', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, (R.topics || []).map(x => h('tr', {}, h('td', {}, h('b', { text: x.topic }), x.chapter ? h('div', { class: 'pt-hint', text: x.chapter }) : null), h('td', { class: 'pt-num', text: x.total }), h('td', { class: 'pt-num', text: x.correct }), h('td', { class: 'pt-num', text: x.wrong }), h('td', { class: 'pt-num', text: x.skipped }), h('td', { class: 'pt-num', text: num(x.marks, 2) }), h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-barcell' }, bar(x.accuracy, x.accuracy == null ? '' : x.accuracy < 40 ? 'bad' : x.accuracy < 70 ? 'mid' : 'ok')))))))),
    card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Question-wise review' }), keysAt ? null : filt), review));
  mathIn(review);
}

/* ---------- Taking a test ---------- */
async function pageTake(code) {
  if (EX) return;
  if (!code) { location.hash = '#/tests'; return; }
  show(loading('Opening the test…'));
  const info = await rpc('test_info', { p_code: code });
  if (!info) { show(card(empty('Test not found', 'This test link is not valid. Ask your teacher for the link again.', link('#/tests', 'Available tests', 'btn')))); return; }
  if (info.is_owner && !['self', 'teachers_link'].includes(info.audience)) { show(card(empty('This is your own test', 'Students open this link to take it. You can preview it and see results from My Tests.', link('#/my-tests', 'My Tests', 'btn pri')))); return; }
  if (info.attempt_status === 'submitted') { location.replace('#/report/' + info.attempt_id); return; }
  if (info.school_pending && !info.attempt_id) { show(card(empty(info.title, 'Your school (' + (P().school || 'not chosen') + ') is waiting for approval by the admin. Tests open after it is approved. Edit profile shows the status.', link('#/profile', 'Edit profile', 'btn')))); return; }
  if (!info.for_me && !info.attempt_id && info.blocked) {
    const prem = /Premium/.test(info.blocked) && AU().perm.plan === 'free';
    show(card(empty(info.title, info.blocked, prem ? link('#/membership', '★ Get Premium', 'btn pri') : link('#/personal', 'Practice Tests & Results', 'btn')))); return;
  }
  if (!info.for_me && !info.attempt_id) {
    const me = P(), otherSchool = info.school && String(info.school).toLowerCase() !== String(me.school || '').toLowerCase();
    const who = otherSchool ? 'students of ' + info.school : (info.target_classes || []).map(c => c === 'Dropper' ? 'Droppers' : 'Class ' + c).join(', ') + ' · ' + (info.target_streams || []).join(', ');
    show(card(empty(info.title, 'This test is only for ' + who + '. You are ' + [me.class === 'Dropper' ? 'a Dropper' : 'in Class ' + (me.class || '?'), me.stream].filter(Boolean).join(' · ') + '. Ask your teacher if you think this is wrong.', link('#/tests', 'Available tests', 'btn')))); return;
  }
  if (!info.is_active && !info.attempt_id) { show(card(empty(info.title, 'This test is not open right now. Ask your teacher.', link('#/tests', 'Available tests', 'btn')))); return; }
  const startBtn = h('button', { type: 'button', class: 'btn pri pt-big', text: info.attempt_status === 'in_progress' ? 'Resume test' : 'Start test', onclick: async () => {
    startBtn.disabled = true; startBtn.textContent = 'Starting…';
    try { const d = await rpc('start_attempt', { p_code: code }); if (d.status === 'submitted') { location.replace('#/report/' + d.attempt_id); return; } try { await document.documentElement.requestFullscreen(); } catch (e) { /* not supported */ } runExam(d); }
    catch (e) { startBtn.disabled = false; startBtn.textContent = 'Start test'; toast(e.message); }
  } });
  let auto = false; try { auto = sessionStorage.getItem('avanti-auto') === code; if (auto) sessionStorage.removeItem('avanti-auto'); } catch (e) { /* no storage */ }
  show(h('div', { class: 'pt-start' }, card(h('p', { class: 'pt-sub', text: info.audience === 'self' ? 'Your personal test' : 'Test by ' + info.teacher }), h('h1', { text: info.title }),
    h('div', { class: 'pt-stats' }, stat('Questions', info.n_questions), stat('Time', info.duration_min + ' min'), stat('Correct', '+' + num(info.marks_correct, 2)), stat('Wrong (MCQ)', '−' + num(info.marks_wrong, 2))),
    h('h2', { text: 'Instructions' }),
    h('ul', { class: 'pt-feats' }, ['The timer runs only while this page is open. If the power or internet goes, the timer pauses by itself. Open the test again within 30 hours to carry on; after 30 hours it is submitted with your saved answers.', 'Your answers are saved automatically every few seconds. If your internet drops, keep going: they are saved again when it returns.', 'Use "Mark for review" to come back to a question. Marked questions with an answer are still marked.', 'Do not switch tabs or apps. Every switch is recorded and your teacher can see it.', 'The test submits by itself when the time is up.'].map(x => h('li', { text: x }))),
    h('p', { class: 'pt-hint', text: 'Signed in as ' + (P().full_name || P().email || P().avanti_id) + (P().school ? ' · ' + P().school : '') }),
    startBtn)));
  if (auto && info.is_active) startBtn.click();   /* started from Practice Tests: begin at once, nothing more to ask */
}

let EX = null;
function exitExam() {
  if (!EX) return;
  clearInterval(EX.tick); clearInterval(EX.auto);
  document.removeEventListener('visibilitychange', EX.onVis); window.removeEventListener('beforeunload', EX.onUnload); window.removeEventListener('offline', EX.onOffline); window.removeEventListener('online', EX.onOnline);
  EX.root.remove(); document.body.classList.remove('ex-on'); EX = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function runExam(d) {
  exitExam();
  const qs = d.questions, ans = {};
  qs.forEach(q => { const a = (d.answers || {})[q.id] || {}; ans[q.id] = { r: a.r == null ? (q.type === 'MSQ' ? [] : '') : a.r, t: +a.t || 0, m: !!a.m, v: !!a.v }; });
  /* the clock counts active time only: the server says how many seconds are left, this page counts down from there and stops while offline */
  const X = EX = { d, qs, ans, cur: 0, tabs: d.tab_switches || 0, dirty: false, saving: false, enter: Date.now(), done: false, left: d.remaining_sec != null ? d.remaining_sec : Math.max(0, d.duration_min * 60 - (Date.parse(d.server_now) - Date.parse(d.started_at)) / 1000), sync: Date.now(), paused: !navigator.onLine };
  const root = X.root = h('div', { class: 'ex', role: 'application', 'aria-label': 'Test: ' + d.title });
  document.body.classList.add('ex-on'); document.body.append(root);
  const timer = h('span', { class: 'ex-timer', role: 'timer', 'aria-live': 'off' });
  const pauseBar = h('div', { class: 'ex-pause', role: 'alert', hidden: true, text: 'No connection: your timer is paused. Your answers are kept on this page and saved again as soon as you are back online.' });
  const saved = h('span', { class: 'ex-saved', role: 'status' });
  const main = h('main', { class: 'ex-main' }), pal = h('div', { class: 'ex-grid' });
  const side = h('aside', { class: 'ex-side', 'aria-label': 'Question palette' },
    h('div', { class: 'ex-who' }, h('b', { text: P().full_name || P().avanti_id || 'Student' }), h('span', { text: qs.length + ' questions' })), pal,
    h('ul', { class: 'ex-legend' }, [['ans', 'Answered'], ['na', 'Not answered'], ['nv', 'Not visited'], ['mk', 'Marked for review'], ['am', 'Answered and marked']].map(([k, t]) => h('li', {}, h('i', { class: 'ex-p ' + k }), t))),
    h('button', { type: 'button', class: 'btn pri ex-submit2', text: 'Submit test', onclick: () => askSubmit() }));
  root.append(h('header', { class: 'ex-top' }, h('strong', { class: 'ex-title', text: d.title }), saved, timer,
    h('button', { type: 'button', class: 'btn ex-qp', text: 'Question paper PDF', title: 'Download the question paper as a PDF', onclick: e => paperPdf(e.currentTarget) }),
    h('button', { type: 'button', class: 'btn ex-palbtn', text: 'Questions', 'aria-expanded': 'false', onclick: e => { const o = root.classList.toggle('pal-open'); e.target.setAttribute('aria-expanded', String(o)); } }),
    h('button', { type: 'button', class: 'btn pri', text: 'Submit', onclick: () => askSubmit() })), pauseBar, h('div', { class: 'ex-body' }, main, side));

  const filled = a => (Array.isArray(a.r) ? a.r.length > 0 : String(a.r).trim() !== '');
  const stateOf = a => (a.m ? (filled(a) ? 'am' : 'mk') : filled(a) ? 'ans' : a.v ? 'na' : 'nv');
  function track() { const now = Date.now(), q = qs[X.cur]; if (q) ans[q.id].t += Math.round((now - X.enter) / 1000); X.enter = now; }
  function payload() { const o = {}; qs.forEach(q => { const a = ans[q.id]; o[q.id] = { r: a.r, t: a.t, m: a.m, v: a.v }; }); return o; }
  async function save(force) {
    if (X.done || X.saving || (!X.dirty && !force)) return;
    X.saving = true; track(); X.dirty = false; saved.textContent = 'Saving…'; saved.className = 'ex-saved';
    try { const r = await rpc('save_attempt', { p_attempt: d.attempt_id, p_answers: payload(), p_tab_switches: X.tabs }); if (r.status === 'time_up') { finish(true); return; } if (r.remaining_sec != null) { X.left = r.remaining_sec; X.sync = Date.now(); } setPaused(false); saved.textContent = 'Saved ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { X.dirty = true; saved.textContent = 'Not saved: offline? Retrying…'; saved.className = 'ex-saved bad'; setPaused(true); }
    X.saving = false;
  }
  function drawPal() {
    pal.textContent = '';
    qs.forEach((q, i) => pal.append(h('button', { type: 'button', class: 'ex-p ' + stateOf(ans[q.id]) + (i === X.cur ? ' cur' : ''), text: i + 1, 'aria-label': 'Question ' + (i + 1) + ': ' + { ans: 'answered', na: 'not answered', nv: 'not visited', mk: 'marked for review', am: 'answered and marked' }[stateOf(ans[q.id])], onclick: () => go(i) })));
  }
  function go(i) { track(); X.cur = Math.max(0, Math.min(qs.length - 1, i)); root.classList.remove('pal-open'); draw(); save(); }
  function draw() {
    const q = qs[X.cur], a = ans[q.id]; a.v = true;
    main.textContent = '';
    let input;
    if (q.type === 'Numerical') {
      input = h('div', { class: 'ex-num' }, h('label', { for: 'exNum', text: 'Your answer (a number)' }),
        h('input', { id: 'exNum', type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'pt-in', value: a.r || '', maxlength: 20, oninput: e => { const v = e.target.value.replace(/[^0-9.\-]/g, ''); if (v !== e.target.value) e.target.value = v; a.r = v; X.dirty = true; drawPal(); } }));
    } else if (q.type === 'SUBJ') {
      /* board-paper written question (Sections B to E): solve on paper, then open the 8 final answers and pick the matching one */
      const open = !!a.ex;
      input = h('div', { class: 'ex-subj' }, h('p', { class: 'pt-hint', text: 'Solve this on paper. Then expand the options and choose your final answer.' }),
        h('button', { type: 'button', class: 'btn ex-expand', 'aria-expanded': String(open), text: open ? 'Hide options' : 'Expand Options', onclick: () => { a.ex = !a.ex; draw(); } }),
        h('div', { class: 'ex-opts', role: 'radiogroup', 'aria-label': 'Final answer', hidden: !open }, (q.o || []).slice(0, 8).map((t, k) => {
          const L = LETTERS[k], on = a.r === L;
          return h('label', { class: 'ex-opt' + (on ? ' on' : '') }, h('input', { type: 'radio', name: 'exo', value: L, checked: on, onchange: () => { a.r = L; X.dirty = true; main.querySelectorAll('.ex-opt').forEach(l => l.classList.toggle('on', l.querySelector('input').checked)); drawPal(); } }), h('b', { text: L }), h('span', { html: qText(t) }));
        })));
    } else {
      const multi = q.type === 'MSQ';
      input = h('div', { class: 'ex-opts', role: multi ? 'group' : 'radiogroup', 'aria-label': 'Options' }, (q.o || []).map((t, k) => {
        const L = LETTERS[k], on = multi ? a.r.includes(L) : a.r === L;
        return h('label', { class: 'ex-opt' + (on ? ' on' : '') },
          h('input', { type: multi ? 'checkbox' : 'radio', name: 'exo', value: L, checked: on, onchange: e => {
            if (multi) { const s = new Set(a.r); e.target.checked ? s.add(L) : s.delete(L); a.r = [...s].sort(); } else a.r = L;
            X.dirty = true; main.querySelectorAll('.ex-opt').forEach(l => l.classList.toggle('on', l.querySelector('input').checked)); drawPal();
          } }), h('b', { text: L }), h('span', { html: qText(t) }));
      }));
    }
    main.append(h('div', { class: 'ex-qh' }, h('strong', { text: 'Question ' + (X.cur + 1) + ' of ' + qs.length }), badge((q.sec ? 'Section ' + q.sec + ' · ' : '') + (q.type === 'MSQ' ? 'MSQ: one or more correct' : q.type === 'Numerical' ? 'Numerical answer' : q.type === 'SUBJ' ? 'Written question: pick the final answer' : 'MCQ: one correct')),
      h('span', { class: 'pt-hint', text: '+' + num(q.mc != null ? q.mc : d.marks_correct, 2) + (() => { const w = q.mw != null ? +q.mw : (q.type === 'MCQ' ? +d.marks_wrong : 0); return w ? ' / −' + num(w, 2) : ''; })() + (q.mp ? ' · partial marks' : '') }),
      X.qtEl = h('span', { class: 'ex-qtime', title: 'Time spent on this question', 'aria-label': 'Time on this question' })),
      h('div', { class: 'ex-q', html: qText(q.q) }), figure(q.f) || '', input,
      h('div', { class: 'ex-nav' },
        h('button', { type: 'button', class: 'btn', text: '‹ Previous', disabled: X.cur === 0, onclick: () => go(X.cur - 1) }),
        h('button', { type: 'button', class: 'btn', text: 'Clear response', onclick: () => { a.r = q.type === 'MSQ' ? [] : ''; X.dirty = true; draw(); } }),
        h('button', { type: 'button', class: 'btn ex-mk', text: a.m ? 'Unmark review' : 'Mark for review & next', onclick: () => { a.m = !a.m; X.dirty = true; if (a.m && X.cur < qs.length - 1) go(X.cur + 1); else { draw(); save(); } } }),
        h('button', { type: 'button', class: 'btn pri', text: X.cur < qs.length - 1 ? 'Save & next ›' : 'Save', onclick: () => { X.dirty = true; if (X.cur < qs.length - 1) go(X.cur + 1); else { save(true); toast('Saved. Press Submit when you are done.'); } } })));
    drawPal(); mathIn(main); tickQ();
  }
  function tickQ() {
    const q = qs[X.cur]; if (!q || !X.qtEl) return;
    const s2 = Math.floor(ans[q.id].t + (Date.now() - X.enter) / 1000);
    X.qtEl.textContent = '\u23f1 ' + Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0');
  }
  /* pause and resume the countdown (no connection = paused; the first save that goes through resumes it with the server's time) */
  function setPaused(on) {
    if (X.paused === on || X.done) return;
    if (on) X.left = Math.max(0, X.left - (Date.now() - X.sync) / 1000); X.sync = Date.now(); X.paused = on;
    pauseBar.hidden = !on; timer.classList.toggle('paused', on); if (on) track(); else X.enter = Date.now();
  }
  X.onOffline = () => setPaused(true); X.onOnline = () => { X.dirty = true; save(true); };
  window.addEventListener('offline', X.onOffline); window.addEventListener('online', X.onOnline);
  /* the question paper as a PDF, made from the questions on this page (the question bank is closed while a test is running) */
  async function paperPdf(btn) {
    btn.disabled = true;
    try {
      const T = TE(); if (!T || !T.rawPaper) throw new Error('The question paper is not available here.');
      await T.rawPaper(qs.map(q => ({ i: q.id, s: q.s === 'P' ? 'P' : 'N', t: q.type, q: q.q, o: q.o || [], a: '', f: q.f || null, tp: q.tp || '', d: 'L2', cc: 'x', e: 'Main' })), d.title, 'Time ' + d.duration_min + ' min');
    } catch (e) { toast(e.message || 'Could not make the PDF'); } finally { btn.disabled = false; }
  }
  function tickTimer() {
    tickQ();
    if (X.paused) { pauseBar.hidden = false; timer.classList.add('paused'); }
    const left = (X.paused ? X.left : X.left - (Date.now() - X.sync) / 1000) * 1000;
    if (left <= 0 && !X.paused) { timer.textContent = '0:00'; finish(true); return; }
    const s = Math.max(0, Math.ceil(left / 1000)), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    timer.textContent = (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0');
    timer.classList.toggle('low', s <= 300);
    if (s === 300) toast('5 minutes left');
  }
  function askSubmit() {
    track();
    const c = { ans: 0, na: 0, nv: 0, mk: 0, am: 0 }; qs.forEach(q => c[stateOf(ans[q.id])]++);
    modal('Submit the test?', h('div', {}, h('ul', { class: 'pt-feats' }, h('li', { text: 'Answered: ' + (c.ans + c.am) }), h('li', { text: 'Not answered: ' + (c.na + c.nv) }), h('li', { text: 'Marked for review: ' + (c.mk + c.am) })),
      h('p', { class: 'pt-hint', text: 'You cannot change your answers after submitting.' })), [{ text: 'Back to test', onclick: () => {} }, { text: 'Submit', pri: true, onclick: () => { finish(false); } }]);
  }
  async function finish(timeUp) {
    if (X.done) return; X.done = true; track();
    clearInterval(X.tick); clearInterval(X.auto);
    main.textContent = ''; main.append(loading(timeUp ? 'Time is up. Submitting your answers…' : 'Submitting your answers…'));
    for (let i = 0; i < 5; i++) {
      try { const r = await rpc('submit_attempt', { p_attempt: d.attempt_id, p_answers: payload(), p_tab_switches: X.tabs }); exitExam(); location.replace('#/report/' + r.attempt_id); toast('Submitted. Here is your report.'); return; }
      catch (e) { main.textContent = ''; main.append(errorBox('Could not submit yet (' + e.message + '). Trying again…')); await new Promise(r => setTimeout(r, 3000)); }
    }
    main.textContent = ''; main.append(errorBox('Your answers were saved, but the test could not be submitted. Check your internet and press Try again.', () => { X.done = false; finish(timeUp); }));
  }
  X.onVis = () => {
    if (X.done) return;
    if (document.visibilityState === 'hidden') { X.tabs++; X.dirty = true; save(true); }
    else modal('Stay on the test', h('p', { text: 'You left the test window. This has happened ' + X.tabs + ' time' + (X.tabs === 1 ? '' : 's') + ' and your teacher can see it. The timer did not stop.' }), [{ text: 'Back to the test', pri: true, onclick: () => {} }]);
  };
  X.onUnload = e => { if (!X.done) { e.preventDefault(); e.returnValue = ''; } };
  document.addEventListener('visibilitychange', X.onVis);
  window.addEventListener('beforeunload', X.onUnload);
  X.tick = setInterval(tickTimer, 1000); X.auto = setInterval(() => save(true), 25000);   /* every save is also a heartbeat for the server's clock */
  tickTimer(); draw();
}

/* ---------- Teachers: students of their school ---------- */
/* Students sign in with Google (the email below). Only students the admin ticks as "Avanti student" sign in with
   Avanti ID + date of birth instead (the server enforces this). */
const COLS = ['student_id', 'email', 'dob', 'full_name', 'class', 'stream', 'category', 'gender', 'session'];
const COL_LBL = { student_id: 'Student ID', email: 'Google email', dob: 'Date of birth', full_name: 'Full name', class: 'Class', stream: 'Stream', category: 'Category', gender: 'Gender', session: 'Session' };
const pickFrom = (list, v) => { const t = String(v == null ? '' : v).trim(); return list.find(x => x.toLowerCase() === t.toLowerCase()) || t; };
function studentForm(o) {
  o = o || {}; const v = o.values || {}, edit = !!o.edit;
  const sel = (id, list, val) => { const x = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: 'Choose…' }), list.map(z => h('option', { value: z, text: z }))); x.value = val || ''; return x; };
  const avTick = o.avantiTick ? h('input', { type: 'checkbox', id: 'sfAvanti', checked: !!o.avanti }) : null;
  const isAv = () => (avTick ? avTick.checked : !!(v.avanti || o.avanti));
  const F = {
    student_id: h('input', { id: 'sfId', class: 'pt-in', type: 'text', maxlength: 40, value: v.student_id || '', placeholder: 'Avanti ID', disabled: edit, autocomplete: 'off' }),
    email: h('input', { id: 'sfMail', class: 'pt-in', type: 'email', maxlength: 200, value: v.email || '', placeholder: 'student@gmail.com', autocomplete: 'off' }),
    dob: h('input', { id: 'sfDob', class: 'pt-in', type: 'date', max: new Date().toISOString().slice(0, 10), value: v.dob || '' }),
    full_name: h('input', { id: 'sfName', class: 'pt-in', type: 'text', maxlength: 120, value: v.full_name || '' }),
    class: sel('sfClass', CLASSES, v.class), stream: sel('sfStream', STREAMS, v.stream),
    category: sel('sfCat', CATEGORIES, v.category), gender: sel('sfGender', GENDERS, v.gender),
    session: sel('sfSession', SESSIONS, v.session || '')
  };
  const req = k => k !== 'session' && !(edit && (k === 'dob' || k === 'email' || k === 'student_id')) && !(k === 'email' && isAv()) && !((k === 'dob' || k === 'student_id') && !isAv());
  const showId = () => edit ? !!v.student_id : isAv();
  const fld = (k, hint) => h('label', { class: 'pt-fld', for: F[k].id }, h('span', {}, COL_LBL[k], k === 'session' ? null : h('b', { class: 'pt-req', text: ' *', hidden: !req(k) })), F[k], hint ? h('small', { text: hint }) : null);
  let idFld = null, idNote = null;
  const node = h('div', { class: 'pt-form' },
    avTick ? h('label', { class: 'pt-fld pt-check', for: 'sfAvanti' }, h('span', {}, avTick, ' Avanti student'), h('small', { text: 'Ticked: signs in with Avanti ID + date of birth (Premium included). Not ticked: signs in with Google using the email below.' })) : null,
    o.hideId ? null : h('div', { class: 'pt-row2' }, idFld = fld('student_id', edit ? 'The ID cannot be changed.' : 'The Avanti student signs in with this ID.'),
      fld('email', isAv() ? 'Optional for Avanti students.' : 'The student signs in with this Google account.')),
    o.hideId || edit ? null : idNote = h('p', { class: 'pt-hint', text: 'The Student ID is made automatically (St + date and time) and shown after saving.' }),
    o.hideId ? null : fld('dob', isAv() ? (edit && !v.dob ? 'Only the admin sees this. It is the Avanti student\'s sign-in password.' : 'Used as the password with the Avanti ID.') : 'Optional (students who are not Avanti students sign in with Google).'),
    fld('full_name'), h('div', { class: 'pt-row2' }, fld('class'), fld('stream')), h('div', { class: 'pt-row2' }, fld('category'), fld('gender')), fld('session', 'Filled from the class: Class 11 → ' + sessionFor('11') + ', Class 12 / Dropper → ' + sessionFor('12') + '.'));
  F.class.addEventListener('change', () => { if (F.class.value) F.session.value = sessionFor(F.class.value); });
  const paintId = () => { if (idFld) idFld.hidden = !showId(); if (idNote) idNote.hidden = isAv(); };
  paintId();
  node.values = () => { const r = {}; COLS.forEach(k => { r[k] = (F[k].value || '').trim(); }); if (!edit && !isAv()) r.student_id = ''; return r; };
  node.missing = () => COLS.filter(k => req(k) && !(o.hideId && (k === 'student_id' || k === 'dob' || k === 'email')) && !node.values()[k]).map(k => COL_LBL[k]);
  node.avanti = () => isAv();
  if (avTick) avTick.addEventListener('change', () => { paintId(); node.querySelectorAll('.pt-fld').forEach(l => { const k = Object.keys(F).find(x => l.contains(F[x])); if (!k) return; const b = l.querySelector('.pt-req'); if (b) b.hidden = !req(k); }); });
  return node;
}
const STUDENT_PLANS = [['free', 'Free student'], ['premium', 'Premium student (2 years for Class 11, 1 year for Class 12 / Dropper, from today)']];   /* "Avanti student" is the tick in the form */
const planSel = (id, val) => { const x = h('select', { id, class: 'pt-in', 'aria-label': 'Student plan' }, STUDENT_PLANS.map(([k, t]) => h('option', { value: k, text: t }))); x.value = val || 'free'; return x; };
async function addStudentFlow(after, defSchool) {
  const admin = can('isAdmin');
  const f = studentForm({ avantiTick: admin }); const msg = h('p', { class: 'pt-msg', role: 'status' });   /* the admin chooses the school; a teacher always adds to their own school */
  const sch = admin ? schoolSelect('addStuSchool', defSchool || '', 'Choose a school', true) : null, plan = admin ? planSel('addStuPlan', 'free') : null;
  modal('Add a student', h('div', {}, h('p', { class: 'pt-hint', text: (admin ? 'Choose the school below. ' : 'Adds the student to ' + (P().school || 'your school') + '. ') + 'They sign in with Google using the email you type' + (admin ? ' (Avanti students: Avanti ID + date of birth).' : '.') }),
      admin ? h('div', { class: 'pt-fld' }, h('span', {}, 'School', h('b', { class: 'pt-req', text: ' *' })), sch, h('small', { text: 'Not in the list? Choose "Other" and type it.' })) : null,
      admin ? h('label', { class: 'pt-fld', for: 'addStuPlan' }, h('span', { text: 'Plan' }), plan, h('small', { text: 'Premium lasts 2 years for Class 11 and 1 year for Class 12 / Dropper, counted from today. Students added by any other teacher are always Free.' })) : null, f, msg),
    [{ text: 'Cancel', onclick: () => {} }, { text: 'Add student', pri: true, onclick: close => {
      const miss = f.missing(); if (admin && !sch.value()) miss.unshift('School'); if (miss.length) { msg.textContent = 'Please fill in: ' + miss.join(', '); msg.className = 'pt-msg bad'; return false; }
      msg.textContent = 'Saving…'; msg.className = 'pt-msg';
      rpc('teacher_add_student', { p: Object.assign(f.values(), admin ? { school: sch.value(), plan: f.avanti() ? 'avanti' : plan.value } : {}) }).then(r => { close(); toast('Added ' + f.values().full_name + ' (ID ' + r.student_id + ')'); if (after) after(); })
        .catch(e => { msg.textContent = e.message; msg.className = 'pt-msg bad'; });
      return false;
    } }]);
}
function pageAddStudent() {
  if (!can('isAdmin')) { location.replace('#/students'); return; }
  if (!can('createTests')) return nope('Adding students is for teachers', '');
  if (can('manageStudents')) { location.replace('#/students'); return; }
  let f = studentForm(); const holder = h('div', {}, f), msg = h('p', { class: 'pt-msg', role: 'status' }), done = h('div', { class: 'pt-plist' });
  const btn = h('button', { type: 'button', class: 'btn pri pt-big', text: 'Add student', onclick: async () => {
    const miss = f.missing(); if (miss.length) { msg.textContent = 'Please fill in: ' + miss.join(', '); msg.className = 'pt-msg bad'; return; }
    btn.disabled = true; msg.textContent = 'Saving…'; msg.className = 'pt-msg';
    try {
      const v = f.values(), r = await rpc('teacher_add_student', { p: v });
      msg.textContent = 'Added. ' + v.full_name + ' can now sign in with Google using ' + v.email + '.'; msg.className = 'pt-msg ok';
      done.prepend(h('div', { class: 'pt-si' }, h('b', { text: '✓' }), h('span', { class: 'pt-si-t', text: v.full_name + ' · ' + r.student_id }), h('span', { class: 'pt-hint', text: 'Class ' + v.class + ' · ' + v.stream + ' · ' + (v.session || sessionFor(v.class)) })));
      f = studentForm(); holder.textContent = ''; holder.append(f);
    } catch (e) { msg.textContent = e.message; msg.className = 'pt-msg bad'; }
    btn.disabled = false;
  } });
  show(head('Add a student', 'Students of ' + (P().school || 'your school') + ' sign in with Google using the email you add here.'),
    h('div', { class: 'pt-grid2' }, card(h('h2', { text: 'Student details' }), holder, h('div', { class: 'pt-actions' }, btn), msg),
      h('div', { class: 'pt-col' }, card(h('h2', { text: 'Added just now' }), done, h('p', { class: 'pt-hint', text: 'Students you add here appear in this list until you leave the page.' })),
        card(h('h2', { text: 'Premium for teachers' }), h('ul', { class: 'pt-feats' }, ['See every student of your school by class and batch, with their test performance', 'Upload a whole class at once from Excel or CSV', 'Edit any student\'s details'].map(x => h('li', { text: x }))), link('#/membership', 'Upgrade to Premium', 'btn pt-gold')))));
}

let XLSX_P = null;
function loadXlsx() { if (!XLSX_P) XLSX_P = new Promise((res, rej) => { if (window.XLSX) return res(); const sc = document.createElement('script'); sc.src = 'vendor/xlsx-0.18.5.full.min.js'; sc.onload = res; sc.onerror = () => { XLSX_P = null; rej(new Error('Could not load the Excel reader. Check your internet connection.')); }; document.head.append(sc); }); return XLSX_P; }
const TEMPLATE_BASE = [COLS, ['', 'priya.sharma@gmail.com', '2008-05-14', 'Priya Sharma', '11', 'JEE', 'OBC-NCL', 'Female', sessionFor('11')], ['', 'rohan.k@gmail.com', '', 'Rohan Kumar', '12', 'NEET', 'General', 'Male', sessionFor('12')]];
const TEMPLATE_SCHOOL = 'JNV South Canara';
function templateRows() {
  if (!can('isAdmin')) return TEMPLATE_BASE;
  return TEMPLATE_BASE.map((r, i) => r.concat(i === 0 ? ['school', 'plan'] : [TEMPLATE_SCHOOL, i === 1 ? 'free' : 'premium']))
    .concat([['2401234567', '', '2008-03-04', 'Asha Verma', '11', 'JEE', 'SC', 'Female', sessionFor('11'), TEMPLATE_SCHOOL, 'avanti']]);
}
async function downloadTemplate(kind) {
  const TEMPLATE = templateRows(), HCOLS = TEMPLATE[0];
  if (kind === 'csv') { saveCsv('students_template.csv', TEMPLATE); return; }
  try {
    await loadXlsx();
    const ws = window.XLSX.utils.aoa_to_sheet(TEMPLATE); ws['!cols'] = HCOLS.map(() => ({ wch: 18 }));
    const help = window.XLSX.utils.aoa_to_sheet([['Column', 'What to write'], ['student_id', 'Only for Avanti students: their Avanti ID. Leave empty for everyone else: a Student ID (St + date and time) is made automatically.'], ['email', 'The student\'s Google email: they sign in with this Google account. Required (not needed for Avanti students).'], ['dob', 'Date of birth, YYYY-MM-DD or DD-MM-YYYY. Optional, except for Avanti students (it is their password).'], ['full_name', 'Full name'], ['class', CLASSES.join(', ') + ' (11th, XI, 12th, XII also work)'], ['stream', STREAMS.join(', ') + ' (PCM is read as JEE, PCB as NEET)'], ['category', CATEGORIES.join(', ')], ['gender', GENDERS.join(', ')], ['session', 'Optional. Leave blank to fill it from the class: Class 11 → ' + sessionFor('11') + ', Class 12 / Dropper → ' + sessionFor('12')]]);
    if (can('isAdmin')) window.XLSX.utils.sheet_add_aoa(help, [['school', 'School name (admin only). Required on every row.'], ['plan', 'free, premium or avanti (admin only). avanti = Avanti student: signs in with Avanti ID + date of birth. Empty = free. Students added by other teachers are always Free.']], { origin: -1 });
    help['!cols'] = [{ wch: 14 }, { wch: 90 }];
    const wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, 'Students'); window.XLSX.utils.book_append_sheet(wb, help, 'How to fill');
    window.XLSX.writeFile(wb, 'students_template.xlsx');
  } catch (e) { toast(e.message); }
}
const HDR = { caste: 'category', 'caste category': 'category', 'social category': 'category', 'category ': 'category', sex: 'gender', 'roll no': 'student_id', 'roll number': 'student_id', 'student name': 'full_name', 'student id': 'student_id', studentid: 'student_id', id: 'student_id', 'avanti id': 'student_id', avanti_id: 'student_id', 'e-mail': 'email', 'email id': 'email', 'google email': 'email', gmail: 'email', 'email address': 'email', 'date of birth': 'dob', 'date_of_birth': 'dob', birthdate: 'dob', name: 'full_name', 'full name': 'full_name', 'student name': 'full_name', 'class': 'class', grade: 'class' };
function normRow(o) {
  const r = {};
  Object.keys(o).forEach(k => { const key = String(k).trim().toLowerCase(); const c = HDR[key] || key.replace(/\s+/g, '_'); if (COLS.includes(c)) r[c] = o[k]; });
  let d = r.dob;
  if (d instanceof Date && !isNaN(d)) { const x = new Date(d.getTime() + 12 * 3600e3); d = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  else if (typeof d === 'number' && window.XLSX) { const p = window.XLSX.SSF.parse_date_code(d); d = p ? p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : String(d); }
  const out = {}; COLS.forEach(k => { out[k] = String((k === 'dob' ? d : r[k]) == null ? '' : (k === 'dob' ? d : r[k])).trim(); });
  const sk = Object.keys(o).find(k => ['school', 'school name'].includes(String(k).trim().toLowerCase())); out.school = sk ? String(o[sk] == null ? '' : o[sk]).trim() : '';
  const pk = Object.keys(o).find(k => String(k).trim().toLowerCase() === 'plan'); out.plan = pk ? String(o[pk] == null ? '' : o[pk]).trim().toLowerCase() : '';
  /* exact values are kept; anything else is converted and listed as a warning, or rejected when it cannot be converted */
  const raw = Object.assign({}, out), warn = [], err = [];
  const conv = { class: v => pickFrom(CLASSES, normClass(v)), stream: v => pickFrom(STREAMS, normStream(v)), category: v => pickFrom(CATEGORIES, normCategory(v)), gender: v => pickFrom(GENDERS, normGender(v)) };
  Object.keys(conv).forEach(k => { out[k] = conv[k](out[k]); });
  let swapped = false;
  if (!CATEGORIES.includes(out.category) && GENDERS.includes(conv.gender(raw.category)) && (!raw.gender || CATEGORIES.includes(conv.category(raw.gender)))) {   /* Category and Gender columns swapped in the file */
    out.category = raw.gender ? conv.category(raw.gender) : ''; out.gender = conv.gender(raw.category); swapped = true;
    warn.push('Category and Gender were in each other\'s columns: Category → ' + (out.category || '?') + ', Gender → ' + out.gender);
  }
  [['class', CLASSES], ['stream', STREAMS], ['category', CATEGORIES], ['gender', GENDERS]].forEach(([k, L]) => {
    if (!out[k]) return;
    if (!L.includes(out[k])) err.push(COL_LBL[k] + ' "' + raw[k] + '" is not one of ' + L.join(', '));
    else if (!(swapped && (k === 'category' || k === 'gender')) && out[k] !== raw[k]) warn.push(COL_LBL[k] + ' "' + raw[k] + '" → ' + out[k]);
  });
  if (!out.session && CLASSES.includes(out.class)) out.session = sessionFor(out.class);
  if (out.plan === 'avanti' && !out.student_id) err.push('Avanti ID missing (student_id column)');
  if (out.plan !== 'avanti') out.student_id = '';   /* made automatically */
  if (can('isAdmin') && !out.school) err.push('school missing');
  if (out.plan && !['free', 'premium', 'avanti'].includes(out.plan)) err.push('plan must be free, premium or avanti');
  if ((out.plan === 'premium' || out.plan === 'avanti') && !can('isAdmin')) err.push('Only the admin can add Premium or Avanti students');
  if (out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) err.push('email not understood');
  if (out.dob && !/^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(out.dob)) err.push('date of birth not understood');
  if (out.session && !/^\d{4}-\d{2}$/.test(out.session)) err.push('Session must look like ' + sessionFor('12'));
  ['full_name', 'class', 'stream', 'category', 'gender'].forEach(k => { if (!out[k]) err.push(COL_LBL[k] + ' missing'); });
  if (out.plan === 'avanti' && !out.dob) err.push('Date of birth missing (needed for Avanti students)');
  if (out.plan !== 'avanti' && !out.email) err.push('Google email missing');
  out._warn = warn.join('; ');
  out._err = err.join('; ');
  return out;
}
async function readSheet(file) {
  await loadXlsx();
  const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }).map(normRow).filter(r => COLS.some(k => r[k]));
}
function bulkUpload(after) {
  const out = h('div', { class: 'pt-bulk' });
  const fileIn = h('input', { type: 'file', accept: '.csv,.xlsx,.xls', id: 'bulkFile', class: 'pt-file' });
  const admin = can('isAdmin');   /* the admin's file has school and plan columns; a teacher's students always go to their own school, Free */
  const body = h('div', {}, h('p', { class: 'pt-hint', text: 'Use the template: one row per student. Columns: ' + templateRows()[0].join(', ') + '. ' + (admin ? 'school is required on every row; plan is free, premium or avanti (empty = free). ' : '') + 'Fill student_id only for Avanti students (their Avanti ID); every other student gets a Student ID made automatically. A student already in the list (same Avanti ID, or same email) is not added again; only their date of birth is saved.' }),
    h('div', { class: 'pt-actions' }, h('button', { type: 'button', class: 'btn', text: '⬇ Template (Excel)', onclick: () => downloadTemplate('xlsx') }), h('button', { type: 'button', class: 'btn', text: '⬇ Template (CSV)', onclick: () => downloadTemplate('csv') })),
    h('label', { class: 'pt-drop', for: 'bulkFile' }, h('b', { text: 'Choose a .xlsx or .csv file' }), h('span', { text: 'Excel or CSV, up to 2000 students' }), fileIn), out);
  let rows = [];
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; out.textContent = ''; if (!f) return;
    out.append(loading('Reading ' + f.name + '…'));
    try { rows = await readSheet(f); } catch (e) { out.textContent = ''; out.append(errorBox('Could not read the file: ' + e.message)); return; }
    out.textContent = '';
    if (!rows.length) { out.append(empty('No students found', 'The first sheet has no rows under the headings. Use the template.')); return; }
    if (rows.length > 2000) { out.append(errorBox('This file has ' + rows.length + ' rows. Upload up to 2000 at a time.')); return; }
    const bad = rows.filter(r => r._err).length, conv = rows.filter(r => !r._err && r._warn).length;
    out.append(h('p', { class: 'pt-meta' }, h('b', { text: rows.length + ' students found' }), bad ? ' · ' + bad + ' with problems (red: these rows will not be saved; fix them in the file and upload again)' : ''),
      conv ? h('div', { class: 'pt-note pt-warnnote', role: 'note' }, h('b', { text: conv + ' row' + (conv === 1 ? '' : 's') + ' will be converted before saving (yellow). ' }), 'Allowed values are Class 11, 12, Dropper · Stream JEE, NEET, KCET (PCM), KCET (PCB) · Category General, Gen-EWS, OBC-NCL, SC, ST · Gender Male, Female, Other. Check each change below before you upload.') : null,
      h('div', { class: 'pt-tw pt-tw-s' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['#'].concat(COLS.map(k => COL_LBL[k]), ['Check']).map(x => h('th', { text: x })))),
        h('tbody', {}, rows.slice(0, 200).map((r, i) => h('tr', { class: r._err ? 'pt-badrow' : r._warn ? 'pt-warnrow' : null }, h('td', { text: i + 1 }), COLS.map(k => h('td', { text: r[k] || (k === 'student_id' ? 'made automatically' : '—') })), h('td', { text: r._err || (r._warn ? 'Will convert: ' + r._warn : 'OK') })))))),
      rows.length > 200 ? h('p', { class: 'pt-hint', text: 'Showing the first 200 rows.' }) : '');
  });
  const close = modal('Bulk upload students', body, [{ text: 'Close', onclick: () => {} }, { text: 'Upload students', pri: true, onclick: () => {
    if (!rows.length) { toast('Choose a file first'); return false; }
    const good = rows.filter(r => !r._err), convN = good.filter(r => r._warn).length;
    if (!good.length) { toast('No row can be saved. Fix the red rows in the file and choose it again.'); return false; }
    if (admin) good.forEach(r => { r.plan = r.plan || 'free'; });
    const go = () => {
    out.prepend(loading('Uploading ' + good.length + ' students…'));
    rpc('teacher_add_students', { p_rows: good.map(r => { const o = Object.assign({}, r); delete o._err; delete o._warn; return o; }) }).then(res => {
      const ok = res.filter(x => x.ok), added = ok.filter(x => x.action === 'added').length, upd = ok.filter(x => x.action === 'exists').length, dobSet = ok.filter(x => x.action === 'dob').length, fail = res.filter(x => !x.ok);
      out.textContent = '';
      out.append(h('div', { class: 'pt-stats' }, stat('Added', added), stat('Date of birth saved', dobSet, 'for students already in the list'), stat('Already registered', upd, 'skipped (other school, or no date given)'), stat('Not saved', fail.length)),
        fail.length ? h('div', { class: 'pt-tw pt-tw-s' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Row', 'Student ID', 'Problem'].map(x => h('th', { text: x })))),
          h('tbody', {}, fail.map(x => h('tr', { class: 'pt-badrow' }, h('td', { text: x.row }), h('td', { text: x.student_id || (good[x.row - 1] || {}).student_id || (good[x.row - 1] || {}).email || '—' }), h('td', { text: x.error })))))) : h('p', { class: 'pt-msg ok', text: 'All students saved.' }));
      rows = []; fileIn.value = ''; if (after) after();
    }).catch(e => { out.querySelector('.pt-state') && out.querySelector('.pt-state').remove(); out.prepend(errorBox(e.message)); });
    };
    if (convN || good.length < rows.length) confirmBox('Upload with changes?', (convN ? convN + ' row' + (convN === 1 ? '' : 's') + ' will be converted to the allowed values exactly as shown in yellow. ' : '') + (rows.length - good.length ? (rows.length - good.length) + ' red row' + (rows.length - good.length === 1 ? '' : 's') + ' will not be uploaded. ' : '') + 'Continue?', 'Upload ' + good.length + ' students').then(ok => { if (ok) go(); });
    else go();
    return false;
  } }]);
  return close;
}
/* Admin only: choose a plan for a teacher or student. Free = no Premium. Premium = until a date (default one year). Avanti = on the Avanti list, Premium included. */
const PLAN_NAMES = { free: 'Free', premium: 'Premium', avanti: 'Avanti', staff: 'Avanti staff' };
function planPicker(cur, until, canPremium, years, teacher) {
  const oneYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + (years || 1)); return d.toISOString().slice(0, 10); };
  const sel = h('select', { class: 'pt-in', id: 'plPlan', 'aria-label': 'Plan' }, ['free', 'premium', 'avanti'].map(k => h('option', { value: k, text: teacher ? { free: 'Free Teacher', premium: 'Premium Teacher (until a date)', avanti: 'Avanti Teacher' }[k] : k === 'avanti' ? 'Avanti student (signs in with Avanti ID + date of birth, Premium included)' : PLAN_NAMES[k] + (k === 'premium' ? ' (until a date)' : '') })));
  sel.value = cur === 'premium' || cur === 'avanti' ? cur : 'free';
  const dt = h('input', { type: 'date', class: 'pt-in', id: 'plUntil', min: new Date().toISOString().slice(0, 10), value: until ? String(until).slice(0, 10) : oneYear() });
  const dtRow = h('label', { class: 'pt-fld', for: 'plUntil' }, h('span', { text: 'Premium until' }), dt);
  const hint = h('small', {});
  const sync = () => {
    dtRow.hidden = sel.value !== 'premium';
    hint.textContent = sel.value === 'free' ? 'Free: view only, no downloads or printing. Signs in with Google.' : sel.value === 'avanti' ? (teacher ? 'Avanti Teacher: Premium included, no end date. Signs in with Google.' : 'Avanti student: signs in with Avanti ID + date of birth; Premium included, no end date.') : 'Premium: PDF downloads and printing until this date. Signs in with Google.';
    const o = [...sel.options].find(x => x.value === 'premium'); if (o) o.disabled = canPremium === false;
  };
  sel.addEventListener('change', sync); sync();
  const node = h('div', { class: 'pt-plan' }, h('label', { class: 'pt-fld', for: 'plPlan' }, h('span', { text: 'Plan' }), sel, hint), dtRow);
  node.start = sel.value;
  node.startUntil = dt.value;
  node.changed = () => sel.value !== node.start || (sel.value === 'premium' && dt.value !== node.startUntil);
  node.value = () => ({ plan: sel.value, until: sel.value === 'premium' ? dt.value : null });
  return node;
}
async function savePlan(target, pick) {
  if (!pick.changed()) return;
  const v = pick.value();
  await rpc('admin_set_plan', { p_user: target.user_id || null, p_student_id: target.user_id ? null : (target.student_id || null), p_plan: v.plan, p_until: v.until });
}
/* Admin only: the six account types for Edit teacher / Edit student. One choice sets the role (student or teacher) and the plan. */
const ACCOUNT_KINDS = [['free_student', 'Free Student'], ['free_teacher', 'Free Teacher'], ['premium_student', 'Premium Student (1 year plan)'], ['premium_teacher', 'Premium Teacher (1 year plan)'], ['avanti_student', 'Avanti Student'], ['avanti_teacher', 'Avanti Teacher']];
const kindOf = (role, planLabel) => { const r = role === 'teacher' ? 'teacher' : 'student'; return planLabel === 'staff' ? 'avanti_teacher' : planLabel === 'avanti' ? 'avanti_' + r : planLabel === 'premium' ? 'premium_' + r : 'free_' + r; };
function accountPicker(role, planLabel, until, opt) {
  opt = opt || {};
  const oneYear = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10); };
  const start = kindOf(role, planLabel);
  const sel = h('select', { class: 'pt-in', id: 'acKind', 'aria-label': 'Account type' }, ACCOUNT_KINDS.map(([k, t]) => h('option', { value: k, text: t, disabled: !!opt.noTeacher && /_teacher$/.test(k) && k !== start })));
  sel.value = start;
  const dt = h('input', { type: 'date', class: 'pt-in', id: 'acUntil', min: new Date().toISOString().slice(0, 10), value: until ? String(until).slice(0, 10) : oneYear() });
  const dtRow = h('label', { class: 'pt-fld', for: 'acUntil' }, h('span', { text: 'Premium until' }), dt);
  const hint = h('small', {});
  const HINT = { free: 'Free: view only, no downloads or printing.', premium: 'Premium: PDF downloads and printing until the date below (one year from today unless you change it).', avanti: 'Avanti: Premium included, no end date.' };
  const sync = () => {
    const kind = sel.value, plan = kind.split('_')[0], r = kind.split('_')[1];
    dtRow.hidden = plan !== 'premium';
    hint.textContent = HINT[plan] + (kind === 'avanti_teacher' ? ' Avanti Teacher has every teacher feature.' : '') + (r !== (role === 'teacher' ? 'teacher' : 'student') ? ' This also changes the account to ' + (r === 'teacher' ? 'a Teacher' : 'a Student') + '.' : '');
  };
  sel.addEventListener('change', sync); sync();
  const node = h('div', { class: 'pt-plan' }, h('label', { class: 'pt-fld', for: 'acKind' }, h('span', { text: 'Account type' }), sel, hint), dtRow);
  node.startUntil = dt.value;
  node.changed = () => sel.value !== start || (sel.value.startsWith('premium') && dt.value !== node.startUntil);
  node.value = () => ({ kind: sel.value, until: sel.value.startsWith('premium') ? dt.value : null });
  return node;
}
async function saveAccount(target, pick) {
  if (!pick.changed()) return;
  const v = pick.value();
  await rpc('admin_set_account', { p_user: target.user_id || null, p_student_id: target.user_id ? null : (target.student_id || null), p_kind: v.kind, p_until: v.until });
}
/* Plan badge for the admin lists: Free / Premium (with the end date) / Avanti / Avanti staff */
function planBadge(x) {
  const k = x.plan_label || (x.plan === 'free' ? 'free' : x.plan === 'staff' ? 'staff' : 'premium');
  return h('span', {}, badge(PLAN_NAMES[k] || 'Free', k === 'free' ? null : 'mid'), k === 'premium' && x.premium_until ? h('div', { class: 'pt-hint', text: 'until ' + day(x.premium_until) }) : null);
}
function editStudent(st, after) {
  if (!can('isAdmin')) { toast('Only the admin can change student details.'); return; }   /* teachers can only view their students */
  const f = studentForm({ edit: true, values: st, hideId: !st.student_id }); const msg = h('p', { class: 'pt-msg', role: 'status' });
  const sch = schoolSelect('esSchool', st.school || '', 'Choose a school', true, { noSchool: true });
  const pick = accountPicker('student', st.plan_label, st.premium_until, { noTeacher: !st.user_id || !!st.student_id });
  modal('Edit ' + (st.full_name || 'student'), h('div', {}, st.student_id ? null : h('p', { class: 'pt-hint', text: 'Signs in with Google: ' + (st.email || '') }), f,
      h('div', { class: 'pt-fld' }, h('span', { text: 'School' }), sch, h('small', { text: 'Not in the list? Choose "Other" and type it.' })), pick, msg),
    [{ text: 'Cancel', onclick: () => {} }, { text: 'Save changes', pri: true, onclick: close => {
      const miss = f.missing(); if (miss.length) { msg.textContent = 'Please fill in: ' + miss.join(', '); msg.className = 'pt-msg bad'; return false; }
      const v = f.values(); delete v.student_id; if (!v.dob || v.dob === st.dob) delete v.dob; if (sch.value()) v.school = sch.value();
      rpc('teacher_update_student', { p_user: st.student_id ? null : st.user_id, p_student_id: st.student_id || null, p: v })
        .then(() => saveAccount(st, pick))
        .then(() => { close(); toast('Saved'); if (after) after(); }).catch(e => { msg.textContent = e.message; msg.className = 'pt-msg bad'; });
      return false;
    } }]);
}
async function studentTests(st) {
  const body = h('div', {}, loading());
  modal((st.full_name || 'Student') + ' · tests', body, [{ text: 'Close', pri: true, onclick: () => {} }]);
  try {
    const list = await rpc('student_attempts', { p_user: st.user_id });
    body.textContent = '';
    body.append(list.length ? h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', 'C / W / S', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, list.map(a => h('tr', {}, h('td', {}, h('b', { text: a.title })), h('td', { text: day(a.submitted_at) }), h('td', { class: 'pt-num', text: num(a.score, 2) + ' / ' + num(a.max_score, 2) }),
        h('td', { class: 'pt-num', text: a.correct + ' / ' + a.wrong + ' / ' + a.skipped }), h('td', {}, h('a', { class: 'btn', href: '#/report/' + a.id, text: 'Report', onclick: () => { const m = document.querySelector('.pt-modal-back'); if (m) m.remove(); } }))))))) : empty('No tests yet', 'This student has not submitted a test.'));
  } catch (e) { body.textContent = ''; body.append(errorBox(e.message)); }
}
let STU_SCHOOL = '', STU_NAME = '', STU_ROWS = new Map();
async function pageStudents() {
  if (!can('manageStudents')) { if (can('createTests')) { location.replace('#/add-student'); return; } if (P().role === 'student') return show(card(empty('My Students is for teachers', 'This page is for teachers. Your tests and reports are in the profile menu.', link('#/tests', 'Available tests', 'btn pri')))); return nope('My Students is for teachers', ''); }
  show(head('My Students', ''), loading('Loading your students…'));
  const R = await rpc('school_students', { p_school: STU_SCHOOL || null });
  const all = R.students || [];
  const IS_ADMIN = can('isAdmin'), DOB_SHOWN = R.dob_visible !== false;
  const noDob = all.filter(x => x.student_id && !x.dob && (IS_ADMIN || x.source !== 'avanti')).length;
  /* The teachers of the same school (Premium teachers and the admin). If the database function is not installed yet, the list is simply left out. */
  const T = await rpc('school_teachers', { p_school: STU_SCHOOL || null }).catch(() => null);
  const F = { cls: '', stream: '', session: '', q: '' };
  STU_NAME = R.school || ''; STU_ROWS = new Map(all.filter(x => x.user_id).map(x => [x.user_id, x]));
  const SORT = { key: 'full_name', dir: 1 };
  const reload = () => pageStudents();
  const uniq = k => [...new Set(all.map(x => x[k]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true }));
  const tbody = h('tbody', {}), countEl = h('span', { class: 'pt-meta' }), thead = h('thead', {});
  const COLS = [['Student', 'full_name'], ['Date of birth', 'dob'], ['Class · Stream', 'class_stream'], ['Session', 'session'], ['Category · Gender', 'cat_gender']].concat(IS_ADMIN ? [['Plan', 'plan_label']] : [], [['Tests', 'tests'], ['Average', 'avg_pct'], ['Last test', 'last_at'], ['', null]]);
  const drawHead = () => { thead.textContent = ''; thead.append(h('tr', {}, COLS.map(([t, k]) => !k ? h('th', {}) : h('th', { 'aria-sort': SORT.key === k ? (SORT.dir > 0 ? 'ascending' : 'descending') : 'none' },
    h('button', { type: 'button', class: 'pt-sortb', title: 'Sort by ' + t, onclick: () => { if (SORT.key === k) SORT.dir *= -1; else { SORT.key = k; SORT.dir = ['tests', 'avg_pct', 'last_at'].includes(k) ? -1 : 1; } draw(); } }, t, h('span', { class: 'pt-sorti', 'aria-hidden': 'true', text: SORT.key === k ? (SORT.dir > 0 ? '▲' : '▼') : '↕' })))))); };
  const draw = () => {
    const q = F.q.toLowerCase();
    const rows = all.filter(x => (!F.cls || x.class === F.cls) && (!F.stream || x.stream === F.stream) && (!F.session || x.session === F.session) && (!q || [x.full_name, x.student_id, x.email].some(v => String(v || '').toLowerCase().includes(q))));
    const val = x => { const k = SORT.key; return k === 'class_stream' ? [x.class, x.stream].filter(Boolean).join(' ') : k === 'cat_gender' ? [x.category, x.gender].filter(Boolean).join(' ') : x[k]; };
    rows.sort((a, b) => { const A = val(a), B = val(b), ea = A == null || A === '', eb = B == null || B === ''; if (ea || eb) return ea && eb ? 0 : ea ? 1 : -1; return (typeof A === 'number' && typeof B === 'number' ? A - B : String(A).localeCompare(String(B), 'en', { numeric: true, sensitivity: 'base' })) * SORT.dir; });
    drawHead();
    countEl.textContent = rows.length + ' of ' + all.length + ' students';
    tbody.textContent = '';
    if (!rows.length) tbody.append(h('tr', {}, h('td', { colspan: 10 }, empty('No students match', all.length ? 'Change the filters above.' : 'Add students one by one, or upload a whole class from Excel.'))));
    rows.forEach(x => tbody.append(h('tr', {},
      h('td', {}, x.user_id ? h('a', { class: 'pt-sname', href: '#/student/' + x.user_id, title: 'Open the dashboard of ' + (x.full_name || 'this student'), text: x.full_name || '—' }) : h('b', { text: x.full_name || '—' }),
        h('div', { class: 'pt-hint', text: (x.student_id ? 'ID ' + x.student_id + (x.email ? ' · ' + x.email : '') : (x.email || 'Google sign-in')) + (x.user_id ? '' : ' · not signed in yet') })),
      h('td', { class: 'pt-num' }, x.dob ? x.dob.split('-').reverse().join('-') : !x.student_id ? 'Google' : x.source === 'avanti' && !IS_ADMIN ? h('span', { class: 'pt-hint', text: 'Admin only', title: 'An Avanti student\'s date of birth is their sign-in password, so only the admin sees it.' }) : !DOB_SHOWN ? h('span', { class: 'pt-hint', text: 'Hidden', title: 'Dates of birth show once Avanti approves your school.' }) : h('span', { class: 'pt-hint', text: 'Not saved yet', title: 'Press Edit and add the date, or upload the class file again. It also fills in when the student signs in.' })),
      h('td', { text: [x.class && (x.class === 'Dropper' ? 'Dropper' : 'Class ' + x.class), x.stream].filter(Boolean).join(' · ') || '—' }), h('td', { text: x.session || '—' }),
      h('td', { text: [x.category, x.gender].filter(Boolean).join(' · ') || '—' }),
      IS_ADMIN ? h('td', {}, planBadge(x)) : null,
      h('td', { class: 'pt-num', text: x.tests }), h('td', { class: 'pt-num pt-barcell' }, x.avg_pct == null ? '—' : [h('span', { text: pct(x.avg_pct) }), bar(x.avg_pct, x.avg_pct < 40 ? 'bad' : x.avg_pct < 70 ? 'mid' : 'ok')]),
      h('td', { class: 'pt-num', text: x.last_at ? day(x.last_at) : '—' }),
      h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, can('isAdmin') ? h('button', { type: 'button', class: 'btn', text: 'Edit', onclick: () => editStudent(x, reload) }) : null,
        x.user_id && x.tests ? h('button', { type: 'button', class: 'btn', text: 'Tests', onclick: () => studentTests(x) }) : null)))));
  };
  const mkSel = (label, all1, list, key) => h('select', { class: 'pt-in', 'aria-label': label, onchange: e => { F[key] = e.target.value; draw(); } }, h('option', { value: '', text: all1 }), list.map(v => h('option', { value: v, text: v })));
  const signed = all.filter(x => x.signed_in).length, took = all.filter(x => x.tests > 0), avg = took.length ? took.reduce((a, x) => a + (+x.avg_pct || 0), 0) / took.length : null;
  let schoolPick = null;
  if (can('isAdmin')) { schoolPick = schoolSelect('stuSchool', R.school, 'Choose a school'); schoolPick.sel.addEventListener('change', () => { STU_SCHOOL = schoolPick.value(); pageStudents(); }); }
  const teachersCard = T == null ? null : card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Teachers of ' + R.school }), h('span', { class: 'pt-meta', text: T.length + ' teacher' + (T.length === 1 ? '' : 's') })),
    T.length ? h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Teacher', 'Plan', 'Tests', 'Joined', 'School approval'].map(x => h('th', { text: x })))),
      h('tbody', {}, T.map(t => h('tr', {},
        h('td', {}, h('b', { text: t.full_name || '—' }), t.is_staff ? h('span', {}, ' ', badge('Avanti staff', 'mid')) : null, h('div', { class: 'pt-hint', text: t.email || '' })),
        h('td', {}, planBadge(t)), h('td', { class: 'pt-num', text: t.tests }), h('td', { text: day(t.created_at) }),
        h('td', {}, t.approved ? badge('Approved', 'ok') : badge('Waiting', 'mid'))))))) : empty('No teachers yet', 'No teacher has chosen this school.'));
  show(head('My Students', R.school + ' · ' + all.length + ' student' + (all.length === 1 ? '' : 's'),
      can('isAdmin') ? h('button', { type: 'button', class: 'btn', text: '+ Add a student', onclick: () => addStudentFlow(reload, STU_SCHOOL) }) : null,
      can('isAdmin') ? h('button', { type: 'button', class: 'btn pri', text: 'Bulk upload', onclick: () => bulkUpload(reload) }) : null),
    schoolPick ? card(h('div', { class: 'pt-fld' }, h('span', { text: 'School (admin: every school)' }), schoolPick)) : null,
    teachersCard,
    can('schoolApproved') ? null : h('div', { class: 'pt-note pt-warnnote' }, h('b', { text: 'Your school is waiting for approval by अंक-IT. ' }), 'Students register themselves and choose their school. You will see them here once your school is approved.'),
    DOB_SHOWN && noDob ? h('div', { class: 'pt-note' }, h('b', { text: noDob + ' student' + (noDob === 1 ? ' has' : 's have') + ' no date of birth saved yet. ' }), 'Upload your Excel sheet with the date of birth column (Bulk upload), or press Edit on a student, to save it. It also fills in when the student signs in once. Dates of birth are shown only to the teachers of the student\u2019s own school and to Avanti admins.') : null,
    DOB_SHOWN ? null : h('div', { class: 'pt-note pt-warnnote' }, h('b', { text: 'Dates of birth are hidden until Avanti approves your school. ' }), 'Then you will see the date of birth of every student of ' + R.school + '.'),
    h('div', { class: 'pt-stats' }, stat('Students', all.length), stat('Signed in', signed), stat('Took a test', took.length), stat('Average score', avg == null ? '—' : pct(avg), 'of students who took a test')),
    card(h('div', { class: 'pt-frow' }, mkSel('Class', 'All classes', CLASSES, 'cls'), mkSel('Stream', 'All streams', STREAMS, 'stream'), mkSel('Session', 'All sessions', uniq('session'), 'session'),
        h('input', { type: 'search', class: 'pt-in', placeholder: 'Search name, ID or email', 'aria-label': 'Search students', oninput: e => { F.q = e.target.value.trim(); draw(); } })), countEl,
      h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t pt-sortable' }, thead, tbody))));
  draw();
}


/* ---------- One student's dashboard (teachers: Premium) ---------- */
async function pageStudent(uid) {
  if (!can('manageStudents') || !/^[0-9a-f-]{36}$/i.test(uid || '')) { location.hash = '#/students'; return; }
  show(head('Student', ''), loading('Loading the student dashboard…'));
  let st = STU_ROWS.get(uid);
  if (!st) { try { const R = await rpc('school_students', { p_school: STU_SCHOOL || null }); STU_ROWS = new Map((R.students || []).filter(x => x.user_id).map(x => [x.user_id, x])); st = STU_ROWS.get(uid); } catch (e) { /* shown below */ } }
  const back = h('a', { class: 'btn', href: '#/students', text: '‹ My Students' });
  const who = st ? [st.class && (st.class === 'Dropper' ? 'Dropper' : 'Class ' + st.class), st.stream, st.session, R_SCHOOL(st)].filter(Boolean).join(' · ') : '';
  let list;
  try { list = await rpc('student_attempts', { p_user: uid }); }
  catch (e) { show(head(st ? st.full_name || 'Student' : 'Student', who, back), card(empty('Student dashboards are part of Premium', /not found/i.test(e.message || '') ? 'This student was not found in your school.' : (e.message || 'Could not load.'), link('#/membership', 'See Premium', 'btn pri')))); return; }
  const done = list.filter(a => a.max_score > 0).map(a => Object.assign({ pct: 100 * a.score / a.max_score }, a)).sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
  const head1 = head(st ? st.full_name || 'Student' : 'Student', who + (st && st.student_id ? ' · ID ' + st.student_id : ''), back);
  if (!done.length) { show(head1, card(empty('No tests taken yet', 'Charts and reports appear here after this student submits a test.'))); return; }
  const n = done.length, avg = done.reduce((t, a) => t + a.pct, 0) / n, best = Math.max(...done.map(a => a.pct)), last = done[n - 1];
  const C = done.reduce((t, a) => t + a.correct, 0), W = done.reduce((t, a) => t + a.wrong, 0), Sk = done.reduce((t, a) => t + a.skipped, 0), acc = C + W ? 100 * C / (C + W) : null;
  const avgTime = done.reduce((t, a) => t + (a.time_taken_sec || 0), 0) / n;
  const trend = n > 1 ? (() => { const k = Math.min(3, Math.floor(n / 2)), f = done.slice(0, k), l = done.slice(-k); return l.reduce((t, a) => t + a.pct, 0) / k - f.reduce((t, a) => t + a.pct, 0) / k; })() : null;
  /* score trend: one point per test */
  const W0 = 640, H0 = 220, L = 38, R2 = 30, T0 = 14, B0 = 30, pw = W0 - L - R2, ph = H0 - T0 - B0;
  const X = i => L + (n === 1 ? pw / 2 : pw * i / (n - 1)), Y = v => T0 + ph * (1 - v / 100), NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, at, kids) => { const e = document.createElementNS(NS, tag); Object.entries(at || {}).forEach(([k, v]) => e.setAttribute(k, v)); (kids || []).forEach(c => e.append(c)); return e; };
  const svg = sv('svg', { viewBox: '0 0 ' + W0 + ' ' + H0, class: 'pt-chart', role: 'img', 'aria-label': 'Score of each test, in order' });
  [0, 25, 50, 75, 100].forEach(v => { svg.append(sv('line', { x1: L, x2: W0 - R2, y1: Y(v), y2: Y(v), class: 'pt-cg' })); const t = sv('text', { x: L - 6, y: Y(v) + 4, class: 'pt-ct-l', 'text-anchor': 'end' }); t.textContent = v + '%'; svg.append(t); });
  svg.append(sv('line', { x1: L, x2: W0 - R2, y1: Y(avg), y2: Y(avg), class: 'pt-cavg' }));
  svg.append(sv('polyline', { points: done.map((a, i) => X(i) + ',' + Y(a.pct)).join(' '), class: 'pt-cline', fill: 'none' }));
  done.forEach((a, i) => { const c = sv('circle', { cx: X(i), cy: Y(a.pct), r: 5, class: 'pt-cdot ' + (a.pct < 40 ? 'bad' : a.pct < 70 ? 'mid' : 'ok') }); const tt = sv('title'); tt.textContent = a.title + ' · ' + day(a.submitted_at) + ' · ' + num(a.pct, 1) + '% (' + num(a.score, 2) + ' / ' + num(a.max_score, 2) + ')'; c.append(tt); svg.append(c);
    if (n <= 12 || i === 0 || i === n - 1) { const t = sv('text', { x: X(i), y: H0 - 10, class: 'pt-ct-l', 'text-anchor': 'middle' }); t.textContent = new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); svg.append(t); } });
  /* answers split */
  const tot = C + W + Sk || 1, seg = (v, cls, lab) => h('span', { class: 'pt-seg-b ' + cls, style: 'width:' + (100 * v / tot) + '%', title: lab + ': ' + v });
  const split = h('div', {}, h('div', { class: 'pt-split' }, seg(C, 'ok', 'Correct'), seg(W, 'bad', 'Wrong'), seg(Sk, 'mute', 'Not answered')),
    h('p', { class: 'pt-legend' }, [['ok', 'Correct', C], ['bad', 'Wrong', W], ['mute', 'Not answered', Sk]].map(([c, l, v]) => h('span', { class: 'pt-lgi' }, h('span', { class: 'pt-lg ' + c }), l + ' ' + v + ' (' + num(100 * v / tot, 0) + '%)'))));
  /* topics over the latest tests (each report is fetched once) */
  const topicBox = h('div', {}, loading('Adding up topics from the latest tests…'));
  const tests = h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', '%', 'C / W / S', 'Time', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, done.slice().reverse().map(a => h('tr', {}, h('td', {}, h('b', { text: a.title })), h('td', { text: day(a.submitted_at) }), h('td', { class: 'pt-num', text: num(a.score, 2) + ' / ' + num(a.max_score, 2) }),
      h('td', { class: 'pt-num pt-barcell' }, h('span', { text: num(a.pct, 1) + '%' }), bar(a.pct, a.pct < 40 ? 'bad' : a.pct < 70 ? 'mid' : 'ok')), h('td', { class: 'pt-num', text: a.correct + ' / ' + a.wrong + ' / ' + a.skipped }),
      h('td', { class: 'pt-num', text: mmss(a.time_taken_sec) }), h('td', {}, link('#/report/' + a.id, 'Report', 'btn')))))));
  show(head1,
    h('div', { class: 'pt-stats' }, stat('Tests taken', n, 'last: ' + day(last.submitted_at)), stat('Average score', pct(avg), 'across all tests'), stat('Best score', pct(best)), stat('Latest score', pct(last.pct), trend == null ? '' : (trend >= 0 ? '▲ ' : '▼ ') + num(Math.abs(trend), 1) + ' points vs first tests'),
      stat('Accuracy', pct(acc), 'correct of attempted'), stat('Time per test', mmss(avgTime))),
    h('div', { class: 'pt-two' }, card(h('h2', { text: 'Score trend' }), h('div', { class: 'pt-chartwrap' }, svg), h('p', { class: 'pt-hint', text: 'Each dot is one test (hover or tap for details). The dashed line is the average.' })),
      card(h('h2', { text: 'How the answers went' }), split)),
    card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Topic-wise performance' }), h('span', { class: 'pt-meta', text: 'latest ' + Math.min(n, 12) + ' tests' })), topicBox),
    card(h('h2', { text: 'All tests' }), tests));
  /* topic roll-up */
  const take = done.slice(-12), reps = await Promise.all(take.map(a => rpc('attempt_report', { p_attempt: a.id }).catch(() => null)));
  const T = new Map(); reps.forEach(r => (r && r.topics || []).forEach(x => { const k = (x.chapter || '') + '|' + x.topic, o = T.get(k) || { topic: x.topic, chapter: x.chapter, total: 0, correct: 0, wrong: 0, skipped: 0 }; o.total += +x.total || 0; o.correct += +x.correct || 0; o.wrong += +x.wrong || 0; o.skipped += +x.skipped || 0; T.set(k, o); }));
  const rows = [...T.values()].map(o => Object.assign(o, { acc: o.correct + o.wrong ? 100 * o.correct / (o.correct + o.wrong) : null })).sort((a, b) => (a.acc == null) - (b.acc == null) || a.acc - b.acc || b.total - a.total);
  topicBox.textContent = '';
  if (!rows.length) { topicBox.append(h('p', { class: 'pt-hint', text: 'Topic details are not available for these tests.' })); return; }
  const weak = rows.filter(x => x.acc != null && x.acc < 50 && x.correct + x.wrong >= 3).slice(0, 5), strong = rows.filter(x => x.acc != null && x.acc >= 75 && x.correct + x.wrong >= 3).slice(-5).reverse();
  const chips = (title, list, cls) => list.length ? h('div', { class: 'pt-tp' }, h('b', { text: title }), h('div', { class: 'pt-tags' }, list.map(x => h('span', { class: 'pt-tag ' + cls, title: (x.chapter || '') + ' · ' + num(x.acc, 0) + '% of ' + (x.correct + x.wrong) + ' attempted', text: x.topic + ' · ' + num(x.acc, 0) + '%' })))) : null;
  topicBox.append(h('div', { class: 'pt-tpgrid' }, chips('Needs work', weak, 'badtag'), chips('Strong topics', strong, 'oktag')),
    h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Topic', 'Questions', 'Correct', 'Wrong', 'Not answered', 'Accuracy', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, rows.map(x => h('tr', {}, h('td', {}, h('b', { text: x.topic }), x.chapter ? h('div', { class: 'pt-hint', text: x.chapter }) : null), h('td', { class: 'pt-num', text: x.total }), h('td', { class: 'pt-num', text: x.correct }), h('td', { class: 'pt-num', text: x.wrong }), h('td', { class: 'pt-num', text: x.skipped }),
        h('td', { class: 'pt-num', text: pct(x.acc) }), h('td', { class: 'pt-barcell' }, bar(x.acc, x.acc == null ? '' : x.acc < 40 ? 'bad' : x.acc < 70 ? 'mid' : 'ok'))))))));
}
const R_SCHOOL = st => st.school || STU_NAME;

/* ---------- Help & Support ---------- */
/* Help & Support: Free and Premium side by side for everyone (same rows as the Membership page, so they never disagree) */
function planCompareCard() {
  const p = P(); let teacher = p.role !== 'student';
  const body = h('div', {}), tabs = h('div', { class: 'pt-seg pt-seg-help', role: 'group', 'aria-label': 'Show plans for' });
  const tick = v => h('td', { class: v ? 'mb-yes' : 'mb-no', 'aria-label': v ? 'Included' : 'Not included', text: v ? '\u2713' : '\u2014' });
  const draw = () => {
    const C = membershipContent(teacher), price = teacher ? 599 : 299;
    tabs.textContent = '';
    [[true, 'Teachers'], [false, 'Students']].forEach(([t, l]) => tabs.append(h('button', { type: 'button', 'aria-pressed': String(t === teacher), text: l, onclick: () => { teacher = t; draw(); } })));
    body.textContent = '';
    body.append(h('div', { class: 'pt-tw mb-tw' }, h('table', { class: 'mb-table' },
      h('thead', {}, h('tr', {}, h('th', { text: '' }), h('th', { text: 'Free' }), h('th', { class: 'mb-prem' }, 'Premium', h('small', { text: '\u20b9' + price + ' / year' })))),
      h('tbody', {}, C.rows.map(([t, f, pr]) => h('tr', { class: f ? null : 'mb-only' }, h('td', { text: t }), tick(f), tick(pr)))))));
  };
  draw();
  return card(h('h2', { text: 'Free and Premium plans' }),
    h('p', { class: 'pt-hint', text: 'What each plan includes. Students on the Avanti list and Avanti teachers get Premium without paying. You can upgrade any time from the profile menu → Membership.' }),
    tabs, body);
}
async function pageHelp() {
  show(head('Help & Support', ''), loading());
  const c = await rpc('support_contact');
  const p = P(), perm = AU().perm;
  const who = [p.full_name, p.email || (p.avanti_id ? 'ID ' + p.avanti_id : ''), p.role, perm.plan, p.school].filter(Boolean).join(' · ');
  const subject = 'Mathematics Dashboard: ';
  const bodyTxt = 'Hello,\n\nDescribe the problem here (what you did, what you expected, what happened):\n\n\n---\nAccount: ' + who + '\nPage: ' + location.href.replace(/#\/help$/, '') + '\nBrowser: ' + navigator.userAgent;
  const topic = h('select', { class: 'pt-in', id: 'hpTopic' }, ['Problem with sign-in', 'Payment or membership', 'A test or report', 'Wrong question, answer or figure', 'My school or student details', 'Something else'].map(t => h('option', { value: t, text: t })));
  const mailto = () => 'mailto:' + c.email + '?subject=' + encodeURIComponent(subject + topic.value) + '&body=' + encodeURIComponent(bodyTxt);
  const gmail = () => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(c.email) + '&su=' + encodeURIComponent(subject + topic.value) + '&body=' + encodeURIComponent(bodyTxt);
  const digits = c.phone ? c.phone.replace(/[^\d]/g, '') : '', wa = digits ? (digits.length === 10 ? '91' + digits : digits) : '';
  const faq = [
    ['I cannot sign in with my Student ID.', 'Check the ID and date of birth with your teacher. After 5 wrong tries the ID is locked for 15 minutes.'],
    ['I paid but I am still on Free.', 'Wait two minutes and refresh the page. If it is still Free, email with the payment ID from Membership → Payment history.'],
    ['My school, class or name is wrong.', 'Students: ask your teacher to correct it. Teachers: email us and we will change the school.'],
    ['A question, answer or figure is wrong.', 'Email the question ID (shown in the question menu) and what should be corrected.']];
  show(head('Help & Support', 'Found a problem or have a question? Write to us and we will get back to you.'),
    h('div', { class: 'pt-grid2 pt-helpgrid' },
      h('div', { class: 'pt-hstack' },
      card(h('h2', { text: 'Contact' }),
        h('div', { class: 'pt-contact' }, h('span', { class: 'pt-cic', text: '✉' }), h('div', {}, h('span', { class: 'pt-hint', text: 'Email' }), h('a', { href: 'mailto:' + c.email, text: c.email }))),
        c.phone ? h('div', { class: 'pt-contact' }, h('span', { class: 'pt-cic', text: '☎' }), h('div', {}, h('span', { class: 'pt-hint', text: 'Mobile' }), h('a', { href: 'tel:+' + wa, text: c.phone }))) : null,
        h('label', { class: 'pt-fld', for: 'hpTopic' }, h('span', { text: 'What is it about?' }), topic),
        h('div', { class: 'pt-actions' },
          h('a', { class: 'btn pri', href: '#', text: '✉ Email me', onclick: e => { e.currentTarget.href = mailto(); } }),
          h('a', { class: 'btn', href: '#', target: '_blank', rel: 'noopener', text: 'Write in Gmail', onclick: e => { e.currentTarget.href = gmail(); } }),
          wa ? h('a', { class: 'btn', href: 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hello, I need help with the Mathematics Dashboard. ' + who), target: '_blank', rel: 'noopener', text: 'WhatsApp' }) : null,
          c.phone ? h('a', { class: 'btn', href: 'tel:+' + wa, text: '☎ Call' }) : null),
        h('p', { class: 'pt-hint', text: 'The email opens with your account details filled in, so we can help faster.' })),
      card(h('h2', { text: 'Common questions' }), h('div', { class: 'pt-faq' }, faq.map(([q, a]) => h('details', {}, h('summary', { text: q }), h('p', { text: a })))))),
    planCompareCard(),
    window.AvantiBoot ? h('p', { class: 'pt-hver' }, h('button', { type: 'button', class: 'pt-hver-b', title: 'See what changed in each version', onclick: showChangelog },
      'Website v' + window.AvantiBoot.build + ' · ' + window.AvantiBoot.released), h('span', { text: ' · tap to see what changed' })) : null));
}

/* ---------- Admin: approve teachers' schools ---------- */
async function pageApprovals() {
  if (!can('isAdmin')) return show(card(empty('Not available', 'Only Avanti admins can approve schools.')));
  show(head('Teacher approvals', ''), loading());
  const list = await rpc('admin_teachers');
  const pend = list.filter(x => !x.approved && x.school);
  const editTeacher = t => {
    const name = h('input', { type: 'text', class: 'pt-in', id: 'etName', maxlength: 120, value: t.full_name || '', autocomplete: 'off' });
    const sch = schoolSelect('etSchool', t.school, 'Choose a school', true, { notWorking: true }); const msg = h('p', { class: 'pt-msg', role: 'status' });
    const fixedStaff = t.is_staff && /@avantifellows\.org$/i.test(t.email || '');
    const pick = fixedStaff ? null : accountPicker('teacher', t.plan_label, t.premium_until);
    modal('Edit teacher', h('div', {},
      h('p', { class: 'pt-hint', text: 'Signs in with Google: ' + (t.email || '') + (t.is_staff ? ' · Avanti staff' : '') }),
      h('label', { class: 'pt-fld', for: 'etName' }, h('span', { text: 'Full name' }), name),
      h('div', { class: 'pt-fld' }, h('span', { text: 'School' }), sch, h('small', { text: 'Not in the list? Choose "Other" and type it. The approval status stays as it is.' })),
      fixedStaff ? h('p', { class: 'pt-hint', text: 'Account: Avanti staff (@avantifellows.org) always have full access. This cannot be changed.' }) : pick, msg),
      [{ text: 'Cancel', onclick: () => {} }, { text: 'Save changes', pri: true, onclick: close => {
        if (!name.value.trim()) { msg.textContent = 'The name cannot be empty.'; msg.className = 'pt-msg bad'; name.focus(); return false; }
        rpc('admin_update_teacher', { p_user: t.id, p_full_name: name.value.trim(), p_school: sch.value() || null })
          .then(() => pick ? saveAccount({ user_id: t.id }, pick) : null)
          .then(() => { close(); toast('Saved'); schools(true); pageApprovals(); }).catch(e => { msg.textContent = e.message; msg.className = 'pt-msg bad'; });
        return false;
      } }]);
  };
  const act = async (t, action) => {
    let school = null, note = null;
    if (action === 'approve') { school = await promptBox('Approve ' + (t.full_name || t.email), 'School name (correct it if needed)', t.school); if (!school) return; }
    if (action === 'reject') { note = await promptBox('Not approve ' + (t.full_name || t.email), 'Message for the teacher', 'Your school could not be verified. Please choose your correct school, or email us.'); if (note == null) return; }
    if (action === 'revoke' && !await confirmBox('Remove approval?', (t.full_name || t.email) + ' will not see students, add students or make tests until approved again.', 'Remove approval', true)) return;
    try { await rpc('admin_set_teacher_school', { p_user: t.id, p_action: action, p_school: school, p_note: note }); toast({ approve: 'Approved', reject: 'They will choose the school again', revoke: 'Approval removed' }[action]); await AU().refresh(); pageApprovals(); }
    catch (e) { toast(e.message); }
  };
  const row = t => h('tr', {},
    h('td', {}, h('b', { text: t.full_name || '—' }), h('div', { class: 'pt-hint', text: t.email || '' })),
    h('td', {}, t.school ? [h('b', { text: t.school }), h('div', { class: 'pt-hint', text: t.school_known ? 'On the Avanti list · ' + t.students + ' students' : 'New school (not on the Avanti list)' })] : h('span', { class: 'pt-hint', text: 'Not chosen yet' })),
    h('td', { text: day(t.created_at) }), h('td', {}, planBadge(t)), h('td', { class: 'pt-num', text: t.tests }),
    h('td', {}, t.is_admin ? badge('Admin', 'ok') : !t.school ? badge('No school yet', 'mute') : t.approved ? badge('Approved', 'ok') : badge('Waiting', 'mid'), t.is_staff && !t.is_admin ? h('div', { class: 'pt-hint', text: 'Avanti staff' }) : null, t.approved && t.approved_by ? h('div', { class: 'pt-hint', text: 'by ' + t.approved_by.split('@')[0] + ' · ' + day(t.approved_at) }) : null),
    h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, h('button', { type: 'button', class: 'btn', text: 'Edit', onclick: () => editTeacher(t) }),
      t.is_admin || !t.school ? null : t.approved ? h('button', { type: 'button', class: 'btn pt-danger', text: 'Remove approval', onclick: () => act(t, 'revoke') })
      : [h('button', { type: 'button', class: 'btn pri', text: 'Approve', onclick: () => act(t, 'approve') }), h('button', { type: 'button', class: 'btn pt-danger', text: 'Not approve', onclick: () => act(t, 'reject') })])));
  const table = rows => h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Teacher', 'School', 'Signed up', 'Plan', 'Tests', 'Status', ''].map(x => h('th', { text: x })))), h('tbody', {}, rows.map(row))));
  const allBody = h('div', {}), allCount = h('span', { class: 'pt-meta' });
  const drawAll = q => { q = (q || '').toLowerCase(); const rows = list.filter(t => !q || [t.full_name, t.email, t.school].some(v => String(v || '').toLowerCase().includes(q)));
    allCount.textContent = rows.length + ' of ' + list.length + ' teachers'; allBody.textContent = ''; allBody.append(rows.length ? table(rows) : empty('No teachers match', 'Change the search.')); };
  drawAll('');
  const reqAct = async (r, action) => {
    let school = null, note = null;
    if (action === 'approve') { school = await promptBox('Approve the change for ' + (r.full_name || r.email || r.avanti_id), 'New school (correct it if needed)', r.request); if (!school) return; }
    else { note = await promptBox('Reject the change for ' + (r.full_name || r.email || r.avanti_id), 'Message for them', 'Your request to change your school was not approved. Email us if you think this is wrong.'); if (note == null) return; }
    try { await rpc('admin_school_request', { p_user: r.id, p_action: action, p_school: school, p_note: note }); toast(action === 'approve' ? 'School changed' : 'Request rejected'); await AU().refresh(); AU().renderMenu(); pageApprovals(); }
    catch (e) { toast(e.message); }
  };
  const reqTable = rows => h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Name', 'Role', 'School now', 'New school', 'Asked on', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, rows.map(r => h('tr', {},
      h('td', {}, h('b', { text: r.full_name || '—' }), h('div', { class: 'pt-hint', text: r.email || (r.avanti_id ? 'ID ' + r.avanti_id : '') })),
      h('td', { text: (r.role === 'teacher' ? 'Teacher' : 'Student') + ' · ' + (r.plan === 'premium' ? 'Premium' : 'Free') }),
      h('td', { text: r.school }),
      h('td', {}, h('b', { text: r.request }), h('div', { class: 'pt-hint', text: r.school_known ? 'On the Avanti list' : 'New school (not on the Avanti list)' })),
      h('td', { text: day(r.requested_at) }),
      h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, h('button', { type: 'button', class: 'btn pri', text: 'Approve', onclick: () => reqAct(r, 'approve') }),
        h('button', { type: 'button', class: 'btn pt-danger', text: 'Reject', onclick: () => reqAct(r, 'reject') }))))))));
  const invites = await rpc('admin_teacher_invites').catch(() => []);   /* teachers added before their first sign-in */
  const addTeacher = () => {
    const mail = h('input', { type: 'email', class: 'pt-in', id: 'atMail', placeholder: 'name@gmail.com', autocomplete: 'off' });
    const name = h('input', { type: 'text', class: 'pt-in', id: 'atName', maxlength: 120, autocomplete: 'off' });
    const sch = schoolSelect('atSchool', '', 'Choose a school', true, { notWorking: true }), pick = planPicker('free', null, true, 1, true), msg = h('p', { class: 'pt-msg', role: 'status' });
    modal('Add a teacher', h('div', {}, h('p', { class: 'pt-hint', text: 'The teacher signs in with this Google account. Their school is approved and their plan is set from the first sign-in. If they already have an account, it is updated now.' }),
      h('label', { class: 'pt-fld', for: 'atMail' }, h('span', {}, 'Google email', h('b', { class: 'pt-req', text: ' *' })), mail),
      h('label', { class: 'pt-fld', for: 'atName' }, h('span', {}, 'Full name', h('b', { class: 'pt-req', text: ' *' })), name),
      h('div', { class: 'pt-fld' }, h('span', { text: 'School' }), sch, h('small', { text: 'Not in the list? Choose "Other" and type it.' })), pick, msg),
      [{ text: 'Cancel', onclick: () => {} }, { text: 'Add teacher', pri: true, onclick: close => {
        if (!mail.value.trim() || !name.value.trim()) { msg.textContent = 'Please fill in the email and the name.'; msg.className = 'pt-msg bad'; return false; }
        const v = pick.value(); msg.textContent = 'Saving…'; msg.className = 'pt-msg';
        rpc('admin_add_teacher', { p_email: mail.value.trim(), p_full_name: name.value.trim(), p_school: sch.value() || null, p_plan: v.plan, p_until: v.until })
          .then(r => { close(); toast(r.status === 'updated' ? 'Teacher updated' : 'Teacher added. The plan starts when they first sign in.'); schools(true); pageApprovals(); })
          .catch(e => { msg.textContent = e.message; msg.className = 'pt-msg bad'; });
        return false;
      } }]);
  };
  const cancelInvite = async i => { if (!await confirmBox('Cancel this invite?', i.email + ' will sign up as a normal new user.', 'Cancel invite', true)) return; try { await rpc('admin_cancel_teacher_invite', { p_email: i.email }); toast('Invite cancelled'); pageApprovals(); } catch (e) { toast(e.message); } };
  const reqs = await rpc('admin_school_requests').catch(() => []);
  const roleReqs = (await rpc('admin_role_requests').catch(() => [])) || [];
  const roleAct = async (r, action) => { try { await rpc('admin_role_request', { p_id: r.id, p_action: action }); toast(action === 'approve' ? 'Role changed' : 'Request rejected'); pageApprovals(); } catch (e) { toast(e.message); } };
  /* students who signed up with Google and chose their school themselves: their school needs approval too */
  const pstu = await rpc('admin_pending_students').catch(() => []);
  /* Schools: rename (or merge into another) and delete */
  const sch = await rpc('admin_schools').catch(() => []);
  const editSchool = async s => {
    const nn = await promptBox('Edit school', 'School name (type the name of another school to merge the two)', s.school);
    if (!nn || nn.trim() === s.school) return;
    const other = sch.find(x => x.school.toLowerCase() === nn.trim().toLowerCase() && x.school !== s.school);
    if (other && !await confirmBox('Merge schools?', 'Everyone and everything in "' + s.school + '" moves to "' + other.school + '".', 'Merge')) return;
    try { await rpc('admin_rename_school', { p_old: s.school, p_new: nn.trim() }); toast(other ? 'Schools merged' : 'School renamed'); schools(true); await AU().refresh(); pageApprovals(); } catch (e) { toast(e.message); }
  };
  const delSchool = async s => {
    if (s.list_students) { toast(s.list_students + ' students on the student list belong to this school. Edit the school to move them first.'); return; }
    if (!await confirmBox('Delete "' + s.school + '"?', (s.teachers + s.google_students) + ' teachers / students who chose it must choose their school again, and its ' + s.tests + ' tests are switched off.', 'Delete school', true)) return;
    try { await rpc('admin_delete_school', { p_school: s.school }); toast('School deleted'); schools(true); await AU().refresh(); pageApprovals(); } catch (e) { toast(e.message); }
  };
  const schBody = h('div', {});
  const drawSch = q => { q = (q || '').toLowerCase(); const rows = sch.filter(s => !q || s.school.toLowerCase().includes(q)); schBody.textContent = '';
    schBody.append(rows.length ? h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['School', 'Students (list)', 'Google students', 'Teachers', 'Tests', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, rows.map(s => h('tr', {}, h('td', {}, h('b', { text: s.school })), h('td', { class: 'pt-num', text: s.list_students }), h('td', { class: 'pt-num', text: s.google_students }),
        h('td', { class: 'pt-num', text: s.teachers }), h('td', { class: 'pt-num', text: s.tests }),
        h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, h('button', { type: 'button', class: 'btn', text: 'Edit', onclick: () => editSchool(s) }),
          h('button', { type: 'button', class: 'btn pt-danger', text: 'Delete', onclick: () => delSchool(s) })))))))) : empty('No schools match', 'Change the search.')); };
  drawSch('');
  const stuTable = rows => h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Student', 'School', 'Class', 'Signed up', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, rows.map(s => h('tr', {},
      h('td', {}, h('b', { text: s.full_name || '—' }), h('div', { class: 'pt-hint', text: s.email || '' })),
      h('td', {}, h('b', { text: s.school }), h('div', { class: 'pt-hint', text: s.school_known ? 'On the Avanti list' : 'New school (not on the Avanti list)' })),
      h('td', { text: [s.class, s.stream].filter(Boolean).join(' · ') }), h('td', { text: day(s.created_at) }),
      h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, h('button', { type: 'button', class: 'btn pri', text: 'Approve', onclick: () => act(s, 'approve') }),
        h('button', { type: 'button', class: 'btn pt-danger', text: 'Not approve', onclick: () => act(s, 'reject') }))))))));
  show(head('Approvals', pend.length + ' teachers and ' + pstu.length + ' students waiting · ' + list.filter(x => x.approved).length + ' approved · ' + list.length + ' teachers' + (reqs.length ? ' · ' + reqs.length + ' school change' + (reqs.length === 1 ? '' : 's') : ''),
      h('button', { type: 'button', class: 'btn pri', text: '+ Add a teacher', onclick: addTeacher })),
    invites.length ? card(h('h2', { text: 'Added, not signed in yet' }), h('p', { class: 'pt-hint', text: 'These teachers get their school and plan the first time they sign in with Google.' }),
      h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Teacher', 'School', 'Plan', 'Added', ''].map(x => h('th', { text: x })))),
        h('tbody', {}, invites.map(i => h('tr', {}, h('td', {}, h('b', { text: i.full_name || '—' }), h('div', { class: 'pt-hint', text: i.email })), h('td', { text: i.school || '—' }), h('td', {}, planBadge({ plan_label: i.plan, premium_until: i.premium_until })), h('td', { text: day(i.created_at) }),
          h('td', {}, h('button', { type: 'button', class: 'btn pt-danger', text: 'Cancel', onclick: () => cancelInvite(i) })))))))) : null,
    roleReqs.length ? card(h('h2', { text: 'Role change requests (' + roleReqs.length + ')' }), h('p', { class: 'pt-hint', text: 'Free accounts that chose the wrong role. Approving switches the role; the person fills in the new details at the next sign-in.' }),
      h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Person', 'School', 'Change', 'Note', ''].map(x => h('th', { text: x })))),
        h('tbody', {}, roleReqs.map(r => h('tr', {}, h('td', {}, h('b', { text: r.full_name || '—' }), h('div', { class: 'pt-hint', text: r.email || '' })), h('td', { text: r.school || '—' }), h('td', { text: r.from_role + ' → ' + r.to_role }), h('td', { text: r.note || '' }),
          h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, h('button', { type: 'button', class: 'btn pri', text: 'Approve', onclick: () => roleAct(r, 'approve') }), h('button', { type: 'button', class: 'btn pt-danger', text: 'Reject', onclick: () => roleAct(r, 'reject') }))))))))) : null,
    reqs.length ? card(h('h2', { text: 'School change requests' }), h('p', { class: 'pt-hint', text: 'Teachers and students cannot change their school themselves. Approving moves them to the new school; for teachers this also approves the new school.' }), reqTable(reqs)) : null,
    h('p', { class: 'pt-hint', text: 'Every school choice needs your approval: teachers, Avanti staff and students. Until then a teacher cannot see or add students or make tests, and a student cannot see or take tests. Not approving asks them to choose the school again.' }),
    card(h('h2', { text: 'Teachers waiting for approval' }), pend.length ? table(pend) : empty('Nothing waiting', 'New teachers appear here after they choose their school.')),
    card(h('h2', { text: 'Students waiting for approval (' + pstu.length + ')' }), pstu.length ? stuTable(pstu) : empty('Nothing waiting', 'Students who sign up with Google and choose their school appear here. Students you or their teacher added are approved already.')),
    card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Schools (' + sch.length + ')' })),
      h('p', { class: 'pt-hint', text: 'Edit renames a school everywhere (students, teachers, tests, results); typing the name of another school merges the two. Delete works when no student on the student list belongs to the school.' }),
      h('div', { class: 'pt-frow' }, h('input', { type: 'search', class: 'pt-in', placeholder: 'Search schools', 'aria-label': 'Search schools', oninput: e => drawSch(e.target.value.trim()) })), schBody),
    card(h('div', { class: 'pt-ct' }, h('h2', { text: 'All teachers' }), allCount),
      h('div', { class: 'pt-frow' }, h('input', { type: 'search', class: 'pt-in', placeholder: 'Search name, email or school', 'aria-label': 'Search teachers', oninput: e => drawAll(e.target.value.trim()) })), allBody));
}

/* Footer: website version → list of updates (changelog.json) */
async function showChangelog() {
  const body = h('div', { class: 'pt-chlog' }, loading());
  modal('What changed on the website', body, [{ text: 'Close', pri: true, onclick: () => {} }]);
  try {
    const list = await fetch('changelog.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const cur = window.AvantiBoot && window.AvantiBoot.build;
    body.textContent = '';
    list.forEach(e => body.append(h('section', { class: 'pt-chv' }, h('div', { class: 'pt-ct' }, h('h3', { text: 'Version ' + e.v }), e.v === cur ? badge('You are using this', 'ok') : h('span', { class: 'pt-hint', text: e.date })),
      e.v === cur ? h('p', { class: 'pt-hint', text: e.date }) : null, h('ul', { class: 'pt-feats' }, e.items.map(t => h('li', { text: t }))))));
  } catch (x) { body.textContent = ''; body.append(errorBox('Could not load the list of updates. Check your internet connection.')); }
}
window.AvantiPortal = { dropMenu, icons: IC, showChangelog, shareReady, route, leave: () => leave(false), saveWorksheet, createTestFrom, onboard, profileMissing };
if (AU() && AU().profile && TE()) route();
})();
