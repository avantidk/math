/* Avanti Fellows \u00b7 Maths DPP and Test maker. One file, no build step. */
(function () {
'use strict';
let OPTS = null, TESTS = [];          // set after publish: the page's own share link, so test links can be built
const SHEET_W = 794, SHEET_H = 1123, PAD_X = 36, COL_GAP = 22;
const MAX_FS = 15, MAN_MIN = 13.5, AUTO_MIN = 13.5;
const CDN = {
  katex: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js',
  math: 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.1/math.js',
  auto: 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js',
  h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  pptx: 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js',
  docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  zip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
};
const DIFF = { L1: 'L1', L2: 'L2', L3: 'L3' };
const RANK = { L1: 0, L2: 1, L3: 2 };
const TYPES = ['MCQ', 'MSQ', 'Numerical', 'Subjective', 'Comprehension', 'Matching'];

/* Out-of-syllabus questions (bank field oo): include or exclude them from the test maker and the DPP library */
const OOS = { ex: false };
try { OOS.ex = localStorage.getItem('oosEx') === '1'; } catch (e) {}
function oosBox() {
  const n = BANK && BANK.all ? BANK.all.filter(q => q.oo).length : 0;
  return h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Out-of-syllabus questions' }),
    h('div', { class: 'seg oosSeg' }, h('button', { type: 'button', 'data-act': 'oos', 'data-k': 'in', text: 'Include' }), h('button', { type: 'button', 'data-act': 'oos', 'data-k': 'ex', text: 'Exclude' })),
    h('p', { class: 'hint', text: n + ' PYQs are marked out of syllabus (topics removed from the current JEE syllabus). Exclude keeps them out of every test, DPP and booklet.' }));
}
function syncOos() { document.querySelectorAll('.oosSeg button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.k === 'ex') === OOS.ex))); }
function applyOos() {
  BANK.qs = OOS.ex ? BANK.all.filter(q => !q.oo) : BANK.all.slice();
  SUBS = buildSubDpps(BANK.qs, CHMAP); buildPyqTopics();
  Object.keys(BK).forEach(k => delete BK[k]);
  ['cw', 'sw'].forEach(t => { PDFT[t].sel = null; PDFT[t].v++; if ($('#' + t + 'List')) renderPdfTab(t); });
  window.__oosInfo = () => ({ n: BANK.qs.length, all: BANK.all.length, oo: BANK.qs.filter(q => q.oo).length, subs: SUBS.length });
}
let KATEX_P = null;
let BANK = null, BYID = new Map(), CHMAP = new Map(), downloads = null;
const S = {
  mode: 'test', pyq: false, pubs: new Set(), exam: { Main: true, Adv: false, KCET: false }, cls: { 11: true, 12: false },
  ch: new Set(), tp: new Set(), diff: new Set(['L1']), types: new Set(['MCQ']), count: 25, sides: 2, cols: 2, order: true, tag: true,
  title: '', batch: '', date: new Date().toISOString().slice(0, 10), mins: 60, pos: 4, neg: 1, email: '', key: false,
  picked: [], chSearch: '', lay: null, code: '', paper: null
};

/* ---------- helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const _svg = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const ICO = {
  print: _svg('<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>'),
  share: _svg('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.7 15.7 6.3M8.3 13.3l7.4 4.4"/>'),
  chat: _svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'),
  mail: _svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
  link: _svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>'),
  bw: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
  dl: _svg('<path d="M12 4v11"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/>'),
  drive: '<img src="img/drive.png" width="22" height="20" alt="" style="display:block">',
  max: _svg('<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>'),
  min: _svg('<path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/>')
};
const fileIco = (t, stack) => '<svg viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (stack ? '<path d="M9 3h9l6 6v10"/>' : '') + '<path d="M6 5h11l6 6v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M17 5v6h6"/><text x="14" y="21" text-anchor="middle" font-size="6.4" font-weight="800" fill="currentColor" stroke="none" font-family="Inter,Arial,sans-serif">' + t + '</text></svg>';
const FIMG = { pdf: '<img src="img/pdf.png" width="36" height="36" alt="" style="display:block;object-fit:contain">', docx: '<img src="img/word.png" width="38" height="33" alt="" style="display:block;object-fit:contain">', pptx: '<img src="img/ppt.png" width="38" height="33" alt="" style="display:block;object-fit:contain">' };
const FT = { pdf: ['PDF', 'PDF'], docx: ['DOC', 'Word (editable)'], pptx: ['PPT', 'PowerPoint (editable)'] };
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
const sum = a => a.reduce((x, y) => x + y, 0);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage may be blocked */ } }
let toastT;
function toast(msg) {
  let t = $('.toast'); if (t) t.remove();
  t = h('div', { class: 'toast', role: 'status', text: msg }); document.body.append(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), Math.max(3200, String(msg).length * 80));
}
const loaded = {};
const ALT = {
  'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js': ['https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', 'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'],
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js': ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js'],
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': ['https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', 'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'],
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': ['https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js', 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'],
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js': ['https://unpkg.com/docx@8.5.0/build/index.umd.js', 'https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/index.umd.js']
};
function loadOne(url) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => { s.remove(); rej(new Error('Could not load ' + url.split('/').pop())); };
    document.head.append(s);
  });
}
function loadScript(url) {
  if (loaded[url]) return loaded[url];
  return (loaded[url] = (async () => {
    let err;
    for (const u of [url].concat(ALT[url] || [])) {
      for (let k = 0; k < 2; k++) { try { await loadOne(u); return; } catch (e) { err = e; await new Promise(r => setTimeout(r, 400)); } }
    }
    delete loaded[url];
    throw new Error((err && err.message ? err.message : 'Could not load a library') + '. Check your connection.');
  })());
}
function math(node) {
  if (!window.renderMathInElement) return;
  try {
    window.renderMathInElement(node, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false, macros: { '\\frac': '\\dfrac{#1}{#2}' } });
  } catch (e) { /* leave raw text */ }
}
const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
/* wide maths: shrink to the available width instead of spilling into the next column */
function fitMath(nd) {
  const qb = nd.querySelector('.qb'); if (!qb || !qb.clientWidth) return;
  nd.querySelectorAll('.mfit').forEach(w => { const c = w.firstElementChild; c.style.transform = ''; w.replaceWith(c); });
  nd.querySelectorAll('.katex-display').forEach(d => {
    const html = d.querySelector('.katex-html'); if (!html) return;
    html.style.transform = ''; d.style.height = '';
    const w = d.clientWidth || qb.clientWidth, cw = html.scrollWidth;
    if (cw > w + 1) {
      /* too wide for the column: let it wrap at the = and + signs (inline maths breaks lines) instead of shrinking it */
      const ann = d.querySelector('annotation');
      if (ann && window.katex) {
        try { const wr = h('div', { class: 'dwrap' }); wr.innerHTML = window.katex.renderToString(ann.textContent, { displayMode: false, throwOnError: false, macros: { '\\frac': '\\dfrac{#1}{#2}' } }); d.replaceWith(wr); return; } catch (e) { /* keep the shrunk version */ }
      } const k = (w - 2) / cw, hh = d.offsetHeight; html.style.transformOrigin = 'left top'; html.style.transform = 'scale(' + k + ')'; d.style.height = Math.ceil(hh * k) + 'px'; }
  });
  nd.querySelectorAll('.katex .base').forEach(bs => {
    if (bs.closest('.katex-display')) return;
    const opt = bs.closest('.opt'), cell = bs.closest('td,th'), avail = opt ? opt.clientWidth - opt.firstElementChild.offsetWidth - 6 : cell ? cell.clientWidth - 10 : (bs.closest('.stem') || qb).clientWidth, w = bs.offsetWidth;
    if (!avail || w <= avail + 1) return;
    const k = (avail - 2) / w, wrap = h('span', { class: 'mfit', style: 'display:inline-block;vertical-align:middle;width:' + Math.ceil(w * k) + 'px;height:' + Math.ceil(bs.offsetHeight * k) + 'px' });
    bs.replaceWith(wrap); wrap.append(bs); bs.style.transformOrigin = 'left top'; bs.style.transform = 'scale(' + k + ')';
  });
}
const plain = s => s.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\\()^_]/g, '');

/* ---------- question logic ---------- */
function numAns(a) {
  a = (a || '').trim();
  let m = a.match(/^(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)$/i);
  if (m) return { lo: Math.min(+m[1], +m[2]), hi: Math.max(+m[1], +m[2]) };
  if (/^-?\d+(?:\.\d+)?$/.test(a)) { const v = +a; return { lo: v, hi: v }; }
  return null;
}
function gradable(q) {
  if (!q.a || q.t === 'Subjective') return false;
  if (q.t === 'Numerical') return numAns(q.a) !== null;
  return q.o.length > 0 && /^[A-D](,[A-D])*$/.test(q.a);
}
function grade(q, a, pos, neg) {
  const empty = a == null || a === '' || (Array.isArray(a) && !a.length);
  if (empty) return { st: 'skip', m: 0 };
  if (q.t === 'Numerical') {
    const r = numAns(q.a), v = parseFloat(a);
    if (isNaN(v)) return { st: 'skip', m: 0 };
    const ok = r.lo === r.hi ? Math.abs(v - r.lo) <= 0.01 : (v >= r.lo - 0.005 && v <= r.hi + 0.005);
    return ok ? { st: 'ok', m: pos } : { st: 'no', m: 0 };
  }
  const given = (Array.isArray(a) ? a.slice().sort() : [a]).join(',');
  if (given === q.a.split(',').sort().join(',')) return { st: 'ok', m: pos };
  return { st: 'no', m: q.t === 'MSQ' ? 0 : -neg };
}
/* a question is in the pool when its source is ticked; the exam choice only matters for PYQs */
function srcOk(q) { return q.s === 'P' ? (S.pyq && !!S.exam[q.e]) : S.pubs.has(q.pb || 'VMC'); }
function poolFor(skip) {
  skip = skip || {};
  return BANK.qs.filter(q => {
    if (!srcOk(q)) return false;
    const c = CHMAP.get(q.cc);
    if (!S.ch.has(q.cc)) return false;
    if (!skip.tp && S.tp.size && !S.tp.has(q.cc + '|' + q.tp)) return false;
    if (!skip.diff && S.diff.size && !S.diff.has(q.d)) return false;
    if (!skip.types && S.types.size && !S.types.has(q.t)) return false;
    if (S.mode === 'test' && !gradable(q)) return false;
    return true;
  });
}
function roundRobin(list, n) {
  const g = new Map();
  shuffle(list).forEach(q => { if (!g.has(q.cc)) g.set(q.cc, []); g.get(q.cc).push(q); });
  const arrs = shuffle([...g.values()]), out = [];
  for (let i = 0; out.length < n && arrs.some(a => a.length > i); i++) arrs.forEach(a => { if (a[i] && out.length < n) out.push(a[i]); });
  return out;
}
function orderIds(ids) {
  if (!S.order) return ids;
  return ids.map((id, i) => ({ id, i, q: BYID.get(id) })).sort((a, b) => RANK[a.q.d] - RANK[b.q.d] || a.i - b.i).map(x => x.id);
}
function reconcile() {
  if (S.paper) { S.picked = S.paper.ids.filter(i => BYID.has(i)); S.count = S.picked.length; return; }
  const P = poolFor(), ids = new Set(P.map(q => q.i));
  let picked = S.picked.filter(i => ids.has(i)).slice(0, S.count);
  if (picked.length < S.count) {
    const have = new Set(picked);
    picked = picked.concat(roundRobin(P.filter(q => !have.has(q.i)), S.count - picked.length).map(q => q.i));
  }
  S.picked = orderIds(picked);
}

