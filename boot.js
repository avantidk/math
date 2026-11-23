/* अंक-IT · Mathematics Dashboard · loads the dashboard after sign-in.
   Questions, solutions and handouts are NOT on this website: they live in a private Supabase Storage bucket
   and every file is checked by the database (signed in, plan, not during a test) before it is sent. This file sends the
   signed-in user's token with each request and keeps a copy in the browser (one cache per account, cleared at sign-out),
   so later visits open fast.
   BUILD must be bumped on every release so returning visitors get the new code on their next visit. */
(function () {
'use strict';
/* Clickjacking protection: GitHub Pages cannot send frame-ancestors / X-Frame-Options, so if another website has put this one
   inside a frame, break out of it, or hide the page when the browser refuses. Frames from this same site (previews) are fine. */
try {
  if (window.top !== window.self) {
    let same = false; try { same = window.top.location.origin === window.location.origin; } catch (e) { same = false; }
    if (!same) { try { window.top.location.replace(window.location.href); } catch (e) { /* sandboxed frame */ } document.documentElement.style.display = 'none'; }
  }
} catch (e) { /* never block the page because of this check */ }
/* Small helpers shared by every file of the site (one copy instead of four). */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else if (k === 'checked' || k === 'value' || k === 'disabled') e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
window.AvantiUtil = Object.freeze({ h, esc });
const BUILD = '1047';
const RELEASED = '23 Nov 2026';   /* date of this release, shown in the footer */
const SB_URL = 'https://usehxhvzhdbcmnmqaxoo.supabase.co';
const SB_KEY = 'sb_publishable_QQ_N_B6kl416kbGMF0DQtw_9Jg58PoN';
const QB_HTML = 'qb/qb.b525.html', QB_JS = 'qb/qb-all.b870.js?v=' + BUILD, TEACHER_JS = 'teacher.b870.js?v=' + BUILD;   /* the build number in the address, so a new release is never served from the saved copy */
const KATEX_JS = 'vendor/katex-0.16.9.min.js';
/* files served from Supabase Storage (bucket "content"), always with the user's token */
const CONTENT = /^(qb\/data\/|sol\/|sol-np\/|pyq\/|np\/|papers\/|index\/|must\.json|bank-meta\.json|handouts\/)/;
/* practice (Premium) files: never written to Cache Storage, so nothing paid stays in the browser after a plan ends */
const PREMIUM_FILE = /^(qb\/data\/nonpyq\.json|qb\/data\/figures-np\.json|sol-np\/|np\/)/;
/* public files kept in the browser cache as well */
const PUBLIC = /^(qb\/qb\.b\d+\.html|syllabus\.json|katex\.css)$/;
const origFetch = window.fetch.bind(window);
const CACHE_PREFIX = 'avanti-c-';

function clean(url) { return String(url).replace(/^\.?\//, ''); }
async function session() {
  const a = window.AvantiAuth; if (!a || !a.sb) return null;
  try { const { data } = await a.sb.auth.getSession(); return data.session || null; } catch (e) { return null; }
}
let cacheP = null, cacheUser = null;
async function cache() {
  if (!window.caches) return null;
  const s = await session(); const uid = s && s.user ? s.user.id : null;
  if (!uid) return null;
  if (cacheUser !== uid) {
    cacheUser = uid;
    const name = CACHE_PREFIX + uid + '-b' + BUILD;
    cacheP = window.caches.open(name).then(c => { dropPremium(c); return c; }).catch(() => null);
    /* older builds, and other accounts that used this browser, never keep paid files here */
    window.caches.keys().then(ks => ks.forEach(k => { if ((k.startsWith(CACHE_PREFIX) || k.startsWith('avanti-teacher-')) && k !== name) window.caches.delete(k); })).catch(() => {});
  }
  return cacheP;
}
/* copies of practice files left by an older build are removed (they are never stored now) */
function dropPremium(c) {
  if (!c) return;
  c.keys().then(ks => ks.forEach(r => { let u = ''; try { u = clean(new URL(r.url).pathname); } catch (e) { u = ''; } if (PREMIUM_FILE.test(u)) c.delete(r).catch(() => {}); })).catch(() => {});
}
/* the copies kept in memory on this visit (downloaded files, the solutions map, the figures) */
function clearMemory() {
  Object.keys(inflight).forEach(k => { delete inflight[k]; });
  Object.keys(refreshed).forEach(k => { delete refreshed[k]; });
  Object.keys(data).forEach(k => { delete data[k]; });
  figsP = null;
  if (window.__qbPre) window.__qbPre = null;
  recs.clear(); Object.keys(fileP).forEach(k => { delete fileP[k]; }); idxP = null; fullP = null; bankMode = null;
  try { window.dispatchEvent(new Event('avanti-content-cleared')); } catch (e) { /* old browser */ }   /* the dashboard drops its copies too */
}
/* everything readable in this browser: Cache Storage and the in-memory copies. Called at sign-out and when a test starts or resumes. */
async function clearCaches() {
  cacheP = null; cacheUser = null;
  clearMemory();
  try { const ks = await window.caches.keys(); await Promise.all(ks.filter(k => k.startsWith(CACHE_PREFIX) || k.startsWith('avanti-teacher-')).map(k => window.caches.delete(k))); } catch (e) { /* nothing cached */ }
}
/* one request to Supabase Storage (the database decides whether this account may have the file) */
async function remote(path) {
  const s = await session();
  if (!s) return new Response('', { status: 401, statusText: 'Not signed in' });
  return origFetch(SB_URL + '/storage/v1/object/authenticated/content/' + path.split('?')[0].split('/').map(encodeURIComponent).join('/'),
    { cache: 'no-cache', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + s.access_token } });
}
/* Paid files (CONTENT) are ALWAYS asked from the server, so a plan that ended or a test in progress is respected at once.
   An unchanged file costs only a small "not modified" answer (the browser keeps it). The copy in Cache Storage is used only
   when there is no internet, and it is deleted as soon as the server refuses the file. Handout PDFs are never kept. */
const inflight = {}, refreshed = {};
const keep = url => !/^handouts\/.+\.pdf$/i.test(url) && !PREMIUM_FILE.test(url);
function net(url) {
  if (!inflight[url]) {
    const go = CONTENT.test(url) ? remote(url) : origFetch(url, { cache: 'no-cache' });
    inflight[url] = go.then(async r => {
      const c = await cache();
      if (r.ok) { if (c && keep(url)) { try { c.put(url, r.clone()).catch(() => {}); } catch (e) { /* cache full */ } } }
      else {
        if (c && r.status >= 400 && r.status < 500) c.delete(url).catch(() => {});   /* refused now: never served from the cache again */
        setTimeout(() => { delete inflight[url]; }, 0);
      }
      return r;   /* a good answer is kept for this visit, so the same file is never downloaded twice */
    }, e => { delete inflight[url]; throw e; });
  }
  return inflight[url].then(r => r.clone());
}
window.fetch = function (input, init) {
  const raw = typeof input === 'string' ? input : (input && input.url);
  if (init != null || typeof raw !== 'string') return origFetch(input, init);
  const url = clean(raw);
  if (!CONTENT.test(url) && !PUBLIC.test(url)) return origFetch(input, init);
  if (inflight[url]) return inflight[url].then(r => r.clone());   /* already downloaded (or downloading) on this visit */
  if (CONTENT.test(url)) {
    return net(url).catch(e => cache().then(c => (c ? c.match(url) : null)).catch(() => null).then(hit => { if (hit) return hit; throw e; }));
  }
  return cache().then(c => (c ? c.match(url) : null)).catch(() => null).then(hit => {
    if (hit) { if (!refreshed[url]) { refreshed[url] = 1; setTimeout(() => { net(url).catch(() => {}); }, 3000); } return hit; }
    refreshed[url] = 1; return net(url);
  });
};
function getJson(path) { return window.fetch(path).then(r => { if (!r.ok) throw new Error(path + ' (' + r.status + ')'); return r.json(); }); }

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[data-src="' + src + '"]')) return res();
    const s = document.createElement('script'); s.src = src + (/^(blob:|data:|https?:)/.test(src) || src.indexOf('?') >= 0 ? '' : '?v=' + BUILD); s.dataset.src = src;
    s.onload = res; s.onerror = () => { s.remove(); rej(new Error(src)); }; document.head.append(s);
  });
}
/* KaTeX: one loader for the whole site */
let katexP = null;
function katex() { if (window.katex) return Promise.resolve(window.katex); if (!katexP) katexP = loadScript(KATEX_JS).then(() => window.katex).catch(e => { katexP = null; throw e; }); return katexP; }

