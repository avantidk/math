/* अंक-IT · the study dashboard (/dashboard). Source (PYQs / Non-PYQs) → exam → chapter → chapter overview, with a left menu that
   changes at every step. Questions stay in the private bucket and are read with the signed-in user's token (boot.js); lists of
   questions open in the Question Bank (/qbank) already filtered, through a small note kept in sessionStorage. */
(function () {
'use strict';
const { h } = window.AvantiUtil;
const $ = s => document.querySelector(s);
const A = () => window.AvantiAuth;
const num = n => Number(n || 0).toLocaleString('en-IN');
const pct = (a, b) => (b ? Math.round((a * 1000) / b) / 10 : 0);

/* ---------- the exams ---------- */
const EXAMS = [
  { slug: 'jee-main', name: 'JEE Main', short: 'JEE', tone: '#2563eb', banks: ['JEE Main', 'AIEEE'], logo: 'img/exams/jee-main.webp', note: 'Includes AIEEE' },
  { slug: 'jee-advanced', name: 'JEE Advanced', short: 'ADV', tone: '#7c3aed', banks: ['JEE Advanced', 'IIT'], logo: 'img/exams/jee-advanced.webp', note: 'Includes IIT-JEE' },
  { slug: 'kcet', name: 'KCET', short: 'KCET', tone: '#059669', banks: ['KCET'], logo: 'img/exams/kcet.webp' },
  { slug: 'nda', name: 'NDA', short: 'NDA', tone: '#b45309', banks: ['NDA'], logo: 'img/exams/nda.webp' },
  { slug: 'iat', name: 'IAT', short: 'IAT', tone: '#db2777', banks: ['IAT'], logo: 'img/exams/iat.webp' },
  { slug: 'cuet', name: 'CUET', short: 'CUET', tone: '#0891b2', banks: [] },
  { slug: 'cbse-12', name: 'CBSE Class 12 Boards', short: 'CBSE', tone: '#dc2626', banks: [], note: 'Code 041' }
];
const EX = Object.fromEntries(EXAMS.map(e => [e.slug, e]));
const EXAM_OF_BANK = {}; EXAMS.forEach(e => e.banks.forEach(b => { EXAM_OF_BANK[b] = e.slug; }));
const LEVELS = [['L1', 'Confidence Booster', 'Level 1', 'beginner'], ['L2', 'Balanced', 'Level 2', 'booster'], ['L3', 'Rank Booster', 'Level 3', 'advanced']];

/* ---------- icons ---------- */
const svg = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const IC = {
  home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
  grid: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'),
  clock: svg('<path d="M3.5 12a8.5 8.5 0 1 0 3-6.5"/><path d="M3 4v4.5h4.5"/><path d="M12 8v4.2l2.8 1.8"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 5.5h1.5v3M4 11h2l-2 2.4h2M4 16.5h2v1.5H4v1.5h2"/>'),
  mark: svg('<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>'),
  test: svg('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'),
  all: svg('<path d="M4 5h16M4 10h16M4 15h10"/><path d="m15 18 2 2 4-4.5"/>'),
  back: svg('<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>'),
  chev: svg('<path d="m9 6 6 6-6 6"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  star: svg('<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.3 2.8 1-5.9-4.2-4.1 5.9-.8z"/>'),
  bolt: svg('<path d="M13 3 5 13.5h6L10.5 21 19 10h-6z"/>'),
  target: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>'),
  book: svg('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19"/>'),
  up: svg('<path d="M12 19V6"/><path d="m6 11 6-6 6 6"/>'),
  fire: svg('<path d="M12 3c1 3.2 4.5 4.8 4.5 9a4.5 4.5 0 0 1-9 0c0-1.7.8-2.8 1.6-3.7.3 1.2 1 1.8 1.8 1.9C10.5 7.5 11 5.3 12 3z"/>'),
  shapes: svg('<path d="m5 19 4-9 4 9z"/><circle cx="17" cy="8" r="3.5"/>')
};

/* ---------- data ---------- */
const D = { ready: null, rows: [], raw: new Map(), chapters: [], chByCode: {}, topics: {}, must: {}, mustK: {}, maxYear: 2026, sum: { bookmarks: [], results: {} }, tests: null };
/* DPP sources and their exercise (sheet) numbers, read from the question ids */
const SOURCES = [
  { k: 'bb', name: 'BB Ex', sub: 'Exercise sheets, chapter by chapter', tone: '#2563eb' }, { k: 'dy', name: 'Ln DY', sub: 'Do Yourself sheets after every class', tone: '#059669' },
  { k: 'lx', name: 'Ln Ex', sub: 'Exercise sheets, level by level', tone: '#7c3aed' }, { k: 'ci', name: 'Cg ill', sub: 'Worked illustrations', tone: '#b45309' },
  { k: 'ce', name: 'Cg Ex', sub: 'Exercise sheets', tone: '#db2777' }, { k: 'cd', name: 'Cg DPPs', sub: 'Daily practice problems', tone: '#0891b2' }];
const SRC = Object.fromEntries(SOURCES.map(x => [x.k, x]));
function sheetOf(book, id) {
  const m = book === 'Ln DY' ? /-DY(\d+)-/.exec(id) : book === 'Ln Ex' ? /-O(\d+)-/.exec(id) : book === 'BB Ex' ? /^BB-\d+-(\d+)-/.exec(id) : null;
  return m ? { no: +m[1], label: (book === 'Ln DY' ? 'DY-' : 'Ex-') + (+m[1]) } : null;
}
const isGradable = r => { const a = String(r.answer == null ? '' : r.answer).trim(); if (!a) return false;
  if (r.type === 'Numerical') return /^-?\d+(\.\d+)?$/.test(a) || /^-?\d+(\.\d+)?\s*to\s*-?\d+(\.\d+)?$/i.test(a);
  return (r.type === 'MCQ' || r.type === 'MSQ') && (r.options || []).length > 0 && /^[A-D](,[A-D])*$/.test(a); };
function load() {
  if (D.ready) return D.ready;
  const C = window.AvantiContent;
  D.ready = Promise.all([C.get('qb/data/pyq.json'), (A().perm.premium ? C.get('qb/data/nonpyq.json') : Promise.resolve([])), C.get('qb/data/chapters.json'), C.get('qb/data/topics.json').catch(() => []), C.get('must.json').catch(() => [])]).then(([pyq, np, chs, tops, must]) => {
    D.chapters = (chs || []).slice().sort((a, b) => a.order - b.order); D.chapters.forEach(c => { D.chByCode[c.chapter_code] = c; });
    (tops || []).forEach(t => { (D.topics[t.chapter_code] = D.topics[t.chapter_code] || []).push(t); });
    (must || []).forEach(m => { D.must[m.c] = (m.i || []).map(x => x.r); (m.i || []).forEach(x => { D.mustK[x.r] = x.k; }); });
    (pyq || []).concat(np || []).forEach(r => {
      const P = r.source === 'PYQ' || (pyq.indexOf && false);
      const isP = r.source === 'PYQ';
      D.raw.set(String(r.id), r);
      const bk = isP ? '' : (r.book || r.publisher || ''), sh = isP ? null : sheetOf(bk, String(r.id));
      D.rows.push({ id: String(r.id), P: isP, ex: isP ? (EXAM_OF_BANK[r.exam] || null) : null, y: isP ? Number(r.year) || null : null, ch: r.chapter_code, tp: r.topic || '', tc: r.topic_code || '', d: r.difficulty, ok: isGradable(r), bk, shl: sh ? sh.label : '', shn: sh ? sh.no : 0 });
      if (!P) { /* kept for readability */ }
    });
    D.rows.forEach(r => { if (r.y && r.y > D.maxYear) D.maxYear = r.y; });
    D.maxYear = Math.min(D.maxYear, new Date().getFullYear());
  });
  return D.ready;
}
async function loadMine(force) {
  try { const s = await A().sb.rpc('dash_summary'); if (!s.error && s.data) D.sum = s.data; } catch (e) { /* the page still works without it */ }
  if (force || !D.tests) { try { const t = await A().sb.rpc('dash_tests'); D.tests = !t.error && Array.isArray(t.data) ? t.data : []; } catch (e) { D.tests = []; } }
}
const scope = (mode, slug, ch) => D.rows.filter(r => (mode === 'pyq' ? r.P && (!slug || slug === '-' || r.ex === slug) : !r.P) && (!ch || r.ch === ch));
const last5 = rows => rows.filter(r => r.y && r.y > D.maxYear - 5);
const att = st => st === 'c' || st === 'w';   /* attempted = answered (right or wrong); a question left blank in a test is not counted */
const solvedOf = rows => rows.filter(r => att(D.sum.results[r.id])).length;
const correctOf = rows => rows.filter(r => D.sum.results[r.id] === 'c').length;

/* ---------- small pieces ---------- */
const locked = () => { const p = A().perm; return !(p.premium || p.staff || p.isAdmin); };   /* Free accounts */
function openQB(ids, title) {
  try { sessionStorage.setItem('avanti-qbpreset', JSON.stringify({ ids: ids.slice(0, 3000), title: title || '' })); } catch (e) { /* storage blocked */ }
  location.href = 'qbank';
}
const go = hash => { location.hash = hash; };
function logo(e) {
  const mono = h('span', { class: 'd-mono', style: '--tone:' + e.tone, text: e.short });
  if (!e.logo) return mono;
  const img = h('img', { class: 'd-logo', src: e.logo + '?v=' + window.AvantiBoot.build, alt: '', loading: 'lazy', onerror: () => img.replaceWith(mono) });
  return img;
}
function bar(a, b, cls) { return h('div', { class: 'd-bar ' + (cls || ''), role: 'img', 'aria-label': pct(a, b) + ' percent' }, h('i', { style: 'width:' + Math.min(100, pct(a, b)) + '%' })); }
const stat = (ic, val, label, tone) => h('div', { class: 'd-stat' }, h('span', { class: 'd-stat-i ' + (tone || ''), html: ic }), h('div', {}, h('strong', { text: val }), h('small', { text: label })));
function tile(o) {   /* a big clickable block */
  const t = h(o.href || o.go ? 'a' : 'div', { class: 'd-tile ' + (o.cls || '') + (o.off ? ' is-off' : ''), href: o.href || (o.go ? '#' + o.go : null), 'aria-disabled': o.off ? 'true' : null,
    onclick: e => { if (o.onclick) { e.preventDefault(); if (!o.off) o.onclick(e); } else if (o.off) e.preventDefault(); } },
    o.badge ? h('span', { class: 'd-badge ' + (o.badgeCls || ''), text: o.badge }) : null,
    o.icon ? h('span', { class: 'd-tile-i', html: o.icon }) : null,
    h('b', { class: 'd-tile-t', text: o.title }), o.sub ? h('small', { class: 'd-tile-s', text: o.sub }) : null, o.extra || null);
  return t;
}
const crumb = (...p) => h('nav', { class: 'd-crumb', 'aria-label': 'You are here' }, p.filter(Boolean).map((x, i, a) => (x.nodeType ? x : h('span', { text: x }))).flatMap((x, i, a) => (i < a.length - 1 ? [x, h('span', { class: 'd-sep', text: '›' })] : [x])));

/* ---------- shell ---------- */
let SIDE, MAIN;
function shell() {
  const root = $('#app'); root.textContent = '';
  SIDE = h('aside', { class: 'd-side', 'aria-label': 'Dashboard menu' }); MAIN = h('main', { class: 'd-main', id: 'dMain' });
  const C = window.AvantiChrome;   /* the same top bar and footer as /qbank */
  root.append(h('div', { class: 'shell d-shell' },
    h('header', { class: 'topbar' }, C.head(), C.home(), C.themeBtn(), ...C.tools(), C.nav('dash', 'dash')),
    h('div', { class: 'd-body' }, SIDE, MAIN), C.footer()));
  C.themeInit(); C.footerInit();
  const pop = () => $('#qbPop'), info = () => $('#qbInfoBtn');
  const shut = () => { if (pop()) pop().hidden = true; if (info()) info().setAttribute('aria-expanded', 'false'); };
  document.addEventListener('click', e => { const m = document.getElementById('guideModal'); if (m && (e.target === m || e.target.closest('[data-act="guideclose"]'))) m.remove(); });
  root.addEventListener('click', async e => {
    const g = e.target.closest('#guideBtn'), i = e.target.closest('#qbInfoBtn'), it = e.target.closest('#qbPop .tb-item');
    if (g) { try { const t = await realTE(); t.guide(); } catch (x) { toast('The guide did not load. Try again.'); } return; }
    if (i) { const open = pop().hidden; pop().hidden = !open; i.setAttribute('aria-expanded', String(open)); return; }
    if (it) { shut(); const k = it.dataset.qbpanel || it.dataset.k; const pg = { heroov: 'Mathematics Bank: Question Counts', overview: 'Chapter-wise Count', syl: 'Syllabus Priority', wchart: 'Chapter Weightage' }[k]; if (pg) popPage(pg, 'qbank', k); return; }
    shut();
  });
}
let COLL = false; try { COLL = localStorage.getItem('d-side-collapsed') === '1'; } catch (e) { /* default open */ }
const PANEL_IC = svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>');
function applyColl() { const b = $('.d-body'); if (b) b.classList.toggle('d-collapsed', COLL); document.querySelectorAll('.d-colbtn').forEach(x => { x.setAttribute('aria-pressed', String(COLL)); x.title = COLL ? 'Show the menu' : 'Hide the menu'; x.setAttribute('aria-label', x.title); }); }
function side(o) {   /* o: { back: hash|null, title, sub, items:[{label, icon, hash|href|onclick, active, badge, off}] } */
  SIDE.textContent = '';
  const col = h('button', { type: 'button', class: 'd-colbtn', html: PANEL_IC, 'aria-pressed': String(COLL), onclick: () => { COLL = !COLL; try { localStorage.setItem('d-side-collapsed', COLL ? '1' : '0'); } catch (e) { /* optional */ } applyColl(); } });
  SIDE.append(h('div', { class: 'd-side-top' }, o.back != null ? h('a', { class: 'd-back', href: o.back === '' ? '#d/' : '#' + o.back, 'aria-label': 'Back', html: IC.back }) : h('span', { class: 'd-back-sp' }), col));
  if (o.title) SIDE.append(h('div', { class: 'd-side-h' }, h('b', { text: o.title }), o.sub ? h('small', { text: o.sub }) : null));
  SIDE.append(h('nav', { class: 'd-nav' }, o.items.map(it => h('a', { class: 'd-nav-i' + (it.active ? ' on' : '') + (it.off ? ' off' : ''), href: it.href || (it.hash != null ? '#' + it.hash : '#'), 'aria-current': it.active ? 'page' : null, title: it.label,
    onclick: it.onclick ? (e => { e.preventDefault(); it.onclick(); }) : null },
    h('span', { class: 'd-nav-ic', html: it.icon || '' }), h('span', { class: 'd-nav-t', text: it.label }), it.badge ? h('span', { class: 'd-nav-b', text: it.badge }) : null, h('span', { class: 'd-nav-c', html: it.off ? IC.lock : IC.chev })))));
  applyColl();
}
const main = (...kids) => { MAIN.textContent = ''; MAIN.append(...kids.flat().filter(Boolean)); MAIN.scrollTop = 0; window.scrollTo(0, 0); };
const loadingBox = t => h('div', { class: 'pt-state' }, h('div', { class: 'spin' }), h('p', { text: t || 'Loading…' }));
const homeItems = active => [
  { label: 'Home', icon: IC.grid, hash: 'd/', active: active === 'home' },
  { label: 'PYQs', icon: IC.clock, hash: 'd/pyq', active: active === 'pyq' },
  { label: 'Non-PYQs', icon: IC.list, hash: 'd/np', active: active === 'np', off: false },
  { label: 'DPPs', icon: IC.test, hash: 'd/dpp', active: active === 'dpp' },
  { label: 'Tests', icon: IC.grid, hash: '/modes', active: active === 'tests' },
  { label: 'Handouts', icon: IC.list, hash: 'd/handouts', active: active === 'ho' },
  { label: 'Bookmarked Qs', icon: IC.mark, hash: 'd/bookmarks', active: active === 'bookmarks' },
  { label: 'Test History', icon: IC.test, hash: 'd/history', active: active === 'history' }
];

/* ---------- DPPs: sources, then the exercise, then the questions ---------- */
const MIXSEL = new Set(['BB Ex', 'Ln DY', 'Ln Ex']);   /* the sources ticked on the Mixed Practice page */
const dppCount = name => D.rows.filter(r => !r.P && r.bk === name).length;
function dppLocked() {
  side({ back: '', title: 'DPPs', items: homeItems('dpp') });
  main(h('section', { class: 'd-lockcard' }, h('span', { html: IC.lock }), h('h2', { text: 'DPPs are part of Premium' }), h('p', { text: 'The practice sheets of BB Ex, Ln DY, Ln Ex and more open with a Premium plan. PYQs stay free.' }), h('a', { class: 'btn pri', href: '#/membership', text: '★ Get Premium' })));
}
function viewDpp() {
  side({ back: '', title: 'DPPs', sub: 'Practice sheets by source', items: homeItems('dpp') });
  const free = locked(), lockIc = svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>').replace('width="20" height="20"', 'width="16" height="16"');
  const cards = SOURCES.map(x => {
    const n = dppCount(x.name), sheets = new Set(D.rows.filter(r => !r.P && r.bk === x.name && r.shl).map(r => r.ch + r.shl)).size, none = !n, off = free || none;
    return h('a', { class: 'dpp-card' + (off ? ' is-off' : ''), href: free ? '#/membership' : none ? '#d/dpp' : '#d/dpp/' + x.k, style: '--tone:' + x.tone, onclick: e => { if (none && !free) { e.preventDefault(); toast(x.name + ' is coming soon.'); } } },
      h('span', { class: 'dpp-mark', text: x.name.toUpperCase().replace(' ', '-') }), h('b', { text: x.name }), h('small', { text: x.sub }),
      h('span', { class: 'dpp-n', text: none ? 'Coming soon' : (sheets ? sheets + ' sheets · ' : '') + num(n) + ' questions' }),
      free ? h('span', { class: 'dpp-lock', html: lockIc + ' Premium' }) : h('span', { class: 'dpp-go', text: none ? '' : 'Open questions ›' }));
  });
  cards.push(h('a', { class: 'dpp-card dpp-mix', href: free ? '#/membership' : '#d/dpp/mix', style: '--tone:#1f3f95' }, h('span', { class: 'dpp-mark', text: 'MIX' }), h('b', { text: 'Mixed Practice' }), h('small', { text: 'Tick the sources you want and practise them together, with filters for chapter, exercise, level and type' }), h('span', { class: 'dpp-go', text: 'Open Mixed Practice ›' })));
  main(h('div', { class: 'dpp-head' }, h('h2', { text: 'DPPs' }), h('p', { text: 'Pick a source, then the exercise, and practise its questions.' })), h('div', { class: 'dpp-grid' }, cards));
}
/* a source (BB Ex, Ln DY, ...): first its exercises / sheets, grouped by chapter */
function viewDppExercises(k) {
  const src = SRC[k];
  side({ back: 'd/dpp', title: 'DPPs', sub: 'Choose a source', items: SOURCES.map(x => ({ label: x.name, icon: IC.list, badge: String(dppCount(x.name)), hash: 'd/dpp/' + x.k, active: x.k === k })) });
  const pool = D.rows.filter(r => !r.P && r.bk === src.name), groups = new Map();
  pool.forEach(r => { const g = groups.get(r.ch) || groups.set(r.ch, new Map()).get(r.ch), key = r.ch + '~' + (r.shl || ''), o = g.get(key) || g.set(key, { key, t: r.shl || 'Questions', n: r.shn || 0, c: 0 }).get(key); o.c++; });
  const chs = [...groups.keys()].map(c => D.chByCode[c]).filter(Boolean).sort((a, b) => a.order - b.order);
  const all = h('a', { class: 'dpp-ex dpp-ex-all', href: '#d/dpp/' + k + '/all' }, h('b', { text: 'All questions' }), h('small', { text: num(pool.length) + ' questions · every chapter' }));
  main(h('div', { class: 'd-head' }, crumb('DPPs', src.name), h('h2', { text: src.name }), h('p', { text: 'Pick an exercise or sheet to see its questions.' })), all,
    chs.map(c => h('section', { class: 'dpp-chap' }, h('h3', { class: 'd-sec' }, h('span', { class: 'd-code', text: c.chapter_code }), ' ' + c.chapter),
      h('div', { class: 'dpp-exgrid' }, [...groups.get(c.chapter_code).values()].sort((a, b) => a.n - b.n || a.t.localeCompare(b.t)).map(o =>
        h('a', { class: 'dpp-ex', href: '#d/dpp/' + k + '/' + encodeURIComponent(o.key) }, h('b', { text: o.t }), h('small', { text: num(o.c) + ' Qs' })))))));
}
/* one source (BB Ex, Ln DY, ...) or Mixed Practice: the sources are the left menu, the filters are one line on top */
function viewDppSrc(k, exKey) {
  if (locked()) return dppLocked();
  const mix = k === 'mix', src = SRC[k]; if (!mix && !src) return go('d/dpp');
  if (!mix && !exKey) return viewDppExercises(k);
  const names = mix ? [...MIXSEL] : [src.name];
  const items = SOURCES.map(x => mix
    ? { label: x.name, icon: MIXSEL.has(x.name) ? svg('<rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity=".18"/><path d="m8 12 3 3 5-6"/>') : svg('<rect x="4" y="4" width="16" height="16" rx="3"/>'), badge: String(dppCount(x.name)), active: MIXSEL.has(x.name), href: '#', onclick: () => { if (MIXSEL.has(x.name)) MIXSEL.delete(x.name); else MIXSEL.add(x.name); viewDppSrc('mix'); } }
    : { label: x.name, icon: IC.list, badge: String(dppCount(x.name)), hash: 'd/dpp/' + x.k, active: x.k === k });
  side({ back: mix ? 'd/dpp' : 'd/dpp/' + k, title: mix ? 'Mixed Practice' : 'DPPs', sub: mix ? 'Tick the sources to mix' : 'Choose a source', items });
  const sheetKey = r => r.ch + '~' + (r.shl || '');
  const pool = D.rows.filter(r => !r.P && names.includes(r.bk) && (mix || exKey === 'all' || sheetKey(r) === exKey));
  const chs = [...new Set(pool.map(r => r.ch))].map(c => D.chByCode[c]).filter(Boolean).sort((a, b) => a.order - b.order);
  const shs = new Map(); pool.forEach(r => { if (r.shl) shs.set(r.bk + '|' + r.shl, { t: (mix ? r.bk + ' ' : '') + r.shl, n: r.shn, b: r.bk }); });
  const exList = [...shs.entries()].sort((a, b) => a[1].b.localeCompare(b[1].b) || a[1].n - b[1].n).map(([key, v]) => [key, v.t]);
  const one = !mix && exKey !== 'all', first = pool[0];
  const title = mix ? 'Mixed Practice' : one && first ? src.name + ' · ' + first.ch + (first.shl ? ' · ' + first.shl : '') : src.name, head = h('div', { class: 'd-head' }, crumb('DPPs', mix ? title : src.name, one ? (first ? first.ch + (first.shl ? ' · ' + first.shl : '') : '') : 'All questions'));
  window.DashList.render(listEnv(), { rows: pool, title, head, compact: true, seqOrder: true, testLabel: 'Take test',
    filters: one ? [] : [{ key: 'ch', label: 'Chapter', values: chs.map(c => [c.chapter_code, c.chapter_code + ' ' + c.chapter]), get: r => r.ch }].concat(exList.length ? [{ key: 'ex', label: 'Exercise', values: exList, get: r => r.bk + '|' + r.shl }] : []),
    emptyText: mix && !names.length ? 'Tick at least one source on the left.' : title + ' questions are coming soon.',
    startTest: list => launchTestFrom(list, { chapter: title + ' DPP', chapter_code: 'dpp' }, 'np', null, 20, 'DPP test') });
}

/* ---------- Step 1: source ---------- */
/* a page of the site shown in a pop-up (cross at the top right), so nobody leaves the dashboard */
function popPage(title, path, qbPanel) {
  const old = document.getElementById('dPop'); if (old) old.remove();
  if (qbPanel) { try { sessionStorage.setItem('avanti-qbopen', qbPanel); } catch (x) { /* optional */ } }
  const frame = h('iframe', { class: 'dpop-f', title, src: '/' + path + '?embed=1', loading: 'eager' }), load = h('div', { class: 'dpop-load' }, h('div', { class: 'spin' }), h('p', { text: 'Loading…' }));
  const ready = e => { if (e.origin === location.origin && e.data && e.data.qbReady) { load.remove(); window.removeEventListener('message', ready); } };
  if (qbPanel) window.addEventListener('message', ready); else frame.addEventListener('load', () => load.remove());
  const close = () => { window.removeEventListener('message', ready); box.remove(); document.removeEventListener('keydown', key); document.body.classList.remove('dpop-on'); };
  const key = e => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'dpop', id: 'dPop', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: e => { if (e.target === box) close(); } },
    h('div', { class: 'dpop-in' }, h('div', { class: 'dpop-h' }, h('h2', { text: title }), h('button', { type: 'button', class: 'dpop-x', 'aria-label': 'Close', html: '&times;', onclick: close })), h('div', { class: 'dpop-b' }, load, frame)));
  document.body.append(box); document.body.classList.add('dpop-on'); document.addEventListener('keydown', key);
  box.querySelector('.dpop-x').focus();
}
/* ---------- special picks: a small carousel on the home page, each opens a question list ---------- */
const MIXF = { trig: /\\(sin|cos|tan|cot|sec|csc)\b/, log: /\\(log|ln)\b/, int: /\\int/, lim: /\\lim/, der: /\\frac\{d|derivative|differentiable|f'|\\prime/, mat: /matri|determinant|vmatrix|adj\b/, vec: /\\vec|\\hat|vector|overrightarrow/, cx: /complex|\\bar\{z\}|\|z|\\omega|\barg\b/,
  conic: /parabola|ellipse|hyperbola|circle|focus|directrix|eccentric/, prob: /probabilit|dice|coin|randomly/, seq: /\ba\.?p\b|\bg\.?p\b|arithmetic|geometric|sequence|progression/, bin: /\\binom|binomial|permutation|combination|arrange|\^\{?n\}?c|\{\}\^/, set: /relation|\\cup|\\cap|bijective|injective|one-one|onto/, quad: /quadratic|discriminant/ };
let MIXSET = null;
const mixIds = () => MIXSET || (MIXSET = new Set(D.rows.filter(r => r.P).filter(r => { const x = D.raw.get(r.id) || {}, t = ((x.question || '') + ' ' + (x.options || []).join(' ')).toLowerCase(); let n = 0; for (const k in MIXF) if (MIXF[k].test(t)) n++; return n >= 3; }).map(r => r.id)));
const PICKS = [
  { k: 'repeated', t: 'Repeated questions', s: 'Asked again and again in JEE', tone: '#e11d48', title: 'Repeated Questions', pool: () => D.rows.filter(r => r.P && (D.mustK[r.id] === 'i' || D.mustK[r.id] === 'e')) },
  { k: 'sure', t: 'Sure-shot questions', s: 'Hand-picked for the next exam', tone: '#d9961a', title: 'Sure-shot Questions', pool: () => D.rows.filter(r => r.P && D.mustK[r.id] === 'u') },
  { k: 'mix', t: 'Mix-breed questions', s: 'Concepts of 3 or more chapters', tone: '#7c3aed', title: 'Mix-breed Questions', pool: () => D.rows.filter(r => mixIds().has(r.id)) },
  { k: 'adv-easy', t: 'Easiest JEE Advanced', s: 'Level 1 questions of Advanced', tone: '#16a06a', title: 'Easiest JEE Advanced Questions', pool: () => D.rows.filter(r => r.ex === 'jee-advanced' && r.d === 'L1') },
  { k: 'main-hard', t: 'Toughest JEE Main', s: 'Level 3 questions of Main', tone: '#0891b2', title: 'Toughest JEE Main Questions', pool: () => D.rows.filter(r => r.ex === 'jee-main' && r.d === 'L3') }];
function viewPick(k) {
  const pk = PICKS.find(x => x.k === k); if (!pk) return go('d/');
  side({ back: '', title: 'Special picks', sub: 'Quick sets to practise', items: PICKS.map(x => ({ label: x.t, icon: IC.test, hash: 'd/pick/' + x.k, active: x.k === k, badge: String(x.pool().length) })) });
  const rows = pk.pool();
  window.DashList.render(listEnv(), { rows, title: pk.title, head: h('div', { class: 'd-head' }, crumb('Dashboard', pk.title)), testLabel: 'Take test', emptyText: 'Nothing here yet.',
    startTest: list => launchTestFrom(list, { chapter: pk.title, chapter_code: 'pick' }, 'pyq', null, 20, 'practice test') });
}
const UPCOMING = [['JEE Main 2027 · Session 1', '2027-01-20', 'jee-main'], ['JEE Advanced 2027', '2027-05-23', 'jee-advanced']];
function viewHome() {
  side({ back: null, title: 'Dashboard', sub: 'Choose how you want to practise', items: homeItems('home') });
  const pyq = D.rows.filter(r => r.P), np = D.rows.filter(r => !r.P), res = D.sum.results, solved = D.rows.filter(r => att(res[r.id])).length, right = D.rows.filter(r => res[r.id] === 'c').length;
  const p = A().profile || {}, first = p.full_name ? p.full_name.split(' ')[0] : '', hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const pyqDone = pyq.filter(r => att(res[r.id])).length, lock = locked();
  const days = d => Math.ceil((Date.parse(d + 'T00:00:00+05:30') - Date.now()) / 864e5);
  const stat3 = (n, l) => h('div', { class: 'dh-st' }, h('b', { text: n }), h('span', { text: l }));
  const hero = h('section', { class: 'dh-hero' },
    h('div', { class: 'dh-hero-t' }, h('span', { class: 'dh-kick', text: greet.toUpperCase() }), h('h2', { text: first ? first + ', ready to practise?' : 'Ready to practise?' }),
      h('p', { text: 'Pick up where you left off: previous year questions, practice sets, DPPs and full tests, all in one place.' }),
      h('div', { class: 'dh-cta' }, h('a', { class: 'btn dh-gold', href: '#d/pyq', text: 'Practise PYQs' }), h('a', { class: 'btn dh-ghost', href: '#/modes', text: 'Take a test' }))),
    h('div', { class: 'dh-stats' }, stat3(num(solved), 'Questions attempted'), stat3(solved ? pct(right, solved) + '%' : '—', 'Accuracy'), stat3(num(D.sum.bookmarks.length), 'Bookmarked')));
  const soon = UPCOMING.map(([n, d, sl]) => ({ n, d, sl, k: days(d) })).filter(x => x.k > 0);
  const strip = soon.length ? h('section', { class: 'dh-soon', 'aria-label': 'Upcoming exams' }, soon.map(x => h('a', { class: 'dh-ex', href: 'exams/' + x.sl + '/', title: 'Dates, safe scores and pattern' },
    h('span', { class: 'dh-days' }, h('b', { text: String(x.k) }), h('i', { text: 'days' })), h('span', { class: 'dh-ex-t' }, h('b', { text: x.n }), h('small', { text: new Date(x.d + 'T12:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) })), h('span', { class: 'dh-go', html: IC.chev })))) : null;
  const card = (tone, icon, title, sub, meta, o) => h('a', { class: 'dh-card' + (o && o.lock ? ' is-lock' : ''), href: o && o.href ? o.href : '#' + o.go, style: '--tone:' + tone, onclick: o && o.lock ? (e => { e.preventDefault(); location.hash = '#/membership'; }) : null },
    h('span', { class: 'dh-ci', html: icon }), h('b', { class: 'dh-ct', text: title }), h('small', { class: 'dh-cs', text: sub }),
    h('span', { class: 'dh-cm' }, o && o.lock ? h('span', { class: 'dh-lock', html: IC.lock + ' Premium' }) : h('span', { text: meta }), h('i', { html: IC.chev })));
  const cards = h('div', { class: 'dh-grid' },
    card('#2450c8', IC.clock, 'PYQs', 'Real papers, chapter by chapter', num(pyq.length) + ' questions', { go: 'd/pyq' }),
    card('#d9961a', IC.list, 'Non-PYQs', 'Practice from books and sheets', num(np.length) + ' questions', { go: 'd/np', lock }),
    card('#7c3aed', IC.test, 'DPPs', 'BB Ex, Ln DY, Ln Ex and more', 'Daily practice', { go: 'd/dpp', lock }),
    card('#e11d48', IC.grid, 'Tests', 'Mock tests and your own tests', '5 test types', { href: '#/modes' }),
    card('#16a06a', IC.mark, 'Handouts', 'Handwritten revision notes', 'Class 11 and 12', { go: 'd/handouts' }),
    card('#0891b2', IC.mark, 'Bookmarks', 'Questions you marked', num(D.sum.bookmarks.length) + ' saved', { go: 'd/bookmarks' }));
  const prog = h('section', { class: 'dh-box' }, h('div', { class: 'dh-bh' }, h('h3', { text: 'Your progress' }), h('small', { text: 'from submitted tests' })),
    h('div', { class: 'dh-prog' }, h('div', { class: 'dh-pl' }, h('span', { text: 'PYQs attempted' }), h('b', { text: num(pyqDone) + ' / ' + num(pyq.length) })), bar(pyqDone, pyq.length)),
    h('div', { class: 'dh-prog' }, h('div', { class: 'dh-pl' }, h('span', { text: 'Correct answers' }), h('b', { text: solved ? num(right) + ' of ' + num(solved) + ' (' + pct(right, solved) + '%)' : '—' })), bar(right, solved || 1, 'ok')));
  const tests = (D.tests || []).slice(0, 4);
  const rec = h('section', { class: 'dh-box' }, h('div', { class: 'dh-bh' }, h('h3', { text: 'Recent tests' }), h('a', { href: '#d/history', text: 'All tests ›' })),
    tests.length ? h('ul', { class: 'dh-tl' }, tests.map(t => h('li', {}, h('a', { href: '#/report/' + t.attempt_id }, h('span', { class: 'dh-tt' }, h('b', { text: t.title }), h('small', { text: t.submitted_at ? new Date(t.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '' })),
      h('span', { class: 'dh-sc', text: t.score == null ? '—' : +(+t.score).toFixed(2) + ' / ' + +(+t.max_score).toFixed(2) }))))) :
      h('div', { class: 'dh-empty' }, h('p', { text: 'No tests yet. Take your first test to see your score and analysis here.' }), h('a', { class: 'btn pri', href: '#/modes', text: 'Take a test' })));
  const car = h('div', { class: 'dh-car', role: 'region', 'aria-label': 'Special picks' });
  const track = h('div', { class: 'dh-track' }, PICKS.map(pk => h('a', { class: 'dh-pk', href: '#d/pick/' + pk.k, style: '--tone:' + pk.tone }, h('b', { text: pk.t }), h('small', { text: pk.s }), h('span', { class: 'dh-pn', text: num(pk.pool().length) + ' questions' }))));
  const arrow = (dir, ic) => h('button', { type: 'button', class: 'dh-ar dh-ar-' + dir, 'aria-label': dir === 'l' ? 'Previous' : 'Next', html: ic, onclick: () => track.scrollBy({ left: dir === 'l' ? -280 : 280, behavior: 'smooth' }) });
  car.append(arrow('l', IC.back), track, arrow('r', IC.chev));
  main(hero, strip, h('h3', { class: 'dh-h', text: 'Special picks' }), car, h('h3', { class: 'dh-h', text: 'Practise' }), cards, h('div', { class: 'dh-two' }, prog, rec));
}

/* ---------- Step 2: exams (PYQ path) ---------- */
function viewExams() {
  side({ back: '', title: 'PYQs', sub: 'Pick an exam', items: homeItems('pyq') });
  const cards = EXAMS.map(e => {
    const rows = scope('pyq', e.slug), ys = rows.map(r => r.y).filter(Boolean), off = !rows.length;
    return h('a', { class: 'tx-card tx-top' + (off ? ' is-off' : ''), href: off ? '#d/pyq' : '#d/pyq/' + e.slug, style: '--tone:' + e.tone, onclick: off ? (ev => { ev.preventDefault(); toast(e.name + ' is coming soon.'); }) : null },
      h('span', { class: 'tx-ic d-exam-ic' }, logo(e)), h('h2', { text: e.name }), h('p', { text: off ? 'Coming soon' : num(rows.length) + ' previous year questions' + (ys.length ? ' from ' + Math.min(...ys) + ' to ' + Math.max(...ys) : '') + '.' }),
      h('ul', { class: 'tx-tags' }, [e.note, off ? null : 'Chapter-wise'].filter(Boolean).map(t => h('li', { text: t }))), h('span', { class: 'tx-go', text: off ? '' : 'Open \u203a' }));
  });
  main(h('div', { class: 'd-head' }, h('h2', { text: 'Previous Year Questions' }), h('p', { text: 'Pick an exam, then a chapter. Your progress stays in your own account.' })),
    h('div', { class: 'tx-grid' }, cards));
}
/* ---------- Tests: the pages of portal.js, drawn inside the dashboard ---------- */
function viewPortalPage(hs, r) {
  const tests = r === 'modes' || r === 'personal';
  document.querySelectorAll('.tb-menu .tb').forEach(x => x.setAttribute('aria-pressed', String(tests && x.dataset.k === 'tests')));
  const on = p => hs === p || hs.startsWith(p + '/');
  if (tests) side({ back: '', title: 'Tests', sub: 'Mock tests and your results', items: homeItems('tests') });
  else side({ back: '', title: 'My account', sub: 'Profile, plan and results', items: [
    { label: 'Edit profile', icon: IC.grid, hash: '/profile', active: on('#/profile') },
    { label: 'Membership', icon: IC.mark, hash: '/membership', active: on('#/membership') },
    { label: 'My Performance', icon: IC.list, hash: '/personal' },
    { label: 'Help & Support', icon: IC.test, hash: '/help', active: on('#/help') }] });
  MAIN.textContent = ''; MAIN.append(h('div', { id: 'viewPortal', class: 'pt-wrap' }));
  window.scrollTo(0, 0);
  window.AvantiPortal.route(true);
}
/* ---------- Handouts ---------- */
let HOLIST = null;
async function viewHandouts() {
  side({ back: '', title: 'Handouts', sub: 'Handwritten revision notes', items: homeItems('ho') });
  main(loadingBox('Loading the handouts…'));
  if (!HOLIST) { try { const r = await fetch('handouts/index.json'); const j = r.ok ? await r.json() : []; HOLIST = Array.isArray(j) ? j.filter(Boolean) : []; } catch (e) { HOLIST = []; } }
  const perm = A().perm, canPdf = perm.pdf === true || perm.premium || perm.staff || perm.isAdmin, FREE_HO = new Set(['11M1', '12M13']);
  const ACC = ['#e0197a', '#0a86c2', '#16a06a', '#d98200', '#7a3fd1', '#e8590c', '#5a9a00'];
  const base = x => x.file.replace(/\.pdf$/, ''), path = (x, bw) => 'handouts/' + (bw ? x.dir + '/bw/' + base(x) + '_BW.pdf' : x.file);
  const get = async (x, bw) => { const r = await fetch(path(x, bw)); if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'Handouts are part of the Premium membership.' : 'Could not open the handout. Try again.'); return r.blob(); };
  const view = async x => { try { toast('Opening ' + x.code + '…'); const t = await realTE(); await t.viewHandout(x, path(x, false)); } catch (e) { toast((e && e.message) || 'Could not open the handout. Try again.'); } };
  const save = async (x, bw) => { try { toast('Preparing the download…'); const b = await get(x, bw), a = h('a', { href: URL.createObjectURL(b), download: base(x) + (bw ? '_BW' : '') + '.pdf' }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); } catch (e) { toast(e.message); } };
  const q = { cls: '11', t: '' };
  const grid = h('div', { class: 'ho-grid' }), count = h('small', { class: 'ho-count' });
  const draw = () => {
    const L = HOLIST.filter(x => x.code.startsWith(q.cls) && (!q.t || (x.code + ' ' + x.title).toLowerCase().includes(q.t)));
    count.textContent = L.length + ' handout' + (L.length === 1 ? '' : 's');
    grid.textContent = ''; if (!L.length) { grid.append(h('p', { class: 'd-fine', text: 'No handout matches.' })); return; }
    L.forEach((x, k) => { const open = canPdf || FREE_HO.has(x.code);
      grid.append(h('article', { class: 'ho-card', style: '--ac:' + ACC[k % ACC.length] },
        h('div', { class: 'ho-top' }, h('span', { class: 'ho-code', text: x.code }), open ? null : h('span', { class: 'ho-lock', text: 'Premium' }), x.pages ? h('span', { class: 'ho-pg', text: x.pages + ' pages' }) : null),
        h('h3', { text: x.title }),
        h('p', { class: 'ho-meta', text: (x.orient || 'A4') + ' · handwritten notes' }),
        h('div', { class: 'ho-act' }, open ? [h('button', { type: 'button', class: 'btn pri', text: 'View', onclick: () => view(x) }),
          canPdf ? h('button', { type: 'button', class: 'btn', text: 'Download PDF', onclick: () => save(x, false) }) : null,
          canPdf && !x.nobw ? h('button', { type: 'button', class: 'btn', title: 'Black and white, for printing', text: 'B&W print', onclick: () => save(x, true) }) : null]
          : h('a', { class: 'btn pt-gold', href: '#/membership', text: '★ Unlock with Premium' }))));
    });
  };
  const seg = h('div', { class: 'ho-seg', role: 'tablist' }, [['11', 'Class 11'], ['12', 'Class 12']].map(([c, t]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(c === q.cls), text: t + ' (' + HOLIST.filter(x => x.code.startsWith(c)).length + ')', onclick: e => { q.cls = c; seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b === e.currentTarget))); draw(); } })));
  const search = h('input', { type: 'search', class: 'd-sel ho-search', placeholder: 'Search a chapter or code', 'aria-label': 'Search handouts', oninput: e => { q.t = e.target.value.trim().toLowerCase(); draw(); } });
  draw();
  main(h('div', { class: 'd-head' }, crumb('Handouts'), h('h2', { text: 'Handouts' }), h('p', { text: canPdf ? 'Handwritten revision notes for every chapter: view them here or download as PDF.' : 'Handwritten revision notes. The first handout of Class 11 and of Class 12 is free to view; the rest are part of Premium.' })),
    h('div', { class: 'ho-bar' }, seg, search, count), grid);
}
/* ---------- Step 3: chapters ---------- */
function chapterCards(mode, slug) {
  const withRows = D.chapters.map(c => ({ c, rows: scope(mode, slug, c.chapter_code) })).filter(x => x.rows.length);
  return h('div', { class: 'd-grid d-grid-ch' }, withRows.map(({ c, rows }) => {
    const l5 = last5(rows);
    return tile({ cls: 'd-ch', go: 'd/ch/' + mode + '/' + (slug || '-') + '/' + c.chapter_code + '/overview',
      extra: h('div', { class: 'd-ch-in' }, h('span', { class: 'd-code', text: c.chapter_code }), h('b', { text: c.chapter }),
        mode === 'pyq' ? h('small', { class: 'd-l5', text: (D.maxYear - 4) + '–' + D.maxYear + ': ' + num(l5.length) + ' Qs' }) : null,
        h('small', { text: num(rows.length) + (mode === 'pyq' ? ' PYQs in all' : ' questions') }), bar(solvedOf(rows), rows.length)) });
  }));
}
function viewChapters(mode, slug) {
  const e = EX[slug];
  if (mode === 'pyq' && !e) return go('d/pyq');
  if (mode === 'np' && locked()) { side({ back: '', title: 'Non-PYQs', items: homeItems('np') }); main(h('section', { class: 'd-lockcard' }, h('span', { html: IC.lock }), h('h2', { text: 'Non-PYQs are part of Premium' }), h('p', { text: 'Book and DPP practice questions open with a Premium plan. PYQs stay free.' }), h('a', { class: 'btn pri', href: '#/membership', text: '★ Get Premium' }))); return; }
  side(mode === 'pyq' ? { back: 'd/pyq', title: e.name, sub: '2027 · choose a chapter', items: [{ label: 'All chapters', icon: IC.grid, active: true, hash: 'd/pyq/' + slug }, { label: 'Other exams', icon: IC.clock, hash: 'd/pyq' }, { label: 'Bookmarked Qs', icon: IC.mark, hash: 'd/bookmarks' }, { label: 'Test History', icon: IC.test, hash: 'd/history' }] }
    : { back: '', title: 'Non-PYQs', sub: 'Choose a chapter', items: homeItems('np') });
  main(h('div', { class: 'd-head' }, crumb(mode === 'pyq' ? 'PYQs' : 'Non-PYQs', e && e.name), h('h2', { text: 'Select a chapter' }), h('p', { text: mode === 'pyq' ? 'The last five years show how often each chapter is asked right now.' : 'Practice questions from books and sheets, chapter by chapter.' })), chapterCards(mode, slug));
}

/* ---------- Step 4: chapter overview and its sections ---------- */
function chapterSide(mode, slug, ch, section, rows) {
  const c = D.chByCode[ch], base = 'd/ch/' + mode + '/' + (slug || '-') + '/' + ch + '/', e = EX[slug];
  const byY = y => rows.filter(r => r.y === y).length;
  const sub = (mode === 'pyq' && e ? e.name + ' » ' + (D.maxYear) + ': ' + byY(D.maxYear) + ' Qs • ' + (D.maxYear - 1) + ': ' + byY(D.maxYear - 1) + ' Qs' : 'Non-PYQ practice');
  side({ back: section === 'overview' ? (mode === 'pyq' ? 'd/pyq/' + slug : 'd/np') : base + 'overview', title: c ? c.chapter : ch, sub, items: [
    { label: 'Overview', icon: IC.grid, hash: base + 'overview', active: section === 'overview' },
    { label: mode === 'pyq' ? 'All PYQs' : 'All Questions', icon: IC.all, hash: base + 'all', active: section === 'all' },
    { label: 'Topic-wise Qs', icon: IC.list, hash: base + 'topics', active: section === 'topics' },
    { label: 'Bookmarked Qs', icon: IC.mark, hash: base + 'bookmarked', active: section === 'bookmarked' },
    { label: 'Test History', icon: IC.test, hash: base + 'tests', active: section === 'tests' }] });
}
/* Opening a difficulty bucket or a topic moves the menu one step up: its own menu with the chapter underneath, and the back arrow returns to the chapter */
const BUCKETS = [['must', 'Most Relevant PYQ-based Qs', 'star'], ['l1', 'Confidence Booster', 'beginner'], ['l2', 'Balanced', 'booster'], ['l3', 'Rank Booster', 'advanced'], ['must5', 'Must Do Qs of last 5 years', 'fire']];
function bucketSide(mode, slug, ch, active) {
  const c = D.chByCode[ch], e = EX[slug], base = 'd/ch/' + mode + '/' + (slug || '-') + '/' + ch + '/';
  const icon = { star: IC.star, beginner: IC.up, booster: IC.up, advanced: IC.up, fire: IC.fire };
  side({ back: base + 'overview', title: 'Difficulty Wise Qs Buckets', sub: (mode === 'pyq' && e ? e.name : 'Non-PYQs') + ' » ' + (c ? c.chapter : ch),
    items: BUCKETS.filter(b => mode === 'pyq' || !/^must/.test(b[0])).map(([k, t, ic]) => ({ label: t, icon: icon[ic], hash: base + k, active: active === k })) });
}
function topicList(rows, c) {
  const by = new Map(); rows.forEach(r => { const k = r.tc || r.tp; if (!by.has(k)) by.set(k, { name: r.tp || 'Other', rows: [] }); by.get(k).rows.push(r); });
  const order = (D.topics[c.chapter_code] || []).map(t => t.topic_code);
  return [...by.entries()].sort((a, b) => { const ia = order.indexOf(a[0]), ib = order.indexOf(b[0]); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
}
function topicSide(mode, slug, ch, active, rows) {
  const c = D.chByCode[ch], e = EX[slug], base = 'd/ch/' + mode + '/' + (slug || '-') + '/' + ch + '/';
  side({ back: base + 'topics', title: mode === 'pyq' ? 'Topic-wise PYQs' : 'Topic-wise Qs', sub: (mode === 'pyq' && e ? e.name : 'Non-PYQs') + ' » ' + (c ? c.chapter : ch),
    items: topicList(rows, c).map(([k, t]) => ({ label: t.name, icon: IC.list, badge: String(t.rows.length), hash: base + 't/' + encodeURIComponent(k), active: active === k })) });
}
let TOASTT = 0;
function toast(m) { let t = document.getElementById('dToast'); if (!t) { t = h('div', { id: 'dToast', class: 'd-toast', role: 'status' }); document.body.append(t); } t.textContent = m; t.classList.add('on'); clearTimeout(TOASTT); TOASTT = setTimeout(() => t.classList.remove('on'), 2600); }
const LIST_KINDS = ['all', 'must', 'must5', 'l1', 'l2', 'l3', 'bookmarked', 't'];
/* marking scheme of a question, like "+4 / −1", from the database table marking_schemes (the scheme in force in the paper's year) */
let SCP = null;
const schemesP = () => SCP || (SCP = A().sb.rpc('marking_schemes').then(r => (r.error ? [] : r.data) || []).catch(() => []));
async function markingOf(x) {
  const all = await schemesP(), P = x.source === 'PYQ', ex = P ? ({ 'AIEEE': 'JEE Main', 'IIT': 'JEE Advanced' }[x.exam] || x.exam) : 'JEE Main', yr = P ? Number(x.year) || 9999 : 9999;
  const rows = all.filter(r => r.exam === ex); if (!rows.length) return '';
  const ok = rows.filter(r => (r.effective_year || 0) <= yr).sort((a, b) => b.effective_year - a.effective_year), sc = ok[0] || rows.sort((a, b) => a.effective_year - b.effective_year)[0];
  const ty = (sc.rules && sc.rules.types) || {}, type = x.type === 'Matching' ? 'MCQ' : x.type || 'MCQ', t = ty[type] || ty.MCQ; if (!t) return '';
  const n = v => String(Number(v)), w = +t.w ? '\u2212' + n(t.w) : '0';
  return '+' + n(t.c) + ' / ' + w + (t.p ? ' (partial marks possible)' : '');
}
const listEnv = () => ({ D, A, h, main, stat, IC, pct, openQB, toast, marking: markingOf, content: window.AvantiContent, mathReady: () => window.AvantiBoot.katex().catch(() => {}) });
/* a question list inside the dashboard (dash-list.js draws it) */
function viewList(mode, slug, ch, kind, arg) {
  const c = D.chByCode[ch], e = EX[slug], rows = scope(mode, slug, ch), idSet = new Set(rows.map(r => r.id));
  const must = mode === 'pyq' ? (D.must[ch] || []).filter(id => idSet.has(id)) : [], mustSet = new Set(must), last5 = new Set(rows.filter(r => r.y && r.y > D.maxYear - 5).map(r => r.id));
  let pool, title, what = 'Chapter';
  if (kind === 'all') { pool = rows; title = mode === 'pyq' ? 'All PYQs' : 'All Questions'; chapterSide(mode, slug, ch, 'all', rows); }
  else if (kind === 'bookmarked') { const bm = new Set(D.sum.bookmarks); pool = rows.filter(r => bm.has(r.id)); title = 'Bookmarked Qs'; chapterSide(mode, slug, ch, 'bookmarked', rows); }
  else if (kind === 't') { const k = arg; pool = rows.filter(r => (r.tc || r.tp) === k); title = (pool[0] && pool[0].tp) || 'Topic'; what = 'Topic'; topicSide(mode, slug, ch, k, rows); }
  else {
    what = 'Bucket'; bucketSide(mode, slug, ch, kind);
    if (kind === 'must') { pool = rows.filter(r => mustSet.has(r.id)); title = 'Most Relevant PYQ-based Qs'; }
    else if (kind === 'must5') { pool = rows.filter(r => mustSet.has(r.id) && last5.has(r.id)); title = 'Must Do Qs of last 5 years'; }
    else { const L = kind.toUpperCase(); pool = rows.filter(r => r.d === L); title = ({ L1: 'Confidence Booster · Level 1 (Easy)', L2: 'Balanced · Level 2 (Moderate)', L3: 'Rank Booster · Level 3 (Tough)' })[L]; }
  }
  const head = h('div', { class: 'd-head' }, crumb(mode === 'pyq' ? 'PYQs' : 'Non-PYQs', e && e.name, c ? c.chapter : ch));
  window.DashList.render(listEnv(),
    { rows: pool, title, head, practiceLabel: 'Practice ' + what, testLabel: 'Take ' + what + ' Test', emptyText: kind === 'bookmarked' ? 'Tap the bookmark on any question to keep it here.' : 'No questions here yet.',
      startTest: list => launchTestFrom(list, c, mode, e, 20, what.toLowerCase() + ' test') });
}
function viewChapter(mode, slug, ch, section, extra) {
  const c = D.chByCode[ch]; if (!c) return go(mode === 'pyq' ? 'd/pyq' : 'd/np');
  if (mode === 'np' && locked()) return go('d/np');
  if (LIST_KINDS.includes(section)) return viewList(mode, slug, ch, section, extra);
  const rows = scope(mode, slug, ch); chapterSide(mode, slug, ch, section, rows);
  const e = EX[slug], tag = mode === 'pyq' ? (e ? e.name + ' PYQs' : 'PYQs') : 'Non-PYQs';
  const head = h('div', { class: 'd-head' }, crumb(mode === 'pyq' ? 'PYQs' : 'Non-PYQs', e && e.name, c.chapter_code), h('h2', { text: c.chapter }), h('p', { text: tag }));
  if (section === 'topics') return viewTopics(head, rows, mode, c, slug);
  if (section === 'tests') return viewHistory(head, rows);
  /* overview */
  const total = rows.length, solved = solvedOf(rows), right = correctOf(rows), wrong = rows.filter(r => D.sum.results[r.id] === 'w').length, acc = solved ? pct(right, solved) : 0;
  const ids = rows.map(r => r.id), must = mode === 'pyq' ? (D.must[ch] || []).filter(id => ids.includes(id)) : [], tops = [...new Set(rows.map(r => r.tp).filter(Boolean))];
  const lvl = L => rows.filter(r => r.d === L);
  const yrs = {}; rows.forEach(r => { if (r.y) yrs[r.y] = (yrs[r.y] || 0) + 1; });
  const title = c.chapter;
  main(head,
    h('section', { class: 'd-card' }, h('div', { class: 'd-card-h' }, h('h3', { text: 'Your progress' }), h('small', { text: 'from tests you have submitted' })),
      h('div', { class: 'd-stats' }, stat(IC.all, solved + '/' + total, mode === 'pyq' ? 'PYQs attempted' : 'Questions attempted'), stat(IC.target, right + '/' + total, 'Correct'), stat(IC.up, solved ? acc + '%' : '—', 'Accuracy')), bar(solved, total, 'big')),
    h('div', { class: 'd-three' },
      tile({ cls: 'd-big', title: (mode === 'pyq' ? 'All Previous Year Qs' : 'All Questions') + ' →', sub: num(total) + (mode === 'pyq' ? ' PYQs' : ' questions'), icon: IC.clock, go: 'd/ch/' + mode + '/' + (slug || '-') + '/' + ch + '/' + 'all', extra: bar(solved, total) }),
      tile({ title: mode === 'pyq' ? 'Topic-Wise PYQs' : 'Topic-Wise Qs', sub: tops.length + ' topics', icon: IC.list, go: 'd/ch/' + mode + '/' + (slug || '-') + '/' + ch + '/topics' }),
      mode === 'pyq' ? tile({ cls: 'd-gold', badge: 'Recommended', badgeCls: 'rec', title: 'Must Do PYQs', sub: must.length ? num(must.length) + ' Qs · high-yield, repeated patterns' : 'Not marked for this chapter yet', icon: IC.star, off: !must.length, go: must.length ? 'd/ch/' + mode + '/' + (slug || '-') + '/' + ch + '/' + 'must' : null })
        : tile({ title: 'Bookmarked Qs', sub: num(rows.filter(r => D.sum.bookmarks.includes(r.id)).length) + ' saved', icon: IC.mark, go: 'd/ch/np/-/' + ch + '/bookmarked' })),
    h('h3', { class: 'd-sec', text: 'Difficulty buckets' }),
    h('div', { class: 'd-three' }, LEVELS.map(([L, name, word, key]) => { const r = lvl(L); return tile({ cls: 'd-lvl d-lvl-' + key, off: !r.length, icon: IC.up, title: name + ' · ' + word, sub: num(r.length) + ' Qs', go: r.length ? 'd/ch/' + mode + '/' + (slug || '-') + '/' + ch + '/' + L.toLowerCase() : null, extra: bar(solvedOf(r), r.length) }); })),
    h('div', { class: 'd-two' },
      tile({ cls: 'd-test', icon: IC.bolt, title: 'Create Chapter Test', sub: 'A timed test from this chapter, started in one tap', extra: testLauncher(rows, c, mode, e) }),
      h('section', { class: 'd-card d-perf' }, h('div', { class: 'd-card-h' }, h('h3', { text: 'Chapter performance' })),
        h('div', { class: 'd-perf-g' }, perfRow('Attempted', solved, total, ''), perfRow('Correct', right, total, 'ok'), perfRow('Wrong', wrong, total, 'bad')),
        h('p', { class: 'd-fine', text: solved ? 'Accuracy ' + acc + '% over ' + solved + ' questions.' : 'Take a test to see your accuracy here.' }))),
    yearBlocks(rows, yrs, mode));
}
const perfRow = (label, v, t, tone) => h('div', { class: 'd-perf-r' }, h('span', { text: label }), h('b', { text: v + ' / ' + t }), bar(v, t, tone));
function yearBlocks(rows, yrs, mode) {
  const years = Object.keys(yrs).map(Number).sort((a, b) => a - b);
  if (!years.length) return null;
  const shown = years.slice(-15), max = Math.max(...shown.map(y => yrs[y])), W = 560, H = 190, bw = W / shown.length;
  const bars = shown.map((y, i) => { const v = yrs[y], bh = Math.max(3, (v / max) * (H - 44)); return '<g><title>' + y + ': ' + v + ' questions</title><rect x="' + (i * bw + 6) + '" y="' + (H - 24 - bh) + '" width="' + (bw - 12) + '" height="' + bh + '" rx="5" class="yb"/><text x="' + (i * bw + bw / 2) + '" y="' + (H - 24 - bh - 6) + '" text-anchor="middle" class="yv">' + v + '</text><text x="' + (i * bw + bw / 2) + '" y="' + (H - 7) + '" text-anchor="middle" class="yl">' + String(y).slice(2) + '</text></g>'; }).join('');
  const chart = h('div', { class: 'd-chart', role: 'img', 'aria-label': 'Questions per year', html: '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" preserveAspectRatio="xMidYMid meet">' + bars + '</svg>' });
  const lv = y => ['L1', 'L2', 'L3'].map(L => rows.filter(r => r.y === y && r.d === L).length);
  const table = h('div', { class: 'd-tw' }, h('table', { class: 'd-t' }, h('thead', {}, h('tr', {}, ['Year', 'Questions', 'Level 1', 'Level 2', 'Level 3'].map(x => h('th', { text: x })))),
    h('tbody', {}, years.slice().reverse().map(y => h('tr', {}, h('td', { text: String(y) }), h('td', { text: String(yrs[y]) }), lv(y).map(n => h('td', { text: String(n) })))))));
  return [h('h3', { class: 'd-sec', text: 'Year-wise distribution' }), h('div', { class: 'd-two d-two-top' }, h('section', { class: 'd-card' }, h('div', { class: 'd-card-h' }, h('h3', { text: 'Graph' }), h('small', { text: 'questions per year (last 15 years)' })), chart),
    h('section', { class: 'd-card' }, h('div', { class: 'd-card-h' }, h('h3', { text: 'Table' }), h('small', { text: 'all years' })), table))];
}

/* ---------- Create Chapter Test ---------- */
async function launchTestFrom(rows, c, mode, e, count, label) {
  const pool = rows.filter(r => r.ok); if (pool.length < 3) throw new Error('Not enough test-ready questions here yet.');
  const n = Math.min(count, pool.length), fresh = pool.filter(r => D.sum.results[r.id] !== 'c'), pick = (fresh.length >= n ? fresh : pool).slice();
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  const chosen = pick.slice(0, n); let figs = {}; try { figs = await window.AvantiContent.get('qb/data/figures.json'); } catch (x) { figs = {}; }
  const qs = chosen.map(r => { const x = D.raw.get(r.id), f = figs[r.id]; return { id: r.id, type: x.type, q: x.question, o: x.options || [], a: String(x.answer), ch: x.chapter_code, chn: c.chapter, tp: x.topic || '', f: f && f.svg ? { svg: f.svg } : null, s: r.P ? 'P' : 'N' }; });
  const r = await A().sb.rpc('create_personal_test', { p_title: c.chapter + (mode === 'pyq' && e ? ' · ' + e.name : '') + ' · ' + label, p_duration_min: n * 3, p_marks_correct: 4, p_marks_wrong: 1, p_questions: qs, p_paper_key: 'chapter-' + c.chapter_code, p_audience: 'self', p_exam: 'JEE Main' });
  if (r.error) throw new Error(r.error.message);
  location.hash = '#/t/' + r.data.code;
}
function testLauncher(rows, c, mode, e) {
  const pool = rows.filter(r => r.ok), sel = h('select', { class: 'd-sel', 'aria-label': 'Number of questions' }, [10, 20, 30].filter(n => n <= Math.max(10, pool.length)).map(n => h('option', { value: n, text: n + ' questions', selected: n === 20 })));
  const msg = h('small', { class: 'd-fine', role: 'status' });
  const btn = h('button', { type: 'button', class: 'btn pri', text: '⚡ Start test', disabled: pool.length < 3, onclick: async ev => {
    ev.stopPropagation(); btn.disabled = true; msg.textContent = 'Getting your questions ready…';
    try {
      await launchTestFrom(pool, c, mode, e, +sel.value, 'chapter test');
    } catch (x) { msg.textContent = x.message || 'Could not start the test.'; btn.disabled = false; }
  } });
  return h('div', { class: 'd-launch', onclick: ev => ev.stopPropagation() }, sel, btn, msg, pool.length < 3 ? h('small', { class: 'd-fine', text: 'Not enough test-ready questions here yet.' }) : h('small', { class: 'd-fine', text: '3 min per question · +4 / −1 · saved in Practice Tests & Results' }));
}

/* ---------- topics ---------- */
function viewTopics(head, rows, mode, c, slug) {
  const by = new Map(); rows.forEach(r => { const k = r.tc || r.tp; if (!by.has(k)) by.set(k, { name: r.tp || 'Other', rows: [] }); by.get(k).rows.push(r); });
  const order = (D.topics[c.chapter_code] || []).map(t => t.topic_code), list = [...by.entries()].sort((a, b) => { const ia = order.indexOf(a[0]), ib = order.indexOf(b[0]); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
  main(head, h('div', { class: 'd-grid d-grid-topic' }, list.map(([k, t]) => tile({ cls: 'd-topic', title: t.name, sub: num(t.rows.length) + ' Qs · ' + solvedOf(t.rows) + ' attempted', go: 'd/ch/' + mode + '/' + (slug || '-') + '/' + c.chapter_code + '/t/' + encodeURIComponent(k), extra: bar(solvedOf(t.rows), t.rows.length) }))));
}

/* ---------- bookmarks ---------- */
function plain(s) { return String(s || '').replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}^_$]/g, '').replace(/\s+/g, ' ').trim(); }
function viewBookmarks(head, rows, label) {
  const mine = new Set(D.sum.bookmarks), list = (rows ? rows.filter(r => mine.has(r.id)) : D.sum.bookmarks.map(id => D.rows.find(r => r.id === id)).filter(Boolean));
  const box = h('div', { class: 'd-bm' });
  const draw = () => { box.textContent = ''; const cur = list.filter(r => D.sum.bookmarks.includes(r.id));
    if (!cur.length) { box.append(h('div', { class: 'pt-state' }, h('p', { class: 'pt-st-t', text: 'No bookmarked questions yet' }), h('p', { text: 'Tap the bookmark on any question to keep it here.' }), h('a', { class: 'btn', href: '#d/pyq', text: 'Open PYQs' }))); return; }
    box.append(h('div', { class: 'd-row-actions' }, h('button', { type: 'button', class: 'btn pri', text: 'Practise these ' + cur.length + ' in the Question Bank', onclick: () => openQB(cur.map(r => r.id), (label || 'Bookmarked') + ' · bookmarked') })));
    cur.forEach(r => { const x = D.raw.get(r.id) || {}, ex = r.P ? ((EX[r.ex] || {}).name || '') + (r.y ? ' ' + r.y : '') : (x.publisher || 'Practice');
      box.append(h('div', { class: 'd-bmq' }, h('div', { class: 'd-bmq-m' }, h('span', { class: 'd-code', text: r.id }), h('small', { text: ex + ' · ' + ((D.chByCode[r.ch] || {}).chapter || r.ch) })),
        h('p', { class: 'd-bmq-t', text: plain(x.question).slice(0, 220) }),
        h('button', { type: 'button', class: 'btn', text: 'Remove', onclick: async () => { try { const t = await A().sb.rpc('toggle_bookmark', { p_qid: r.id }); if (!t.error) { D.sum.bookmarks = D.sum.bookmarks.filter(i => i !== r.id); draw(); } } catch (e) { /* offline */ } } }))); }); };
  draw(); main(head, h('section', { class: 'd-card' }, box));
}
function viewBookmarksPage() { side({ back: '', title: 'Bookmarked Qs', sub: 'Your important questions', items: homeItems('bookmarks') }); viewBookmarks(h('div', { class: 'd-head' }, h('h2', { text: 'Bookmarked questions' }), h('p', { text: 'Questions you marked as important, across all chapters.' })), null, ''); }

/* ---------- test history ---------- */
function viewHistory(head, rows) {
  const ids = rows ? new Set(rows.map(r => r.id)) : null, list = (D.tests || []).filter(t => !ids || (t.qids || []).some(q => ids.has(q)));
  const body = !list.length ? h('div', { class: 'pt-state' }, h('p', { class: 'pt-st-t', text: 'No tests yet' }), h('p', { text: ids ? 'Tests with questions from this chapter appear here.' : 'Your submitted tests appear here.' }), h('a', { class: 'btn', href: '#/modes', text: 'Take a test' }))
    : h('div', { class: 'd-tw' }, h('table', { class: 'd-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', 'Right', 'Wrong', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, list.map(t => h('tr', {}, h('td', {}, h('b', { text: t.title })), h('td', { text: t.submitted_at ? new Date(t.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }),
        h('td', { text: t.score == null ? '—' : +(+t.score).toFixed(2) + ' / ' + +(+t.max_score).toFixed(2) }), h('td', { text: String(t.correct == null ? '—' : t.correct) }), h('td', { text: String(t.wrong == null ? '—' : t.wrong) }),
        h('td', {}, h('a', { class: 'btn', href: '#/report/' + t.attempt_id, text: 'Report' })))))));
  main(head, h('section', { class: 'd-card' }, body));
}
function viewHistoryPage() { side({ back: '', title: 'Test History', sub: 'All your submitted tests', items: homeItems('history') }); viewHistory(h('div', { class: 'd-head' }, h('h2', { text: 'Test history' }), h('p', { text: 'Every test you have submitted, newest first.' })), null); }

/* ---------- router ---------- */
let NAV = 0;
async function route() {
  const hs = location.hash || '';
  const pr = /^#\/([a-z-]+)/.exec(hs);
  if (pr && pr[1] !== 'home') {   /* an account or test page of portal.js, drawn inside the dashboard */
    const to = { dpps: '#d/dpp', pyps: '#d/pyq', handouts: '#d/handouts' }[pr[1]];
    if (to) { location.replace(to); return; }
    if (pr[1] === 'qb') { location.replace('qbank#/qb'); return; }
    return viewPortalPage(hs, pr[1]);
  }
  const tok = ++NAV;
  const navK = /^#d\/dpp/.test(hs) ? 'lib' : /^#d\/(pyq|ch\/pyq)/.test(hs) ? 'pyq' : /^#d\/handouts/.test(hs) ? 'ho' : 'dash'; document.querySelectorAll('.tb-menu .tb').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.k === navK)));
  const parts = hs.replace(/^#d\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  main(loadingBox('Loading your dashboard…'));
  try { await Promise.all([load(), loadMine(false)]); } catch (e) { main(h('div', { class: 'pt-state' }, h('p', { class: 'pt-st-t', text: 'Could not load the questions' }), h('p', { text: e.message || 'Check your connection and try again.' }), h('button', { type: 'button', class: 'btn', text: 'Try again', onclick: () => { D.ready = null; route(); } }))); return; }
  if (tok !== NAV) return;
  const [a, b, c, d, e, f] = parts;
  if (!a) return viewHome();
  if (a === 'pyq') return b ? viewChapters('pyq', b) : viewExams();
  if (a === 'np') return viewChapters('np', null);
  if (a === 'ch') return viewChapter(b, c === '-' ? null : c, d, e || 'overview', f);
  if (a === 'handouts') return viewHandouts();
  if (a === 'pick') return viewPick(b);
  if (a === 'dpp') return b ? viewDppSrc(b, c) : viewDpp();
  if (a === 'bookmarks') return viewBookmarksPage();
  if (a === 'history') return viewHistoryPage();
  viewHome();
}
/* The Tests pages (portal.js) ask the Question Bank engine for the questions. On the dashboard that engine is not loaded, so the same list is built here from
   the dashboard's own data. Downloads (PDF of a paper or an answer sheet) are made by the Question Bank, so those open there. */
const QB_EXAM = { 'JEE Main': 'Main', 'AIEEE': 'Main', 'JEE Advanced': 'Adv', 'IIT': 'Adv', 'KCET': 'KCET', 'IAT': 'IAT', 'NDA': 'NDA' };
function qbCompact(r, figs) {
  const e = QB_EXAM[r.exam]; if (!e) return null;
  const P = r.source === 'PYQ';
  let o = r.options || []; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (x) { o = []; } }
  const q = { i: String(r.id), s: P ? 'P' : 'N', e, y: P && r.year != null && r.year !== '' ? Number(r.year) : null, p: r.paper, t: r.type, cc: r.chapter_code, tc: String(r.topic_code || '').replace(/^JM-/, ''), tp: r.topic || '', d: r.difficulty, q: r.question || '', o, a: r.answer == null ? '' : String(r.answer) };
  if (!P) { q.pb = r.publisher || 'Practice'; q.sec = r.section || ''; if (r.pyq) q.pq = r.pyq_ref || ''; }
  if (r.oos) q.oo = 1;
  const f = r.figure && r.figure.svg ? r.figure : figs && figs[r.id] && figs[r.id].svg ? figs[r.id] : null; if (f) q.f = f;
  return q;
}
let BANKP = null;
const dashBank = () => BANKP || (BANKP = (async () => {
  await load();
  const [meta, figs] = await Promise.all([fetch('bank-meta.json').then(r => { if (!r.ok) throw new Error('bank-meta'); return r.json(); }), window.AvantiContent.get('qb/data/figures.json').catch(() => ({}))]);
  const qs = [], byId = new Map(), chapters = new Map();
  D.raw.forEach(r => { const q = qbCompact(r, figs); if (q) { qs.push(q); byId.set(q.i, q); } });
  meta.chapters.forEach(c => chapters.set(c.c, c));
  return { qs, byId, chapters };
})().catch(e => { BANKP = null; throw e; }));
/* PDF / Word / PowerPoint exports are made by the Question Bank engine: it is loaded here, in the background, the first time a download is asked for */
let REALP = null;
const realTE = () => REALP || (REALP = (async () => {
  const keep = window.AvantiTeacher;
  if (!document.getElementById('qbStub')) document.body.append(h('div', { id: 'qbStub', hidden: true }, h('div', { id: 'viewLib' })));
  toast('Preparing the download…');
  await window.AvantiBoot.loadScript('teacher.b870.js');
  const real = window.AvantiTeacher; window.AvantiTeacher = keep; return real;
})().catch(e => { REALP = null; throw e; }));
const viaReal = fn => async (...a) => { const t = await realTE(); return t[fn](...a); };
window.AvantiTeacher = { hideViews() {}, toast, bank: dashBank, setTab: k => { location.hash = { lib: '#d/dpp', pyq: '#d/pyq', ho: '#d/handouts' }[k] || '#d/'; },
  exportIds: viaReal('exportIds'), pdfIds: viaReal('pdfIds'), shareIds: viaReal('shareIds'), math() {} };
function start() {
  shell();
  window.addEventListener('hashchange', route);
  if (window.AvantiAuth) window.AvantiAuth.renderMenu();
  route();
}
window.AvantiDash = Object.freeze({ start, route });
})();