/* ---------- sheet building ---------- */
function colWidth(cols) { return Math.floor((SHEET_W - 2 * PAD_X - (cols - 1) * COL_GAP) / cols); }
function chapterNames() { return [...S.ch].map(c => CHMAP.get(c) && CHMAP.get(c).n).filter(Boolean); }
function defaultTitle() {
  const n = chapterNames();
  const base = n.length === 1 ? n[0] : n.length > 1 ? n.length + ' chapters' : 'Mixed chapters';
  return base + (S.mode === 'test' ? ' Test' : ' DPP');
}
function sheetParams() {
  const n = chapterNames();
  return { mode: 'test', kind: 'test', title: S.title.trim() || defaultTitle(), sub: n.length ? (n.length > 2 ? n.length + ' chapters' : n.join(' \u00b7 ')) : 'Maths', batch: S.batch.trim(), date: S.date, mins: S.mins, pos: S.pos, neg: S.neg,
    cols: S.cols, tag: S.tag, key: S.key, qs: S.picked.map(id => BYID.get(id)).filter(Boolean) };
}
function tagText(q) { return q.s === 'P' ? '[' + (q.e === 'KCET' ? 'KCET' : 'JEE ' + (q.e === 'Adv' ? 'Advanced' : 'Main')) + ' ' + q.y + ']' : ''; }
/* "match the lists" questions: split into intro + two lists so they can be drawn as a table */
function matchParts(text) {
  const ls = String(text).split('\n'), re1 = /^\s*(List|Column)[\s-]*(I|1)\s*:?\s*$/i, re2 = /^\s*(List|Column)[\s-]*(II|2)\s*:?\s*$/i;
  const a = ls.findIndex(l => re1.test(l)), b = ls.findIndex(l => re2.test(l));
  if (a < 0 || b <= a + 1) return null;
  const left = ls.slice(a + 1, b).filter(x => x.trim()), right = ls.slice(b + 1).filter(x => x.trim());
  if (!left.length || !right.length) return null;
  return { pre: ls.slice(0, a).join('\n').trim(), head: [ls[a].replace(/:\s*$/, '').trim(), ls[b].replace(/:\s*$/, '').trim()], left, right };
}
function matchTable(m) {
  const n = Math.max(m.left.length, m.right.length), rows = [];
  for (let i = 0; i < n; i++) rows.push(h('tr', {}, h('td', { text: m.left[i] || '' }), h('td', { text: m.right[i] || '' })));
  return h('table', { class: 'mtab' }, h('thead', {}, h('tr', {}, h('th', { text: m.head[0] }), h('th', { text: m.head[1] }))), h('tbody', {}, rows));
}
function buildQ(q, n, p) {
  const maxOpt = Math.max(0, ...q.o.map(o => plain(o).length));
  const cls = !q.o.length ? '' : (maxOpt <= 10 && p.cols === 1) ? 'c4' : maxOpt <= 26 ? 'c2' : 'c1';
  const hint = q.t === 'MSQ' ? '(one or more options correct)' : '';
  const t = p.tag ? tagText(q) : '';
  const mt = q.t === 'Matching' ? matchParts(q.q) : null;
  const stem = h('div', { class: 'stem' }, mt ? mt.pre : q.q, hint ? h('span', { class: 'tag', text: hint }) : null, t ? h('span', { class: 'tag', text: t }) : null);
  const kids = [stem];
  if (mt) kids.push(matchTable(mt));
  if (q.f) kids.push(h('img', { class: 'fig', alt: 'Figure', src: 'data:image/svg+xml;utf8,' + encodeURIComponent(q.f.svg), width: q.f.w, height: q.f.h }));
  if (q.o.length) kids.push(h('div', { class: 'opts ' + cls }, q.o.map((o, i) => h('div', { class: 'opt' }, h('b', { text: '(' + 'ABCD'[i] + ')' }), h('span', { text: o })))));
  else if (q.t === 'Numerical') kids.push(h('div', { class: 'ans', text: 'Ans. ____________' }));
  const node = h('div', { class: 'sq' }, q.head ? h('div', { class: 'qhead', text: q.head }) : null, h('div', { class: 'qn', text: n + '.' }), h('div', { class: 'qb' }, kids));
  math(node);
  return node;
}
function skeleton(p, keyMode) {
  const test = p.mode === 'test', sub = keyMode ? 'Answer key' : (p.sub || 'Maths');
  const info = h('div', { class: 'sh-info' },
    h('span', { text: 'Name: ______________________' }), h('span', { text: 'Avanti ID: __________' }),
    h('span', { text: (p.total || p.qs.length) + ' questions' }),
    test ? h('span', { text: 'Time: ' + p.mins + ' min' }) : h('span', { text: 'Date: ______________' }),
    test ? h('span', { text: 'Max marks: ' + (p.total || p.qs.length) * p.pos + '  (+' + p.pos + ' / \u2212' + p.neg + ')' }) : h('span', { text: 'Marks: ____ / ' + p.qs.length }));
  const dt = p.date ? new Date(p.date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return h('div', { class: 'sheet' },
    h('div', { class: 'sh-head' },
      h('div', { class: 'sh-brand' }, 'Avanti Fellows', h('i', { text: 'JEE Maths' })),
      h('div', { class: 'sh-title' }, p.title, h('small', { text: sub })),
      h('div', { class: 'sh-meta' }, p.badge ? h('div', { class: 'sh-badge', text: p.badge }) : h('div', { text: dt }), h('div', { text: p.batch || '' }))),
    keyMode || !test ? null : info,
    h('div', { class: 'sh-body' }),
    h('div', { class: 'sh-foot' }, h('span', { text: 'Avanti Fellows \u00b7 ' + p.title }), h('span', { text: keyMode ? 'Teacher copy' : (test ? 'Test' + (p.pageOf ? ' \u00b7 Page ' + p.pageOf : '') : 'DPP') })));
}
function pickSplit(hs, gap, avail, cols) {
  const n = hs.length, total = sum(hs);
  if (!n) return { split: 0, m: 0 };
  if (cols === 1) { const m = total + gap * (n - 1); return m <= avail ? { split: n, m } : null; }
  let best = null, pre = 0;
  for (let k = 1; k <= n; k++) {
    pre += hs[k - 1];
    const s1 = pre + gap * (k - 1), s2 = k < n ? total - pre + gap * (n - k - 1) : 0, m = Math.max(s1, s2);
    if (!best || m < best.m) best = { split: k, m };
  }
  return best.m <= avail ? best : null;
}
/* Lays the sheet out into `host` so it is exactly full: biggest text that fits, then equal gaps. */
/* a test is spread over S.sides A4 sides: split the questions evenly, front then back */
function testPages(p) {
  p = p || sheetParams();
  if (!p.qs.length) return [];
  const groups = S.sides > 1 ? paginate(p.qs, p) : [p.qs];
  let start = 0;
  return groups.map((g, i) => { const pg = Object.assign({}, p, { qs: g, start, total: p.qs.length, pageOf: groups.length > 1 ? (i + 1) + ' of ' + groups.length : '' }); start += g.length; return pg; });
}
function layoutSheet(p, host, minFs) {
  const sheet = skeleton(p); host.append(sheet);
  const body = $('.sh-body', sheet), cols = p.cols, nCols = [];
  for (let i = 0; i < cols; i++) { const c = h('div', { class: 'sh-col' }); body.append(c); nCols.push(c); }
  const avail = nCols[0].clientHeight;
  const nodes = p.qs.map((q, i) => buildQ(q, i + 1 + (p.start || 0), p));
  const meas = h('div', { class: 'measure' }); meas.style.width = colWidth(cols) + 'px';
  nodes.forEach(nd => { nd.style.flex = 'none'; meas.append(nd); });
  document.body.append(meas);
  let best = null, fs = p.maxFs || MAX_FS;
  const floor = minFs || (p.maxFs ? FIT_MIN : MAN_MIN);
  for (; fs >= floor - 0.001; fs -= 0.25) {
    meas.style.setProperty('--fs', fs + 'px'); nodes.forEach(fitMath);
    const hs = nodes.map(nd => nd.offsetHeight);
    const r = pickSplit(hs, fs * 0.7, avail - 8, cols);
    if (r) { best = { fs, split: r.split, m: r.m }; break; }
  }
  let overflow = false;
  if (!best) { overflow = true; fs = floor; meas.style.setProperty('--fs', fs + 'px'); nodes.forEach(fitMath); const hs = nodes.map(nd => nd.offsetHeight); const r = pickSplit(hs, 0, 1e9, cols); best = { fs, split: r.split, m: r.m }; }
  sheet.style.setProperty('--fs', best.fs + 'px');
  const groups = cols === 1 ? [nodes] : [nodes.slice(0, best.split), nodes.slice(best.split)];
  groups.forEach((g, i) => g.forEach(nd => { nd.style.flex = ''; nCols[i].append(nd); }));
  meas.remove();
  const slack = overflow ? 0 : (avail - best.m) / avail;
  return { sheet, nodes, groups, fs: best.fs, overflow, slack, avail, gap: best.fs * 0.7, n: nodes.length };
}
/* answer key: one plain, continuous list (no boxes); pages of the same sheet read as one run, and it only
   spills onto a second page when the answers really do not fit on one */
function keySheets(pp, host) {
  const base = pp[0], groups = [];
  pp.forEach(p => {
    const lab = String(p.badge || p.title).replace(/\s*\u00b7\s*Page \d+ of \d+$/, ''), g = groups[groups.length - 1], items = p.qs.map((q, i) => ({ n: i + 1 + (p.start || 0), a: q.a || '\u2014' }));
    if (g && g.lab === lab) g.items.push(...items); else groups.push({ lab, items });
  });
  const labelled = groups.length > 1, sheets = [];
  let body = null, head = null, flow = null;
  const fresh = () => { const sh = skeleton(Object.assign({}, base, { qs: [], badge: '' }), true); sh.style.boxShadow = 'none'; body = $('.sh-body', sh); body.style.display = 'block'; host.append(sh); sheets.push(sh); };
  const open = g => { head = labelled ? h('div', { class: 'keyhead', text: g.lab }) : null; flow = h('div', { class: 'keyflow' }); if (head) body.append(head); body.append(flow); };
  const over = () => body.scrollHeight > body.clientHeight + 1;
  fresh();
  for (const g of groups) {
    open(g);
    for (const it of g.items) {
      const el = h('span', { class: 'kitem' }, h('b', { text: it.n + '.' }), h('span', { text: ' ' + it.a }));
      flow.append(el); math(el);
      if (over()) {
        el.remove();
        if (!flow.children.length) { flow.remove(); if (head) head.remove(); }
        fresh(); open(g); flow.append(el);
      }
    }
  }
  return sheets;
}
/* fits at the readable size? used by "Fill page" */
function fitsAt(qs, fs) {
  const p = sheetParams(); p.qs = qs;
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' }); document.body.append(host);
  const r = layoutSheet(p, host, fs); host.remove();
  return !r.overflow;
}

/* ---------- DPP library: build ready-made topic-wise DPPs from the bank ---------- */
const MIN_Q = 8, TARGET_MIN = 10, MAX_Q = 15;
function tcNum(tc) { const m = String(tc).match(/\.(\d+)$/); return m ? +m[1] : 999; }
function sortTopicwise(qs) {
  return qs.map((q, i) => ({ q, i })).sort((a, b) => tcNum(a.q.tc) - tcNum(b.q.tc) || a.q.tp.localeCompare(b.q.tp) || RANK[a.q.d] - RANK[b.q.d] || a.i - b.i).map(x => x.q);
}
function topicGroups(qs) {
  const g = [];
  sortTopicwise(qs).forEach(q => { const l = g[g.length - 1]; if (l && l.tp === q.tp) l.qs.push(q); else g.push({ tp: q.tp, qs: [q] }); });
  return g;
}
function splitBig(g) {
  const n = g.qs.length; if (n <= MAX_Q) return [g];
  const parts = Math.ceil(n / MAX_Q), out = []; let i = 0;
  for (let p = 0; p < parts; p++) { const sz = Math.ceil((n - i) / (parts - p)); out.push({ tp: g.tp, qs: g.qs.slice(i, i + sz) }); i += sz; }
  return out;
}
function chunkLevel(qs, lv) {
  const items = topicGroups(qs).flatMap(splitBig), out = []; let cur = null;
  items.forEach(it => {
    if (!cur) { cur = { qs: it.qs.slice(), lvs: [lv] }; return; }
    if (cur.qs.length < TARGET_MIN && cur.qs.length + it.qs.length <= MAX_Q) cur.qs = cur.qs.concat(it.qs);
    else { out.push(cur); cur = { qs: it.qs.slice(), lvs: [lv] }; }
  });
  if (cur) out.push(cur);
  return out;
}
/* levels: [{key, qs}] easiest first. cross: a small leftover may join the neighbouring level. */
function rebalance(a, b) {
  const qs = sortTopicwise(a.qs.concat(b.qs)), n = qs.length, parts = Math.ceil(n / MAX_Q), out = []; let i = 0;
  for (let p = 0; p < parts; p++) { const sz = Math.ceil((n - i) / (parts - p)); out.push({ qs: qs.slice(i, i + sz), lvs: a.lvs.concat(b.lvs.filter(x => !a.lvs.includes(x))) }); i += sz; }
  return out;
}
function buildDpps(levels, cross) {
  let chunks = levels.flatMap(l => chunkLevel(l.qs, l.key));
  for (let guard = 0; guard < 200; guard++) {
    const i = chunks.findIndex((c, k) => c.qs.length < MIN_Q && [k + 1, k - 1].some(j => chunks[j] && (cross || chunks[j].lvs[0] === c.lvs[0])));
    if (i < 0) break;
    const j = [i + 1, i - 1].find(x => chunks[x] && (cross || chunks[x].lvs[0] === chunks[i].lvs[0]));
    const first = Math.min(i, j);
    chunks.splice(first, 2, ...rebalance(chunks[first], chunks[first + 1]));
  }
  return chunks.map(c => { const qs = sortTopicwise(c.qs); return { qs, lvs: c.lvs, tps: [...new Set(qs.map(q => q.tp))] }; });
}
function practiceLevel(q) {
  return RANK[q.d] == null ? 2 : RANK[q.d] + 1;   // every question is L1, L2 or L3
}
const DIFF_KEYS = ['L1', 'L2', 'L3'];

/* ---------- subtopic DPPs and level booklets ---------- */
const SUB_TOP = 20, FIT_MIN = 12, DPP_FS = 14;   /* px: 12 px = 9 pt, 14 px = 10.5 pt */
function spread(qs) {
  const g = [[], [], []];
  qs.slice().sort((x, y) => (x.s === 'N' ? 0 : 1) - (y.s === 'N' ? 0 : 1)).forEach(q => g[RANK[q.d] == null ? 1 : RANK[q.d]].push(q));
  const out = [];
  for (let i = 0; g[0].length > i || g[1].length > i || g[2].length > i; i++) [0, 1, 2].forEach(k => { if (g[k][i]) out.push(g[k][i]); });
  return out;
}
function pickSpread(topics, n) {
  const lists = topics.map(t => spread(t.qs)), out = [];
  for (let i = 0; out.length < n; i++) { let any = false; for (const l of lists) if (l[i] && out.length < n) { out.push(l[i]); any = true; } if (!any) break; }
  return out;
}
/* every chapter gets about one DPP per lecture (LECTURES, give or take one), as many as its questions allow, each on its own topic(s):
   - a topic with enough questions gets its own DPP, a big topic is spread over several DPPs (different questions in each)
   - small neighbouring topics are merged into one DPP
   Each DPP: at least 5 L1 + 5 L2 + 5 L3 (gaps filled from L2 first, then the other level), up to 20 questions on one A4 side. */
/* lectures to be taken per chapter (M2=2A+2B, M3 = 3A only, M11=A+B+C, M20=A+B); a DPP is submitted after every class */
const LECTURES = { '11M1': 12, '11M2': 7, '11M3': 9, '11M4': 9, '11M5': 7, '11M6': 13, '11M7': 8, '11M8': 13, '11M9': 15, '11M10': 11, '11M11': 18, '11M12': 3,
  '12M13': 19, '12M14': 7, '12M15': 12, '12M16': 7, '12M17': 7, '12M18': 7, '12M19': 8, '12M20': 10, '12M21': 6, '12M22': 8, '12M23': 3, '12M24': 6 };
const evenPick = (a, k) => a.length <= k ? a.slice() : Array.from({ length: k }, (_, j) => a[Math.floor((j + 0.5) * a.length / k)]);
function buildSubDpps(bank, chmap) {
  const out = [], byCh = {};
  bank.forEach(q => { if (q.s !== 'N') return; (byCh[q.cc] = byCh[q.cc] || []).push(q); });
  Object.keys(byCh).sort((a, b) => chmap.get(a).o - chmap.get(b).o || chmap.get(a).cl - chmap.get(b).cl).forEach(cc => {
    const c = chmap.get(cc), tm = new Map();
    byCh[cc].forEach(q => { if (!tm.has(q.tc)) tm.set(q.tc, { tc: q.tc, tp: q.tp, qs: [] }); tm.get(q.tc).qs.push(q); });
    const topics = [...tm.values()].sort((x, y) => tcNum(x.tc) - tcNum(y.tc));
    const N = byCh[cc].length, n = Math.max(1, Math.min(LECTURES[cc] || 8, Math.floor(N / 13)));
    let G = topics.map(t => ({ qs: t.qs.slice() }));
    const merge = (a) => { G.splice(a, 2, { qs: G[a].qs.concat(G[a + 1].qs) }); };
    for (let g = 0; g < 99 && G.length > 1; g++) {            // merge small topics into a neighbour
      let k = 0; G.forEach((x, y) => { if (x.qs.length < G[k].qs.length) k = y; });
      if (G[k].qs.length >= 13) break;
      const a = k === 0 ? 0 : k === G.length - 1 ? k - 1 : (G[k - 1].qs.length <= G[k + 1].qs.length ? k - 1 : k); merge(a);
    }
    while (G.length > n) { let b = 0, bs = 1e9; for (let a = 0; a + 1 < G.length; a++) { const z = G[a].qs.length + G[a + 1].qs.length; if (z < bs) { bs = z; b = a; } } merge(b); }
    const m = G.map(() => 1);
    for (let e = n - G.length; e > 0; e--) {                   // spare DPPs go to the biggest topics
      let k = -1, bv = 0; G.forEach((x, y) => { const v = x.qs.length / m[y]; if (Math.floor(x.qs.length / (m[y] + 1)) >= 13 && v > bv) { bv = v; k = y; } });
      if (k < 0) break; m[k]++;
    }
    let num = 0;
    G.forEach((g, gi) => {
      const lvl = { 1: [], 2: [], 3: [] }; g.qs.forEach(q => lvl[practiceLevel(q)].push(q));
      const used = new Set(), mm = m[gi];
      for (let j = 0; j < mm; j++) {
        const chunks = [1, 2, 3].map(l => { const a = lvl[l]; return a.slice(Math.round(j * a.length / mm), Math.round((j + 1) * a.length / mm)).filter(q => !used.has(q.i)); });
        const picks = [], take = q => { picks.push(q); used.add(q.i); };
        chunks.forEach(ch => evenPick(ch, 5).forEach(take));
        let need = 15 - picks.length;
        [2, 3, 1].forEach(l => { chunks[l - 1].filter(q => !used.has(q.i)).slice(0, Math.max(0, need)).forEach(q => { take(q); need--; }); });
        [2, 3, 1].forEach(l => { if (need <= 0) return; const a = lvl[l], at = j * a.length / mm; a.map((q, x) => ({ q, d: Math.abs(x - at) })).filter(o => !used.has(o.q.i)).sort((x, y) => x.d - y.d).slice(0, need).forEach(o => { take(o.q); need--; }); });
        if (!picks.length) continue;
        const extra = new Set(); let more = SUB_TOP - picks.length;
        if (picks.length >= 15) [2, 3, 1].forEach(l => { chunks[l - 1].filter(q => !used.has(q.i)).slice(0, Math.max(0, more)).forEach(q => { take(q); extra.add(q.i); more--; }); });
        const qs = sortTopicwise(picks); num++;
        out.push({ kind: 'sub', cc, chapter: c.n, num, id: 'sub-' + cc + '-' + num, lvs: [], tps: [...new Set(qs.map(q => q.tp === 'Unmapped' ? 'Mixed problems' : q.tp))], pool: picks.length, qs, extra });
      }
    });
  });
  return out;
}
function levelPools(chapterCode) {
  const lv = { 1: [], 2: [], 3: [] };
  BANK.qs.forEach(q => { if (q.cc === chapterCode && q.s === 'N' && LS.pubs.includes(q.pb || 'VMC')) { const l = practiceLevel(q); if (l) lv[l].push(q); } });
  return lv;
}

/* ---------- PYQ topics from the CMS list ---------- */
const norm = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
let PYQT = {};
/* PYQ order inside a topic: easy (L1) to hard (L3), then newest first (year, then date from the id) */
const pyqDay = q => { const m = /^J[MA](\d{4})(\d{2})(\d{2})(\d)/.exec(q.i || ''); return m ? m[1] + m[2] + m[3] + m[4] : '0'; };
const pyqNewest = (a, b) => (Number(b.y) || 0) - (Number(a.y) || 0) || pyqDay(b).localeCompare(pyqDay(a));
/* flat list for pages: a heading at each topic start and at each level change ("L1 questions") */
function levelFlat(groups) {
  const flat = [];
  groups.forEach(g => { let lv = null; g.qs.forEach((q, i) => { const parts = []; if (i === 0 && g.label) parts.push(g.label); if (i === 0 || q.d !== lv) parts.push(q.d + ' questions'); lv = q.d; flat.push(Object.assign({}, q, { _t: g.label, _l: q.d, head: parts.join(' \u00b7 ') })); }); });
  return flat;
}
const contHead = q => [q._t, q._l && q._l + ' questions'].filter(Boolean).join(' \u00b7 ') + ' (continued)';
function buildPyqTopics() {
  PYQT = {};
  Object.keys(BANK.syl || {}).forEach(cc => { PYQT[cc] = { topics: BANK.syl[cc].map(t => ({ no: t[0], name: t[1], qs: [] })), other: [] }; });
  BANK.qs.forEach(q => {
    if (q.s !== 'P' || !PYQT[q.cc]) return;
    const c = PYQT[q.cc], t = c.topics.find(x => norm(x.name) === norm(q.tp)); (t ? t.qs : c.other).push(q);
  });
  Object.values(PYQT).forEach(c => { const by = a => a.map((q, i) => ({ q, i })).sort((x, y) => RANK[x.q.d] - RANK[y.q.d] || pyqNewest(x.q, y.q) || x.i - y.i).map(x => x.q); c.topics.forEach(t => { t.qs = by(t.qs); }); c.other = by(c.other); });
}

/* ---------- DPP library UI ---------- */
let SUBS = [];
const BK = {};
const LS = { kind: 'sub', chs: [], ids: [], idk: '', part: 'all', page: 0, key: false, shown: false, year: 'all', yrs: [], ex: [], lv: ['L1', 'L2', 'L3'], pubs: [] };
const PUBS = [];   /* every source tag found in the bank: VMC, Cengage, PPTs, Avanti and any new one */
function initPubs() {
  const found = [...new Set(BANK.qs.filter(q => q.s === 'N').map(q => q.pb || 'VMC'))], first = ['VMC', 'Cengage', 'PPTs', 'Avanti', 'Black Book'];
  PUBS.length = 0; first.concat(found.filter(x => !first.includes(x)).sort()).forEach(x => PUBS.push(x));
  LS.pubs = PUBS.slice();
  S.pubs = new Set(PUBS);
}
const shortList = (a, n) => a.slice(0, n).join(', ') + (a.length > n ? ' +' + (a.length - n) : '');
const BASE = { mode: 'dpp', kind: 'dpp', cols: 2, tag: true, date: '', batch: '', mins: 0, pos: 4, neg: 1 };
/* a DPP is about 15 questions on one A4 side */
function dppPages(d) {
  const n = d.fitParts ? [].concat(...d.fitParts).length : d.qs.length;
  const parts = d.fitParts || [d.qs.slice()];
  let start = 0;
  return parts.map((g, i) => {
    const p = Object.assign({}, BASE, { title: d.chapter, sub: shortList(d.tps, 3), badge: 'DPP ' + d.num + (parts.length > 1 ? ' \u00b7 Page ' + (i + 1) + ' of ' + parts.length : ''), qs: g, start, total: n, maxFs: DPP_FS, file: d.chapter + ' DPP ' + d.num });
    start += g.length; return p;
  });
}
/* up to 20 questions per DPP: keep as many as fit at 10.5-11.5 pt, dropping the extra (6th-per-level) questions first, then the tallest ones (never below 12) */
function fitDpp(d) {
  if (d.fitDone) return;
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' });
  document.body.append(host);
  try {
    const p = dppPages(d)[0];
    let qs = p.qs.slice();
    for (let g = 0; g < 14; g++) {
      const L = layoutSheet(Object.assign({}, p, { qs }), host, FIT_MIN), hs = L.nodes.map(n => n.offsetHeight); L.sheet.remove();
      if (!L.overflow || qs.length <= 12) break;
      const ex = qs.map((q, i) => ({ i, h: hs[i], x: d.extra && d.extra.has(q.i) })).filter(o => o.x);
      const pool = ex.length ? ex : qs.map((q, i) => ({ i, h: hs[i] }));
      const drop = pool.reduce((a, b) => b.h > a.h ? b : a).i;
      qs = qs.filter((_, i) => i !== drop);
    }
    d.fitParts = [qs]; d.qs = qs; d.fitDone = true;
  } finally { host.remove(); }
}
/* split questions into full pages: greedy count, then spread evenly */
function paginate(qs, base) {
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' }); document.body.append(host);
  const sk = skeleton(Object.assign({}, base, { qs: [] })); host.append(sk);
  const cols = []; for (let i = 0; i < base.cols; i++) { const c = h('div', { class: 'sh-col' }); $('.sh-body', sk).append(c); cols.push(c); }
  const avail = cols[0].clientHeight, gap = AUTO_MIN * 0.7;
  const meas = h('div', { class: 'measure' }); meas.style.width = colWidth(base.cols) + 'px'; meas.style.setProperty('--fs', AUTO_MIN + 'px'); document.body.append(meas);
  const hs = qs.map((q, i) => { const nd = buildQ(q, i + 1, base); nd.style.flex = 'none'; meas.append(nd); fitMath(nd); return nd.offsetHeight; });
  meas.remove(); host.remove();
  const ok = (a, b) => pickSplit(hs.slice(a, b), gap, avail - 8, base.cols);
  const greedy = []; let st = 0;
  while (st < qs.length) { let en = st + 1; while (en < qs.length && ok(st, en + 1)) en++; greedy.push([st, en]); st = en; }
  const k = greedy.length, even = []; let i = 0;
  for (let pg = 0; pg < k; pg++) { const sz = Math.ceil((qs.length - i) / (k - pg)); even.push([i, i + sz]); i += sz; }
  const use = even.every(r => ok(r[0], r[1])) ? even : greedy;
  return use.map(r => qs.slice(r[0], r[1]));
}
function packPages(qs, mk) {
  const pg = paginate(qs, BASE), out = []; let start = 0;
  pg.forEach((g, i) => { out.push(Object.assign({}, BASE, mk(g, i, pg.length), { qs: g, start, cols: g.length <= 4 ? 1 : 2 })); start += g.length; });
  return out;
}
function bookletPages(cc, part) {
  const key = 'b|' + cc + '|' + part + '|' + LS.pubs.join(''); if (BK[key]) return BK[key];
  const pools = levelPools(cc), c = CHMAP.get(cc), out = [];
  (part === 'all' ? [1, 2, 3] : [+part]).forEach(l => {
    if (!pools[l].length) return;
    packPages(sortTopicwise(pools[l]), (g, i, n) => ({ title: c.n, sub: 'Level ' + l + (LS.pubs.length < PUBS.length ? ' \u00b7 ' + LS.pubs.join(' + ') : '') + ' \u00b7 ' + shortList([...new Set(g.map(q => q.tp))], 3), badge: 'Level ' + l + ' \u00b7 Page ' + (i + 1) + ' of ' + n, level: l })).forEach(x => out.push(x));
  });
  return (BK[key] = out);
}
const exOf = q => q.e === 'KCET' ? 'KCET' : q.e === 'Adv' ? (q.y < 2013 ? 'IIT' : 'JEE Advanced') : (q.y < 2013 ? 'AIEEE' : 'JEE Main');
const EXAMS = ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT', 'KCET'];
const yf = qs => qs.filter(q => (!LS.yrs.length || LS.yrs.includes(String(q.y))) && (!LS.ex.length || LS.ex.includes(exOf(q))) && LS.lv.includes(q.d));
function pyqYears(cc) { const c = PYQT[cc], a = c.other.concat(...c.topics.map(t => t.qs)); return [...new Set(a.map(q => String(q.y)))].sort((x, y) => y - x); }
function pyqPages(cc, id) {
  const key = 'p|' + cc + '|' + id + '|' + LS.yrs.join(',') + '|' + LS.ex.join(',') + '|' + LS.lv.join(''); if (BK[key]) return BK[key];
  const c = PYQT[cc], name = CHMAP.get(cc).n, out = [];
  const list = id === 'all' ? c.topics.map(t => ({ label: 'Topic ' + t.no, name: t.name, qs: yf(t.qs) })).concat(c.other.length ? [{ label: 'Other', name: 'Other topics', qs: yf(c.other) }] : [])
    : id === 'other' ? [{ label: 'Other', name: 'Other topics', qs: yf(c.other) }] : c.topics.filter(t => String(t.no) === id).map(t => ({ label: 'Topic ' + t.no, name: t.name, qs: yf(t.qs) }));
  if (id === 'all') {
    const flat = levelFlat(list.map(t => ({ label: t.label + ' \u00b7 ' + t.name, qs: t.qs })));
    if (flat.length) {
      const pages = packPages(flat, (g, i, n) => ({ title: name, sub: 'All topics, topic wise', badge: n > 1 ? 'Page ' + (i + 1) + ' of ' + n : 'All topics' }));
      pages.forEach(pg => { if (!pg.qs[0].head) pg.qs = [Object.assign({}, pg.qs[0], { head: contHead(pg.qs[0]) })].concat(pg.qs.slice(1)); out.push(pg); });
    }
    return (BK[key] = out);
  }
  list.forEach(t => { if (!t.qs.length) return; const flat = levelFlat([{ label: t.label + ' \u00b7 ' + t.name, qs: t.qs }]); packPages(flat, (g, i, n) => ({ title: name, sub: t.label + ' \u00b7 ' + t.name, badge: t.label + (n > 1 ? ' \u00b7 Page ' + (i + 1) + ' of ' + n : '') })).forEach(x => { x.qs = x.qs.map((q, j) => (j === 0 && !q.head ? Object.assign({}, q, { head: contHead(q) }) : q)); out.push(x); }); });
  return (BK[key] = out);
}
function practiceChapters() { return [...new Set(BANK.qs.filter(q => q.s === 'N' && practiceLevel(q) && LS.pubs.includes(q.pb || 'VMC')).map(q => q.cc))].sort((a, b) => CHMAP.get(a).o - CHMAP.get(b).o || CHMAP.get(a).cl - CHMAP.get(b).cl); }
function libChapters() {
  if (LS.kind === 'book') return practiceChapters().map(cc => ({ cc, n: CHMAP.get(cc).n }));
  if (LS.kind === 'pyq') return Object.keys(PYQT).sort((a, b) => CHMAP.get(a).o - CHMAP.get(b).o || CHMAP.get(a).cl - CHMAP.get(b).cl).map(cc => ({ cc, n: CHMAP.get(cc).n + ' (' + pyqCount(cc, 'all') + ')' }));
  const out = []; SUBS.forEach(d => { if (!out.find(x => x.cc === d.cc)) out.push({ cc: d.cc, n: d.chapter }); }); return out;
}
function opt(sel, items, cur) { sel.textContent = ''; items.forEach(([v, t]) => sel.append(h('option', { value: v, text: t }))); if (items.some(i => i[0] === cur)) sel.value = cur; else if (items.length) sel.value = items[0][0]; return sel.value; }
const qWord = n => n + (n === 1 ? ' question' : ' questions');
function pyqCount(cc, id) { const c = PYQT[cc]; return id === 'all' ? sum(c.topics.map(t => yf(t.qs).length)) + yf(c.other).length : id === 'other' ? yf(c.other).length : yf((c.topics.find(t => String(t.no) === id) || { qs: [] }).qs).length; }
const topicKeys = cc => PYQT[cc].topics.map(t => cc + '|' + t.no).concat(PYQT[cc].other.length ? [cc + '|other'] : []);
function pyqSel() {
  const out = [];
  LS.chs.forEach(cc => {
    const all = topicKeys(cc), picked = all.filter(v => LS.ids.includes(v));
    if (!picked.length) return;
    if (picked.length === all.length) pyqPages(cc, 'all').forEach(x => out.push(x));
    else picked.forEach(v => pyqPages(cc, v.split('|')[1]).forEach(x => out.push(x)));
  });
  return out;
}
function currentPages() {
  let pages = [];
  if (LS.kind === 'book') LS.chs.forEach(cc => bookletPages(cc, LS.part).forEach(x => pages.push(x)));
  else if (LS.kind === 'pyq') pages = pyqSel();
  else SUBS.filter(d => LS.ids.includes(d.id)).forEach(d => { fitDpp(d); dppPages(d).forEach(p => pages.push(p)); });
  return pages.map(p => Object.assign({}, p, { key: LS.key }));
}
/* tick-box list: a summary button that opens a list of checkboxes. Redraws keep it open. */
function mfill(id, items, sel, set, noun, o) {
  o = o || {};
  const box = $('#' + id), list = $('.ml', box), st = list.scrollTop, valid = items.map(i => i[0]);
  const cur = sel.filter(v => valid.includes(v));
  list.textContent = '';
  items.forEach(([v, t]) => {
    const cb = h('input', { type: 'checkbox', value: v, onchange: () => set([...list.querySelectorAll('input:checked')].map(x => x.value)) });
    cb.checked = cur.includes(v);
    list.append(h('label', { class: 'mi' }, cb, h('span', { text: t })));
  });
  list.scrollTop = st;
  const names = items.filter(i => cur.includes(i[0])).map(i => i[1].replace(/\s*\(\d+\)$/, ''));
  $('.mt', box).textContent = !items.length ? (o.empty || 'Nothing to pick') : !cur.length ? (o.none || 'Pick ' + noun) : cur.length === items.length ? 'All ' + noun + ' (' + items.length + ')' : cur.length <= 2 ? names.join(', ') : cur.length + ' of ' + items.length + ' ' + noun;
  return cur;
}
const msel = (id, noun) => h('div', { class: 'msel', id },
  h('button', { type: 'button', class: 'mbtn', 'aria-expanded': 'false', onclick: e => { const b = e.currentTarget, o = b.getAttribute('aria-expanded') !== 'true'; document.querySelectorAll('.msel .mbtn').forEach(x => { x.setAttribute('aria-expanded', 'false'); x.parentNode.classList.remove('open'); }); b.setAttribute('aria-expanded', String(o)); b.parentNode.classList.toggle('open', o); } }, h('span', { class: 'mt', text: 'Pick ' + noun }), h('span', { class: 'mcar', 'aria-hidden': 'true', text: '\u25be' })),
  h('div', { class: 'mp' },
    h('div', { class: 'mq' },
      h('button', { type: 'button', class: 'mlink', 'data-act': 'mall', 'data-k': id, text: 'Select all' }),
      h('button', { type: 'button', class: 'mlink', 'data-act': 'mnone', 'data-k': id, text: 'Clear' })),
    h('div', { class: 'ml' })));
const chLabel = () => LS.chs.length === 1 ? CHMAP.get(LS.chs[0]).n : LS.chs.length + ' chapters';
const lvSuffix = () => LS.lv.length === 3 ? '' : ' ' + LS.lv.join('+');
const yrSuffix = () => (LS.ex.length ? ' ' + LS.ex.join('+') : '') + (LS.yrs.length ? ' ' + (LS.yrs.length > 3 ? LS.yrs.length + ' years' : LS.yrs.join('+')) : '');
function renderLib() {
  if (!$('#libCh')) return;
  syncOos();
  $('#libKind').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === LS.kind)));
  const chs = libChapters();
  LS.chs = mfill('libCh', chs.map(c => [c.cc, c.n]), LS.chs, v => { LS.chs = v; LS.chTouched = true; renderLib(); }, 'chapters');
  const book = LS.kind === 'book', pyq = LS.kind === 'pyq', multiCh = LS.chs.length > 1;
  $('#fldDpp').hidden = book; $('#fldPart').hidden = !book; $('#fldYear').hidden = !pyq; $('#fldEx').hidden = !pyq; $('#fldLv').hidden = !pyq; $('#fldPub').hidden = !book; $('#boxAll').hidden = !pyq;
  $('#lblDpp').textContent = pyq ? 'Topics' : 'Subtopics';
  $('#libPub').querySelectorAll('button').forEach(b => { const n = BANK.qs.filter(q => q.s === 'N' && (q.pb || 'VMC') === b.dataset.k && practiceLevel(q)).length; b.setAttribute('aria-pressed', String(LS.pubs.includes(b.dataset.k))); b.textContent = b.dataset.k + ' (' + n + ')'; });
  $('#libLv').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(LS.lv.includes(b.dataset.k))));
  let info = '', itemsNow = [];
  const pre = cc => multiCh ? CHMAP.get(cc).n + ' \u00b7 ' : '';
  if (book) {
    const pls = LS.chs.map(cc => levelPools(cc)), cnt = l => sum(pls.map(p => p[l].length)), tot = sum([1, 2, 3].map(cnt));
    LS.part = opt($('#libPart'), [['all', 'Levels 1, 2 and 3 together (' + tot + ' questions)']].concat([1, 2, 3].map(l => [String(l), 'Level ' + l + ' only (' + cnt(l) + ' questions)'])), LS.part);
    info = '<b>' + qWord(LS.part === 'all' ? tot : cnt(+LS.part)) + '.</b> One file with every page.';
  } else {
    if (pyq) {
      const ys = [...new Set([].concat(...LS.chs.map(cc => pyqYears(cc))))].sort((x, y) => y - x);
      const allQ = [].concat(...LS.chs.map(cc => { const c = PYQT[cc]; return c.other.concat(...c.topics.map(t => t.qs)); }));
      const ys2 = [...new Set(allQ.map(q => String(q.y)))].sort((x, y) => y - x);
      const cy = {}, ce = {}; allQ.forEach(q => { if (LS.lv.includes(q.d)) { if (!LS.ex.length || LS.ex.includes(exOf(q))) cy[q.y] = (cy[q.y] || 0) + 1; if (!LS.yrs.length || LS.yrs.includes(String(q.y))) ce[exOf(q)] = (ce[exOf(q)] || 0) + 1; } });
      LS.ex = mfill('libEx', EXAMS.map(x => [x, x + ' (' + (ce[x] || 0) + ')']), LS.ex, v => { LS.ex = v; renderLib(); }, 'exams', { none: 'All exams' });
      LS.yrs = mfill('libYr', ys2.map(y => [y, y + ' (' + (cy[y] || 0) + ')']), LS.yrs, v => { LS.yrs = v; renderLib(); }, 'years', { none: 'All years' });
      LS.chs.forEach(cc => { const c = PYQT[cc];
        c.topics.forEach(t => itemsNow.push([cc + '|' + t.no, pre(cc) + 'Topic ' + t.no + ' \u00b7 ' + t.name + ' (' + yf(t.qs).length + ')']));
        if (c.other.length) itemsNow.push([cc + '|other', pre(cc) + 'Other topics, not in the CMS list (' + yf(c.other).length + ')']); });
    } else {
      SUBS.filter(d => LS.chs.includes(d.cc)).forEach(d => itemsNow.push([d.id, pre(d.cc) + 'DPP ' + d.num + ' \u00b7 ' + shortList(d.tps, 2).replace(/^(.{70}).*(\+\d+)?$/, '$1\u2026') + ' (' + d.qs.length + ')']));
    }
    const k = LS.kind + '|' + LS.chs.join(',');
    if (LS.idk !== k) { LS.idk = k; LS.ids = itemsNow.map(i => i[0]); }
    LS.ids = mfill('libDpp', itemsNow, LS.ids, v => { LS.ids = v; renderLib(); }, pyq ? 'topics' : 'subtopics', { empty: 'Pick a chapter first' });
    if (pyq) {
      const n = sum(LS.ids.map(v => { const [cc, id] = v.split('|'); return pyqCount(cc, id); }));
      info = !LS.chs.length ? 'Pick one or more chapters first.' : n ? '<b>' + qWord(n) + '.</b> Every page downloads in one file.' : '<b>0 questions</b> for this pick so far.';
    } else { const n = sum(SUBS.filter(d => LS.ids.includes(d.id)).map(d => d.qs.length)); info = !LS.chs.length ? 'Pick one or more chapters first.' : n ? '<b>' + qWord(n) + '</b> in ' + LS.ids.length + (LS.ids.length === 1 ? ' DPP' : ' DPPs') + ', one A4 side each.' : 'Tick at least one DPP.'; }
  }
  $('#libNote').textContent = LS.kind === 'sub' ? 'Practice questions only, no PYQs. Each chapter has about one DPP per lecture, in topic order: 15 to 20 questions on one A4 side (at least 5 easy, 5 medium, 5 tough), text 10.5 to 11.5 pt. You can pick many chapters and subtopics.'
    : pyq ? 'Real JEE Main, JEE Advanced and KCET past-year questions, easy to hard. Pick chapters, topics, levels, exam and year. Topics with no PYQs show 0.'
    : 'Practice questions only, no PYQs. Every question of Level 1, 2 and 3, topic by topic, page after page.';
  $('#libDl').textContent = book || pyq || LS.ids.length > 1 ? 'All selected pages' : 'All selected pages';
  LS.shown = false; LS.page = 0;
  const wrap = $('#libPrev'); wrap.textContent = '';
  const ip = h('p', { class: 'msg' }); ip.innerHTML = info;
  wrap.append(h('div', { class: 'ph' }, ip, h('button', { type: 'button', class: 'btn', 'data-act': 'libshow', text: 'Show preview' })));
  $('#libMsg').textContent = ''; $('#libPages').hidden = true;
}
function addKeyPages(wrap, pages) {
  const kp = pages.filter(p => p.key); if (!kp.length) return;
  const hst = exportHost();
  try { keySheets(kp, hst).forEach(sh => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox keypg' }, sc)); sc.append(sh); }); }
  finally { hst.remove(); }
  rescale();
}
function showLibPrev() {
  const pages = currentPages(), wrap = $('#libPrev'), msg = $('#libMsg'); wrap.textContent = '';
  if (!pages.length) { wrap.append(h('div', { class: 'empty', text: 'No questions here yet.' })); msg.textContent = ''; return; }
  LS.shown = true; LS.page = 0;
  const pb = $('#libPages'); pb.hidden = true; pb.textContent = '';
  const tot = sum(pages.map(x => x.qs.length)), tok = LS.tok = (LS.tok || 0) + 1, scalers = []; let warn = false;
  pages.forEach(() => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox' }, sc)); scalers.push(sc); });
  rescale();
  const say = done => { msg.className = 'msg' + (warn ? ' warn' : ''); msg.innerHTML = pages.length > 1 ? '<b>' + pages.length + ' pages, ' + qWord(tot) + '.</b>' + (done ? ' Scroll to see all pages.' : ' Loading\u2026') + ' Download includes all ' + pages.length + ' pages.' : '<b>' + qWord(pages[0].qs.length) + '</b> on one A4 side' + (warn ? ', printed small.' : '.'); };
  say(false);
  let i = 0;
  const step = () => { if (LS.tok !== tok) return; const end = Math.min(i + 3, pages.length); for (; i < end; i++) { const L = layoutSheet(pages[i], scalers[i]); if (L.overflow) warn = true; } rescale(); say(i >= pages.length); if (i < pages.length) setTimeout(step, 0); else addKeyPages(wrap, pages); };
  step();
}
function exportLib(kind) {
  const pages = currentPages(); if (!pages.length) { toast('No questions here yet'); return; }
  const c = chLabel();
  if (pages.length === 1 && LS.kind !== 'book') { doExport(kind, Object.assign({}, pages[0], { file: LS.kind === 'pyq' ? CHMAP.get(LS.chs[0]).n + ' ' + pages[0].badge + ' PYQs' + lvSuffix() + yrSuffix() : pages[0].file })); return; }
  const file = LS.kind === 'book' ? c + ' ' + (LS.part === 'all' ? 'Levels 1-3 DPPs' : 'Level ' + LS.part + ' DPPs') + (LS.pubs.length < PUBS.length ? ' ' + LS.pubs.join('+') : '')
    : LS.kind === 'sub' ? c + ' subtopic DPPs'
    : c + ' PYQs ' + (LS.chs.length === 1 && LS.ids.length === 1 ? pages[0].badge.split(' \u00b7 ')[0] : 'topic wise') + lvSuffix() + yrSuffix();
  doExport(kind, { pages, file });
}
function exportAllPyq(kind) {
  const pages = [].concat(...LS.chs.map(cc => pyqPages(cc, 'all'))).map(p => Object.assign({}, p, { key: LS.key }));
  if (!pages.length) { toast('No PYQs for this selection'); return; }
  doExport(kind, { pages, file: chLabel() + ' PYQs all topics' + lvSuffix() + yrSuffix() });
}
/* ---------- "PYQ ChapterWise PDF" and "Shift Wise PDF" tabs ---------- */
const PDFT = { cw: { bucket: 'Main', sel: null, page: 0, v: 0, years: [], key: false }, sw: { bucket: 'Main', sel: null, page: 0, v: 0, year: 'all', key: false } };
const BUCKET_NAME = { Main: 'JEE Main', Adv: 'JEE Advanced', KCET: 'KCET' };
const chOrder = cc => { const c = CHMAP.get(cc); return c.cl * 100 + c.o; };
function pyqOf(bucket) { return BANK.qs.filter(q => q.s === 'P' && q.e === bucket); }
const cwYearOk = q => !PDFT.cw.years.length || PDFT.cw.years.includes(String(q.y));
const cwYrKey = () => PDFT.cw.years.length ? PDFT.cw.years.slice().sort().join(',') : 'all';
const cwYrSfx = () => PDFT.cw.years.length ? ' ' + PDFT.cw.years.slice().sort().join('+') : '';
const cwYrText = () => { const ys = PDFT.cw.years.map(Number).sort((a, b) => a - b); if (!ys.length) return 'all'; return ys.length <= 4 ? ys.join(' \u00b7 ') : ys.length + ' years (' + ys[0] + '\u2013' + ys[ys.length - 1] + ')'; };
function pdfRows(T) {
  const P = PDFT[T], key = 'rows|' + T + '|' + P.bucket + (T === 'cw' ? '|' + cwYrKey() : '');
  if (BK[key]) return BK[key];
  const qs = pyqOf(P.bucket).filter(q => T !== 'cw' || cwYearOk(q)); let rows = [];
  if (T === 'cw') {
    const by = {}; qs.forEach(q => { (by[q.cc] = by[q.cc] || []).push(q); });
    rows = Object.keys(by).sort((a, b) => chOrder(a) - chOrder(b)).map(cc => ({ k: cc, name: CHMAP.get(cc).n, qs: by[cc], file: CHMAP.get(cc).n + ' ' + BUCKET_NAME[P.bucket] + ' PYQs' + (T === 'cw' ? cwYrSfx() : '') }));
  } else {
    const by = {};
    qs.forEach(q => { if (/^PYQARC/.test(q.i) || /shift not given|Year not printed/i.test(q.p || '')) return; const k = (q.y || '') + '|' + q.p; (by[k] = by[k] || []).push(q); });
    const sk = k => { const q = by[k][0], m = /^J[MA](\d{4})(\d{2})(\d{2})(\d)/.exec(q.i) || /^KCET(\d{4})(\d{2})(\d{2})()/.exec(q.i); return m ? m[1] + m[2] + m[3] + m[4] : String(q.y || '') + '0000' + (/(\d)\s*$/.exec(q.p) || [0, 0])[1]; };
    rows = Object.keys(by).sort((a, b) => sk(b).localeCompare(sk(a))).map(k => {
      const q = by[k][0], name = P.bucket === 'Adv' && q.y >= 2013 ? q.y + ' \u00b7 ' + q.p : q.p.replace(/\s+Shift/, ' \u00b7 Shift');
      return { k, name, qs: by[k], file: BUCKET_NAME[P.bucket] + ' ' + name + ' PYQs' };
    });
  }
  return (BK[key] = rows);
}
/* one page set per row; chapter wise = topic wise inside the chapter, shift wise = chapter order */
function pdfPages(T, r) {
  const key = 'pg|' + T + '|' + PDFT[T].bucket + '|' + (T === 'cw' ? cwYrKey() + '|' : '') + r.k; if (BK[key]) return BK[key];
  const bucket = PDFT[T].bucket, sub = BUCKET_NAME[bucket] + (T === 'cw' ? ' \u00b7 all topics' : ' \u00b7 chapter wise');
  let flat = [];
  if (T === 'cw') {
    const c = PYQT[r.k], topics = c ? c.topics.map(t => ({ label: 'Topic ' + t.no, name: t.name, qs: t.qs.filter(q => q.e === bucket && cwYearOk(q)) })).concat([{ label: 'Other', name: 'Other topics', qs: c.other.filter(q => q.e === bucket && cwYearOk(q)) }]) : [{ label: '', name: 'All topics', qs: r.qs }];
    topics.forEach(t => t.qs.forEach((q, i) => flat.push(Object.assign({}, q, { _t: (t.label ? t.label + ' \u00b7 ' : '') + t.name, head: i === 0 ? (t.label ? t.label + ' \u00b7 ' : '') + t.name : '' }))));
  } else {
    r.qs.slice().sort((a, b) => chOrder(a.cc) - chOrder(b.cc)).forEach((q, i, a) => flat.push(Object.assign({}, q, { _t: CHMAP.get(q.cc).n, head: i === 0 || a[i - 1].cc !== q.cc ? CHMAP.get(q.cc).n : '' })));
  }
  const pages = packPages(flat, (g, i, n) => ({ title: r.name, sub, badge: n > 1 ? 'Page ' + (i + 1) + ' of ' + n : 'All questions' }));
  pages.forEach(pg => { if (pg.qs.length && !pg.qs[0].head) pg.qs = [Object.assign({}, pg.qs[0], { head: pg.qs[0]._t + ' (continued)' })].concat(pg.qs.slice(1)); });
  return (BK[key] = pages);
}
/* ---------- chapter PowerPoint (PYQ ChapterWise PDF tab) ---------- */
let PYQMETA = null;
function pyqMeta() { return PYQMETA || (PYQMETA = fetch('qb/data/pyq.json').then(r => r.json()).then(list => { const m = {}; list.forEach(x => { m[x.id] = x; }); return m; }).catch(() => ({}))); }
async function cwPptxData(r) {
  const P = PDFT.cw, bucket = P.bucket, cc = r.k, c = CHMAP.get(cc), pc = PYQT[cc];
  const years = {}; pyqOf(bucket).filter(q => q.cc === cc && q.y).forEach(q => { years[q.y] = (years[q.y] || 0) + 1; });
  const inScope = q => q.e === bucket && cwYearOk(q);
  const flat = pc ? [].concat(...pc.topics.map(t => t.qs.filter(inScope).map(q => Object.assign({}, q, { _t: t.name }))), pc.other.filter(inScope).map(q => Object.assign({}, q, { _t: 'Other topics' }))) : r.qs.map(q => Object.assign({}, q, { _t: r.name }));
  const topics = pc ? pc.topics.map(t => ({ name: t.name, n: t.qs.filter(inScope).length })).concat(pc.other.filter(inScope).length ? [{ name: 'Other topics', n: pc.other.filter(inScope).length }] : []) : [];
  const figs = {}; for (const q of flat) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  let logo = null; try { const rs = await fetch('img/avanti-logo.png'); if (rs.ok) { const bl = await rs.blob(), bm = await createImageBitmap(bl), dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); logo = { dataUrl, w: bm.width, h: bm.height }; } } catch (e) { /* no logo file: skip */ }
  return { logo, chapter: c.n, cl: c.cl, cc, bucket, bucketName: BUCKET_NAME[bucket], bucketLabel: bucket, year: cwYrText(), count: flat.length, years, topics, qs: flat, figs, meta: await pyqMeta() };
}
async function exportCwPptx(r) {
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  const btns = document.querySelectorAll('[data-act="pdfdl"]'); btns.forEach(b => { b.disabled = true; });
  toast('Preparing PowerPoint…');
  try {
    const d = await cwPptxData(r);
    await Promise.all([loadScript('mathdoc.js'), loadScript('office.js'), loadScript(CDN.zip), loadScript(CDN.pptx)]);
    const blob = await window.OfficeDoc.buildCwPptx(window.PptxGenJS, window.JSZip, Object.assign(d, { bucket: d.bucketLabel }), { CHMAP, figs: d.figs });
    const file = r.file + '.pptx';
    await downloads.save({ filename: file, data: blob }); toast('Saved ' + file);
  } catch (e) {
    if (e && e.code === 'declined') toast('Download cancelled');
    else toast('PowerPoint export failed: ' + (e && e.message ? e.message : 'try again'));
  } finally { btns.forEach(b => { b.disabled = false; }); }
}
/* ---------- one source of truth: the question list for DPPs, PYQs and tests is built from the SAME files as the Question Bank (qb/data/pyq.json + nonpyq.json). bank-meta.json only holds the chapter list and syllabus. ---------- */
const QBJ = {};
function qbJson(n) {
  if (!QBJ[n]) {
    const pre = window.__qbPre && window.__qbPre.data && window.__qbPre.data[n];
    const direct = () => fetch('qb/data/' + n + '.json').then(r => { if (!r.ok) throw new Error(n); return r.json(); });
    QBJ[n] = (pre ? Promise.resolve(pre).catch(direct) : direct()).catch(e => { delete QBJ[n]; throw e; });
  }
  return QBJ[n];
}
const QB_EXAM = { 'JEE Main': 'Main', 'AIEEE': 'Main', 'JEE Advanced': 'Adv', 'IIT': 'Adv', 'KCET': 'KCET' };
function qbCompact(r, withKcet) {
  const e = QB_EXAM[r.exam]; if (!e) return null;
  const P = r.source === 'PYQ';
  let o = r.options || []; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (x) { o = []; } }
  const q = { i: String(r.id), s: P ? 'P' : 'N', e, y: P && r.year != null && r.year !== '' ? Number(r.year) : null, p: r.paper, t: r.type, cc: r.chapter_code, tc: String(r.topic_code || '').replace(/^JM-/, ''), tp: r.topic || '', d: r.difficulty, q: r.question || '', o, a: r.answer == null ? '' : String(r.answer) };
  if (!P) { q.pb = r.publisher || 'VMC'; q.sec = r.section || ''; if (r.pyq) q.pq = r.pyq_ref || ''; }
  if (r.oos) q.oo = 1;
  if (r.figure && r.figure.svg) q.f = r.figure;
  return q;
}
/* pictures are in qb/data/figures.json (not inside pyq.json / nonpyq.json); loaded once, shared with the Question Bank */
let figP = null;
window.__getFigs = function () {
  if (!figP) figP = fetch('qb/data/figures.json').then(r => { if (!r.ok) throw new Error('figures'); return r.json(); }).catch(e => { figP = null; throw e; });
  return figP;
};
let bankP = null;
function loadBank() {
  if (window.__BANK) return Promise.resolve(window.__BANK);
  if (!bankP) bankP = Promise.all([fetch('bank-meta.json').then(r => { if (!r.ok) throw new Error('bank-meta'); return r.json(); }), qbJson('pyq'), qbJson('nonpyq'), window.__getFigs().catch(() => ({}))]).then(([meta, py, np, figs]) => {
    const qs = []; py.concat(np).forEach(r => { if (figs && figs[r.id] && !r.figure) r.figure = figs[r.id]; const q = qbCompact(r); if (q) qs.push(q); });
    return { chapters: meta.chapters, syl: meta.syl, qs };
  }).catch(e => { bankP = null; throw e; });
  return bankP;
}
/* ---------- Question Bank tab "Export PPT": same black Avanti slides as the PYQ ChapterWise PPT, for any selection ---------- */
window.__qbCwPptx = async function (ids) {
  if (!BANK) { const bank = await loadBank(); BANK = bank; BANK.all = bank.qs.slice(); bank.qs.forEach(q => BYID.set(q.i, q)); bank.chapters.forEach(c => CHMAP.set(c.c, c)); }
  /* KCET questions are kept out of the main bank (a separate exam), so look any id that is not there up in the raw PYQ file */
  let xtra = null; if (ids.some(i => !BYID.has(i))) { xtra = new Map(); (await qbJson('pyq')).forEach(r => { if (r.exam === 'KCET') { const q = qbCompact(r, true); if (q) xtra.set(q.i, q); } }); }
  const qs = ids.map(i => BYID.get(i) || (xtra && xtra.get(String(i)))).filter(Boolean); if (!qs.length) throw new Error('no questions found');
  const ccs = [...new Set(qs.map(q => q.cc))].sort((a, b) => chOrder(a) - chOrder(b)), one = ccs.length === 1, c0 = CHMAP.get(ccs[0]);
  const cls = [...new Set(ccs.map(cc => CHMAP.get(cc).cl))].sort();
  const synIdx = (cc, tp) => { const s = (BANK.syl || {})[cc] || []; const k = s.findIndex(t => norm(t[1]) === norm(tp)); return k < 0 ? 999 : k; };
  const tname = q => (one ? '' : CHMAP.get(q.cc).n + ' · ') + (/^UNMAPPED/.test(q.tc || '') || !q.tp || q.tp === 'Unmapped' ? 'Other topics' : q.tp);
  const flat = qs.map(q => Object.assign({}, q, { _t: tname(q) }));
  const tm = new Map(); flat.forEach(q => { const k = q.cc + '|' + q._t; if (!tm.has(k)) tm.set(k, { name: q._t, n: 0, o: chOrder(q.cc) * 1000 + synIdx(q.cc, q.tp) }); tm.get(k).n++; });
  const topics = [...tm.values()].sort((a, b) => a.o - b.o).map(t => ({ name: t.name, n: t.n }));
  const years = {}; qs.filter(q => q.s === 'P' && q.y).forEach(q => { years[q.y] = (years[q.y] || 0) + 1; });
  const nP = qs.filter(q => q.s === 'P').length, nN = qs.length - nP, ex = [...new Set(qs.filter(q => q.s === 'P').map(q => q.e))];
  const kindLabel = nN && nP ? 'PYQs + practice' : nN ? 'Practice questions' : ex.length === 1 ? BUCKET_NAME[ex[0]] + ' PYQs' : 'JEE Main + Advanced PYQs';
  const figs = {}; for (const q of flat) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  let logo = null; try { const rs = await fetch('img/avanti-logo.png'); if (rs.ok) { const bl = await rs.blob(), bm = await createImageBitmap(bl), dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); logo = { dataUrl, w: bm.width, h: bm.height }; } } catch (e) { /* no logo file: skip */ }
  const yl = Object.keys(years).map(Number).sort((a, b) => a - b);
  const d = { logo, chapter: one ? c0.n : 'Selected Questions', cl: cls[0], cc: one ? ccs[0] : '', clLabel: 'CLASS ' + cls.join(' & '), chLabel: one ? 'CHAPTER ' + ccs[0].split('M')[1] : ccs.length + ' CHAPTERS',
    bucket: ex.length === 1 ? ex[0] : 'Main', bucketName: kindLabel, kindLabel, perQ: true, noFront: true, noTopic: true, year: yl.length ? (yl.length === 1 ? String(yl[0]) : 'all') : '\u2014', count: flat.length, years, topics, qs: flat, figs, meta: await pyqMeta() };
  await Promise.all([loadScript('mathdoc.js'), loadScript('office.js'), loadScript(CDN.zip), loadScript(CDN.pptx)]);
  return window.OfficeDoc.buildCwPptx(window.PptxGenJS, window.JSZip, d, { CHMAP, figs });
};
function markPdfRows(T) { document.querySelectorAll('#' + T + 'List .pdfrow').forEach(e => e.setAttribute('aria-current', String(e.dataset.k === PDFT[T].sel))); }
const keySwitch = (id, act, extra) => h('label', { class: 'pick1 tgl tgl-hl' }, h('input', Object.assign({ type: 'checkbox', role: 'switch', id, 'data-act': act }, extra || {})), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Include answer key (on a new page)' }));
function renderPdfTab(T) {
  const view = $('#view' + (T === 'cw' ? 'Cw' : 'Sw')), P = PDFT[T]; if (!view || !BANK) return;
  if (!$('#' + T + 'List')) {
    view.textContent = '';
    view.append(
      h('div', { class: 'rail' }, h('div', { class: 'card' },
        h('h3', { text: T === 'cw' ? 'Chapterwise PYQ PDF' : 'Question Paper PDF' }),
        h('div', { class: 'seg', id: T + 'Ex' }, ['Main', 'Adv', 'KCET'].map(k => h('button', { type: 'button', 'data-act': 'pdfex', 'data-t': T, 'data-k': k, text: BUCKET_NAME[k] }))),
        T === 'cw' ? h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Years (tick one or many)' }), msel('cwYr', 'years')) : h('div', { class: 'fld' }, h('label', { class: 'lbl', for: T + 'Year', text: 'Year' }), h('select', { id: T + 'Year', onchange: e => { PDFT[T].year = e.target.value; PDFT[T].sel = null; PDFT[T].page = 0; renderPdfTab(T); } })),
        keySwitch(T + 'Key', 'pdfkey', { 'data-t': T }),
        h('div', { class: 'pdflist', id: T + 'List' }))),
      h('div', { class: 'stage' }, h('div', { class: 'statbar' }, h('div', { class: 'msg', id: T + 'Msg', 'aria-live': 'polite' }), h('div', { class: 'pgbtns', id: T + 'Pages', hidden: true }), h('div', { class: 'rowbtns', id: T + 'Exp', hidden: true }, ...[['docx', 'Word (editable)'], ['pdf', 'PDF'], ['pptx', 'PowerPoint (editable)']].map(([f, nm]) => h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'pdfdl', 'data-t': T, 'data-k': '', 'data-f': f, title: 'Download ' + nm, 'aria-label': 'Download ' + nm, html: FIMG[f] }))), h('button', { type: 'button', class: 'btn ibtn maxbtn', 'data-act': 'max', 'aria-pressed': 'false', title: 'Maximize', 'aria-label': 'Maximize', html: ICO.max })), h('div', { class: 'pgwrap', id: T + 'Prev' })));
    if (window.ResizeObserver) new ResizeObserver(rescale).observe($('#' + T + 'Prev'));
  }
  $('#' + T + 'Ex').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === P.bucket)));
  const list = $('#' + T + 'List'); list.textContent = '';
  let rows = pdfRows(T); const my = ++P.v;
  if (T === 'cw') {
    const all = pyqOf(P.bucket), cnt = {}; all.forEach(q => { if (q.y) cnt[q.y] = (cnt[q.y] || 0) + 1; });
    const ys = Object.keys(cnt).map(Number).sort((a, b) => b - a);
    const keep = P.years.filter(y => ys.includes(+y)); if (keep.length !== P.years.length) { P.years = keep; rows = pdfRows(T); }
    mfill('cwYr', ys.map(y => [String(y), y + ' (' + cnt[y] + ')']), P.years, v => { P.years = v; P.sel = null; P.page = 0; renderPdfTab('cw'); }, 'years', { none: 'All years' });
  }
  if (T === 'sw') {
    const ys = [...new Set(rows.map(r => r.qs[0].y))].filter(Boolean).sort((a, b) => b - a), sel = $('#swYear');
    if (P.year !== 'all' && !ys.includes(+P.year)) P.year = 'all';
    sel.textContent = ''; sel.append(h('option', { value: 'all', text: 'All years (' + rows.length + ' papers)' }));
    ys.forEach(y => sel.append(h('option', { value: String(y), text: y + ' (' + rows.filter(r => r.qs[0].y === y).length + ')' })));
    sel.value = P.year;
    if (P.year !== 'all') rows = rows.filter(r => String(r.qs[0].y) === P.year);
  }
  if (!rows.length) { list.append(h('p', { class: 'hint', text: 'No questions here yet.' })); showPdfPrev(T); return; }
  const cells = new Map();
  rows.forEach(r => {
    const info = h('span', { class: 'pdfinfo', text: qWord(r.qs.length) });
    cells.set(r.k, info);
    list.append(h('div', { class: 'pdfrow', 'data-act': 'pdfrow', 'data-t': T, 'data-k': r.k, tabindex: '0' },
      h('div', { class: 'pdfname' }, h('strong', { text: r.name }), info)));
  });
  markPdfRows(T);
  showPdfPrev(T);
}
function showPdfPrev(T) {
  const P = PDFT[T], wrap = $('#' + T + 'Prev'), msg = $('#' + T + 'Msg'), pb = $('#' + T + 'Pages'); if (!wrap) return;
  wrap.textContent = ''; pb.hidden = true; pb.textContent = '';
  const r = P.sel && pdfRows(T).find(x => x.k === P.sel), ex = $('#' + T + 'Exp'); if (ex) { ex.hidden = !r; ex.querySelectorAll('button').forEach(b => { b.dataset.k = r ? r.k : ''; }); }
  if (!r) { msg.className = 'msg'; msg.textContent = 'Click a row to preview it. The PDF, Word and PowerPoint buttons above the preview save it.'; return; }
  const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!P.key })), tok = P.tok = (P.tok || 0) + 1; let warn = false;
  const scalers = pages.map(() => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox' }, sc)); return sc; }); rescale();
  const say = (done) => { msg.className = 'msg' + (warn ? ' warn' : ''); msg.innerHTML = '<b>' + r.name + ':</b> ' + qWord(r.qs.length) + ', ' + pages.length + (pages.length === 1 ? ' page.' : ' pages' + (done ? ' (scroll to see all).' : ', loading\u2026')); };
  say(pages.length === 1);
  let i = 0;
  const step = () => { if (P.tok !== tok) return; const end = Math.min(i + 3, pages.length); for (; i < end; i++) { const L = layoutSheet(pages[i], scalers[i]); if (L.overflow) warn = true; } rescale(); say(i >= pages.length); if (i < pages.length) setTimeout(step, 0); else addKeyPages(wrap, pages); };
  step();
}
/* ---------- Handouts tab: download-only list (PDF, PPTX, DOCX; colour and black and white) ---------- */
let HO = null;
async function renderHandouts() {
  const view = $('#viewHo'); if (!view) return;
  if (!HO) { try { HO = await (await fetch('handouts/index.json')).json(); } catch (e) { HO = []; } }
  view.textContent = '';
  if (!HO.length) { view.append(h('p', { class: 'hint', text: 'No handouts yet.' })); return; }
  const base = x => x.file.replace(/\.pdf$/, '');
  const path = (x, ext, bw) => ext === 'pdf' ? 'handouts/' + (bw ? x.dir + '/bw/' + base(x) + '_BW.pdf' : x.file) : 'handouts/office/' + base(x) + (bw ? '_BW' : '') + '.' + ext;
  const dl = async (x, ext, bw) => { const name = base(x) + (bw ? '_BW' : '') + '.' + ext; if (!downloads) { toast('Downloads are not available in this view'); return; } try { toast('Preparing ' + name + '\u2026'); const r = await fetch(path(x, ext, bw) + (ext === 'pdf' ? '' : '.txt')); let data; if (ext === 'pdf') data = await r.blob(); else { const bin = atob((await r.text()).trim()), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); data = new Blob([u8], { type: ext === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); } await downloads.save({ filename: name, data }); toast('Saved ' + name); } catch (er) { if (er && er.code === 'declined') toast('Download cancelled'); else toast('Could not download'); } };
  const btn = (x, ext, bw, label) => h('button', { type: 'button', class: 'hobtn' + (bw ? ' bw' : ''), title: 'Download ' + label + (bw ? ' (black and white, for printing)' : ' (colour)'), 'aria-label': 'Download ' + x.code + ' ' + label + (bw ? ' black and white' : ' colour'), html: '<img src="img/' + ({ pdf: 'pdf', pptx: 'ppt', docx: 'word' })[ext] + '.png" width="24" height="24" alt="" style="display:block;object-fit:contain"><span>' + label + '</span>', onclick: () => dl(x, ext, bw) });
  const ACC = ['#e0197a', '#0a86c2', '#16a06a', '#d98200', '#7a3fd1', '#e8590c', '#5a9a00'];
  const card = (x, k) => h('article', { class: 'hocard2', style: '--ac:' + ACC[k % ACC.length] },
    h('div', { class: 'hotop' }, h('span', { class: 'hocode', text: x.code }), h('span', { class: 'hocls', text: 'Class ' + x.code.slice(0, 2) })),
    h('h3', { class: 'hotitle', text: x.title }),
    h('div', { class: 'hometa' }, h('span', { text: x.pages + ' pages' }), h('span', { text: x.orient || 'Landscape A4' }), h('span', { text: x.kind || 'Short notes' })),
    h('div', { class: 'hosec' }, h('div', { class: 'holab' }, h('i', { class: 'dot col' }), 'Colour'), h('div', { class: 'hobtns' }, btn(x, 'pdf', false, 'PDF'), x.pdfonly ? null : btn(x, 'pptx', false, 'PPTX'), x.pdfonly ? null : btn(x, 'docx', false, 'DOCX'))),
    x.nobw ? null : h('div', { class: 'hosec' }, h('div', { class: 'holab' }, h('i', { class: 'dot bw' }), 'Black and white (print)'), h('div', { class: 'hobtns' }, btn(x, 'pdf', true, 'PDF'), btn(x, 'pptx', true, 'PPTX'), btn(x, 'docx', true, 'DOCX'))));
  const secs = [['11', 'Class 11'], ['12', 'Class 12']].map(([c, t]) => { const L = HO.filter(x => x.code.startsWith(c)); return L.length ? h('section', { class: 'hosect' }, h('h2', { class: 'hoh2', text: t + ' \u00b7 ' + L.length + (L.length === 1 ? ' chapter' : ' chapters') }), h('div', { class: 'hogrid' }, ...L.map((x, k) => card(x, k)))) : null; });
  view.append(h('div', { class: 'hohero' }, h('div', { class: 'hohd' }, h('h1', { text: 'Handouts' }), h('p', { text: 'Quick revision notes for every JEE Maths chapter: formulas, worked examples, tricky PYQs and a method chooser on each. Pick colour for screens, black and white for printing.' })),
    h('div', { class: 'hokey' }, h('div', null, h('b', { text: 'PDF' }), ' print-ready'), h('div', null, h('b', { text: 'PPTX' }), ' one page per slide'), h('div', null, h('b', { text: 'DOCX' }), ' one page per Word page'), h('small', { text: 'PPTX and DOCX hold pictures of the pages, so the text is not editable.' }))), ...secs);
}