/* Word / PowerPoint export code: only the admin's account can download it (Supabase Storage, admin/...). */
const adminLoaded = {};
function adminScript(path) {
  if (!adminLoaded[path]) {
    adminLoaded[path] = remote(path).then(r => {
      if (!r.ok) throw new Error(r.status === 401 ? 'Please sign in again.' : 'Word and PowerPoint downloads are for the admin only.');
      return r.blob();
    }).then(b => { const u = URL.createObjectURL(new Blob([b], { type: 'text/javascript' })); return loadScript(u).finally(() => URL.revokeObjectURL(u)); })
      .catch(e => { delete adminLoaded[path]; throw e; });
  }
  return adminLoaded[path];
}

/* ---------- the question bank, only as much as the screen needs ----------
   index/questions.json   every question WITHOUT its text, options or answer: what the dashboard needs for counts, filters,
                          progress, tests and paper lists (made by .github/scripts/split_content.py)
   pyq/<chapter>.json     the PYQ records of one chapter, np/<chapter>.json the practice records (Premium), papers/<slug>.json
                          the records of one past paper: fetched only when that chapter or paper is on the screen
   qb/data/pyq.json and nonpyq.json (the whole bank) are for the admin only. Either kind of file may be refused by the server
   rule in force (an older rule refuses the split files, the newer one the whole files): then the other kind is used. */
