/* Avanti Fellows · Teacher page. Only the owner gets the dashboard. */
(function () {
'use strict';
// The served document split around the tests JSON, so the owner can republish the page with a new test list.
const DOC_PREFIX = "<!doctype html><html><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n<title>Mathematics Dashboard | Avanti Fellows</title>\n<link rel=\"stylesheet\" href=\"app.css\">\n<div id=\"app\"><div style=\"padding:64px 16px;text-align:center;font-family:system-ui,sans-serif;color:#6E6757\">Loading…</div></div>\n<noscript>This page needs JavaScript.</noscript>\n<script type=\"application/json\" id=\"tests-data\">";
const DOC_SUFFIX = "</script>\n<script src=\"app.js\"></script>\n\n</body></html>";
const CDN = {
  katex: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js',
  auto: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js'
};
let TESTS = [], MODE = 'wait';
const pageHtml = tests => DOC_PREFIX + JSON.stringify(tests).replace(/</g, '\\u003c') + DOC_SUFFIX;
const $ = (s, r) => (r || document).querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) { const v = props[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const loaded = {};
function loadScript(url) {
  if (loaded[url]) return loaded[url];
  return (loaded[url] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => rej(new Error('load')); document.head.append(s); }));
}
function notice() {
  const app = $('#app'); app.textContent = '';
  app.append(h('div', { class: 'take' }, h('h1', { text: 'This page is for teachers' }), h('p', { text: 'Sign in to Claude with the teacher account to use the question bank, DPP library and test maker.' })));
}
async function boot() {
  try { const el = $('#tests-data'); TESTS = el ? JSON.parse(el.textContent) : []; } catch (e) { TESTS = []; }
  let u = null;
  try { if (window.claude && window.claude.use) u = await window.claude.use('user'); } catch (e) { u = null; }
  // Start every download the question bank needs at once, before the page code even runs.
  const get = (u, t) => fetch(u).then(r => { if (!r.ok) throw new Error(u); return t === 'text' ? r.text() : r.json(); });
  const data = {}; ['pyq', 'nonpyq', 'topics', 'chapters'].forEach(n => { data[n] = get('qb/data/' + n + '.json'); });
  window.__qbPre = { html: get('qb/qb.html', 'text'), js: get('qb/qb-all.js', 'text'), data };
  Object.values(window.__qbPre.data).concat([window.__qbPre.html, window.__qbPre.js]).forEach(p => p.catch(() => {}));
  await loadScript('teacher.js');
  let art = null; try { art = await window.claude.use('artifact'); } catch (e) { art = null; }
  window.AvantiTeacher.start({ tests: TESTS, artifact: art, pageHtml, user: u });
}
boot();
})();