/* ---------- Must Solve tab: questions that repeat in JEE (exact or very similar) and sure-shot picks, by chapter and topic ---------- */
let MUST = null, MTOP = null; const MS = { sel: new Set(), chs: [], kind: 'all', lv: ['L1', 'L2', 'L3'], ans: false, key: false };
const MKIND = { e: ['Exact repeat', 'mk-e'], i: ['Similar type', 'mk-i'], u: ['Sure-shot', 'mk-u'] };
const mYear = q => (q.y ? q.y : 'n/a') + ' ' + (q.e === 'KCET' ? 'KCET' : q.e === 'Adv' ? 'Adv' : 'Main');
/* Must Solve: click a year (or "Asked N times") to see the question as it came in that year, in a pop-up */
function mustPopStyle() {
  if (document.getElementById('mpopcss')) return;
  const st = h('style', { text: '.mclk{cursor:pointer;font:inherit;color:inherit}.mclk:hover,.mclk:focus-visible{border-color:var(--accent,#0f766e);box-shadow:0 0 0 2px var(--accent-soft,rgba(15,118,110,.2))}.mb.mclk{font-size:12px;font-weight:700}.mpopq{border:1px solid var(--rule,#ddd);border-radius:12px;padding:8px;margin:0 0 12px}.mpoph{font-weight:700;font-size:13px;margin:0 0 6px;color:var(--accent,#0f766e)}#mpop .mbody{padding:12px}#mpop .mcard{max-width:900px}' });
  st.id = 'mpopcss'; document.head.append(st);
}
function mustPop(title, ids, useQb) {
  mustPopStyle();
  const old = document.getElementById('mpop'); if (old) old.remove();
  let ov; const esc = e => { if (e.key === 'Escape') close(); }; const close = () => { if (ov) ov.remove(); document.removeEventListener('keydown', esc); };
  const body = h('div', { class: 'mbody qbhost' });
  ids.forEach(id => {
    const q = BYID.get(id); if (!q) return;
    let view = useQb ? window.QBX.cardFor(id) : null;
    if (!view) view = h('article', { class: 'mq' }, h('div', { class: 'mqt', text: q.q }), (q.o || []).length ? h('ol', { class: 'mopts' }, q.o.map(o => h('li', { text: o }))) : null, h('div', { class: 'mans', text: 'Answer: ' + q.a }));
    body.append(h('div', { class: 'mpopq' }, h('div', { class: 'mpoph', text: mYear(q) + (q.p ? ' · ' + q.p : '') + ' · ' + q.i }), view));
  });
  ov = h('div', { class: 'modal', id: 'mpop', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: e => { if (e.target === ov) close(); } },
    h('div', { class: 'mcard' }, h('div', { class: 'mbar' }, h('b', { text: title }), h('button', { type: 'button', class: 'btn', text: 'Close', onclick: close })), body));
  document.body.append(ov); document.addEventListener('keydown', esc); math(body);
}
async function renderMust() {
  const view = $('#viewMust'); if (!view) return;
  if (!MUST) { try { MUST = await (await fetch('must.json')).json(); } catch (e) { MUST = []; } }
  if (!MUST.length) { view.textContent = ''; view.append(h('p', { class: 'hint', text: 'Must Solve is not available yet.' })); return; }
  try { await qbInit(); for (let k = 0; k < 150 && !(window.QBX && window.QBX.hasRows && window.QBX.hasRows()); k++) await new Promise(r => setTimeout(r, 100)); } catch (e) { /* fall back to simple cards */ }
  const useQb = !!(window.QBX && window.QBX.cardFor && window.QBX.hasRows && window.QBX.hasRows());
  if (!MTOP) { try { MTOP = await (await fetch('qb/data/topics.json')).json(); } catch (e) { MTOP = []; } }
  const topIdx = (c, name) => { const i = MTOP.filter(t => t.chapter_code === c).findIndex(t => t.topic === name); return i < 0 ? 999 : i; };
  const chs = MUST.map(m => CHMAP.get(m.c)).filter(Boolean);
  const chName = c => (CHMAP.get(c) || { n: c }).n;
  const list = h('div', { class: 'mlist qbhost' }), msg = h('div', { class: 'msg', 'aria-live': 'polite' });
  const PER = 20; let page = 0;
  const pager = (start, n, total) => {
    const nav = h('nav', { class: 'qb-pager', 'aria-label': 'Pages' }, h('span', { class: 'qb-pinfo', text: (start + 1) + '\u2013' + (start + n) + ' of ' + total }));
    const go = p => { page = p; draw(true); view.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); };
    const btn = (label, p, on, dis) => nav.append(h('button', { type: 'button', class: 'qb-pbtn' + (on ? ' on' : ''), text: label, disabled: !!dis, 'aria-current': on ? 'page' : null, onclick: () => go(p) }));
    const pages = MS.pages;
    btn('\u2039 Prev', page - 1, false, page === 0);
    const shown = []; for (let p = 0; p < pages; p++) if (p === 0 || p === pages - 1 || Math.abs(p - page) <= 2) shown.push(p);
    shown.forEach((p, i) => { if (i && p - shown[i - 1] > 1) nav.append(h('span', { class: 'qb-pgap', text: '\u2026' })); btn(String(p + 1), p, p === page); });
    btn('Next \u203a', page + 1, false, page === pages - 1);
    return nav;
  };
  const selCnt = h('span', { class: 'mselcnt' });
  const selInfo = () => { const n = (MS.flat || []).filter(f => MS.sel.has(f.it.r)).length; selCnt.textContent = n ? n + ' selected \u00b7 downloads only these' : 'None selected \u00b7 downloads all ' + (MS.flat || []).length + ' shown'; };
  const tick = on => { (MS.flat || []).forEach(f => { if (on) MS.sel.add(f.it.r); else MS.sel.delete(f.it.r); }); list.querySelectorAll('.mpick input').forEach(c => { c.checked = MS.sel.has(c.dataset.r); }); selInfo(); };
  const draw = (keep) => {
    if (!keep) page = 0;
    list.textContent = '';
    /* flatten the filtered questions in chapter, topic, then most-repeated order, and show 20 per page */
    const flat = [], yc = {};
    MUST.forEach(m => {
      if (MS.chs.length && !MS.chs.includes(m.c)) return;
      const items = m.i.filter(it => (MS.kind === 'all' || it.k === MS.kind) && MS.lv.includes((BYID.get(it.r) || {}).d));
      if (!items.length) return;
      const y = yc[m.c] = {}; items.forEach(it => [it.r, ...it.m].forEach(id => { const q = BYID.get(id); if (!q) return; const k = q.y ? (q.y >= 2019 ? String(q.y) : 'Before 2019') : 'Year n/a'; y[k] = (y[k] || 0) + 1; }));
      const tops = new Map();
      items.forEach(it => { const q = BYID.get(it.r); if (!q) return; const nm = q.tc && !/UNMAPPED/.test(q.tc) ? q.tp : 'Mixed problems'; if (!tops.has(nm)) tops.set(nm, []); tops.get(nm).push(it); });
      [...tops.entries()].sort((a, b) => (topIdx(m.c, a[0]) - topIdx(m.c, b[0])) || a[0].localeCompare(b[0])).forEach(([nm, its]) => {
        its.sort((a, b) => (b.m.length - a.m.length) || a.k.localeCompare(b.k));
        its.forEach(it => flat.push({ c: m.c, n: items.length, tp: nm, it }));
      });
    });
    MS.flat = flat; selInfo(); MS.pages = Math.max(1, Math.ceil(flat.length / PER)); if (page >= MS.pages) page = MS.pages - 1;
    const part = flat.slice(page * PER, page * PER + PER);
    if (flat.length > PER) list.append(pager(page * PER, part.length, flat.length));
    let curC = null, curT = null, sec = null, tsec = null, num = 0;
    part.forEach(f => {
      if (f.c !== curC) {
        curC = f.c; curT = null;
        const ykeys = Object.keys(yc[f.c]).sort((a, b) => (b === 'Before 2019' ? -1 : a === 'Before 2019' ? 1 : b === 'Year n/a' ? -1 : a === 'Year n/a' ? 1 : b - a));
        sec = h('section', { class: 'mch' },
          h('div', { class: 'mchh' }, h('span', { class: 'mchn', text: f.c }), h('h3', { text: chName(f.c) }), h('span', { class: 'mcnt', text: f.n + ' questions' })),
          h('div', { class: 'myrs', 'aria-label': 'Year-wise count of these questions' }, h('b', { text: 'Year-wise: ' }), ...ykeys.map(k => h('span', { class: 'myr' }, k + ' ', h('b', { text: String(yc[f.c][k]) })))));
        list.append(sec);
      }
      if (f.tp !== curT) { curT = f.tp; tsec = h('div', { class: 'mtop' }, h('h4', { text: f.tp })); sec.append(tsec); }
      const it = f.it, q = BYID.get(it.r), times = it.m.length + 1;
      const yrs = [it.r, ...it.m].map(id => BYID.get(id)).filter(Boolean).sort((a, b) => (b.y || 0) - (a.y || 0));
      const pick = h('input', { type: 'checkbox', 'aria-label': 'Select question ' + it.l + ' for download', onchange: e => { if (e.target.checked) MS.sel.add(it.r); else MS.sel.delete(it.r); selInfo(); } }); pick.checked = MS.sel.has(it.r); pick.dataset.r = it.r;
      const strip = h('div', { class: 'mstrip' },
        h('label', { class: 'mpick', title: 'Select for download' }, pick),
        h('b', { class: 'mlab', text: it.l }),
        h('span', { class: 'mb ' + MKIND[it.k][1], text: MKIND[it.k][0] }),
        it.k === 'u' ? h('span', { class: 'mb mtimes', text: 'Must know' }) : h('button', { type: 'button', class: 'mb mtimes mclk', title: 'Click to see all ' + times + ' questions with their years', 'aria-label': 'Asked ' + times + ' times: show all', text: 'Asked ' + times + ' times', onclick: () => mustPop(it.l + ' \u00b7 asked ' + times + ' times', yrs.map(y => y.i), useQb) }),
        h('span', { class: 'myl' }, h('span', { class: 'mylb', text: it.k === 'u' ? 'Came in:' : 'Years:' }), ...yrs.map(y => h('button', { type: 'button', class: 'myc mclk', title: (y.p || '') + ' \u00b7 click to see this question', text: mYear(y), onclick: () => mustPop(it.l + ' \u00b7 ' + mYear(y), [y.i], useQb) }))),
        it.k === 'u' && it.w ? h('span', { class: 'mwhy', text: it.w }) : null);
      const qc = useQb ? window.QBX.cardFor(it.r) : null; if (qc) { const nn = qc.querySelector('.qb-num'); if (nn) nn.textContent = String(page * PER + (++num)); }
      if (qc) { tsec.append(h('div', { class: 'mitem qb' }, strip, qc)); return; }
      const opts = (q.o || []).length ? h('ol', { class: 'mopts' }, q.o.map(o => h('li', { text: o }))) : null;
      tsec.append(h('article', { class: 'mq' }, strip, h('div', { class: 'mqt', text: q.q }), opts, h('div', { class: 'mans', text: 'Answer: ' + q.a })));
    });
    if (MS.key && part.length) list.append(h('section', { class: 'mkeybox' }, h('h3', { text: 'Answer key' }), h('div', { class: 'keyflow' }, part.map((f, i) => { const q = BYID.get(f.it.r) || {}; return h('span', { class: 'kitem' }, h('b', { text: (page * PER + i + 1) + '.' }), h('span', { text: ' ' + (q.a || '\u2014') })); }))));
    if (flat.length > PER) list.append(pager(page * PER, part.length, flat.length));
    msg.innerHTML = '<b>' + flat.length + '</b> questions to solve first' + (MS.chs.length === 1 ? ' in ' + MS.chs[0] + ' ' + chName(MS.chs[0]) : MS.chs.length ? ' in ' + MS.chs.length + ' chapters' : ' across all chapters') + (flat.length > PER ? ' \u00b7 showing ' + (page * PER + 1) + '-' + (page * PER + part.length) : '') + '.';
    if (!flat.length) list.append(h('p', { class: 'hint', text: 'No questions match these filters.' }));
    math(list);
  };
  MS.redraw = () => draw(true);
  const seg = (items, cur, set) => h('div', { class: 'seg' }, items.map(([k, t]) => h('button', { type: 'button', 'aria-pressed': String(cur() === k), text: t, onclick: e => { set(k); e.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw(); } })));
  const chSel = msel('mustCh', 'chapters'), chItems = chs.map(c => [c.c, c.c + ' ' + c.n]);
  const fillCh = () => mfill('mustCh', chItems, MS.chs, v => { MS.chs = v; draw(); fillCh(); }, 'chapters', { none: 'All chapters' });
  const lvBtns = h('div', { class: 'seg' }, ['L1', 'L2', 'L3'].map(l => h('button', { type: 'button', 'aria-pressed': String(MS.lv.includes(l)), text: l, onclick: e => { MS.lv = MS.lv.includes(l) ? MS.lv.filter(x => x !== l) : MS.lv.concat(l); e.currentTarget.setAttribute('aria-pressed', String(MS.lv.includes(l))); draw(); } })));
  view.textContent = '';
  view.append(h('div', { class: 'rail' }, h('div', { class: 'card' }, h('h3', { text: 'Must Solve' }),
    h('p', { class: 'hint', text: 'Questions that came again and again in JEE, in the same or a very similar form, plus questions that are sure to come. Solve these first.' }),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Chapters (tick one or many)' }), chSel),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Type' }), seg([['all', 'All'], ['e', 'Exact repeat'], ['i', 'Similar type'], ['u', 'Sure-shot']], () => MS.kind, k => { MS.kind = k; })),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Level' }), lvBtns),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Choose questions' }),
      h('div', { class: 'mselbar' }, h('button', { type: 'button', class: 'btn', text: 'Select all shown', onclick: () => tick(true) }), h('button', { type: 'button', class: 'btn', text: 'Clear', onclick: () => tick(false) })),
      selCnt),
    keySwitch('mustKey', 'mkey'),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Download' }),
      h('div', { class: 'mexp' }, ['docx', 'pdf', 'pptx'].map(k => h('button', { type: 'button', class: 'btn ibtn mexpb', 'data-mexp': k, title: 'Download ' + ({ pdf: 'PDF', docx: 'Word (editable)', pptx: 'PowerPoint (editable)' })[k], 'aria-label': 'Download ' + ({ pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint' })[k], html: FIMG[k] || ICO.dl, onclick: () => exportMust(k) })))),
    h('div', { class: 'mlegend' }, h('p', { class: 'hint', html: '<b>Exact repeat:</b> the same question came again. <b>Similar type:</b> the same idea and method, different numbers or wording. <b>Sure-shot:</b> a standard JEE must-know picked by us.' })))),
    h('div', { class: 'stage' }, h('div', { class: 'statbar' }, msg), list));
  draw(); fillCh();
  KATEX_P && KATEX_P.then(() => math(list)).catch(() => {});
}
const chName0 = c => (CHMAP.get(c) || { n: c }).n;
async function exportMust(kind) {
  const all = (MS.flat || []).filter(f => BYID.get(f.it.r)), chosen = all.filter(f => MS.sel.has(f.it.r)), flat = chosen.length ? chosen : all;
  if (!flat.length) { toast('No questions to export'); return; }
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  const chs = [...new Set(flat.map(f => f.c))], one = chs.length === 1;
  const title = one ? chName0(chs[0]) : 'Must Solve';
  const file = 'Must Solve ' + (one ? chs[0] + ' ' + title : chs.length > 3 ? chs.length + ' chapters' : chs.join(' ')) + (MS.kind !== 'all' ? ' ' + MKIND[MS.kind][0] : '') + (MS.lv.length < 3 ? ' ' + MS.lv.join('+') : '');
  const btns = document.querySelectorAll('[data-mexp]'); btns.forEach(b => { b.disabled = true; });
  try {
    if (kind === 'pptx') {
      toast('Preparing PPT\u2026');
      const blob = await window.__qbCwPptx(flat.map(f => f.it.r));
      await downloads.save({ filename: file.replace(/[\\/:*?"<>|]+/g, ' ') + '.pptx', data: blob }); toast('Saved the PPT');
    } else {
      const groups = [], gi = new Map();
      flat.forEach(f => { const k = f.c + '|' + f.tp; if (!gi.has(k)) { gi.set(k, { label: (one ? '' : f.c + ' \u00b7 ') + f.tp, qs: [] }); groups.push(gi.get(k)); } gi.get(k).qs.push(BYID.get(f.it.r)); });
      const lf = levelFlat(groups);
      const pages = packPages(lf, (g, i, n) => ({ title, sub: 'Must Solve \u00b7 questions to solve first', badge: n > 1 ? 'Page ' + (i + 1) + ' of ' + n : 'Must Solve' }));
      pages.forEach(pg => { if (pg.qs.length && !pg.qs[0].head) pg.qs = [Object.assign({}, pg.qs[0], { head: contHead(pg.qs[0]) })].concat(pg.qs.slice(1)); });
      pages.forEach(pg => { pg.key = !!MS.key; });
      btns.forEach(b => { b.disabled = false; });
      await doExport(kind, { pages, file });
      return;
    }
  } catch (e) {
    if (e && e.code === 'declined') toast('Download cancelled'); else toast('Export failed: ' + (e && e.message ? e.message : 'try again'));
  } finally { btns.forEach(b => { b.disabled = false; }); }
}
let makeReady = false;
let PYQSUB = null;
function pyqPick() {
  const v = $('#viewPyq'); if (!v) return;
  v.textContent = '';
  const b = (k, t, d) => h('button', { type: 'button', class: 'pyqopt', 'data-act': 'pyqsub', 'data-k': k, 'aria-pressed': String(PYQSUB === k) }, h('strong', { text: t }), h('span', { text: d }));
  v.append(h('div', { class: 'pyqbar' }, h('span', { class: 'lbl', text: 'PYQs: choose one' }), h('div', { class: 'pyqopts' }, b('sw', 'Question Paper', 'A whole shift paper, by year'), b('cw', 'Chapterwise', 'Every chapter, all topics'))));
  if (!PYQSUB) v.append(h('p', { class: 'hint', text: 'Pick Question Paper or Chapterwise to see the list.' }));
}
function pyqShow() {
  ['Qb', 'Lib', 'Make', 'Cw', 'Sw', 'Ho', 'Must', 'God', 'Syl', 'Res'].forEach(n => { const e = $('#view' + n); if (e) e.hidden = true; });
  if (PYQSUB) setTabInner(PYQSUB);
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === 'pyq')));
  { const mb = $('#miscBtn'); if (mb) { mb.setAttribute('aria-pressed', 'false'); mb.firstChild.textContent = 'Misc '; } }
  pyqPick(); $('#viewPyq').hidden = false;
  setTimeout(rescale, 0);
}
function setTab(t) {
  if (t === 'pyq') { pyqShow(); return; }
  const pv = $('#viewPyq'); if (pv) pv.hidden = true;
  setTabInner(t);
}
function setTabInner(t) {
  $('#viewQb').hidden = t !== 'qb'; $('#viewLib').hidden = t !== 'lib'; $('#viewMake').hidden = t !== 'make'; $('#viewCw').hidden = t !== 'cw'; $('#viewSw').hidden = t !== 'sw'; $('#viewHo').hidden = t !== 'ho'; $('#viewMust').hidden = t !== 'must'; $('#viewGod').hidden = t !== 'god'; $('#viewSyl').hidden = t !== 'syl'; $('#viewRes').hidden = t !== 'res';
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === t)));
  { const mb = $('#miscBtn'), md = $('#miscDrop'); if (mb) { const inMisc = ['make', 'res', 'ho', 'god', 'syl'].includes(t); mb.setAttribute('aria-pressed', String(inMisc)); mb.firstChild.textContent = inMisc ? 'Misc: ' + ({ make: 'Tests', res: 'Results', ho: 'Handouts', god: 'God Mode', syl: 'Syllabus Priority' })[t] + ' ' : 'Misc '; mb.setAttribute('aria-expanded', 'false'); if (md) md.hidden = true; } }
  if (t === 'qb') qbInit(); else if (t === 'syl') renderSyl(); else if (t === 'god') renderGod(); else if (t === 'res') renderResults(); else if (t === 'ho') renderHandouts(); else if (t === 'must') ensureDpp().then(renderMust); else if (t === 'cw' || t === 'sw') ensureDpp().then(() => { renderPdfTab(t); setTimeout(rescale, 0); }); else ensureDpp().then(() => { if (t === 'make') { if (!makeReady) { makeReady = true; refreshRail(); } renderPreview(); } else renderLib(); setTimeout(rescale, 0); });
  setTimeout(rescale, 0);
}
let MORE_OPEN = false;