const REFUSED = e => /\((400|401|403|404)\)/.test(String(e && e.message));
const isAdmin = () => { const p = window.AvantiAuth && window.AvantiAuth.perm; return !!(p && p.isAdmin); };
const recs = new Map(), fileP = {};   /* full records of this visit, and the files asked for */
let idxP = null, fullP = null, bankMode = null;   /* bankMode: 'split' (small files) or 'full' (the two whole files) */
const safeName = c => String(c || 'other').replace(/[^A-Za-z0-9._-]/g, '_');
const optsOf = r => { let o = r.options || []; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { o = []; } } return Array.isArray(o) ? o : []; };
/* the same rules as split_content.py, for the whole files */
const NUMA = /^(-?\d+(?:\.\d+)?(\s+or\s+-?\d+(?:\.\d+)?)*|-?\d+(?:\.\d+)?\s*to\s*-?\d+(?:\.\d+)?)$/i;
function keyOk(r) {
  const a = String(r.answer == null ? '' : r.answer).trim(); if (!a) return false;
  if (r.type === 'Numerical') return NUMA.test(a);
  const n = optsOf(r).length; return n > 0 && (n >= 5 ? /^[A-E](,[A-E])*$/ : /^[A-D](,[A-D])*$/).test(a.replace(/\s+/g, ''));
}
const isParaRec = r => r.type === 'Comprehension' || (r.type === 'Numerical' && /^\s*Para:/i.test(r.question || ''));
const paraKey = r => { const t = String(r.question == null ? '' : r.question); return t.slice(0, Math.max(0, t.lastIndexOf('\n'))) || t; };
/* "mix-breed" PYQs: concepts of 3 or more of these families in the question and its options */
const MIXF = { trig: /\\(sin|cos|tan|cot|sec|csc)\b/, log: /\\(log|ln)\b/, int: /\\int/, lim: /\\lim/, der: /\\frac\{d|derivative|differentiable|f'|\\prime/, mat: /matri|determinant|vmatrix|adj\b/, vec: /\\vec|\\hat|vector|overrightarrow/, cx: /complex|\\bar\{z\}|\|z|\\omega|\barg\b/,
  conic: /parabola|ellipse|hyperbola|circle|focus|directrix|eccentric/, prob: /probabilit|dice|coin|randomly/, seq: /\ba\.?p\b|\bg\.?p\b|arithmetic|geometric|sequence|progression/, bin: /\\binom|binomial|permutation|combination|arrange|\^\{?n\}?c|\{\}\^/, set: /relation|\\cup|\\cap|bijective|injective|one-one|onto/, quad: /quadratic|discriminant/ };
const isMix = r => { const t = ((r.question || '') + ' ' + optsOf(r).join(' ')).toLowerCase(); let n = 0; for (const k in MIXF) if (MIXF[k].test(t)) n++; return n >= 3; };
/* one light row (the index entry) of a full record */
function light(r, P) {
  const para = isParaRec(r), y = r.year != null && r.year !== '' ? Number(r.year) : null;
  return { i: String(r.id), s: P ? 'P' : 'N', cc: r.chapter_code || '', tc: String(r.topic_code || ''), tp: r.topic || '', ex: r.exam || '', y: P && y ? y : null, p: r.paper || '', ps: '', n: r.qno == null ? '' : String(r.qno),
    t: r.type || '', d: r.difficulty || '', g: keyOk(r), oo: !!r.oos, pa: para, mx: P && isMix(r), bk: P ? '' : (r.publisher || r.book || ''), sec: r.section || '', pg: para ? paraKey(r) : '', pq: !P && r.pyq ? (r.pyq_ref || '') : '' };
}
/* index/questions.json: columns + rows, text values as numbers into "dict" (see split_content.py) */
function expand(j) {
  const ix = {}, D = j.dict || {}; (j.cols || []).forEach((k, n) => { ix[k] = n; });
  return (j.rows || []).map(a => {
    const v = k => (ix[k] == null ? undefined : a[ix[k]]), f = v('f') || 0, P = !(f & 1), tt = (D.tt || [])[v('tt') || 0] || ['', ''], pp = (D.pp || [])[v('k') || 0] || ['', 0, '', ''], code = String(tt[0] || '');
    return { i: String(a[0]), s: P ? 'P' : 'N', cc: (D.c || [])[v('c') || 0] || '', tc: code[0] === '=' ? code.slice(1) : 'JM-' + code, tp: tt[1] || '', ex: pp[0] || '', y: P && pp[1] ? Number(pp[1]) : null, p: pp[2] || '', ps: pp[3] || '', n: v('n') == null ? '' : String(v('n')),
      t: (D.t || [])[v('t') || 0] || '', d: (D.d || [])[v('d') || 0] || '', g: !!(f & 2), oo: !!(f & 4), pa: !!(f & 8), mx: !!(f & 16), bk: P ? '' : (D.b || [])[v('b') || 0] || '', sec: (D.sec || [])[v('sec') || 0] || '', pg: v('pg') || '', pq: v('pq') || '' };
  });
}
function fullFiles() {
  if (!fullP) {
    const np = isPaid() ? (data.nonpyq || getJson('qb/data/nonpyq.json')).catch(e => { if (REFUSED(e)) return []; throw e; }) : Promise.resolve([]);   /* Free accounts never ask for practice files */
    fullP = Promise.all([data.pyq || getJson('qb/data/pyq.json'), np]).then(([a, b]) => { a = a || []; b = b || []; a.concat(b).forEach(r => { if (r && r.id != null) recs.set(String(r.id), r); }); return [a, b]; })
      .catch(e => { fullP = null; throw e; });
  }
  return fullP;
}
/* the light rows of every question ({ rows, byId }): the small index for everybody, the whole files for the admin */
function index() {
  if (!idxP) {
    const split = () => getJson('index/questions.json').then(j => { bankMode = 'split'; return expand(j); });
    const full = () => fullFiles().then(([a, b]) => { bankMode = 'full'; return a.map(r => light(r, true)).concat(b.map(r => light(r, false))); });
    const [first, second] = isAdmin() ? [full, split] : [split, full];
    idxP = first().catch(e => { if (!REFUSED(e)) throw e; return second(); }).then(rows => ({ rows, byId: new Map(rows.map(r => [r.i, r])) })).catch(e => { idxP = null; throw e; });
  }
  return idxP;
}
function loadFile(f) {
  if (!fileP[f]) fileP[f] = getJson(f).then(list => { (list || []).forEach(r => { if (r && r.id != null) recs.set(String(r.id), r); }); })
    .catch(e => { delete fileP[f]; if (/^np\//.test(f) && REFUSED(e)) return; throw e; });   /* practice files: refused simply gives nothing */
  return fileP[f];
}
/* the full records of these questions (a Map id -> record): only the chapters (or the past paper, o.paper) that hold them are fetched */
async function records(ids, o) {
  const want = [...new Set((ids || []).map(String))].filter(id => !recs.has(id));
  if (!want.length) return recs;
  const ix = await index();
  if (bankMode === 'full') { await fullFiles(); return recs; }
  const files = new Set(), paid = isPaid();
  want.forEach(id => { const x = ix.byId.get(id); if (!x || (x.s === 'N' && !paid)) return;
    files.add(o && o.paper && x.ps === o.paper ? 'papers/' + x.ps + '.json' : (x.s === 'N' ? 'np/' : 'pyq/') + safeName(x.cc) + '.json'); });
  await Promise.all([...files].map(loadFile));
  return recs;
}
/* the question text, options, answer and figure written into the compact question objects of the test maker (i = id); returns them */
async function fill(qs, o) {
  const todo = (qs || []).filter(q => q && q.q == null);
  if (!todo.length) return qs;
  const [m, figs] = await Promise.all([records(todo.map(q => q.i), o), figures().catch(() => ({}))]);
  todo.forEach(q => { const r = m.get(String(q.i)); if (!r) return;
    q.q = r.question || ''; q.o = optsOf(r); q.a = r.answer == null ? '' : String(r.answer);
    const f = r.figure && r.figure.svg ? r.figure : figs && figs[q.i] && figs[q.i].svg ? figs[q.i] : null; if (f) q.f = f; });
  return qs;
}

/* Solutions are stored one file per chapter: PYQ solutions in sol/<chapter>.json, practice (non-PYQ) solutions in sol-np/<chapter>.json
   (Premium, Staff and the admin only). Only the chapters asked for are downloaded; a file that is missing or refused simply gives no solutions. */
const data = {};
let figsP = null;
const isPaid = () => { const p = window.AvantiAuth && window.AvantiAuth.perm; return !!(p && (p.premium || p.staff || p.isAdmin)); };
async function sols(ids) {
  const ix = await index(), paid = isPaid(), files = new Set();
  (ids || []).forEach(id => { const x = ix.byId.get(String(id)) || { cc: 'other', s: 'P' }; if (x.s === 'N' && !paid) return; files.add((x.s === 'N' ? 'sol-np/' : 'sol/') + encodeURIComponent(x.cc || 'other') + '.json'); });
  const out = {};
  await Promise.all([...files].map(f => getJson(f).then(o => { Object.assign(out, o); }, e => { if (/^sol\//.test(f) && !/\((400|403|404)\)/.test(e.message)) throw e; })));
  return out;
}
/* Figures: qb/data/figures.json holds the PYQ figures (everyone); qb/data/figures-np.json the practice figures (Premium only).
   Both are merged; a missing or refused file is skipped. */
function figures() {
  if (!figsP) {
    const one = (p, ok) => (ok ? getJson(p).catch(() => ({})) : Promise.resolve({}));
    figsP = Promise.all([one('qb/data/figures.json', true), one('qb/data/figures-np.json', isPaid())]).then(([a, b]) => Object.assign({}, b || {}, a || {}));
  }
  return figsP;
}

function fail() {
  const a = document.getElementById('app'); if (!a) return;
  a.innerHTML = '<div style="padding:48px 16px;text-align:center;font-family:system-ui,sans-serif"><p>The dashboard could not load. Please refresh the page.</p></div>';
}
/* /qbank is the admin's Question Bank: nobody else gets as far as asking for its files */
const onQbank = () => /\/qbank(\.html)?\/?$/.test(location.pathname);
async function start() {
  if (onQbank() && !(window.AvantiAuth && window.AvantiAuth.perm && window.AvantiAuth.perm.isAdmin)) { location.replace('dashboard' + location.hash); return; }
  ['topics', 'chapters'].forEach(n => { data[n] = getJson('qb/data/' + n + '.json'); });
  const first = getJson('qb/data/first.json'); first.catch(() => {});
  const html = window.fetch(QB_HTML + '?v=' + BUILD).then(r => { if (!r.ok) throw new Error(QB_HTML); return r.text(); });
  const kcss = window.fetch('katex.css').then(r => r.text()).catch(() => null), kjs = katex().catch(() => null);
  /* the big question files start only after the first screen's files are in */
  const gate = Promise.all([first, html, kcss, kjs].map(p => Promise.resolve(p).catch(() => null)));
  /* practice questions (nonpyq.json) are part of Premium: the database refuses the file to Free accounts, so they are not even asked for */
  const paid = !!(window.AvantiAuth && window.AvantiAuth.perm && window.AvantiAuth.perm.premium);
  ['pyq', 'nonpyq'].forEach(n => { data[n] = gate.then(() => (n === 'nonpyq' && !paid ? [] : getJson('qb/data/' + n + '.json'))); });
  window.__qbPre = { html, js: QB_JS, data, first };
  Object.values(data).concat([html]).forEach(p => p.catch(() => {}));
  try {
    for (let i = 0; ; i++) { try { await loadScript(TEACHER_JS); break; } catch (e) { if (i >= 2) throw e; await new Promise(r => setTimeout(r, 700 * (i + 1))); } }
    if (!window.AvantiTeacher) throw new Error('teacher');
  } catch (e) { fail(); return; }
  window.AvantiTeacher.start({});
  { const f = document.getElementById('appFootSite'); if (f) { f.textContent = 'Website v' + BUILD + ' · ' + RELEASED; f.setAttribute('role', 'button'); f.tabIndex = 0; f.title = 'See what changed in each version'; f.classList.add('af-click');
      const open = () => { if (window.AvantiPortal) window.AvantiPortal.showChangelog(); }; f.addEventListener('click', open); f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); } }
  if (window.AvantiAuth) window.AvantiAuth.renderMenu();
  if (window.AvantiPortal) window.AvantiPortal.route();
  /* small files used by other tabs, fetched quietly in the background (no solutions: those load per chapter when opened) */
  Promise.all(Object.values(data).concat([html])).catch(() => {}).then(async () => {
    for (const u of ['handouts/index.json', 'syllabus.json', 'bank-meta.json']) {
      await new Promise(r => setTimeout(r, 400));
      try { await window.fetch(u).then(r => r.text()); } catch (e) { /* background only */ }
    }
  });
}
window.AvantiContent = Object.freeze({ get: getJson, fetch: p => window.fetch(p), sols, figures, adminScript, clearCaches,
  index, records, fill, record: id => recs.get(String(id)), mode: () => bankMode });
window.AvantiBoot = Object.freeze({ start, loadScript, katex, build: BUILD, released: RELEASED });
})();
