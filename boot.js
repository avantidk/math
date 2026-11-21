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
const BUILD = '982';
const RELEASED = '21 Nov 2026';   /* date of this release, shown in the footer */
const SB_URL = 'https://usehxhvzhdbcmnmqaxoo.supabase.co';
const SB_KEY = 'sb_publishable_QQ_N_B6kl416kbGMF0DQtw_9Jg58PoN';
const QB_HTML = 'qb/qb.b525.html', QB_JS = 'qb/qb-all.b870.js', TEACHER_JS = 'teacher.b870.js';
const KATEX_JS = 'vendor/katex-0.16.9.min.js';
/* files served from Supabase Storage (bucket "content"), always with the user's token */
const CONTENT = /^(qb\/data\/|sol\/|must\.json|bank-meta\.json|handouts\/)/;
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
    cacheP = window.caches.open(name).catch(() => null);
    /* older builds, and other accounts that used this browser, never keep paid files here */
    window.caches.keys().then(ks => ks.forEach(k => { if ((k.startsWith(CACHE_PREFIX) || k.startsWith('avanti-teacher-')) && k !== name) window.caches.delete(k); })).catch(() => {});
  }
  return cacheP;
}
async function clearCaches() {
  cacheP = null; cacheUser = null;
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
const keep = url => !/^handouts\/.+\.pdf$/i.test(url);
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

/* Solutions are stored one file per chapter (sol/<chapter>.json); only the chapters asked for are downloaded. */
const data = {};
let chOf = null;
function chapterOf() {
  if (!chOf) chOf = Promise.all([data.pyq || getJson('qb/data/pyq.json'), data.nonpyq || getJson('qb/data/nonpyq.json')]).then(([a, b]) => {
    const m = new Map(); (a || []).concat(b || []).forEach(q => { if (q && q.id != null) m.set(String(q.id), q.chapter_code || 'other'); }); return m;
  }).catch(e => { chOf = null; throw e; });
  return chOf;
}
async function sols(ids) {
  const m = await chapterOf(), chs = new Set();
  (ids || []).forEach(id => { chs.add(m.get(String(id)) || 'other'); });
  const out = {};
  await Promise.all([...chs].map(c => getJson('sol/' + encodeURIComponent(c) + '.json').then(o => { Object.assign(out, o); })));
  return out;
}

function fail() {
  const a = document.getElementById('app'); if (!a) return;
  a.innerHTML = '<div style="padding:48px 16px;text-align:center;font-family:system-ui,sans-serif"><p>The dashboard could not load. Please refresh the page.</p></div>';
}
async function start() {
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
window.AvantiContent = Object.freeze({ get: getJson, fetch: p => window.fetch(p), sols, adminScript, clearCaches });
window.AvantiBoot = Object.freeze({ start, loadScript, katex, build: BUILD, released: RELEASED });
})();