/* ---------- preview ---------- */
function renderPreview() {
  const wrap = $('#pgwrap'); if (!wrap) return;
  reconcile();
  const p = sheetParams();
  wrap.textContent = '';
  const box = h('div', { class: 'pgbox' }), scaler = h('div', { class: 'pgscale' }); box.append(scaler); wrap.append(box);
  if (!p.qs.length) { scaler.remove(); box.append(h('div', { class: 'empty', text: S.ch.size ? 'No questions match these filters. Try more topics, levels or types.' : 'Pick one or more chapters on the left to start.' })); S.lay = null; setMsg(S.ch.size ? 'No questions match.' : 'Pick a chapter to begin.', !!S.ch.size); renderList(); return; }
  const pgs = testPages(p); scaler.remove(); box.remove();
  S.lay = pgs.map((pg, i) => { const bx = h('div', { class: 'pgbox' }), sc = h('div', { class: 'pgscale' }); bx.append(sc); wrap.append(bx); return layoutSheet(pg, sc); });
  rescale();
  const over = S.lay.some(L => L.overflow) || pgs.length > S.sides, fs0 = Math.min(...S.lay.map(L => L.fs)), pt = (fs0 * 0.75).toFixed(1).replace('.0', '');
  const sd = pgs.length > 1 ? 'both sides of an A4 sheet' : 'one A4 side';
  if (over) setMsg('<b>Too many questions for ' + (S.sides > 1 ? S.sides + ' A4 sides' : 'one A4 side') + '.</b> Remove some, or use 2 columns.', true);
  else if (fs0 < 14) setMsg('<b>' + p.qs.length + ' questions</b> on ' + sd + ' at ' + pt + ' pt text. <b>This is small for print.</b> Remove a few questions, or use 1 column, to get 10.5 pt or more.', true);
  else setMsg('<b>' + p.qs.length + ' questions</b> on ' + sd + ' at ' + pt + ' pt text.' + (S.lay.every(L => L.slack > 0.15) && fs0 >= MAX_FS - 0.01 ? ' There is room for more. <button type="button" class="btn pri inl" data-act="fill">Fill pages</button>' : ''));
  const P = poolFor(); const el = $('#poolInfo'); if (el) el.textContent = P.length + ' questions match your filters.';
  renderList();
}
function rescale() {
  ['#pgwrap', '#libPrev', '#cwPrev', '#swPrev'].forEach(id => {
    const wrap = $(id); if (!wrap || !wrap.clientWidth) return;
    const cs = getComputedStyle(wrap), k = Math.min(1, (wrap.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)) / SHEET_W);
    wrap.querySelectorAll('.pgbox').forEach(bx => { const sc = $('.pgscale', bx); if (!sc) return; sc.style.transform = 'scale(' + k + ')'; bx.style.height = Math.ceil(SHEET_H * k) + 'px'; });
  });
}
function setMsg(html, warn) { const m = $('#statMsg'); if (m) { m.className = 'msg' + (warn ? ' warn' : ''); m.innerHTML = html; } }
function renderList() {
  const box = $('#qList'); if (!box) return; box.textContent = '';
  S.picked.forEach((id, i) => {
    const q = BYID.get(id); if (!q) return;
    const t = q.q.replace(/\\[\(\)\[\]]/g, '').replace(/\s+/g, ' ');
    box.append(h('div', { class: 'qrow' }, h('div', { class: 'n', text: i + 1 }), h('div', { class: 't', text: t }),
      h('div', { class: 'm', text: DIFF[q.d] + ' \u00b7 ' + (q.s === 'P' ? 'PYQ ' + q.y : 'Practice') }),
      h('button', { type: 'button', 'aria-label': 'Swap question ' + (i + 1), title: 'Swap for another', 'data-act': 'swap', 'data-i': i, text: 'Swap' }),
      h('button', { type: 'button', 'aria-label': 'Remove question ' + (i + 1), title: 'Remove', 'data-act': 'remove', 'data-i': i, text: 'Remove' })));
  });
  math(box);
}

