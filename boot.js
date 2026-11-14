/* Avanti Fellows · Mathematics Dashboard · loads the dashboard after sign-in.
   The page code and question files are cached in the browser (stale copy first, refreshed quietly), so later visits open fast.
   BUILD must be bumped on every release so returning visitors get the new code on their next visit. */
(function () {
'use strict';
const BUILD = '829';
const RELEASED = '14 Nov 2026';   /* date of this release, shown in the footer */
const CDN_KATEX = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
const CACHEABLE = /^(qb\/data\/|qb\/qb[.\-]|bank(-meta)?\.json|must\.json|syllabus\.json|handouts\/index\.json|katex\.css|teacher[.\-])/;
const origFetch = window.fetch.bind(window);
let cachep = null;
try {
  if (window.caches) {
    cachep = window.caches.open('avanti-teacher-b' + BUILD).catch(() => null);
    window.caches.keys().then(ks => ks.forEach(k => { if (/^avanti-teacher-/.test(k) && k !== 'avanti-teacher-b' + BUILD) window.caches.delete(k); })).catch(() => {});
  }
} catch (e) { cachep = null; }
const inflight = {}, refreshed = {};
function net(url) {
  if (!inflight[url]) {
    inflight[url] = origFetch(url, { cache: 'no-cache' }).then(r => {
      if (r.ok && cachep) cachep.then(c => { if (c) { try { c.put(url, r.clone()).catch(() => {}); } catch (e) { /* cache full */ } } });
      setTimeout(() => { delete inflight[url]; }, 0);
      return r;
    }, e => { delete inflight[url]; throw e; });
  }
  return inflight[url].then(r => r.clone());
}
window.fetch = function (input, init) {
  const url = typeof input === 'string' ? input : (input && input.url);
  if (init != null || typeof url !== 'string' || !CACHEABLE.test(url)) return origFetch(input, init);
  const hit = cachep ? cachep.then(c => (c ? c.match(url) : null)).catch(() => null) : Promise.resolve(null);
  return hit.then(hh => {
    if (hh) { if (!refreshed[url]) { refreshed[url] = 1; setTimeout(() => { net(url).catch(() => {}); }, 3000); } return hh; }
    refreshed[url] = 1; return net(url);
  });
};
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.append(s); }); }
function fail() {
  const a = document.getElementById('app'); if (!a) return;
  a.innerHTML = '<div style="padding:48px 16px;text-align:center;font-family:system-ui,sans-serif"><p>The dashboard could not load. Please refresh the page.</p></div>';
}
async function start() {
  const get = (u, t) => fetch(u).then(r => { if (!r.ok) throw new Error(u); return t === 'text' ? r.text() : r.json(); });
  const data = {}; ['topics', 'chapters'].forEach(n => { data[n] = get('qb/data/' + n + '.json'); });
  const first = get('qb/data/first.json'); first.catch(() => {});
  const html = get('qb/qb.b525.html', 'text'), js = get('qb/qb-all.b537.js', 'text');
  const kcss = fetch('katex.css').then(r => r.text()).catch(() => null), kjs = loadScript(CDN_KATEX).catch(() => null);
  /* the big question files start only after the first screen's files are in */
  const gate = Promise.all([first, html, js, kcss, kjs].map(p => Promise.resolve(p).catch(() => null)));
  ['pyq', 'nonpyq'].forEach(n => { data[n] = gate.then(() => get('qb/data/' + n + '.json')); });
  window.__qbPre = { html, js, data, first };
  Object.values(data).concat([html, js]).forEach(p => p.catch(() => {}));
  try {
    const code = await fetch('teacher.b531.js').then(r => { if (!r.ok) throw new Error('teacher'); return r.text(); });
    const s = document.createElement('script'); s.textContent = code; document.head.append(s);
    if (!window.AvantiTeacher) throw new Error('teacher');
  } catch (e) { fail(); return; }
  window.AvantiTeacher.start({});
  { const f = document.getElementById('appFootSite'); if (f) { f.textContent = 'Website v' + BUILD + ' · ' + RELEASED; f.setAttribute('role', 'button'); f.tabIndex = 0; f.title = 'See what changed in each version'; f.classList.add('af-click');
      const open = () => { if (window.AvantiPortal) window.AvantiPortal.showChangelog(); }; f.addEventListener('click', open); f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); } }
  if (window.AvantiAuth) window.AvantiAuth.renderMenu();
  if (window.AvantiPortal) window.AvantiPortal.route();
  Promise.all(Object.values(data).concat([html, js])).catch(() => {}).then(async () => {
    for (const u of ['qb/data/sol.json', 'handouts/index.json', 'must.json', 'syllabus.json', 'bank-meta.json']) {
      await new Promise(r => setTimeout(r, 400));
      try { await fetch(u).then(r => r.text()); } catch (e) { /* background only */ }
    }
  });
}
window.AvantiBoot = { start, loadScript, build: BUILD, released: RELEASED };
})();