/* ---------- rail (settings) ---------- */
function chip(label, on, act, data, count, disabled) {
  return h('button', Object.assign({ type: 'button', class: 'chip', 'aria-pressed': String(!!on), 'data-act': act, disabled }, data || {}), label, count != null ? h('small', { text: count }) : null);
}
function refreshRail() {
  syncOos(); paperUi();
  const so = $('#chSrc'); so.textContent = '';
  const sc = { P: 0 }; BANK.qs.forEach(q => { if (q.s === 'P') sc.P++; else { const t = q.pb || 'VMC'; sc[t] = (sc[t] || 0) + 1; } });
  so.append(chip('Past JEE papers (PYQs)', S.pyq, 'src', { 'data-k': 'P' }, sc.P));
  PUBS.filter(x => sc[x]).forEach(x => so.append(chip(x, S.pubs.has(x), 'src', { 'data-k': x }, sc[x])));
  $('#fExam').hidden = !S.pyq; $('#mkOos').hidden = !S.pyq;
  const ex = $('#chExam'); ex.textContent = '';
  ex.append(chip('JEE Main', S.exam.Main, 'exam', { 'data-k': 'Main' }), chip('JEE Advanced', S.exam.Adv, 'exam', { 'data-k': 'Adv' }), chip('KCET', S.exam.KCET, 'exam', { 'data-k': 'KCET' }));
  const cl = $('#chCls'); cl.textContent = '';
  cl.append(chip('Class 11', S.cls[11], 'cls', { 'data-k': 11 }), chip('Class 12', S.cls[12], 'cls', { 'data-k': 12 }));
  // chapters (dropdown, tick many)
  const cnt = {}; BANK.qs.forEach(q => { if (srcOk(q) && (S.mode === 'dpp' || gradable(q))) cnt[q.cc] = (cnt[q.cc] || 0) + 1; });
  const chItems = BANK.chapters.filter(c => S.cls[c.cl] && cnt[c.c]).sort((a, b) => a.cl - b.cl || a.o - b.o).map(c => [c.c, c.n + ' (' + cnt[c.c] + ')']);
  S.ch = new Set(mfill('mkCh', chItems, [...S.ch], v => { S.ch = new Set(v); S.tp = new Set([...S.tp].filter(x => S.ch.has(x.split('|')[0]))); update(); }, 'chapters', { empty: 'No chapters for these filters' }));
  // topics
  const tc = {};
  BANK.qs.forEach(q => { if (srcOk(q) && q.tp && S.ch.has(q.cc) && (S.mode === 'dpp' || gradable(q))) { const k = q.cc + '|' + q.tp; tc[k] = (tc[k] || 0) + 1; } });
  const tpItems = Object.keys(tc).sort((a, b) => (CHMAP.get(a.split('|')[0]).o - CHMAP.get(b.split('|')[0]).o) || a.localeCompare(b)).map(k => [k, (S.ch.size > 1 ? CHMAP.get(k.split('|')[0]).n + ' \u00b7 ' : '') + k.split('|')[1] + ' (' + tc[k] + ')']);
  S.tp = new Set(mfill('mkTp', tpItems, [...S.tp], v => { S.tp = new Set(v); update(); }, 'topics', { empty: 'Pick a chapter first', none: 'All topics of the chapters (none ticked)' }));
  // difficulty + types
  const dc = {}, ty = {};
  poolFor({ diff: 1 }).forEach(q => { dc[q.d] = (dc[q.d] || 0) + 1; });
  poolFor({ types: 1 }).forEach(q => { ty[q.t] = (ty[q.t] || 0) + 1; });
  const df = $('#chDiff'); df.textContent = '';
  ['L1', 'L2', 'L3'].forEach(d => df.append(chip(DIFF[d], S.diff.has(d), 'diff', { 'data-k': d }, dc[d] || 0)));
  const tp = $('#chType'); tp.textContent = '';
  TYPES.forEach(t => tp.append(chip(t, S.types.has(t), 'type', { 'data-k': t }, ty[t] || 0, S.mode === 'test' && t === 'Subjective')));
  const pn = poolFor().length; $('#poolNote').textContent = !S.ch.size ? 'Next, pick a chapter in step 2.' : pn ? pn + ' question' + (pn === 1 ? '' : 's') + ' match your choices.' : 'No questions match. Loosen a choice above.';
  $('#fCount').value = S.count;
  $('#sideSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.k === S.sides)));
  $('#colSeg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.k === S.cols)));
  $('#tOrder').checked = S.order; $('#tTag').checked = S.tag; S.key = false;
  $('#fTitle').placeholder = defaultTitle();
  renderMyTests();
}
function toggle(set, k) { set.has(k) ? set.delete(k) : set.add(k); }
function update(rail) { if (rail !== false) refreshRail(); renderPreview(); }

/* ---------- actions ---------- */
function onAct(e) {
  if (e.type === 'click' && e.target.isConnected && !e.target.closest('.msel')) document.querySelectorAll('.msel.open').forEach(x => { x.classList.remove('open'); x.querySelector('.mbtn').setAttribute('aria-expanded', 'false'); });
  if (e.type === 'click' && !e.target.closest('.tb-misc')) { const md = $('#miscDrop'); if (md && !md.hidden) { md.hidden = true; $('#miscBtn').setAttribute('aria-expanded', 'false'); } }
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, k = t.dataset.k;
  if (e.type === 'change' && t.tagName !== 'INPUT' && t.tagName !== 'SELECT') return;
  if (e.type === 'click' && t.tagName === 'INPUT') return;
  switch (a) {
    case 'src': { const on = k === 'P' ? S.pyq : S.pubs.has(k); if (on && (S.pyq ? 1 : 0) + S.pubs.size <= 1) { toast('Keep at least one source'); break; } if (k === 'P') S.pyq = !S.pyq; else if (on) S.pubs.delete(k); else S.pubs.add(k); S.picked = []; update(); break; }
    case 'exam': S.exam[k] = !S.exam[k]; if (!S.exam.Main && !S.exam.Adv && !S.exam.KCET) S.exam[k] = true; update(); break;
    case 'cls': S.cls[k] = !S.cls[k]; if (!S.cls[11] && !S.cls[12]) S.cls[k] = true; update(); break;
    case 'ch': toggle(S.ch, k); S.tp = new Set([...S.tp].filter(x => !S.ch.size || S.ch.has(x.split('|')[0]))); update(); break;
    case 'tp': toggle(S.tp, k); update(); break;
    case 'diff': toggle(S.diff, k); update(); break;
    case 'type': toggle(S.types, k); update(); break;
    case 'cols': S.cols = +k; renderPreview(); refreshRail(); break;
    case 'sides': S.sides = +k; renderPreview(); refreshRail(); break;
    case 'clearch': S.ch.clear(); S.tp.clear(); update(); break;
    case 'shuffle': S.picked = []; update(false); toast('Shuffled'); break;
    case 'fill': fillPage(); break;
    case 'swap': swapQ(+t.dataset.i); break;
    case 'remove': S.picked.splice(+t.dataset.i, 1); if (S.paper) S.paper.ids = S.picked.slice(); S.count = Math.max(1, S.picked.length); $('#fCount').value = S.count; renderPreview(); break;
    case 'exp': doExport(k); break;
    case 'lexp': exportLib(k); break;
    case 'theme': themeToggle(); break;
    case 'tab': setTab(k); break;
    case 'pyqsub': PYQSUB = k; pyqShow(); break;
    case 'misc': { const md = $('#miscDrop'), open = md.hidden; md.hidden = !open; t.setAttribute('aria-expanded', String(open)); break; }
    case 'libkind': LS.kind = k; LS.idk = ''; LS.chTouched = false; renderLib(); break;
    case 'oos': { OOS.ex = k === 'ex'; try { localStorage.setItem('oosEx', OOS.ex ? '1' : '0'); } catch (e) {} applyOos(); S.picked = []; LS.idk = ''; syncOos(); renderLib(); if (typeof refreshRail === 'function') { refreshRail(); renderPreview(); } toast(OOS.ex ? 'Out-of-syllabus questions excluded' : 'Out-of-syllabus questions included'); break; }
    case 'pdfex': { const T = t.dataset.t; PDFT[T].bucket = k; PDFT[T].sel = null; PDFT[T].page = 0; renderPdfTab(T); break; }
    case 'pdfrow': { const T = t.dataset.t; PDFT[T].sel = k; PDFT[T].page = 0; markPdfRows(T); showPdfPrev(T); break; }
    case 'max': toggleMax(t); break;
    case 'pdfshare': { const T = t.dataset.t, r = pdfRows(T).find(x => x.k === k); if (r) { const mk = extra => () => { const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key })); doExport('pdf', Object.assign({ pages, file: r.file }, extra)); }; shareMenu(t, { title: r.name, drive: mk({ drive: true }), download: mk({}) }); } break; }
    case 'pdfpage': { const T = t.dataset.t; PDFT[T].page = +k; showPdfPrev(T); break; }
    case 'pdfdl': { const T = t.dataset.t, r = pdfRows(T).find(x => x.k === k); if (r && T === 'cw' && t.dataset.f === 'pptx') { exportCwPptx(r); break; } if (r) { const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key })); doExport(t.dataset.f || 'pdf', { pages, file: r.file }); } break; }
    case 'libpub': { const n = LS.pubs.includes(k) ? LS.pubs.filter(x => x !== k) : LS.pubs.concat(k); if (!n.length) { toast('Keep at least one source'); break; } LS.pubs = PUBS.filter(x => n.includes(x)); LS.idk = ''; renderLib(); break; }
    case 'liblv': { const n = LS.lv.includes(k) ? LS.lv.filter(x => x !== k) : LS.lv.concat(k); if (!n.length) { toast('Keep at least one level'); break; } LS.lv = ['L1', 'L2', 'L3'].filter(x => n.includes(x)); renderLib(); break; }
    case 'mall': case 'mnone': { const boxe = $('#' + k); boxe.querySelectorAll('.ml input').forEach(x => { x.checked = a === 'mall'; }); boxe.querySelector('.ml input') ? boxe.querySelector('.ml input').dispatchEvent(new Event('change')) : 0; break; }
    case 'libshow': showLibPrev(); break;
    case 'libpage': LS.page = +k; showLibPrev(); break;
    case 'lexpall': exportAllPyq(k); break;
    case 'pdfkey': PDFT[t.dataset.t].key = t.checked; if (PDFT[t.dataset.t].sel) showPdfPrev(t.dataset.t); break;
    case 'mkey': MS.key = t.checked; if (MS.redraw) MS.redraw(); break;
    case 'libkey': LS.key = $('#libKey').checked; if (LS.shown) showLibPrev(); break;
    case 'mklink': makeLink(); break;
    case 'distest': { const on = TESTS.find(x => x.code === t.dataset.code); publishTests(TESTS.map(x => x.code === t.dataset.code ? (x.off ? Object.assign({}, x, { off: undefined }) : Object.assign({}, x, { off: true })) : x), on && on.off ? 'Test enabled again: students can see it.' : 'Test disabled: hidden from students and from your results.'); break; }
    case 'paperuse': usePaper($('#paperSel').value); break;
    case 'paperoff': S.paper = null; S.picked = []; paperUi(); update(); toast('Back to normal picking'); break;
    case 'deltest': DELASK = t.dataset.code; BACKED = ''; renderMyTests(); break;
    case 'delno': DELASK = ''; renderMyTests(); break;
    case 'delxls': exportTestExcel(t.dataset.code, t); break;
    case 'delyes': { DELASK = ''; BACKED = ''; publishTests(TESTS.filter(x => x.code !== t.dataset.code), 'Removed from saved tests.'); break; }
    case 'flip': if (k === 'order') S.order = $('#tOrder').checked; if (k === 'tag') S.tag = $('#tTag').checked; if (k === 'order') S.picked = orderIds(S.picked); renderPreview(); break;
  }
}
function swapQ(i) {
  const cur = BYID.get(S.picked[i]); if (!cur) return;
  const have = new Set(S.picked), P = poolFor().filter(q => !have.has(q.i));
  if (!P.length) { toast('No other matching question to swap in.'); return; }
  const same = P.filter(q => q.cc === cur.cc && q.d === cur.d), pickFrom = same.length ? same : P;
  S.picked[i] = pickFrom[Math.floor(Math.random() * pickFrom.length)].i;
  renderPreview();
}
function fillPage() {
  try {
    reconcile();
    const P = poolFor(); if (!P.length) { toast('No questions match your filters'); return; }
    const p0 = sheetParams();
    const cand = S.picked.map(id => BYID.get(id)).filter(Boolean), have = new Set(cand.map(q => q.i));
    const all = cand.concat(roundRobin(P.filter(q => !have.has(q.i)), Math.min(P.length, 90))).slice(0, 90);
    const fits = n => { const q = Object.assign({}, p0, { qs: all.slice(0, n) }); return paginate(q.qs, q).length <= S.sides; };
    let lo = 1, hi = all.length; if (!fits(1)) { toast('Could not fit a question'); return; }
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (fits(mid)) lo = mid; else hi = mid - 1; }
    S.picked = orderIds(all.slice(0, lo).map(q => q.i)); S.count = lo; $('#fCount').value = lo;
    renderPreview(); toast(lo + ' questions fit ' + (S.sides > 1 ? 'both sides' : 'this page'));
  } catch (e) { toast('Fill failed: ' + (e && e.message ? e.message : 'try again')); }
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copied'); }
  catch (e) { toast('Select the text and copy it'); }
}

/* ---------- export ---------- */
function exportHost() { const hst = h('div', { 'data-exphost': '', style: 'position:absolute;left:-10000px;top:0;width:794px;background:#fff' }); document.body.append(hst); return hst; }
async function shot(node, scale) {
  await document.fonts.ready;
  return window.html2canvas(node, { scale, backgroundColor: '#ffffff', logging: false, useCORS: true, onclone: d => { const x = d.querySelector('[data-exphost]'); if (x) { x.style.left = '0px'; x.style.top = '0px'; x.style.zIndex = '-1'; } } });
}
const ansText = q => (q.a || '\u2014').replace(/\\[()\[\]]/g, '');
const fname = (p, ext) => (p.file || p.title || 'sheet').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + ext;
/* ---------- Print handouts and share menu ---------- */
async function printHandout(x, bw) {
  const w = window.open('', '_blank');
  if (!w) { toast('This view does not allow a print window. Use Download PDF, then print the file.'); return; }
  try { w.document.write('<!doctype html><title>Preparing\u2026</title><body style="font-family:sans-serif;padding:24px">Preparing pages for printing\u2026</body>'); } catch (e) { toast('This view does not allow printing. Use Download PDF, then print the file.'); return; }
  try {
    const tob = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
    const imgs = [];
    for (let i = 1; i <= x.pages; i++) { const r = await fetch('handouts/' + x.dir + (bw ? '/bw' : '') + '/p-' + i + '.jpg'); imgs.push(await tob(await r.blob())); }
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + x.code + ' ' + x.title + (bw ? ' (black and white)' : '') + '</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:297mm;height:210mm;page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>' + imgs.map(d => '<img src="' + d + '">').join('') + '</body></html>';
    w.document.open(); w.document.write(html); w.document.close();
    const ims = [...w.document.images]; await Promise.all(ims.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    w.focus(); w.print();
  } catch (e) { try { w.close(); } catch (x2) {} toast('Could not open the print view. Use Download PDF, then print the file.'); }
}
const DASH_URL = 'https://claude.ai/artifact/UgXUYU8es1bDbPrckV3Cn8';
function closeShare() { const m = document.getElementById('shareMenu'); if (m) m.remove(); document.removeEventListener('click', closeShareOut, true); document.removeEventListener('keydown', closeShareKey, true); }
function closeShareOut(e) { const m = document.getElementById('shareMenu'); if (m && !m.contains(e.target)) closeShare(); }
function closeShareKey(e) { if (e.key === 'Escape') closeShare(); }
function shareMenu(btn, o) {
  closeShare();
  const text = o.title + ' (Avanti Fellows Math Teacher Dashboard)', link = o.url || DASH_URL, full = text + '\n' + link;
  const item = (ico, label, attrs) => h(attrs.href ? 'a' : 'button', Object.assign({ class: 'smi', type: attrs.href ? undefined : 'button' }, attrs), h('span', { class: 'smic', html: ico }), h('span', { text: label }));
  const m = h('div', { id: 'shareMenu', class: 'smenu', role: 'menu' },
    h('div', { class: 'smh', text: 'Share ' + o.title }),
    item(ICO.chat, 'WhatsApp', { href: 'https://wa.me/?text=' + encodeURIComponent(full), target: '_blank', rel: 'noopener', onclick: closeShare }),
    item(ICO.mail, 'Email (Gmail)', { href: 'https://mail.google.com/mail/?view=cm&fs=1&su=' + encodeURIComponent(text) + '&body=' + encodeURIComponent(full), target: '_blank', rel: 'noopener', onclick: closeShare }),
    item(ICO.link, 'Copy link', { onclick: async () => { closeShare(); try { await navigator.clipboard.writeText(full); toast('Link copied'); } catch (e) { toast('Could not copy. Select and copy: ' + link); } } }),
    o.print ? item(ICO.print, 'Print', { onclick: () => { closeShare(); o.print(); } }) : null,
    o.download ? item(FIMG.pdf.replace('width="36" height="36"', 'width="20" height="20"'), 'Download PDF', { onclick: () => { closeShare(); o.download(); } }) : null,
    h('div', { class: 'smn', text: 'The link opens the dashboard. To print or send the file itself, download it first.' }));
  document.body.append(m);
  const r = btn.getBoundingClientRect(), mw = m.offsetWidth;
  m.style.top = Math.min(window.innerHeight - m.offsetHeight - 8, r.bottom + 6) + 'px';
  m.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw)) + 'px';
  setTimeout(() => { document.addEventListener('click', closeShareOut, true); document.addEventListener('keydown', closeShareKey, true); }, 0);
}
function toggleMax(btn) {
  const st = btn.closest('.stage'); if (!st) return;
  const on = !st.classList.contains('maxed'); st.classList.toggle('maxed', on); document.body.classList.toggle('hasmax', on);
  btn.innerHTML = on ? ICO.min : ICO.max; btn.title = on ? 'Close (Esc)' : 'Maximize'; btn.setAttribute('aria-label', on ? 'Close full screen' : 'Maximize'); btn.setAttribute('aria-pressed', String(on));
  setTimeout(rescale, 0); setTimeout(rescale, 150);
}
function closeMax() { const st = document.querySelector('.stage.maxed'); if (!st) return; const b = st.querySelector('[data-act="max"]'); if (b) toggleMax(b); }
async function doExport(kind, p0) {
  const pages = p0 && p0.pages ? p0.pages : p0 ? [p0] : testPages(), pk = p0 && p0.pages ? p0 : pages[0];
  if (!pages.length || !pages[0].qs.length) { toast('Add some questions first'); return; }
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  const btns = document.querySelectorAll('[data-act="exp"],[data-act="lexp"],[data-act="lexpall"],[data-act="pdfdl"]'); btns.forEach(b => { b.disabled = true; });
  const multi = pages.length > 1, file = fname(pk, '.' + kind);
  toast('Preparing ' + kind.toUpperCase() + '\u2026');
  if (kind !== 'pdf') {
    try {
      const blob = await buildEditable(kind, pages.map(p => Object.assign({}, p, { key: p.key })));
      await downloads.save({ filename: file, data: blob });
      toast('Saved ' + file);
    } catch (e) {
      if (e && e.code === 'declined') toast('Download cancelled');
      else toast('Export failed: ' + (e && e.message ? e.message : 'try again'));
    } finally { btns.forEach(b => { b.disabled = false; }); }
    return;
  }
  const hst = exportHost();
  try {
    await Promise.all([loadScript(CDN.h2c), kind === 'pdf' ? loadScript(CDN.pdf) : kind === 'docx' ? loadScript(CDN.docx) : loadScript(CDN.pptx)]);
    const pdf = kind === 'pdf' ? new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' }) : null, items = [];
    for (let k = 0; k < pages.length; k++) {
      const p = pages[k]; if (multi) toast('Preparing page ' + (k + 1) + ' of ' + pages.length + '\u2026');
      const L = layoutSheet(p, hst, p.maxFs ? FIT_MIN : MAN_MIN); L.sheet.style.boxShadow = 'none';
      if (pdf) { const c = await shot(L.sheet, 2.5); if (k) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297); }
      else { const imgs = []; for (const nd of L.nodes) { const c = await shot(nd, kind === 'pptx' ? (multi ? 3 : 4) : (multi ? 2 : 3)); imgs.push({ c, w: nd.offsetWidth, h: nd.offsetHeight }); } items.push({ p, L: { groups: L.groups.map(g => g.map(n => L.nodes.indexOf(n))), gap: L.gap }, imgs }); }
      L.sheet.remove();
    }
    let blob;
    if (pdf) {
      const kp = pages.filter(p => p.key);
      if (kp.length) for (const ks of keySheets(kp, hst)) { const c2 = await shot(ks, 2); pdf.addPage(); pdf.addImage(c2.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297); ks.remove(); }
      blob = pdf.output('blob');
    } else blob = kind === 'docx' ? await buildDocx(items, pk) : await buildPptx(items, pk);
    { await downloads.save({ filename: file, data: blob }); toast('Saved ' + file); }
  } catch (e) {
    if (e && e.code === 'declined') toast('Download cancelled');
    else toast('Export failed: ' + (e && e.message ? e.message : 'try again'));
  } finally { hst.remove(); btns.forEach(b => { b.disabled = false; }); }
}
const keyLine = p => p.qs.map((q, i) => (i + 1 + (p.start || 0)) + '-' + (window.MathDoc ? window.MathDoc.plainText(q.a || '\u2014') : ansText(q))).join('    ');
/* figures: SVG -> PNG so Word and PowerPoint can hold them */
async function figPng(f) {
  const img = new Image(); img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(f.svg);
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  const w = f.w || img.width || 300, hh = f.h || img.height || 200, c = document.createElement('canvas'); c.width = w * 2; c.height = hh * 2;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/png'), data = await new Promise(r => c.toBlob(b => b.arrayBuffer().then(x => r(new Uint8Array(x))), 'image/png'));
  return { w, h: hh, data, dataUrl };
}
async function buildEditable(kind, pages) {
  if (pages.length > 1 && pages[0].kind === 'test') pages = [Object.assign({}, pages[0], { qs: [].concat(...pages.map(p => p.qs)), start: 0, pageOf: '' })];
  await Promise.all([loadScript('mathdoc.js'), loadScript('office.js'), loadScript(CDN.zip), kind === 'docx' ? loadScript(CDN.docx) : loadScript(CDN.pptx)]);
  const figs = {};
  for (const p of pages) for (const q of p.qs) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  const H = { CHMAP, DIFF, tagText, keyLine, figs, matchParts };
  return kind === 'docx' ? window.OfficeDoc.buildDocx(window.docx, window.JSZip, pages, H) : window.OfficeDoc.buildPptx(window.PptxGenJS, window.JSZip, pages, H);
}

/* ---------- test links ---------- */
function makeCode() {
  const p = sheetParams();
  const meta = { t: p.title, m: p.mins, p: p.pos, n: p.neg, e: S.email.trim() };
  return 'T~' + b64(JSON.stringify(meta)) + '~' + p.qs.map(q => q.i).join('~');
}
function pubMsg(t, warn) { const m = $('#pubMsg'); if (m) { m.textContent = t; m.className = 'hint' + (warn ? ' warnt' : ''); } }
/* Student page sync: a short Claude run copies this page's saved tests to the student dashboard. */
const STUDENT_URL = 'https://claude.ai/artifact/JrF7haaQnwBT8Jh5QPCMcF';   /* public student dashboard */
const SYNC_TRIGGER = 'trig_011QnFtarL5S8UPypzb1TkSq';   /* "Sync tests to student dashboard": runs when a test is saved */
const BLOCK_TRIGGER = 'trig_01YAuUFUtg3Jrg8jcDTWfHPy';  /* "Block IDs on student dashboard": runs from the Results tab */
function syncFlag(v) { try { if (v) sessionStorage.setItem('avanti_sync', '1'); else sessionStorage.removeItem('avanti_sync'); } catch (e) { /* ignore */ } }
async function syncStudents(trig) {
  try {
    const mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null;
    if (!mcp) return 'off';
    await mcp.callTool('Claude Code Remote', 'fire_trigger', { trigger_id: trig || SYNC_TRIGGER }, { cache: false });
    if (!trig) syncFlag(false); return 'ok';
  } catch (e) { return (e && e.code) || 'error'; }
}
function syncNote(r) {
  if (r === 'ok') return 'Student page update started. It shows there in a few minutes.';
  return 'Could not start the student page update (' + r + '). Open the Tests tab again to retry.';
}
async function publishTests(list, okMsg) {
  if (!OPTS || !OPTS.artifact) { pubMsg('Publishing is not available in this view. Open this page from your own account.', true); return false; }
  pubMsg('Publishing\u2026');
  try { try { sessionStorage.setItem('avanti_tab', 'make'); } catch (e) { /* ignore */ } syncFlag(true); await OPTS.artifact.publish(OPTS.pageHtml(list)); TESTS = list; renderMyTests(); const r = await syncStudents(); pubMsg((okMsg || 'Saved.') + ' ' + syncNote(r), r !== 'ok'); return true; }
  catch (e) {
    const c = e && e.code;
    if (c === 'conflict') pubMsg('Someone published at the same moment. The page is reloading. Try again.', true);
    else if (c === 'not_writer' || c === 'not_granted') pubMsg('This account cannot edit the page.', true);
    else pubMsg('Publishing from the page did not work (' + (c || 'error') + '). Send this to Claude and ask it to publish: ' + JSON.stringify(list.map(t => t.code)).slice(0, 3000), true);
    return false;
  }
}
async function makeLink() {
  if (!S.picked.length) { toast('Add some questions first'); return; }
  const bad = S.picked.filter(id => !gradable(BYID.get(id)));
  if (bad.length) { toast('Some questions have no auto-gradable answer. Remove them.'); return; }
  const code = makeCode(), p = sheetParams();
  const btn = $('[data-act="mklink"]'); if (btn) btn.disabled = true;
  const ok = await publishTests([{ code, title: p.title, n: S.picked.length, at: Date.now() }].concat(TESTS.filter(t => t.code !== code)).slice(0, 30), 'Saved to your tests. It is being sent to the student page.');
  if (btn) btn.disabled = false;
}
let DELASK = '', BACKED = '';
function renderMyTests() {
  const box = $('#myTests'); if (!box) return; box.textContent = '';
  if (!TESTS.length) { box.append(h('p', { class: 'hint', text: 'No saved tests yet.' })); return; }
  TESTS.forEach(t => {
    if (t.code === DELASK) {
      box.append(h('div', { class: 'delbox', role: 'alertdialog', 'aria-label': 'Confirm removing ' + t.title },
        h('b', { text: 'Remove \u201c' + t.title + '\u201d?' }),
        h('p', { text: 'The test disappears from your saved tests and from the student page, and students can no longer open it. Results students already sent stay in the Google Sheet, but this cannot be undone. Download a backup first.' }),
        BACKED === t.code ? h('p', { class: 'delok', text: 'Backup downloaded. You can remove the test now.' }) : null,
        h('div', { class: 'btns' },
          h('button', { type: 'button', class: 'btn', 'data-act': 'delxls', 'data-code': t.code, text: 'Export marks to Excel' }),
          h('button', { type: 'button', class: 'btn danger', 'data-act': 'delyes', 'data-code': t.code, text: 'Yes, remove this test' }),
          h('button', { type: 'button', class: 'btn', 'data-act': 'delno', text: 'Cancel' }))));
      return;
    }
    box.append(h('div', { class: t.off ? 'toff' : null }, h('span', { text: t.title + ' \u00b7 ' + t.n + ' Qs' + (t.off ? ' \u00b7 Disabled: hidden from students and from results' : '') }),
      h('span', { class: 'btns' },
        h('button', { type: 'button', class: 'btn sm', 'data-act': 'distest', 'data-code': t.code, 'aria-label': (t.off ? 'Enable ' : 'Disable ') + t.title, text: t.off ? 'Enable' : 'Disable' }),
        h('button', { type: 'button', class: 'btn sm', 'data-act': 'deltest', 'data-code': t.code, 'aria-label': 'Remove ' + t.title + ' from saved tests', text: 'Remove' }))));
  });
}
/* Backup of one test's marks as an Excel file, read from the Google Form response sheet */
async function exportTestExcel(code, btn) {
  const t = TESTS.find(x => x.code === code); if (!t) return;
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Preparing\u2026'; }
  const done = () => { if (btn) { btn.disabled = false; btn.textContent = 'Export marks to Excel'; } };
  try {
    await ensureDpp().catch(() => {});
    if (!RES.data || Date.now() - RES.at > 60000) { RES.data = resParse(await resFetch()); RES.at = Date.now(); }
    const g = RES.data[testKeyOf(code)];
    if (!g || !g.rows.size) { toast('No submitted results found for this test, so there is nothing to export.'); done(); return; }
    await loadScript(CDN.xlsx); const X = window.XLSX; if (!X) throw new Error('Excel library did not load');
    const rows = [...g.rows.values()].sort((a, b) => (b.pct == null ? -1 : b.pct) - (a.pct == null ? -1 : a.pct)), ids = String(t.code).split('~').slice(2), nq = Math.max(ids.length, ...rows.map(r => r.n || 0));
    const mins = s => s == null ? '' : Math.round(s / 6) / 10;
    const marks = [['Rank', 'Avanti ID', 'Submitted at', 'Score', 'Out of', 'Percent', 'Correct', 'Wrong', 'Skipped', 'Attempted', 'Time on questions (min)', 'Times left the test page', 'Minutes away', 'Screenshot key presses']]
      .concat(rows.map((r, i) => [i + 1, r.afid, r.ts, r.score == null ? '' : r.score, r.max == null ? '' : r.max, r.pct == null ? '' : Math.round(r.pct * 1000) / 10, r.ok, r.no, r.sk, r.att, mins(r.secs), r.sw == null ? '' : r.sw, r.away == null ? '' : Math.round(r.away / 6) / 10, r.ps || 0]));
    const qn = n => { const bq = BYID.get(ids[n - 1]); return bq ? bq.a : ''; };
    const qh = []; for (let i = 1; i <= nq; i++) qh.push('Q' + i);
    const ans = [['Avanti ID'].concat(qh), ['Correct answer'].concat(qh.map((_, i) => qn(i + 1)))].concat(rows.map(r => [r.afid].concat(qh.map((_, i) => { const q = r.qs.find(x => x.n === i + 1); return q && q.st !== 's' ? q.a : ''; }))));
    const rw = [['Avanti ID'].concat(qh)].concat(rows.map(r => [r.afid].concat(qh.map((_, i) => { const q = r.qs.find(x => x.n === i + 1); return !q ? '' : q.st === 'o' ? 'Right' : q.st === 'x' ? 'Wrong' : 'Skipped'; }))));
    const byq = [['Question', 'Question ID', 'Correct answer', 'Students', 'Attempted %', 'Accuracy %', 'Average seconds']].concat(qh.map((_, i) => {
      const c = rows.map(r => r.qs.find(x => x.n === i + 1)).filter(Boolean), at = c.filter(x => x.st !== 's'), ok = c.filter(x => x.st === 'o');
      return ['Q' + (i + 1), ids[i] || '', qn(i + 1), c.length, c.length ? Math.round(at.length / c.length * 100) : '', at.length ? Math.round(ok.length / at.length * 100) : '', c.length ? Math.round(c.reduce((s, x) => s + x.t, 0) / c.length) : ''];
    }));
    const wb = X.utils.book_new(), add = (n, a, w) => { const ws = X.utils.aoa_to_sheet(a); ws['!cols'] = a[0].map((_, i) => ({ wch: i === 0 ? w : Math.max(8, Math.min(24, String(a[0][i]).length + 3)) })); X.utils.book_append_sheet(wb, ws, n); };
    add('Marks', marks, 6); add('Answers', ans, 16); add('Right-Wrong', rw, 14); add('By question', byq, 10);
    const out = X.write(wb, { type: 'array', bookType: 'xlsx' }), blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = (t.title || 'Test').replace(/[\\/:*?"<>|]+/g, ' ').trim() + ' marks ' + new Date().toISOString().slice(0, 10) + '.xlsx';
    await downloads.save({ filename: file, data: blob }); toast('Saved ' + file + ' (' + rows.length + ' students)');
    BACKED = code; if (DELASK === code) renderMyTests(); else done();
  } catch (e) {
    done();
    const c = e && e.code;
    toast(c === 'declined' ? 'Download cancelled' : c === 'not_in_manifest' || c === 'consent_required' || c === 'approval_required' ? 'Allow this dashboard to read your Google Sheet, then try again.' : 'Export failed: ' + (e && e.message ? e.message : 'try again'));
  }
}

/* ---------- Syllabus Priority tab: all 24 chapters and subtopics with JEE Main / Advanced priority (from syllabus.json) ---------- */
async function renderSyl() {
  const box = $('#viewSyl'); if (!box || box.dataset.ready) return;
  box.dataset.ready = '1';
  box.textContent = ''; box.append(h('p', { class: 'hint', text: 'Loading…' }));
  let D;
  try { D = await fetch('syllabus.json').then(r => { if (!r.ok) throw new Error('syl'); return r.json(); }); }
  catch (e) { delete box.dataset.ready; box.textContent = ''; box.append(h('p', { class: 'hint', text: 'Could not load the syllabus list. Switch tabs and back to try again.' })); return; }
  const ch = D.chapters, cnt = D.cnt, cntOf = (a, t) => cnt[a + '|' + t] || 0;
  const pill = t => h('span', { class: 'sy-pill sy-p-' + t.toLowerCase(), text: t });
  const numCell = n => h('td', { class: 'num' }, n ? String(n) : h('span', { class: 'sy-zero', text: '0' }));
  const tierItem = (t, txt, n) => h('li', {}, h('span', {}, pill(t), ' ' + txt), h('b', { text: String(n) }));
  const openChap = el => { const b = el && el.querySelector('.sy-chbtn'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); };
  const goTo = code => e => { e.preventDefault(); const el = box.querySelector('#sy-' + code); if (el) { openChap(el); el.scrollIntoView({ block: 'start' }); } };
  const svgEl = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const trendSvg = c => {
    const W = 150, H = 36, P = 5, n = YEARS.length;
    const pts = YEARS.map((y, i) => { const v = (c.yr && c.yr[y]) || 0; return { x: P + i * (W - 2 * P) / (n - 1), py: H - P - v / maxY * (H - 2 * P), v, yr: y }; });
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, class: 'sy-trend', role: 'img', 'aria-label': c.name + ' PYQs 2020 to 2026: ' + pts.map(p => p.yr + ' ' + p.v).join(', ') });
    svg.append(svgEl('polyline', { points: pts.map(p => p.x.toFixed(1) + ',' + p.py.toFixed(1)).join(' '), fill: 'none', class: 'sy-tline' }));
    pts.forEach(p => { const g = svgEl('circle', { cx: p.x.toFixed(1), cy: p.py.toFixed(1), r: 2.8, class: 'sy-tdot' }); const t = svgEl('title', {}); t.textContent = p.yr + ': ' + p.v; g.append(t); svg.append(g); });
    return svg;
  };
  const changeOf = c => {
    const sum = ys => ys.reduce((t, y) => t + ((c.yr && c.yr[y]) || 0), 0);
    const early = sum([2020, 2021, 2022]), late = sum([2024, 2025, 2026]);
    if (early < 10) { const d = late - early; if (!d) return { txt: '0 Qs', dir: 'flat' }; return d > 0 ? { txt: '▲ +' + d + ' Qs', dir: 'up' } : { txt: '▼ ' + Math.abs(d) + ' Qs', dir: 'down' }; }
    const p = Math.round((late - early) / early * 100);
    if (p === 0) return { txt: '0%', dir: 'flat' };
    return p > 0 ? { txt: '▲ ' + p + '%', dir: 'up' } : { txt: '▼ ' + Math.abs(p) + '%', dir: 'down' };
  };
  const changeCell = c => { const r = changeOf(c); return h('td', { class: 'num sy-chg sy-chg-' + r.dir, text: r.txt }); };
  const idxTable = (list, label) => h('div', { class: 'sy-tw' }, h('table', {},
    h('thead', {}, h('tr', {}, h('th', { text: 'Code' }), h('th', { text: label }), h('th', { text: 'PYQs 2020 to 2026' }), h('th', { class: 'num', text: 'Change' }), h('th', { class: 'num', text: 'Subtopics' }), h('th', { class: 'num', text: 'Main PYQs' }), h('th', { class: 'num', text: 'Adv PYQs' }))),
    h('tbody', {}, list.map(c => h('tr', {},
      h('td', { class: 'mono' }, h('a', { href: '#', onclick: goTo(c.code) }, c.code)),
      h('td', {}, h('a', { href: '#', onclick: goTo(c.code) }, c.name)),
      h('td', { class: 'sy-trc' }, trendSvg(c)),
      changeCell(c),
      numCell(c.subs.length), numCell(c.m), numCell(c.a))))));
  const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const maxY = Math.max(1, ...ch.flatMap(c => YEARS.map(y => (c.yr && c.yr[y]) || 0)));
  const yearBars = c => h('div', { class: 'sy-bars', role: 'img', 'aria-label': c.name + ' PYQs per year, 2020 to 2026: ' + YEARS.map(y => y + ' ' + ((c.yr && c.yr[y]) || 0)).join(', ') },
    YEARS.map(y => { const v = (c.yr && c.yr[y]) || 0; return h('div', { class: 'sy-bcol' },
      h('span', { class: 'sy-bv', text: String(v) }),
      h('div', { class: 'sy-bbar' }, h('div', { class: 'sy-bfill', style: 'height:' + Math.round(v / maxY * 46) + 'px' })),
      h('span', { class: 'sy-by', text: String(y) })); }));
  const chapterSection = c => {
    const body = h('div', { class: 'sy-chbody', id: 'sy-body-' + c.code, hidden: true },
      h('div', { class: 'sy-tw' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', { text: 'CMS code' }), h('th', { text: 'Subtopic' }), h('th', { class: 'num', text: 'Main PYQs' }), h('th', { text: 'Main priority' }), h('th', { class: 'num', text: 'Adv PYQs' }), h('th', { text: 'Adv priority' }))),
        h('tbody', {}, c.subs.map(s => h('tr', {},
          h('td', { class: 'mono sy-code' }, s.code),
          h('td', { class: 'sy-sn', text: s.no + '. ' + s.name }),
          numCell(s.m), h('td', {}, pill(s.mt)),
          numCell(s.a), h('td', {}, pill(s.at))))))));
    const btn = h('button', { type: 'button', class: 'sy-chbtn', 'aria-expanded': 'false', 'aria-controls': 'sy-body-' + c.code },
      h('span', { class: 'sy-chtxt' },
        h('span', { class: 'sy-eyebrow', text: (c.code.startsWith('11') ? 'Class 11' : 'Class 12') + ' · Chapter ' + Number(c.no) + ' · ' + c.code }),
        h('span', { class: 'sy-h', text: c.name }),
        h('span', { class: 'sy-cht', text: c.subs.length + ' subtopics · ' + c.m + ' JEE Main · ' + c.a + ' JEE Advanced PYQs · 2024–26 vs 2020–22: ' + changeOf(c).txt })),
      yearBars(c),
      h('span', { class: 'sy-caret', 'aria-hidden': 'true', text: '▾' }));
    btn.addEventListener('click', () => { const open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!open)); body.hidden = open; btn.classList.toggle('open', !open); });
    return h('section', { class: 'sy-chap', id: 'sy-' + c.code }, btn, body);
  };
  const c11 = ch.filter(c => c.code.startsWith('11')), c12 = ch.filter(c => c.code.startsWith('12'));
  box.textContent = '';
  box.append(
    h('p', { class: 'sy-eyebrow', text: 'Avanti Fellows · Maths · Class 11 and 12' }),
    h('h2', { class: 'sy-title', text: 'JEE Maths Syllabus Priority' }),
    h('p', { class: 'sy-lede', text: 'All ' + ch.length + ' chapters and ' + D.tot_sub + ' subtopics, with the CMS names and codes, and how often each subtopic has come up in JEE Main and JEE Advanced past-year questions in the question bank.' }),
    h('div', { class: 'sy-method' },
      h('p', { text: 'How priority is set. Each subtopic is tiered by the number of PYQs tagged to it in the bank, counted separately for JEE Main (JEE Main and AIEEE) and JEE Advanced (JEE Advanced and IIT-JEE). This shows what the bank has seen, not the official weightage from NTA or IIT, and the bank may not yet hold every past paper.' }),
      h('div', { class: 'sy-tiers' },
        h('div', { class: 'sy-tier' }, h('h4', { text: 'JEE Main tiers' }), h('ul', {},
          tierItem('High', '20 or more PYQs', cntOf('m', 'High')), tierItem('Medium', '8 to 19', cntOf('m', 'Medium')), tierItem('Low', '1 to 7', cntOf('m', 'Low')), tierItem('None', 'no PYQ yet', cntOf('m', 'None')))),
        h('div', { class: 'sy-tier' }, h('h4', { text: 'JEE Advanced tiers' }), h('ul', {},
          tierItem('High', '10 or more PYQs', cntOf('a', 'High')), tierItem('Medium', '4 to 9', cntOf('a', 'Medium')), tierItem('Low', '1 to 3', cntOf('a', 'Low')), tierItem('None', 'no PYQ yet', cntOf('a', 'None')))))),
    h('h3', { class: 'sy-h sy-idx', text: 'Chapter index' }),
    h('p', { class: 'sy-yhint', text: 'Change compares the PYQs of 2024 to 2026 with 2020 to 2022 for each chapter. ▲ means more questions lately, ▼ means fewer. Where 2020 to 2022 has fewer than 10 PYQs, the change is shown as a count instead of a percentage.' }),
    h('div', { class: 'sy-idx-grid' }, idxTable(c11, 'Class 11 chapter'), idxTable(c12, 'Class 12 chapter')),
    h('p', { class: 'sy-yhint', text: 'Bars show JEE PYQs per year from 2020 to 2026, on one scale for all chapters. Tap a chapter to see its subtopics.' }),
    h('h3', { class: 'sy-band', text: 'Class 11' }), ...c11.map(chapterSection),
    h('h3', { class: 'sy-band', text: 'Class 12' }), ...c12.map(chapterSection));
}

/* ---------- boot ---------- */
/* ---------- light / dark toggle ---------- */
const THEME_KEY = 'avanti-teacher-theme';
function themeNow() { const a = document.documentElement.getAttribute('data-theme'); if (a === 'dark' || a === 'light') return a; try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; } }
function themeApply(m) {
  document.documentElement.setAttribute('data-theme', m);
  const b = document.getElementById('themeBtn');
  if (b) { b.setAttribute('aria-pressed', String(m === 'dark')); const to = m === 'dark' ? 'light' : 'dark'; b.title = 'Switch to ' + to + ' mode'; b.setAttribute('aria-label', 'Switch to ' + to + ' mode'); b.innerHTML = m === 'dark' ? THEME_ICONS.sun : THEME_ICONS.moon; }
}
const THEME_ICONS = {
  sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
};
function themeInit() { let m = null; try { m = localStorage.getItem(THEME_KEY); } catch (e) { m = null; } if (m === 'dark' || m === 'light') document.documentElement.setAttribute('data-theme', m); themeApply(themeNow()); }
function themeToggle() { const m = themeNow() === 'dark' ? 'light' : 'dark'; themeApply(m); try { localStorage.setItem(THEME_KEY, m); } catch (e) { /* optional */ } }
function buildShell() {
  const root = $('#app');
  root.innerHTML = '';
  const tb = (k, text, on) => h('button', { type: 'button', class: 'tb', 'data-act': 'tab', 'data-k': k, 'aria-pressed': String(!!on), text });
  const miscMenu = () => h('div', { class: 'tb-misc' },
    h('button', { type: 'button', class: 'tb tb-miscbtn', id: 'miscBtn', 'data-act': 'misc', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-pressed': 'false' }, 'Misc ', h('span', { class: 'tb-caret', text: '\u25be' })),
    h('div', { class: 'tb-drop', id: 'miscDrop', hidden: true, role: 'menu' }, [['make', 'Tests'], ['res', 'Results'], ['ho', 'Handouts'], ['god', 'God Mode'], ['syl', 'Syllabus Priority']].map(([k, t]) => h('button', { type: 'button', class: 'tb-item', role: 'menuitem', 'data-act': 'tab', 'data-k': k, 'aria-pressed': 'false', text: t }))));
  root.append(
    h('div', { class: 'shell' },
      h('header', { class: 'topbar' },
        h('div', { class: 'tb-head' }, h('h1', { class: 'tb-title', text: 'Avanti Fellows Math Teacher Dashboard' }), h('span', { class: 'tb-sub', text: 'JEE Mathematics \u00b7 Question Bank, DPPs, Tests and Handouts' })),
        h('button', { type: 'button', class: 'tb-theme', id: 'themeBtn', 'data-act': 'theme', 'aria-pressed': 'false' }),
        h('nav', { class: 'tb-menu' }, tb('qb', 'Question Bank', true), tb('lib', 'DPPs'), tb('pyq', 'PYQs'), tb('must', 'Must Solve'), miscMenu())),
      h('main', { class: 'main' },
        h('div', { id: 'viewQb', class: 'qbhost' }),
        h('div', { id: 'viewLib', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewMake', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewPyq', class: 'pyqpick', hidden: true }),
        h('div', { id: 'viewCw', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewSw', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewHo', class: 'hoview', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewMust', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewGod', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewRes', class: 'resview', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewSyl', class: 'sy-wrap', hidden: true }))));
}
function buildLib() {
  return h('div', { id: 'viewLib', class: 'make' },
    h('div', { class: 'rail' },
      h('div', { class: 'card' },
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'What do you need?' }), h('div', { class: 'seg vert', id: 'libKind' },
          h('button', { type: 'button', 'data-act': 'libkind', 'data-k': 'sub', text: 'Subtopic DPPs (Practice Questions)' }),
          h('button', { type: 'button', 'data-act': 'libkind', 'data-k': 'book', text: 'Level 1, 2, 3 booklet' }),
          h('button', { type: 'button', 'data-act': 'libkind', 'data-k': 'pyq', text: 'Download PYQs topic wise' }))),
        h('p', { class: 'hint', id: 'libNote' }),
        h('label', { class: 'pick1 tgl tgl-hl' }, h('input', { type: 'checkbox', role: 'switch', id: 'libKey', 'data-act': 'libkey' }), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Include answer key (on a new page)' })),
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Chapters (tick one or many)' }), msel('libCh', 'chapters')),
        h('div', { class: 'fld', id: 'fldDpp' }, h('span', { class: 'lbl', id: 'lblDpp', text: 'Subtopics' }), msel('libDpp', 'subtopics')),
        h('div', { class: 'fld', id: 'fldLv', hidden: true }, h('span', { class: 'lbl', text: 'Level (tick one or many)' }), h('div', { class: 'seg', id: 'libLv' },
          ['L1', 'L2', 'L3'].map(l => h('button', { type: 'button', 'data-act': 'liblv', 'data-k': l, text: l })))),
        h('div', { class: 'fld', id: 'fldPub', hidden: true }, h('span', { class: 'lbl', text: 'Source (tick one or many)' }), h('div', { class: 'seg', id: 'libPub' }, PUBS.map(x => h('button', { type: 'button', 'data-act': 'libpub', 'data-k': x, text: x })))),
        h('div', { class: 'fld', id: 'fldEx', hidden: true }, h('span', { class: 'lbl', text: 'Exam (leave blank for all)' }), msel('libEx', 'exams')),
        h('div', { class: 'fld', id: 'fldYear', hidden: true }, h('span', { class: 'lbl', text: 'Year (leave blank for all)' }), msel('libYr', 'years')),
        h('div', { class: 'fld', id: 'fldPart', hidden: true }, h('label', { class: 'lbl', for: 'libPart', text: 'Which file' }), h('select', { id: 'libPart', onchange: e => { LS.part = e.target.value; renderLib(); } })),
        oosBox())),
    h('div', { class: 'rail' },
      h('div', { class: 'exp' }, h('span', { class: 'lbl', id: 'libDl', text: 'All selected pages' }),
        h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'docx', title: 'Download Word (editable)', 'aria-label': 'Download Word (editable)', html: FIMG.docx }),
        h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'pdf', title: 'Download PDF', 'aria-label': 'Download PDF', html: FIMG.pdf }),
        h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'pptx', title: 'Download PowerPoint (editable)', 'aria-label': 'Download PowerPoint (editable)', html: FIMG.pptx })),
      h('div', { class: 'exp', id: 'boxAll', hidden: true }, h('span', { class: 'lbl', text: 'Whole chapter, Topic wise' }),
        h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexpall', 'data-k': 'docx', title: 'Download all PYQs of the picked chapters, every topic (Word (editable))', 'aria-label': 'Download all PYQs of the picked chapters, every topic (Word (editable))', html: FIMG.docx }),
        h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexpall', 'data-k': 'pdf', title: 'Download all PYQs of the picked chapters, every topic (PDF)', 'aria-label': 'Download all PYQs of the picked chapters, every topic (PDF)', html: FIMG.pdf }),
        h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexpall', 'data-k': 'pptx', title: 'Download all PYQs of the picked chapters, every topic (PowerPoint (editable))', 'aria-label': 'Download all PYQs of the picked chapters, every topic (PowerPoint (editable))', html: FIMG.pptx })),
      h('div', { class: 'stage' }, h('div', { class: 'statbar' }, h('div', { class: 'msg', id: 'libMsg', 'aria-live': 'polite' }),
        h('div', { class: 'pgbtns', id: 'libPages', hidden: true })),
        h('div', { class: 'pgwrap', id: 'libPrev' }))));
}
function field(label, id, input) { return h('div', { class: 'fld' }, h('label', { class: 'lbl', for: id, text: label }), input); }
function step(n, title, help, ...kids) {
  return h('section', { class: 'step' }, h('div', { class: 'stephead' }, h('span', { class: 'stepn', text: String(n) }), h('div', {}, h('strong', { text: title }), h('p', { class: 'hint', text: help }))), ...kids);
}
/* Whole shift paper: take every question of one past paper, in paper order, as a 3 hour test */
function paperList() {
  const m = new Map();
  (BANK && BANK.all || []).forEach(q => { if (q.s !== 'P' || !q.p || !(/shift/i.test(q.p) || q.e === 'KCET')) return; const g = m.get(q.p) || { p: q.p, e: q.e, ids: [] }; g.ids.push(q.i); m.set(q.p, g); });
  const dt = p => { const d = Date.parse(p.replace(/\s*shift.*$/i, '')); return isNaN(d) ? 0 : d; };
  return [...m.values()].filter(g => g.ids.length >= 5).sort((a, b) => dt(b.p) - dt(a.p) || (/shift\s*(\d)/i.exec(b.p) || [])[1] - (/shift\s*(\d)/i.exec(a.p) || [])[1]);
}
const qnoOf = id => { const m = /P(\d+)$/.exec(id) || /(\d\d)$/.exec(id); return m ? +m[1] : 0; };
function paperUi() {
  const sel = $('#paperSel'); if (!sel) return;
  if (!sel.dataset.ready && BANK) {
    sel.dataset.ready = '1'; sel.textContent = '';
    [['Main', 'JEE Main / AIEEE'], ['Adv', 'JEE Advanced / IIT-JEE'], ['KCET', 'KCET']].forEach(([e, lab]) => {
      const og = h('optgroup', { label: lab }); paperList().filter(g => g.e === e).forEach(g => og.append(h('option', { value: g.p, text: g.p + ' \u00b7 ' + g.ids.length + ' Qs' }))); if (og.children.length) sel.append(og);
    });
  }
  const on = $('#paperOn'); if (on) { on.hidden = !S.paper; on.textContent = S.paper ? 'Using the whole paper: ' + S.paper.label + ' (' + S.picked.length + ' questions). The filters below are ignored until you switch this off.' : ''; }
  const off = $('#paperOff'); if (off) off.hidden = !S.paper;
}
function usePaper(label) {
  const g = paperList().find(x => x.p === label); if (!g) { toast('Pick a paper first'); return; }
  const ids = g.ids.slice().sort((a, b) => qnoOf(a) - qnoOf(b)).filter(i => BYID.has(i));
  if (!ids.length) { toast('No questions found for this paper'); return; }
  S.paper = { label, ids }; S.picked = ids.slice(); S.count = ids.length; S.order = false;
  const kc = g.e === 'KCET'; S.title = (kc ? 'KCET ' : g.e === 'Adv' ? 'JEE Advanced ' : 'JEE Main ') + label; S.mins = kc ? 80 : 180; S.pos = kc ? 1 : 4; S.neg = kc ? 0 : 1;
  [['fTitle', S.title], ['fMins', S.mins], ['fPos', S.pos], ['fNeg', S.neg], ['fCount', S.count]].forEach(([id, v]) => { const el = $('#' + id); if (el) el.value = v; });
  const o = $('#tOrder'); if (o) o.checked = false;
  paperUi(); renderPreview();
  const bad = ids.filter(i => !gradable(BYID.get(i))).length;
  toast(label + ': ' + ids.length + ' questions, ' + S.mins + ' minutes' + (bad ? '. ' + bad + ' cannot be auto-marked, remove them before saving.' : ''));
}
function buildRail() {
  const num = (id, key, min, max, step) => h('input', { type: 'number', id, min, max, step: step || 1, value: S[key], oninput: e => { const v = parseFloat(e.target.value); if (!isNaN(v)) { S[key] = v; if (key === 'mins' || key === 'pos' || key === 'neg') renderPreview(); } } });
  return h('div', { class: 'rail' },
    h('div', { class: 'card' }, h('h3', { text: 'Or use a whole shift paper' }), h('p', { class: 'hint', text: 'Pick a past paper by date and shift. All its questions come in paper order with 180 minutes, +4 and \u22121. Change anything below, then press Save test.' }),
      h('div', { class: 'row' }, h('select', { id: 'paperSel', class: 'rs-sel', 'aria-label': 'Shift paper' }), h('button', { type: 'button', class: 'btn pri', 'data-act': 'paperuse', text: 'Use this paper' })),
      h('p', { class: 'hint papon', id: 'paperOn', hidden: true }), h('button', { type: 'button', class: 'btn sm', id: 'paperOff', 'data-act': 'paperoff', hidden: true, text: 'Switch off, pick questions normally' })),
    h('div', { class: 'card' }, h('h3', { text: 'Pick your questions' }), h('p', { class: 'hint lead', text: 'Work down the steps. The number on each chip shows how many questions it has.' }),
      step(1, 'Where from?', 'Tick one or more. PYQs are real questions from past JEE papers; the others are practice sheets.',
        h('div', { class: 'chips', id: 'chSrc' }),
        h('div', { class: 'fld sub', id: 'fExam' }, h('span', { class: 'lbl', text: 'Which JEE paper? (only for PYQs)' }), h('div', { class: 'chips', id: 'chExam' })),
        h('div', { id: 'mkOos' }, oosBox())),
      step(2, 'Which chapters?', 'Leave topics unticked to use the whole chapter.',
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Class' }), h('div', { class: 'chips', id: 'chCls' })),
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Chapters' }), msel('mkCh', 'chapters')),
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Topics' }), msel('mkTp', 'topics'))),
      step(3, 'How hard?', 'L1 is easy, L2 is medium, L3 is hard. Tick any mix.', h('div', { class: 'chips', id: 'chDiff' })),
      step(4, 'What kind of questions?', 'Nothing ticked means all types. Tests use only types that can be marked automatically.', h('div', { class: 'chips', id: 'chType' })),
      h('p', { class: 'poolnote', id: 'poolNote' })),
    h('div', { class: 'card' },
      field('Title', 'fTitle', h('input', { type: 'text', id: 'fTitle', value: S.title, oninput: e => { S.title = e.target.value; renderPreview(); } })),
      h('div', { class: 'row' },
        field('Date', 'fDate', h('input', { type: 'date', id: 'fDate', value: S.date, oninput: e => { S.date = e.target.value; renderPreview(); } })),
        field('Batch', 'fBatch', h('input', { type: 'text', id: 'fBatch', placeholder: 'e.g. JEE 2027 \u00b7 Batch A', value: S.batch, oninput: e => { S.batch = e.target.value; renderPreview(); } }))),
      h('div', { 'data-testonly': '', class: 'row' },
        field('Time (minutes)', 'fMins', num('fMins', 'mins', 1, 300)), field('Marks per correct', 'fPos', num('fPos', 'pos', 1, 10)), field('Marks lost if wrong', 'fNeg', num('fNeg', 'neg', 0, 10, 0.25))),
      null),
    h('div', { class: 'card' }, h('h3', { text: 'Page' }),
      h('div', { class: 'row' }, field('Number of questions', 'fCount', h('input', { type: 'number', id: 'fCount', min: 1, max: 100, value: S.count, oninput: e => { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= 100) { S.count = v; renderPreview(); } } }))),
      h('div', { class: 'btns' }, h('button', { type: 'button', class: 'btn pri', 'data-act': 'fill', text: 'Fill pages' }), h('button', { type: 'button', class: 'btn', 'data-act': 'shuffle', text: 'Shuffle questions' })),
      h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Paper' }), h('div', { class: 'seg', id: 'sideSeg' }, h('button', { type: 'button', 'data-act': 'sides', 'data-k': '1', text: '1 side' }), h('button', { type: 'button', 'data-act': 'sides', 'data-k': '2', text: '2 sides (front and back)' }))),
      h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Columns' }), h('div', { class: 'seg', id: 'colSeg' }, h('button', { type: 'button', 'data-act': 'cols', 'data-k': '1', text: '1 column' }), h('button', { type: 'button', 'data-act': 'cols', 'data-k': '2', text: '2 columns' }))),
      h('div', { class: 'pick' },
        h('label', {}, h('input', { type: 'checkbox', id: 'tOrder', 'data-act': 'flip', 'data-k': 'order' }), h('span', { text: 'Order easy to hard' })),
        h('label', {}, h('input', { type: 'checkbox', id: 'tTag', 'data-act': 'flip', 'data-k': 'tag' }), h('span', { text: 'Show exam and year after PYQs' }))),
      h('p', { class: 'hint', id: 'poolInfo' })));
}
function buildStage() {
  return h('div', { class: 'rail' },
    h('div', { class: 'exp' }, h('span', { class: 'lbl', text: 'Download' }),
      h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'exp', 'data-k': 'docx', title: 'Download Word (editable)', 'aria-label': 'Download Word (editable)', html: FIMG.docx }),
      h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'exp', 'data-k': 'pdf', title: 'Download PDF', 'aria-label': 'Download PDF', html: FIMG.pdf }),
      h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'exp', 'data-k': 'pptx', title: 'Download PowerPoint (editable)', 'aria-label': 'Download PowerPoint (editable)', html: FIMG.pptx }),
      h('span', { class: 'hint', text: 'PDF is a print-ready copy. Word and PowerPoint are fully editable: text is text, and every formula is a native equation you can click and change.' })),
    h('div', { class: 'testbox' },
      h('h3', { text: 'Save this test' }),
      h('p', { class: 'hint', text: 'Save this test to keep it in your list below. It then appears on the student page by itself.' }),
      h('div', { class: 'btns' }, h('button', { type: 'button', class: 'btn pri', 'data-act': 'mklink', text: 'Save test' }), h('a', { class: 'btn', href: STUDENT_URL, target: '_blank', rel: 'noopener noreferrer', text: 'Open student dashboard \u2197' })),
      h('p', { class: 'hint', id: 'pubMsg', 'aria-live': 'polite' }),
      h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Saved tests' }), h('div', { class: 'mytests', id: 'myTests' })),),
    h('div', { class: 'stage' },
      h('div', { class: 'statbar' }, h('div', { class: 'msg', id: 'statMsg', 'aria-live': 'polite' })),
      h('div', { class: 'pgwrap', id: 'pgwrap' })),
    h('div', { class: 'card' }, h('h3', { text: 'Questions on this sheet' }), h('div', { class: 'qlist', id: 'qList' })));
}

let dppP = null, listeners = false;
function ensureDpp() {
  if (dppP) return dppP;
  return (dppP = (async () => {
    const [bank, css] = await Promise.all([loadBank(), document.getElementById('kcss') ? Promise.resolve(null) : fetch('katex.css').then(r => r.text())]);
    if (css) { const st = h('style', { text: css }); st.id = 'kcss'; document.head.append(st); }
    BANK = bank; BANK.all = bank.qs.slice(); bank.qs.forEach(q => BYID.set(q.i, q)); bank.chapters.forEach(c => CHMAP.set(c.c, c));
    initPubs(); applyOos();
    KATEX_P = loadScript(CDN.katex).then(() => loadScript(CDN.auto)).then(() => { if (LS.shown) showLibPrev(); PDFT.cw.v++; PDFT.sw.v++; ['cw', 'sw'].forEach(t => { if ($('#' + t + 'List') && !$('#view' + (t === 'cw' ? 'Cw' : 'Sw')).hidden) renderPdfTab(t); }); if (makeReady && !$('#viewMake').hidden) renderPreview(); }).catch(() => {});
    const lib = $('#viewLib'), mk = $('#viewMake'); const wasLib = lib.hidden, wasMk = mk.hidden;
    const nl = buildLib(), nm = h('div', { id: 'viewMake', class: 'make', hidden: wasMk }, buildRail(), buildStage());
    nl.hidden = wasLib; lib.replaceWith(nl); mk.replaceWith(nm);
    if (window.ResizeObserver) { const ro = new ResizeObserver(rescale); ro.observe($('#pgwrap')); ro.observe($('#libPrev')); }
    renderLib(); renderMyTests();
  })().catch(e => { dppP = null; const m = $('#viewLib'); if (m) { m.textContent = ''; m.append(h('p', { class: 'hint', text: 'The library did not load. Refresh the page.' })); } throw e; }));
}
function boot() {
  TESTS = (OPTS && OPTS.tests) || [];
  buildShell(); themeInit();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMax(); }); document.addEventListener('click', onAct); document.addEventListener('change', onAct);
  window.addEventListener('resize', rescale);
  try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {}); } catch (e) { /* no runtime */ }
  qbInit();
  try { if (sessionStorage.getItem('avanti_tab') === 'make') { sessionStorage.removeItem('avanti_tab'); setTab('make'); } } catch (e) { /* ignore */ }
  try { if (sessionStorage.getItem('avanti_sync') === '1') syncStudents().then(r => { toast(syncNote(r)); }); } catch (e) { /* ignore */ }
}
/* ---------- Question bank tab: the question bank's own page and code, loaded on first use ---------- */
let qbLoaded = false;
async function qbInit() {
  if (qbLoaded) return; qbLoaded = true;
  const host = $('#viewQb'); host.textContent = ''; host.append(h('div', { class: 'qbload' }, h('div', { class: 'spin' }), h('p', { text: 'Loading the question bank\u2026' })));
  try {
    const pre = window.__qbPre || {};
    const html = await (pre.html || fetch('qb/qb.b486.html').then(r => r.text()));
    const js = await (pre.js || fetch('qb/qb-all.b486.js').then(r => r.text()));
    await Promise.all([document.getElementById('kcss') ? null : fetch('katex.css').then(r => r.text()).then(c => { if (!document.getElementById('kcss')) { const st = h('style', { text: c }); st.id = 'kcss'; document.head.append(st); } }), loadScript(CDN.katex)]).catch(() => {});
    host.innerHTML = '<div id="dash-root">' + html + '</div>';
    const sc = document.createElement('script'); sc.textContent = js; document.head.append(sc);
    await window.__qbStart();
  } catch (e) { qbLoaded = false; host.textContent = 'The question bank did not load. Refresh the page.'; }
}
// Question Bank "Full explanation": use the explanation saved from God Mode, when there is one.
window.__qbSavedSolution = async id => {
  let db = null; try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) return null;
  try {
    const snap = await db.collection('explanations').doc(id).get();
    const d = snap.exists ? snap.data() : null;
    if (!d || !d.spec) return null;
    // Break each step at its top-level "=" and "\Rightarrow", so every line is short enough to fit the box.
    const splitLatexLines = src => {
      const out = []; let depth = 0, cur = '';
      for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c === '{') depth++; else if (c === '}') depth--;
        if (depth === 0 && cur.trim() && (c === '=' || src.startsWith('\\Rightarrow', i))) {
          out.push(cur.trim());
          if (c === '=') cur = '= ';
          else { i += '\\Rightarrow'.length - 1; cur = '\\Rightarrow '; }
          continue;
        }
        cur += c;
      }
      if (cur.trim()) out.push(cur.trim());
      return out;
    };
    const parts = [];
    (d.spec.solution || []).forEach(s => {
      if (s.title) parts.push(s.title);
      splitLatexLines(String(s.latex || '').replace(/^\$\$|\$\$$/g, '')).forEach(seg => parts.push('\\[' + seg + '\\]'));
    });
    const ans = d.answer || d.spec.answer;
    if (ans) parts.push('Answer: ' + ans);
    return parts.join('\n');
  } catch (e) { return null; }
};
window.AvantiTeacher = { start: o => { OPTS = o; boot(); } };
/* ---------- God Mode tab: a question -> interactive graph, sliders and solution (Claude solves inside the page) ---------- */
const SIM = { spec: null, vals: {}, cache: new Map(), file: null, busy: false, mathP: null };
const SIM_COLORS = ['#e8573e', '#2a9d8f', '#7a3fd1', '#d98200', '#0a86c2', '#16a06a'];
const SIM_HELP = [
  'You are helping a JEE maths teacher. Solve the question below and build an interactive graph that helps a student see the idea.',
  'Reply with ONLY one JSON object (no markdown, no code fence) of this shape:',
  '{',
  '  "title": "short title",',
  '  "params": [ {"name": "h", "label": "vertical line x = h", "min": 0.5, "max": 1, "step": 0.01, "value": 0.75} ],',
  '  "view": {"x": [-4, 4], "y": [-3, 3]},',
  '  "curves": [',
  '    {"type": "fn", "fn": "expression in x and the params", "range": [-2, 2], "color": "#e8573e", "label": ""},',
  '    {"type": "param", "xt": "expression in t", "yt": "expression in t", "t": [0, 6.2832], "color": "#2a9d8f", "label": ""},',
  '    {"type": "seg", "from": ["expr", "expr"], "to": ["expr", "expr"], "color": "#7a3fd1", "label": ""}',
  '  ],',
  '  "points": [ {"x": "expr", "y": "expr", "label": "P", "color": "#d98200"} ],',
  '  "polygons": [ {"points": ["P", "Q", "R"], "color": "#e8573e"} ],',
  '  "plots": [ {"title": "graph of a quantity", "var": "h", "fn": "expression in h and the params", "range": [0.5, 1], "xlabel": "h", "ylabel": "", "marker": true} ],',
  '  "readouts": [ {"label": "area", "expr": "expression in the params", "digits": 3} ],',
  '  "solution": [ {"title": "step title", "latex": "LaTeX for the step"} ],',
  '  "answer": "final answer as text"',
  '}',
  'Expressions use math.js syntax: ^ for powers, sqrt(), abs(), sin(), cos(), tan(), log() for natural log, pi, e.',
  'Use only the parameter names and the variables named above. Keep only the parameters a student should change, so the sliders show the idea.',
  'Make the solution short and correct: check the final number before you reply. Use the exact value the question asks for.',
  '',
  'QUESTION:'
].join('\n');
const simEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const simMsg = (t, warn) => { const m = $('#simMsg'); if (m) { m.className = 'msg' + (warn ? ' warn' : ''); m.textContent = t; } };
function simLoadMath() {
  if (SIM.mathP) return SIM.mathP;
  return (SIM.mathP = (window.math ? Promise.resolve() : loadScript(CDN.math)).then(() => { if (!window.math) throw new Error('math library missing'); return true; }).catch(e => { SIM.mathP = null; throw e; }));
}
function simC(expr) {
  const k = String(expr);
  if (!SIM.cache.has(k)) { let c = null; try { c = window.math.compile(k); } catch (e) { c = null; } SIM.cache.set(k, c); }
  return SIM.cache.get(k);
}
function simEv(expr, scope) {
  const c = simC(expr); if (!c) return NaN;
  try { let v = c.evaluate(Object.assign({}, SIM.vals, scope || {})); if (v && typeof v === 'object' && 're' in v) { if (Math.abs(v.im) > 1e-9) return NaN; v = v.re; } return typeof v === 'number' && isFinite(v) ? v : NaN; } catch (e) { return NaN; }
}
function simNice(span) { const raw = span / 6, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
function simAxes(vx, vy, X, Y, W, H, P) {
  let g = ''; const sx = simNice(vx[1] - vx[0]), sy = simNice(vy[1] - vy[0]);
  for (let x = Math.ceil(vx[0] / sx) * sx; x <= vx[1] + 1e-9; x += sx) { g += '<line x1="' + X(x) + '" y1="' + P + '" x2="' + X(x) + '" y2="' + (H - P) + '" stroke="var(--rule)" stroke-width="1"/><text x="' + X(x) + '" y="' + (H - P + 14) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + (+x.toFixed(4)) + '</text>'; }
  for (let y = Math.ceil(vy[0] / sy) * sy; y <= vy[1] + 1e-9; y += sy) { g += '<line x1="' + P + '" y1="' + Y(y) + '" x2="' + (W - P) + '" y2="' + Y(y) + '" stroke="var(--rule)" stroke-width="1"/><text x="' + (P - 6) + '" y="' + (Y(y) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + (+y.toFixed(4)) + '</text>'; }
  if (vy[0] < 0 && vy[1] > 0) g += '<line x1="' + P + '" y1="' + Y(0) + '" x2="' + (W - P) + '" y2="' + Y(0) + '" stroke="var(--ink)" stroke-width="1.5"/>';
  if (vx[0] < 0 && vx[1] > 0) g += '<line x1="' + X(0) + '" y1="' + P + '" x2="' + X(0) + '" y2="' + (H - P) + '" stroke="var(--ink)" stroke-width="1.5"/>';
  return g;
}
function simPath(pts, X, Y) {
  let d = '', open = false;
  pts.forEach(p => { if (!p || !isFinite(p[0]) || !isFinite(p[1]) || Math.abs(p[1]) > 1e6 || Math.abs(p[0]) > 1e6) { open = false; return; } d += (open ? ' L ' : ' M ') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); open = true; });
  return d;
}
function simDraw() {
  const S = SIM.spec, host = $('#simGraph'); if (!S || !host || !window.math) return;
  const vx = (S.view && S.view.x) || [-3, 3], vy = (S.view && S.view.y) || [-3, 3];
  const W = 640, H = 460, P = 40;
  const X = x => P + (x - vx[0]) / (vx[1] - vx[0]) * (W - 2 * P), Y = y => H - P - (y - vy[0]) / (vy[1] - vy[0]) * (H - 2 * P);
  let g = simAxes(vx, vy, X, Y, W, H, P);
  (S.curves || []).forEach((cv, i) => {
    const col = cv.color || SIM_COLORS[i % SIM_COLORS.length]; let pts = [];
    if (cv.type === 'fn') { const r = cv.range || vx, N = 500; for (let k = 0; k <= N; k++) { const x = r[0] + (r[1] - r[0]) * k / N; pts.push([x, simEv(cv.fn, { x })]); } }
    else if (cv.type === 'param') { const r = cv.t || [0, 1], N = 500; for (let k = 0; k <= N; k++) { const t = r[0] + (r[1] - r[0]) * k / N; pts.push([simEv(cv.xt, { t }), simEv(cv.yt, { t })]); } }
    else if (cv.type === 'seg') { pts = [[simEv(cv.from[0]), simEv(cv.from[1])], [simEv(cv.to[0]), simEv(cv.to[1])]]; }
    const d = simPath(pts, X, Y); if (d) g += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round"/>';
  });
  const pts = {};
  (S.points || []).forEach(p => { const x = simEv(p.x), y = simEv(p.y); if (p.label) pts[p.label] = [x, y]; });
  (S.polygons || []).forEach((pg, i) => { const q = (pg.points || []).map(l => pts[l]).filter(v => v && isFinite(v[0]) && isFinite(v[1])); if (q.length >= 3) { const col = pg.color || SIM_COLORS[i % SIM_COLORS.length]; g += '<polygon points="' + q.map(v => X(v[0]).toFixed(1) + ',' + Y(v[1]).toFixed(1)).join(' ') + '" fill="' + col + '" fill-opacity="0.16" stroke="' + col + '" stroke-width="1.6"/>'; } });
  (S.points || []).forEach((p, i) => { const v = p.label ? pts[p.label] : [simEv(p.x), simEv(p.y)]; if (!v || !isFinite(v[0]) || !isFinite(v[1])) return; const col = p.color || '#1b1b2f'; g += '<circle cx="' + X(v[0]).toFixed(1) + '" cy="' + Y(v[1]).toFixed(1) + '" r="4.2" fill="' + col + '" stroke="#fff" stroke-width="1"/>' + (p.label ? '<text x="' + (X(v[0]) + 7).toFixed(1) + '" y="' + (Y(v[1]) - 7).toFixed(1) + '" font-size="14" font-weight="700" fill="' + col + '">' + simEsc(p.label) + '</text>' : ''); });
  host.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + simEsc(S.title || 'Graph') + '">' + g + '</svg>';
  const pl = $('#simPlots'); pl.textContent = '';
  (S.plots || []).forEach(p => {
    const r = p.range || [0, 1], N = 200, vals = [];
    for (let k = 0; k <= N; k++) { const x = r[0] + (r[1] - r[0]) * k / N; vals.push([x, simEv(p.fn, { [p.var || 'x']: x })]); }
    const fin = vals.map(v => v[1]).filter(isFinite); if (!fin.length) return;
    const y0 = Math.min.apply(null, fin), y1 = Math.max.apply(null, fin), pad = (y1 - y0) * 0.08 || 1, ya = [y0 - pad, y1 + pad];
    const pw = 360, ph = 230, m = 36;
    const PX = x => m + (x - r[0]) / (r[1] - r[0]) * (pw - m - 10), PY = y => ph - m + 10 - (y - ya[0]) / (ya[1] - ya[0]) * (ph - m - 10);
    let s = simAxes(r, ya, PX, PY, pw, ph, m).replace(/font-size="11"/g, 'font-size="10"');
    s += '<path d="' + simPath(vals, PX, PY) + '" fill="none" stroke="#7a3fd1" stroke-width="2.2"/>';
    const cur = p.var && SIM.vals[p.var] !== undefined ? SIM.vals[p.var] : null, cy = cur !== null ? simEv(p.fn, { [p.var || 'x']: cur }) : NaN;
    if (p.marker && cur !== null && isFinite(cy)) s += '<line x1="' + PX(cur) + '" y1="' + PY(ya[0]) + '" x2="' + PX(cur) + '" y2="' + PY(ya[1]) + '" stroke="#e8573e" stroke-dasharray="4 3"/><circle cx="' + PX(cur) + '" cy="' + PY(cy) + '" r="4.5" fill="#e8573e"/>';
    const box = h('div', { class: 'simplot' }, h('div', { class: 'simptitle', text: p.title || '' }), h('div', { html: '<svg viewBox="0 0 ' + pw + ' ' + ph + '" width="100%">' + s + (p.xlabel ? '<text x="' + (pw / 2) + '" y="' + (ph - 4) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + simEsc(p.xlabel) + '</text>' : '') + '</svg>' }));
    pl.append(box);
  });
  const ro = $('#simRead'); ro.textContent = '';
  (S.readouts || []).forEach(r => { const v = simEv(r.expr); ro.append(h('div', { class: 'simread' }, h('span', { text: r.label || '' }), h('b', { text: isFinite(v) ? (+v.toFixed(r.digits == null ? 4 : r.digits)).toString() : '—' }))); });
}
function simBuildControls(S) {
  const pr = $('#simParams'); pr.textContent = '';
  (S.params || []).forEach(p => {
    const out = h('span', { class: 'simval', text: String(p.value) });
    const inp = h('input', { type: 'range', min: String(p.min), max: String(p.max), step: String(p.step || 0.01), value: String(p.value) });
    inp.addEventListener('input', () => { SIM.vals[p.name] = +inp.value; out.textContent = inp.value; simDraw(); });
    pr.append(h('div', { class: 'simparam' }, h('label', { text: p.label || p.name }), inp, out));
  });
  const sol = $('#simSol'); sol.textContent = '';
  (S.solution || []).forEach(st => {
    let tex = String(st.latex || ''); if (!/\\\(|\$\$|\\\[/.test(tex)) tex = '\\(' + tex + '\\)';
    const body = h('div', { class: 'simtex', text: tex });
    sol.append(h('div', { class: 'simstep' }, st.title ? h('h4', { text: st.title }) : null, body));
  });
  (window.katex ? Promise.resolve() : loadScript(CDN.katex)).catch(() => {}).then(() => {
    if (!window.katex) return;
    sol.querySelectorAll('.simtex').forEach(el => {
      const s = el.textContent.trim().replace(/^\$\$|\$\$$|^\\\[|\\\]$|^\\\(|\\\)$/g, '').trim();
      try { window.katex.render(s, el, { throwOnError: false, displayMode: false }); } catch (e) { /* keep the raw text */ }
    });
  });
  $('#simAns').textContent = S.answer ? 'Answer: ' + S.answer : '';
  $('#simTitle').textContent = S.title || 'God Mode';
}
async function simLoad(spec) {
  if (!spec || typeof spec !== 'object' || (!Array.isArray(spec.curves) && !Array.isArray(spec.plots) && !Array.isArray(spec.points))) throw new Error('The answer had no graph spec. Try again, or paste a spec below.');
  await simLoadMath();
  SIM.spec = spec; SIM.cache = new Map(); SIM.vals = {};
  (spec.params || []).forEach(p => { SIM.vals[p.name] = +p.value || 0; });
  simBuildControls(spec); simDraw();
}
function simErr(e) {
  const c = e && e.code;
  if (c === 'not_granted') return 'Claude is not allowed in this view. Paste a spec below to draw it.';
  if (c === 'rate_limited') return 'Too many requests. Wait a minute and try again.';
  if (c === 'images_unavailable') return 'This view cannot send images. Type the question instead.';
  return 'Could not solve it: ' + ((e && e.message) || 'try again') + '.';
}
function simParse(raw) {
  let s = String(raw == null ? '' : raw).trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}
async function simAsk(sample, text, opts) {
  const prompt = SIM_HELP + '\n' + (text || '(see the attached image)');
  const o = Object.assign({ modelTier: 'complex' }, opts);
  let r = await sample(prompt, o);
  let spec = simParse(r && r.text);
  if (!spec) {
    r = await sample(prompt + '\n\nYour last reply was not a valid JSON object. Reply with ONLY the JSON object, starting with { and ending with }, with no other words.', o);
    spec = simParse(r && r.text);
  }
  if (!spec) throw { message: 'Claude did not return a graph this time. Press Solve again, or try a shorter question' };
  return spec;
}
async function simSolve() {
  if (SIM.busy) return;
  const text = $('#simText').value.trim(), file = SIM.file;
  if (!text && !file) { simMsg('Pick a bank question, type it, or upload its image first.', true); return; }
  let sample = null; try { sample = await window.claude.use('sample'); } catch (e) { sample = null; }
  if (!sample) { simMsg('Claude is not available in this view. Paste a spec below to draw it.', true); return; }
  SIM.busy = true; simMsg('Thinking… this can take up to a minute.');
  try {
    const opts = {};
    if (file) { let ok = false; try { ok = !!(await sample.limits()).images; } catch (e) { ok = false; } if (!ok) throw { code: 'images_unavailable' }; opts.images = [file]; }
    const spec = await simAsk(sample, text, opts);
    await simLoad(spec);
    simMsg('Done. Move the sliders to explore.');
  } catch (e) { simMsg(simErr(e), true); }
  finally { SIM.busy = false; }
}
function simSearch() {
  const q = ($('#simQ').value || '').trim().toLowerCase(), list = $('#simList'); list.textContent = '';
  if (!BANK || !BANK.qs) { ensureDpp().then(() => { if (BANK && BANK.qs) simSearch(); }).catch(() => {}); return; }
  const words =q.split(/\s+/).filter(Boolean);
  BANK.qs.filter(x => (x.s === 'P' || x.s === 'N') && (!words.length || (() => { const hay = (x.i + ' ' + (x.tp || '') + ' ' + x.q).toLowerCase(); return words.every(w => hay.includes(w)); })())).slice(0, 25).forEach(x => {
    list.append(h('button', { type: 'button', class: 'simpick', title: x.i, onclick: () => simPick(x) }, h('b', { text: x.i }), h('span', { text: ' ' + String(x.q).replace(/\\\(|\\\)|\\\[|\\\]/g, '').slice(0, 90) })));
  });
}
function simHash(s) { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }
async function simSave() {
  if (!SIM.spec) { simMsg('Solve or draw a question first.', true); return; }
  const text = $('#simText').value.trim();
  const id = SIM.qid || 'typed-' + simHash(text || JSON.stringify(SIM.spec));
  let db = null; try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) { simMsg('Saving is not available in this view.', true); return; }
  try {
    await db.collection('explanations').doc(id).set({ question: text, spec: SIM.spec, answer: SIM.spec.answer || '', savedAt: new Date().toISOString() });
    simMsg('Saved as the explanation for ' + id + '.');
  } catch (e) { simMsg('Could not save: ' + ((e && e.message) || 'try again') + '.', true); }
}
async function simLoadSaved(id) {
  let db = null; try { db = await window.claude.use('db'); } catch (e) { db = null; }
  if (!db) return false;
  try {
    const snap = await db.collection('explanations').doc(id).get();
    const d = snap.exists ? snap.data() : null;
    if (d && d.spec) { await simLoad(d.spec); simMsg('Loaded the saved explanation for ' + id + '.'); return true; }
  } catch (e) { /* nothing saved for this question */ }
  return false;
}
function simPick(x) {
  $('#simText').value = x.q + ((x.o && x.o.length) ? '\n' + x.o.map((o, i) => '(' + 'ABCD'[i] + ') ' + o).join('\n') : '');
  SIM.file = null; SIM.qid = x.i; const f = $('#simImg'); if (f) f.value = ''; const pv = $('#simPrev'); if (pv) { pv.hidden = true; pv.removeAttribute('src'); }
  simMsg('Question loaded: ' + x.i + '. Press Solve and draw.');
  simLoadSaved(x.i);
}
function renderGod() {
  const view = $('#viewGod'); if (!view || view.dataset.ready) return;
  view.dataset.ready = '1';
  const src = h('div', { class: 'card' }, h('h3', { text: 'Question' }),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Find a bank question' }), h('input', { id: 'simQ', type: 'search', placeholder: 'Type words or a question id', oninput: simSearch })),
    h('div', { class: 'simlist', id: 'simList' }),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Question text' }), h('textarea', { id: 'simText', rows: '7', placeholder: 'Type or paste the question. Use \\( \\) for maths.' })),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Or upload its image' }), h('input', { id: 'simImg', type: 'file', accept: 'image/*', onchange: e => { const f = e.target.files && e.target.files[0]; SIM.file = f || null; const pv = $('#simPrev'); if (f) { pv.src = URL.createObjectURL(f); pv.hidden = false; } else { pv.hidden = true; } } }), h('img', { id: 'simPrev', hidden: true, alt: 'Uploaded question', class: 'simprev' })),
    h('div', { class: 'btns' }, h('button', { type: 'button', class: 'btn pri', onclick: simSolve, text: 'Solve and draw' }), h('button', { type: 'button', class: 'btn', onclick: simSave, text: 'Save this answer as explanation' })),
    h('p', { class: 'msg', id: 'simMsg', 'aria-live': 'polite' }),
    h('details', { class: 'simspec' }, h('summary', { text: 'Paste a spec (JSON) instead' }),
      h('textarea', { id: 'simSpec', rows: '8', placeholder: '{ "title": "...", "params": [...], "curves": [...] }' }),
      h('div', { class: 'btns' }, h('button', { type: 'button', class: 'btn', text: 'Draw from spec', onclick: async () => { try { await simLoad(JSON.parse($('#simSpec').value)); simMsg('Drawn from the spec.'); } catch (e) { simMsg('That spec did not load: ' + (e.message || 'check the JSON.'), true); } } }))));
  const stage = h('div', { class: 'stage' },
    h('div', { class: 'statbar' }, h('h3', { id: 'simTitle', text: 'God Mode' })),
    h('div', { class: 'simgraph', id: 'simGraph' }, h('p', { class: 'hint', text: 'Solve a question or paste a spec to see the graph here.' })),
    h('div', { class: 'simparams', id: 'simParams' }),
    h('div', { class: 'simread-box', id: 'simRead' }),
    h('div', { class: 'simplots', id: 'simPlots' }),
    h('div', { class: 'simans', id: 'simAns' }),
    h('div', { class: 'simsol', id: 'simSol' }));
  view.textContent = ''; view.append(h('div', { class: 'rail' }, src), stage);
  simSearch();
}

/* ---------- Results tab: students' answers, from the Google Form's response sheet ---------- */
const RES = { sheet: '18NqW5aYWm-SBTeF3GSpBo_Y9xl1u2YxPteLAqwPI4To', tab: 'Form Responses 1', data: null, at: 0, sel: '', sort: 'pct', dir: -1, open: '' };
function testKeyOf(code) { let x = 5381; const c = String(code).replace(/^#/, ''); for (let i = 0; i < c.length; i++) x = ((x << 5) + x + c.charCodeAt(i)) >>> 0; return 'k' + x.toString(36); }
const resMean = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const resPct = v => v == null ? '—' : Math.round(v * 100) + '%';
const resTime = s => s == null ? '—' : Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
function resParse(vals) {
  const out = {};
  (vals || []).slice(1).forEach(r => {
    const afid = String(r[1] || '').replace(/\s+/g, ''), key = String(r[2] || '').trim(); if (!/^\d{6,12}$/.test(afid) || !key) return;
    const g = out[key] || (out[key] = { key, name: String(r[3] || ''), rows: new Map() }); if (g.rows.has(afid)) return;
    const m = /(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(String(r[4] || ''));
    const segs = String(r[5] || '').split(';').filter(Boolean), wseg = segs.find(x => x.slice(0, 2) === 'W:'), wp = wseg ? wseg.split(':') : null, qs = segs.filter(x => x.slice(0, 2) !== 'W:').map(x => { const p = x.split(':'); return { n: +p[0], a: p[1] || '', st: p[2] || 's', t: +p[3] || 0 }; });
    const ok = qs.filter(q => q.st === 'o').length, no = qs.filter(q => q.st === 'x').length, sk = qs.filter(q => q.st === 's').length, att = ok + no, n = qs.length, secs = qs.reduce((s, q) => s + q.t, 0);
    g.rows.set(afid, { sw: wp ? +wp[1] || 0 : null, away: wp ? +wp[2] || 0 : null, ps: wp ? +wp[3] || 0 : 0, afid, ts: String(r[0] || ''), score: m ? +m[1] : null, max: m ? +m[2] : null, pct: m && +m[2] ? +m[1] / +m[2] : null, qs, ok, no, sk, att, n, rate: n ? att / n : null, acc: att ? ok / att : null, secs, avg: n ? secs / n : null });
  });
  return out;
}
function resTests() { const o = {}; TESTS.forEach(t => { o[testKeyOf(t.code)] = { title: t.title, off: !!t.off, ids: String(t.code).split('~').slice(2) }; }); return o; }
async function resFetch() {
  const mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null;
  if (!mcp) throw { code: 'off' };
  const r = await mcp.callTool('Google Sheets', 'get_values', { spreadsheetId: RES.sheet, range: "'" + RES.tab + "'!A:F" }, { cache: false });
  let p = r && (r.structuredContent || r.payload); if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
  return (p && p.values) || [];
}
function resMsg(t, bad) { const m = $('#resMsg'); if (m) { m.textContent = t; m.className = 'hint' + (bad ? ' warnt' : ''); } }
async function resLoad() {
  resMsg('Reading the result sheet…');
  try {
    await ensureDpp().catch(() => {});
    RES.data = resParse(await resFetch()); RES.at = Date.now();
    const names = resTests(), keys = Object.keys(RES.data).filter(k => RES.showOld ? !(names[k] && names[k].off) : (names[k] && !names[k].off)), sel = $('#resTest'); sel.textContent = '';
    keys.sort((a, b) => RES.data[b].rows.size - RES.data[a].rows.size).forEach(k => sel.append(h('option', { value: k, text: ((names[k] && names[k].title) || RES.data[k].name || k) + ' · ' + RES.data[k].rows.size + (RES.data[k].rows.size === 1 ? ' student' : ' students') })));
    if (!keys.includes(RES.sel)) RES.sel = keys[0] || ''; sel.value = RES.sel;
    resMsg('Updated ' + new Date(RES.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + '. Only students who pressed Submit in the form appear here.'); resDraw();
  } catch (e) {
    const c = e && e.code;
    resMsg(c === 'not_in_manifest' || c === 'consent_required' || c === 'approval_required' ? 'Allow this dashboard to read your Google Sheet when asked, then press Refresh.' : c === 'server_not_connected' || c === 'needs_reauth' ? 'Connect or reconnect Google Sheets in your Claude connector settings, then press Refresh.' : c === 'off' ? 'This view cannot reach Google Sheets. Open the dashboard from your own account.' : 'Could not read the sheet (' + (c || 'error') + '). Press Refresh to try again.', true);
  }
}
async function resSync() { resMsg('Starting the block list update…'); const r = await syncStudents(BLOCK_TRIGGER); resMsg(r === 'ok' ? 'Update started. The block list on the student page refreshes in a few minutes.' : 'Could not start the update (' + r + ').', r !== 'ok'); }
function resDraw() {
  const body = $('#resBody'); if (!body) return; body.textContent = '';
  const g = RES.data && RES.data[RES.sel];
  if (!g) { body.append(h('div', { class: 'card' }, h('p', { class: 'hint', text: 'No results yet. A student appears here after pressing Submit in the Google Form that opens when they finish a test.' }))); return; }
  const rows = [...g.rows.values()], T = resTests()[RES.sel], q0 = rows[0] ? rows[0].n : 0;
  const tiles = h('div', { class: 'rs-tiles' }, [['Students', rows.length], ['Average score', resPct(resMean(rows.map(r => r.pct)))], ['Attempt rate', resPct(resMean(rows.map(r => r.rate)))], ['Accuracy', resPct(resMean(rows.map(r => r.acc)))], ['Average time', resTime(resMean(rows.map(r => r.secs)))], ['Seconds per question', resMean(rows.map(r => r.avg)) == null ? '—' : Math.round(resMean(rows.map(r => r.avg)))]]
    .map(x => h('div', { class: 'rs-tile' }, h('b', { text: String(x[1]) }), h('span', { text: x[0] }))));
  const cols = [['afid', 'Avanti ID', r => r.afid], ['score', 'Score', r => r.score == null ? '—' : r.score + ' / ' + r.max], ['pct', '%', r => resPct(r.pct)], ['att', 'Attempted', r => r.att + ' / ' + r.n], ['rate', 'Attempt rate', r => resPct(r.rate)], ['acc', 'Accuracy', r => resPct(r.acc)], ['ok', 'Correct', r => r.ok], ['no', 'Wrong', r => r.no], ['sk', 'Skipped', r => r.sk], ['secs', 'Time', r => resTime(r.secs)], ['avg', 'Sec / Q', r => r.avg == null ? '—' : Math.round(r.avg)], ['sw', 'Left the test page', r => r.sw == null ? '—' : (r.sw === 0 ? 'Never' : r.sw + (r.sw === 1 ? ' time' : ' times') + ', ' + resTime(r.away)) + (r.ps ? ' · screenshot key ' + r.ps + 'x' : '')]];
  const srt = RES.sort, dir = RES.dir, val = r => srt === 'afid' ? r.afid : (r[srt] == null ? -1 : r[srt]);
  rows.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
  const tb = h('tbody', null);
  rows.forEach(r => {
    tb.append(h('tr', { class: 'rs-row', 'data-open': RES.open === r.afid ? '1' : '', onclick: () => { RES.open = RES.open === r.afid ? '' : r.afid; resDraw(); } }, cols.map(c => h('td', { text: String(c[2](r)) }))));
    if (RES.open === r.afid) tb.append(h('tr', { class: 'rs-det' }, h('td', { colspan: String(cols.length) }, h('div', { class: 'rs-chips' }, r.qs.map(q => h('span', { class: 'rs-chip ' + q.st, title: 'Q' + q.n + ' answer ' + (q.a || 'none') + ', ' + q.t + ' s', text: 'Q' + q.n + ' · ' + (q.a ? q.a.replace(/\+/g, ',') : '–') + ' · ' + q.t + 's' }))))));
  });
  const stud = h('div', { class: 'card' }, h('h3', { text: 'By student' }), h('p', { class: 'hint', text: 'Click a heading to sort. Click a student to see every question with their answer and time.' }),
    h('div', { class: 'rs-tw' }, h('table', { class: 'rs-t' }, h('thead', null, h('tr', null, cols.map(c => h('th', { 'aria-sort': srt === c[0] ? (dir < 0 ? 'descending' : 'ascending') : 'none' }, h('button', { type: 'button', class: 'rs-sb', text: c[1] + (srt === c[0] ? (dir < 0 ? ' ▼' : ' ▲') : ''), onclick: () => { if (RES.sort === c[0]) RES.dir = -RES.dir; else { RES.sort = c[0]; RES.dir = c[0] === 'afid' ? 1 : -1; } resDraw(); } }))))), tb)));
  const qa = [];
  for (let i = 1; i <= q0; i++) {
    const cells = rows.map(r => r.qs.find(q => q.n === i)).filter(Boolean), att = cells.filter(c => c.st !== 's'), ok = cells.filter(c => c.st === 'o'), wr = {};
    cells.filter(c => c.st === 'x' && c.a).forEach(c => { wr[c.a] = (wr[c.a] || 0) + 1; });
    const top = Object.entries(wr).sort((a, b) => b[1] - a[1])[0], id = T && T.ids[i - 1], bq = id && BYID.get(id);
    qa.push({ i, id, txt: bq ? String(bq.q).replace(/\s+/g, ' ').slice(0, 90) : (id || ''), ans: bq ? bq.a : '', att: cells.length ? att.length / cells.length : null, acc: att.length ? ok.length / att.length : null, cor: cells.length ? ok.length / cells.length : null, time: resMean(cells.map(c => c.t)), wrong: top ? top[0].replace(/\+/g, ',') + ' (' + top[1] + ')' : '—' });
  }
  const bar = v => h('div', { class: 'rs-bar2' }, h('i', { style: 'width:' + Math.round((v || 0) * 100) + '%' }));
  const qcard = h('div', { class: 'card' }, h('h3', { text: 'By question' }), h('p', { class: 'hint', text: 'Which questions the class found hard, which they skipped, and where they spent the most time.' }),
    h('div', { class: 'rs-tw' }, h('table', { class: 'rs-t' }, h('thead', null, h('tr', null, ['Q', 'Answer', 'Attempted', 'Accuracy', 'Correct overall', 'Avg time', 'Common wrong'].map(x => h('th', { text: x })))),
      h('tbody', null, qa.map(x => h('tr', null, h('td', { text: 'Q' + x.i, title: x.id || '' }), h('td', { text: x.ans }), h('td', { text: resPct(x.att) }), h('td', null, resPct(x.acc), bar(x.acc)), h('td', null, resPct(x.cor), bar(x.cor)), h('td', { text: x.time == null ? '—' : Math.round(x.time) + ' s' }), h('td', { text: x.wrong })))))));
  body.append(tiles, stud, qcard);
}
function renderResults() {
  const view = $('#viewRes'); if (!view) return;
  if (!view.dataset.ready) {
    view.dataset.ready = '1'; view.textContent = '';
    view.append(h('div', { class: 'rs' }, h('div', { class: 'card' }, h('h3', { text: 'Student results' }), h('p', { class: 'hint', text: 'Read live from the Google Sheet that collects the test result form.' }),
      h('div', { class: 'rs-bar' }, h('select', { id: 'resTest', class: 'rs-sel', 'aria-label': 'Test', onchange: e => { RES.sel = e.target.value; RES.open = ''; resDraw(); } }), h('button', { type: 'button', class: 'btn pri', text: 'Refresh', onclick: resLoad }), h('button', { type: 'button', class: 'btn', text: 'Update student page block list', onclick: resSync }), h('label', { class: 'rs-old' }, h('input', { type: 'checkbox', onchange: e => { RES.showOld = e.target.checked; RES.open = ''; if (RES.data) resLoad(); } }), h('span', { text: ' Show removed tests' }))),
      h('p', { class: 'hint', id: 'resMsg', 'aria-live': 'polite' })), h('div', { id: 'resBody' })));
    resLoad();
  }
}

})();
