/* Avanti Fellows \u00b7 Mathematics Dashboard: Question Bank, DPPs, PYQs, Must Solve and Handouts. One file, no build step. Tests and results live in portal.js. */
(function () {
'use strict';
let OPTS = null;
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

/* Out-of-syllabus questions (bank field oo): include or exclude them from the DPP library */
const OOS = { ex: false };
try { OOS.ex = localStorage.getItem('oosEx2') === '1'; } catch (e) {}
function oosBox() {
  const n = BANK && BANK.all ? BANK.all.filter(q => q.oo).length : 0;
  return h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Out-of-syllabus questions' }),
    h('div', { class: 'seg oosSeg' }, h('button', { type: 'button', 'data-act': 'oos', 'data-k': 'in', text: 'Include' }), h('button', { type: 'button', 'data-act': 'oos', 'data-k': 'ex', text: 'Exclude' })),
    h('p', { class: 'hint', text: n + ' PYQs are marked out of syllabus (topics removed from the current JEE syllabus). Exclude keeps them out of every test and DPP.' }));
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
let BANK = null, BYID = new Map(), CHMAP = new Map(), downloads = { save: o => new Promise(res => { const blob = o.data instanceof Blob ? o.data : new Blob([o.data]); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.filename || 'download'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); res(true); }, 1500); }) }; /* plain browser download until (and unless) the Claude runtime offers its own */

/* ---------- permissions ----------
   The plan (Free, Premium, Staff) and role come from the user's Supabase profile, read by auth.js.
   Free: view only. Premium: PDF download, print and PDF sharing. Staff: everything, including Word / PowerPoint and Attention flags.
   Every download, print, share and copy path below checks G() / need() as well as hiding its button. */
const PERM = () => (window.AvantiAuth && window.AvantiAuth.perm) || {};
function G(what) { return PERM()[what] === true; }
function need(what) {
  if (G(what)) return true;
  toast(['docx', 'pptx'].includes(what) && G('pdf') ? 'Your plan includes PDF downloads only.' : 'This needs a Premium membership. Open the profile menu and choose Purchase membership.');
  return false;
}
const extPerm = f => { const e = String(f || '').split('.').pop().toLowerCase(); return e === 'pdf' ? 'pdf' : e === 'pptx' ? 'pptx' : 'docx'; };
function gatedDownloads(d) { return { save: o => need(extPerm(o && o.filename)) ? d.save(o) : Promise.reject(Object.assign(new Error('Not allowed on your plan'), { code: 'declined' })) }; }
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
/* a question is in the pool when its source is ticked; the exam choice only matters for PYQs */

/* ---------- sheet building ---------- */
function colWidth(cols) { return Math.floor((SHEET_W - 2 * PAD_X - (cols - 1) * COL_GAP) / cols); }
/* PYQ section label (chapterwise + question paper, preview and exports): JEE Main = date + shift, JEE ADV = paper + year, NDA = I or II + year, KCET / IAT / AIEEE / IIT = year */
function pyqLabel(q) {
  const y = q.y ? String(q.y) : '', p = String(q.p || '');
  if (q.e === 'Main') { if (exOf(q) !== 'JEE Main') return 'AIEEE' + (y ? ' ' + y : ''); const m = /(\d{1,2} [A-Za-z]{3} \d{4})(.*)$/.exec(p); return m ? ('JEE Main ' + m[1] + (m[2] || '').replace(/\s+/g, ' ').trimEnd()) : 'JEE Main' + (y ? ' ' + y : ''); }
  if (q.e === 'Adv') { const m = /Paper\s*(\d)/i.exec(p); return (exOf(q) === 'IIT' ? 'IIT-JEE' : 'JEE ADV') + (m ? ' P' + m[1] : '') + (y ? ' ' + y : ''); }
  if (q.e === 'NDA') { const m = /\((NDA[^)]*)\)/.exec(p); return (m ? m[1] : 'NDA') + (y ? ' ' + y : ''); }
  return q.e + (y ? ' ' + y : '');
}
function tagText(q) { const lv = q.lvTag ? 'L' + practiceLevel(q) : ''; const ex = q.s === 'P' ? pyqLabel(q) : ''; return lv || ex ? '[' + [lv, ex].filter(Boolean).join(' \u00b7 ') + ']' : ''; }
/* "match the lists" questions: split into intro + two lists so they can be drawn as a table */
function matchParts(text) {
  const ls = String(text).split('\n'), HA = /^\s*(List|Column)[\s\-]*(I|1)\s*(\([^)]*\))?\s*:\s*(.*)$/i, HB = /^\s*(List|Column)[\s\-]*(II|2)\s*(\([^)]*\))?\s*:\s*(.*)$/i;
  let a = -1, b = -1, ma = null, mb = null;
  for (let k = 0; k < ls.length; k++) { if (a < 0) { ma = HA.exec(ls[k]); if (ma) a = k; } else if (b < 0) { mb = HB.exec(ls[k]); if (mb) b = k; } }
  if (a < 0 || b < 0) return null;
  const grp = r => { if (!r.length || !/^\(?([A-Za-z]|\d+|i{1,3}|iv|vi{0,3})[).]/.test(r[0]) && !/^\(([A-Za-z]|\d+|i{1,3}|iv|vi{0,3})\)/.test(r[0])) return r; const o = []; r.forEach(x => { if (/^\(([A-Za-z]|\d{1,2}|i{1,3}|iv|vi{0,3})\)/.test(x) || !o.length) o.push(x); else o[o.length - 1] += ' ' + x; }); return o; };
  const items = (inline, lines) => { const r = []; if (inline && inline.trim()) inline.split(/\s;\s+(?=\()/).forEach(x => { if (x.trim()) r.push(x.trim()); }); lines.forEach(l => { if (l.trim()) r.push(l.trim()); }); return grp(r); };
  const left = items(ma[4], ls.slice(a + 1, b)), right = items(mb[4], ls.slice(b + 1));
  if (!left.length || !right.length) return null;
  const lab = m => (m[1] + (/^list$/i.test(m[1]) ? '-' : ' ') + m[2]) + (m[3] ? ' ' + m[3] : '');
  return { pre: ls.slice(0, a).join('\n').trim(), head: [lab(ma), lab(mb)], left, right };
}
function matchTable(m) {
  const n = Math.max(m.left.length, m.right.length), rows = [];
  for (let i = 0; i < n; i++) rows.push(h('tr', {}, h('td', { text: m.left[i] || '' }), h('td', { text: m.right[i] || '' })));
  return h('table', { class: 'mtab' }, h('thead', {}, h('tr', {}, h('th', { text: m.head[0] }), h('th', { text: m.head[1] }))), h('tbody', {}, rows));
}
/* tall formulas (matrices, cases, chains of fractions) sitting inside a line of text overlap their neighbours in the PDF picture: give them a line of their own */
const spaceCases = t => String(t).replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (m, b) => { const tl = /\\(d|t)?frac|\\sqrt|\\sum|\\int|\\prod|\\lim|\\binom/.test(b); return '\\begin{cases}' + b.replace(/\\\\(?!\[)(?=[\s\S]*\S)/g, '\\\\[' + (tl ? '1.3em' : '0.55em') + ']') + '\\end{cases}'; });
const boldHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
function tallToDisplay(s) {
  return spaceCases(s).replace(/\\\(([\s\S]+?)\\\)/g, (m, x0) => { const x = x0.replace(/\\begin\{([bp])matrix\}([\s\S]*?)\\end\{\1matrix\}/g, (mm, k, body) => { const r = body.split('\\\\').length, big = r >= 3 ? '\\Bigg' : r === 2 ? '\\Big' : ''; return big ? big + 'l' + (k === 'b' ? '[' : '(') + '\\begin{matrix}' + body + '\\end{matrix}' + big + 'r' + (k === 'b' ? ']' : ')') : mm; }); return ((/\\begin\{/.test(x) || ((x.match(/\\d?frac/g) || []).length >= 2 && x.length > 24)) ? '\\[' + x + '\\]' : (x !== x0 ? '\\(' + x + '\\)' : m)); });
}
function buildQ(q, n, p) {
  const maxOpt = Math.max(0, ...q.o.map(o => plain(o).length));
  const cls = !q.o.length ? '' : (maxOpt <= 10 && p.cols === 1) ? 'c4' : maxOpt <= 26 ? 'c2' : 'c1';
  const hint = q.t === 'MSQ' ? '(one or more options correct)' : '';
  const t = p.tag ? tagText(q) : '';
  const mt = matchParts(q.q);
  let txt = String(mt ? mt.pre : q.q), after = '';
  const fx = txt.indexOf('{{figure}}');
  if (fx > -1) { after = txt.slice(fx + 10).trim(); txt = txt.slice(0, fx).trim(); }
  const tags = [hint ? h('span', { class: 'tag', text: hint }) : null, t ? h('span', { class: 'tag', text: t }) : null];
  const stem = h('div', { class: 'stem' }, ...(after ? [] : tags));
  stem.insertAdjacentHTML('afterbegin', boldHtml(tallToDisplay(txt)));
  const kids = [stem];
  if (mt) kids.push(matchTable(mt));
  if (q.f) kids.push(h('img', { class: 'fig', alt: 'Figure', src: figSrc(q.f), width: q.f.w, height: q.f.h }));
  if (after) { const st2 = h('div', { class: 'stem' }, ...tags); st2.insertAdjacentHTML('afterbegin', boldHtml(tallToDisplay(after))); kids.push(st2); }
  if (q.o.length) kids.push(h('div', { class: 'opts ' + cls, style: q.o.some(o => /\\d?frac/.test(o)) ? 'row-gap:.8em' : '' }, q.o.map((o, i) => h('div', { class: 'opt' }, h('b', { text: '(' + 'ABCD'[i] + ')' }), h('span', { text: o })))));
  const node = h('div', { class: 'sq' }, q.head ? h('div', { class: 'qhead', text: q.head }) : null, h('div', { class: 'qn', text: n + '.' }), h('div', { class: 'qb' }, kids));
  math(node);
  return node;
}
var LOGO_DATA = '';
try { fetch('img/avanti-logo-dark.png').then(r => r.ok ? r.blob() : null).then(bl => { if (!bl) return; const fr = new FileReader(); fr.onload = () => { LOGO_DATA = fr.result; }; fr.readAsDataURL(bl); }).catch(() => {}); } catch (e) { /* use the file path */ }
/* a figure that is just a picture wrapped in an SVG is drawn from the picture itself (screenshots and PDFs then never lose it) */
function figSrc(f) { const m = /<image[^>]*?href="(data:image\/(?:png|jpeg|jpg);base64,[^"]+)"/.exec(f.svg || ''); return m ? m[1] : 'data:image/svg+xml;utf8,' + encodeURIComponent(f.svg); }
function skeleton(p, keyMode) {
  const test = p.mode === 'test', sub = keyMode ? (keyMode === 'exp' ? 'Explanations' : 'Answer key') : (p.sub || 'Maths');
  const info = h('div', { class: 'sh-info' },
    h('span', { text: 'Name: ______________________' }), h('span', { text: 'Avanti ID: __________' }),
    h('span', { text: (p.total || p.qs.length) + ' questions' }),
    test ? h('span', { text: 'Time: ' + p.mins + ' min' }) : h('span', { text: 'Date: ______________' }),
    test ? h('span', { text: 'Max marks: ' + (p.total || p.qs.length) * p.pos + '  (+' + p.pos + ' / \u2212' + p.neg + ')' }) : h('span', { text: 'Marks: ____ / ' + p.qs.length }));
  const dt = p.date ? new Date(p.date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  /* header: logo left, exam name (18 bold) with date below (14), Mathematics top right; footer: Exam - Date left, page number right */
  const examName = p.pyq ? String(p.sub || '').replace(/\s*\u00b7\s*all topics$/, '') : p.title, dateLine = p.pyq ? p.title : sub;
  const headTitle = p.pyq ? examName : p.title, headSub = p.pyq ? (keyMode ? dateLine + ' \u00b7 ' + (keyMode === 'exp' ? 'Explanations' : 'Answer key') : dateLine) : sub;
  const logo = h('img', { class: 'sh-logo', src: LOGO_DATA || 'img/avanti-logo-dark.png', alt: 'Avanti Fellows', style: 'height:40px;width:auto;display:block' });
  return h('div', { class: 'sheet' },
    h('div', { class: 'sh-head' },
      h('div', { class: 'sh-brand' }, logo),
      h('div', { class: 'sh-title', style: 'font-size:18px;font-weight:700;line-height:1.2' }, headTitle, h('small', { text: headSub, style: 'font-size:14px;font-weight:600;margin-top:3px;letter-spacing:0;color:var(--sheet-muted)' })),
      h('div', { class: 'sh-meta' }, h('div', { text: 'Mathematics', style: 'font-weight:700;font-size:12px' }), p.badge && !p.pyq ? h('div', { class: 'sh-badge', text: p.badge }) : (dt ? h('div', { text: dt }) : null), p.batch ? h('div', { text: p.batch }) : null)),
    keyMode || !test ? null : info,
    h('div', { class: 'sh-body' }),
    h('div', { class: 'sh-foot' }, h('span', { text: p.pyq ? examName + ' - ' + dateLine : p.title }), h('span', { text: keyMode ? 'Teacher copy' : test ? 'Test' + (p.pageOf ? ' \u00b7 Page ' + p.pageOf : '') : (p.pg ? 'Page ' + p.pg : '') })));
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
  /* DPP pages: do not stretch a few tall questions apart; cap the gap and leave the rest blank at the bottom of the column */
  if (p.capGap) nCols.forEach((c, i) => { const ns = groups[i] || []; if (ns.length < 2) return; const used = sum(ns.map(n => n.offsetHeight)), free = c.clientHeight - used; c.style.justifyContent = 'flex-start'; c.style.gap = Math.max(0, Math.min(free / (ns.length - 1), best.fs * 2.2)) + 'px'; });
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
/* explanations: a flowing list of full solutions (text, maths and the solution's own figure) over as many pages as needed */
function explSheets(items, base, host) {
  const labelled = new Set(items.map(x => x.lab)).size > 1, sheets = []; let body = null, last = null;
  const fresh = () => { const sh = skeleton(Object.assign({}, base, { qs: [], badge: '' }), 'exp'); sh.style.boxShadow = 'none'; body = $('.sh-body', sh); body.style.display = 'block'; host.append(sh); sheets.push(sh); };
  const over = () => body.scrollHeight > body.clientHeight + 1;
  const build = it => {
    const el = h('div', { class: 'explitem', style: 'margin:0 0 9px;font-size:12px;line-height:1.45' }), parts = it.text.split(/\s*\{\{figure\}\}\s*/);
    el.append(h('b', { text: it.n + '. ', style: 'color:var(--sheet-accent)' }));
    parts.forEach((t, k) => {
      if (k) { if (it.f && it.f.svg) { const fg = h('div', { style: 'margin:4px 0' }); fg.innerHTML = String(it.f.svg).replace(/<svg /, '<svg style="width:' + Math.min(it.f.w || 240, 240) + 'px;height:auto" '); el.append(fg); } }
      if (t.trim()) el.append(h('span', { text: t.replace(/^\n+|\n+$/g, ''), style: 'white-space:pre-wrap' }));
    });
    if (parts.length === 1 && it.f && it.f.svg) { const fg = h('div', { style: 'margin:4px 0' }); fg.innerHTML = String(it.f.svg).replace(/<svg /, '<svg style="width:' + Math.min(it.f.w || 240, 240) + 'px;height:auto" '); el.append(fg); }
    return el;
  };
  fresh();
  for (const it of items) {
    const mk = () => { const nodes = []; if (labelled && it.lab !== last) nodes.push(h('div', { class: 'keyhead', text: it.lab })); nodes.push(build(it)); return nodes; };
    let nodes = mk(); nodes.forEach(nd => { body.append(nd); math(nd); });
    if (over() && body.children.length > nodes.length) { nodes.forEach(nd => nd.remove()); fresh(); nodes = mk(); nodes.forEach(nd => { body.append(nd); math(nd); }); }
    last = it.lab;
  }
  return sheets;
}
/* fits at the readable size? used by "Fill page" */

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
  BANK.qs.forEach(q => { if (q.cc === chapterCode && q.s === 'N' && LS.pubs.includes(q.pb || 'Practice')) { const l = practiceLevel(q); if (l) lv[l].push(q); } });
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
  Object.keys(BANK.syl || {}).forEach(cc => { PYQT[cc] = { topics: BANK.syl[cc].map(t => ({ no: t[0], name: t[1], code: t[2], qs: [] })), other: [] }; });
  BANK.qs.forEach(q => {
    if (q.s !== 'P' || !PYQT[q.cc]) return;
    const c = PYQT[q.cc], t = c.topics.find(x => norm(x.name) === norm(q.tp)); (t ? t.qs : c.other).push(q);
  });
  Object.values(PYQT).forEach(c => { const by = a => a.map((q, i) => ({ q, i })).sort((x, y) => RANK[x.q.d] - RANK[y.q.d] || pyqNewest(x.q, y.q) || x.i - y.i).map(x => x.q); c.topics.forEach(t => { t.qs = by(t.qs); }); c.other = by(c.other); });
}

/* ---------- DPP library UI ---------- */
let SUBS = [];
const BK = {};
const LS = { kind: 'sub', chs: [], ids: [], idk: '', part: 'all', page: 0, key: false, shown: false, year: 'all', yrs: [], ex: [], lv: ['L1', 'L2', 'L3'], pubs: [], srcs: [], tough: 2, mixv: 2, stat: '', seed: 0 };
const PUBS = [];   /* every source tag found in the bank (Black Book and any new one) */
function initPubs() {
  const found = [...new Set(BANK.qs.filter(q => q.s === 'N').map(q => q.pb || 'Practice'))], first = ['Black Book'];
  PUBS.length = 0; first.concat(found.filter(x => !first.includes(x)).sort()).forEach(x => PUBS.push(x));
  LS.pubs = PUBS.slice(); LS.srcs = EXAMS.concat(PUBS);
}
const shortList = (a, n) => a.slice(0, n).join(', ') + (a.length > n ? ' +' + (a.length - n) : '');
const BASE = { mode: 'dpp', kind: 'dpp', big: true, cols: 2, tag: true, date: '', batch: '', mins: 0, pos: 4, neg: 1 };
/* a DPP is about 15 questions on one A4 side */
function dppPages(d) {
  const n = d.fitParts ? [].concat(...d.fitParts).length : d.qs.length;
  const parts = d.fitParts || [d.qs.slice()];
  let start = 0;
  return parts.map((g, i) => {
    const p = Object.assign({}, BASE, { title: d.chapter, sub: shortList(d.tps, 3), badge: 'DPP ' + d.num, pg: parts.length > 1 ? (i + 1) + ' of ' + parts.length : '', qs: g, start, total: n, maxFs: DPP_FS, file: d.chapter + ' DPP ' + d.num });
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
function idPages(ids, title) {
  const qs = ids.map(i => BYID.get(i)).filter(Boolean);
  return qs.length ? packPages(qs, (g, i, n) => ({ title, sub: 'Worksheet', badge: n > 1 ? 'Page ' + (i + 1) + ' of ' + n : 'Worksheet' })) : [];
}
function packPages(qs, mk) {
  const pg = paginate(qs, BASE), out = []; let start = 0;
  pg.forEach((g, i) => { out.push(Object.assign({}, BASE, mk(g, i, pg.length), { qs: g, start, cols: 2 })); start += g.length; });
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
const exOf = q => q.e === 'KCET' ? 'KCET' : q.e === 'IAT' ? 'IAT' : q.e === 'NDA' ? 'NDA' : q.e === 'Adv' ? (q.y < 2013 ? 'IIT' : 'JEE Advanced') : (q.y < 2013 ? 'AIEEE' : 'JEE Main');
const EXAMS = ['JEE Main', 'JEE Advanced', 'AIEEE', 'IIT', 'KCET', 'IAT', 'NDA'];
const yf = qs => qs.filter(q => (!LS.yrs.length || LS.yrs.includes(String(q.y))) && (!LS.ex.length || LS.ex.includes(exOf(q))) && LS.lv.includes(q.d));
function pyqYears(cc) { const c = PYQT[cc], a = c.other.concat(...c.topics.map(t => t.qs)); return [...new Set(a.map(q => String(q.y)))].sort((x, y) => y - x); }
function pyqPages(cc, id) {
  const key = 'p|' + cc + '|' + id + '|' + LS.yrs.join(',') + '|' + LS.ex.join(',') + '|' + LS.lv.join(''); if (BK[key]) return BK[key];
  const c = PYQT[cc], name = CHMAP.get(cc).n, out = [];
  const list = id === 'all' ? c.topics.map(t => ({ label: t.code || ('Topic ' + t.no), name: t.name, qs: yf(t.qs) })).concat(c.other.length ? [{ label: 'Other', name: 'Other topics', qs: yf(c.other) }] : [])
    : id === 'other' ? [{ label: 'Other', name: 'Other topics', qs: yf(c.other) }] : c.topics.filter(t => String(t.no) === id).map(t => ({ label: t.code || ('Topic ' + t.no), name: t.name, qs: yf(t.qs) }));
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
function practiceChapters() { return [...new Set(BANK.qs.filter(q => q.s === 'N' && practiceLevel(q) && LS.pubs.includes(q.pb || 'Practice')).map(q => q.cc))].sort((a, b) => CHMAP.get(a).o - CHMAP.get(b).o || CHMAP.get(a).cl - CHMAP.get(b).cl); }
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
/* ---------- Topicwise DPP: 2 A4 pages, text 11 to 12 pt ---------- */
const DPP_MINPX = 14.67, DPP_MAXPX = 16, DPP_CAP = 60;   /* 11 pt and 12 pt in px (1 pt = 4/3 px) */
const TKM = {};
function topicKeyOf(q) {
  const m = TKM[q.cc] || (TKM[q.cc] = new Map(((BANK.syl || {})[q.cc] || []).map(t => [norm(t[1]), String(t[0])])));
  return q.cc + '|' + (m.get(norm(q.tp)) || 'other');
}
const srcOf = q => q.s === 'P' ? exOf(q) : (q.pb || 'Practice');
function dppPool(forCount) {
  const yrs = LS.yrs, chs = new Set(LS.chs), ids = new Set(LS.ids), src = new Set(LS.srcs);
  return BANK.qs.filter(q => chs.has(q.cc) && (forCount || ids.has(topicKeyOf(q))) && src.has(srcOf(q)) && (q.s !== 'P' || !yrs.length || yrs.includes(String(q.y))) && LS.lv.includes('L' + practiceLevel(q))).map(q => Object.assign({}, q, { lvTag: true }));
}
function rrTopics(qs) {
  const g = new Map(); qs.forEach(q => { const k = topicKeyOf(q); if (!g.has(k)) g.set(k, []); g.get(k).push(q); });
  const lists = [...g.values()];
  if (LS.seed) { const rnd = (() => { let a = LS.seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(); const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }; lists.forEach(shuf); shuf(lists); }
  else lists.forEach(l => { if (l[0].s === 'P') l.sort(pyqNewest); });
  const out = []; for (let i = 0; lists.some(l => i < l.length); i++) lists.forEach(l => { if (i < l.length) out.push(l[i]); });
  return out;
}
const chOrd2 = cc => { const c = CHMAP.get(cc); return c ? c.cl * 100 + c.o : 0; };
const dppOrder = qs => qs.map((q, i) => ({ q, i })).sort((a, b) => chOrd2(a.q.cc) - chOrd2(b.q.cc) || tcNum(a.q.tc) - tcNum(b.q.tc) || a.q.tp.localeCompare(b.q.tp) || practiceLevel(a.q) - practiceLevel(b.q) || a.i - b.i).map(x => x.q);
/* pick the order in which questions are taken so that every prefix keeps the chosen level mix and PYQ / practice mix */
function dppSeq(pool, cap) {
  const cats = {}; pool.forEach(q => { const k = (q.s === 'P' ? 'P' : 'N') + practiceLevel(q); (cats[k] = cats[k] || []).push(q); });
  Object.keys(cats).forEach(k => { cats[k] = rrTopics(cats[k]); });
  const hasP = pool.some(q => q.s === 'P'), hasN = pool.some(q => q.s !== 'P');
  let ws = { P: LS.mixv === 3 ? 1 : LS.mixv === 2 ? 0.5 : 0, N: LS.mixv === 1 ? 1 : LS.mixv === 2 ? 0.5 : 0 };
  if (!hasP) ws = { P: 0, N: 1 }; else if (!hasN) ws = { P: 1, N: 0 };
  const wl0 = LS.tough === 1 ? [1, 0, 0] : LS.tough === 3 ? [0, 0, 1] : [1, 1, 1].map(x => x / 3);
  let wl = wl0.map((w, i) => LS.lv.includes('L' + (i + 1)) ? w : 0); const sw = sum(wl);
  wl = sw ? wl.map(w => w / sw) : [1, 2, 3].map(l => LS.lv.includes('L' + l) ? 1 / LS.lv.length : 0);
  const pos = {}, taken = {}, seq = [], fbAt = [];
  Object.keys(cats).forEach(k => { pos[k] = 0; taken[k] = 0; });
  const left = k => pos[k] < cats[k].length;
  while (seq.length < cap) {
    const live = Object.keys(cats).filter(left); if (!live.length) break;
    const want = live.filter(k => ws[k[0]] * wl[+k[1] - 1] > 0);
    let k;
    if (want.length) k = want.reduce((a, b) => (ws[b[0]] * wl[+b[1] - 1] * (seq.length + 1) - taken[b]) > (ws[a[0]] * wl[+a[1] - 1] * (seq.length + 1) - taken[a]) ? b : a);
    else { fbAt.push(seq.length); k = live.slice().sort((a, b) => Math.abs(+a[1] - LS.tough) - Math.abs(+b[1] - LS.tough) || ws[b[0]] - ws[a[0]])[0]; }
    seq.push(cats[k][pos[k]++]); taken[k]++;
  }
  return { seq, fbAt };
}
function dppHeights(qs, fs) {
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' }); document.body.append(host);
  const sk = skeleton(Object.assign({}, BASE, { qs: [] })); host.append(sk);
  const c = h('div', { class: 'sh-col' }); $('.sh-body', sk).append(c); const avail = c.clientHeight;
  const meas = h('div', { class: 'measure' }); meas.style.width = colWidth(2) + 'px'; meas.style.setProperty('--fs', fs + 'px'); document.body.append(meas);
  const hs = new Map(); qs.forEach((q, i) => { const nd = buildQ(q, i + 1, BASE); nd.style.flex = 'none'; meas.append(nd); fitMath(nd); hs.set(q.i, nd.offsetHeight); });
  meas.remove(); host.remove(); return { hs, avail };
}
function dppBuild() {
  const pool = dppPool(); if (!pool.length) return { pages: [], stat: '' };
  const { seq, fbAt } = dppSeq(pool, DPP_CAP), H = dppHeights(seq, DPP_MINPX), gap = DPP_MINPX * 0.7;
  const fits = qs => !!pickSplit(qs.map(q => H.hs.get(q.i)), gap, H.avail - 8, 2);
  const split = n => {   /* ordered list for n questions, and the split point closest to half where both pages fit */
    const qs = dppOrder(seq.slice(0, n)); if (fits(qs)) return { qs, k: n }; if (n < 2) return null;
    let best = null; for (let k = 1; k < n; k++) if (fits(qs.slice(0, k)) && fits(qs.slice(k)) && (!best || Math.abs(k - n / 2) < Math.abs(best - n / 2))) best = k;
    return best ? { qs, k: best } : null;
  };
  let lo = 1, hi = seq.length, ok = split(hi) ? hi : 0;
  if (!ok) { while (lo <= hi) { const m = (lo + hi) >> 1; if (split(m)) { ok = m; lo = m + 1; } else hi = m - 1; } }
  for (let t = 0; t < 3 && ok < seq.length && split(ok + 1); t++) ok++;
  const nm = chs => chs.length <= 2 ? chs.map(cc => CHMAP.get(cc).n).join(' + ') : chs.length + ' chapters';
  const used = LS.chs.filter(cc => pool.some(q => q.cc === cc)).sort((a, b) => chOrd2(a) - chOrd2(b));
  const title = nm(used), file = title + ' DPP';
  for (let n = ok; n >= 1; n--) {
    const sp = split(n); if (!sp) continue;
    const r = dppPlace(sp.qs, sp.k, title, file); if (!r) continue;
    return Object.assign(r, { pool, title, file, out: new Set() }, dppFin(r, pool, fbAt.some(i => i < n)));
  }
  return { pages: [], stat: '' };
}
/* lay the chosen questions out for real: one page (k = n) or two pages split after k; both pages get the same text size */
function dppPlace(qs, k, title, file) {
  const n = qs.length, tps = [...new Set(qs.map(q => q.tp === 'Unmapped' ? 'Mixed problems' : q.tp))], sub = shortList(tps, 3);
  const mk = (g, start, i, tot) => Object.assign({}, BASE, { title, sub, badge: 'DPP', pg: tot > 1 ? (i + 1) + ' of ' + tot : '', qs: g, start, total: n, maxFs: DPP_MAXPX, file, capGap: true });
  const parts = k >= n ? [qs] : [qs.slice(0, k), qs.slice(k)];
  let pages = parts.map((g, i) => mk(g, i ? parts[0].length : 0, i, parts.length));
  const host = h('div', { style: 'position:absolute;left:-10000px;top:0;width:794px' }); document.body.append(host);
  let bad = false, fs = DPP_MAXPX;
  try { pages.forEach(pg => { const L = layoutSheet(pg, host, DPP_MINPX); L.sheet.remove(); if (L.overflow) bad = true; fs = Math.min(fs, L.fs); }); } finally { host.remove(); }
  if (bad) return null;
  pages = pages.map(pg => Object.assign(pg, { maxFs: fs }));
  return { pages, qs, k: Math.min(k, n), fs };
}
function dppFin(r, pool, fb) {
  const qs = r.qs, n = qs.length, lv = [1, 2, 3].map(l => 'L' + l + ' ' + qs.filter(q => practiceLevel(q) === l).length).join(' · '), np = qs.filter(q => q.s === 'P').length;
  LS.fs = r.fs;
  return { stat: '<b>' + qWord(n) + '</b> of ' + pool.length + ' matching, on ' + r.pages.length + ' A4 ' + (r.pages.length > 1 ? 'pages' : 'page') + ' at ' + (r.fs * 0.75).toFixed(1).replace('.0', '') + ' pt. ' + lv + ' · PYQ ' + np + ' · Practice ' + (n - np) + '.' + (fb ? ' Not enough questions for this exact pick, so some come from the nearest level or source.' : '') };
}
/* swap one question for another from the same pool: same level first, then same kind (PYQ / practice), then same topic */
function dppSwap(r, id) {
  const cur = r.qs.findIndex(q => q.i === id); if (cur < 0) return false;
  const q0 = r.qs[cur], inSel = new Set(r.qs.map(q => q.i)); r.out.add(id);
  const lvl = practiceLevel(q0), isP = q0.s === 'P', tk = topicKeyOf(q0);
  const score = q => (practiceLevel(q) === lvl ? 4 : 0) + ((q.s === 'P') === isP ? 2 : 0) + (topicKeyOf(q) === tk ? 1 : 0);
  const cands = r.pool.filter(q => !inSel.has(q.i) && !r.out.has(q.i)).map(q => ({ q, sc: score(q) + Math.random() * 0.9 })).sort((a, b) => b.sc - a.sc).slice(0, 30);
  for (const { q } of cands) {
    const qs = dppOrder(r.qs.map((x, i) => i === cur ? q : x));
    const k0 = r.k >= qs.length ? qs.length : r.k;
    for (const k of [k0, ...[1, -1, 2, -2].map(d => k0 + d).filter(k => k >= 1 && k < qs.length)]) {
      const pl = dppPlace(qs, k, r.title, r.file); if (!pl) continue;
      Object.assign(r, pl, dppFin(pl, r.pool, false)); return true;
    }
  }
  return false;
}
const dppKey = () => 'dpp|' + LS.chs.join(',') + '|' + LS.ids.join(',') + '|' + LS.lv.join('') + '|' + LS.srcs.join(',') + '|' + LS.yrs.join(',') + '|' + LS.tough + LS.mixv + '|' + LS.seed + '|' + (OOS.ex ? 1 : 0) + (window.katex ? 'k' : '');
const dppCur = () => { const key = dppKey(); return BK[key] || (BK[key] = dppBuild()); };
function currentPages() {
  const r = dppCur(); LS.stat = r.stat;
  return r.pages.map(p => Object.assign({}, p, { key: LS.key, exp: !!LS.exp }));
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
/* one-choice dropdown: same look as msel, but picking an item selects it and closes the list */
const ssel = (id, noun) => {
  if (!document.getElementById('ssel-css')) { const st = document.createElement('style'); st.id = 'ssel-css'; st.textContent = '.pdflist{overflow:visible!important;max-height:none!important;height:auto!important}.msel.sgl .mp{position:static!important;width:auto!important;max-height:none!important;overflow:visible!important;margin-top:6px;box-shadow:none}.msel.sgl .ml{max-height:min(52vh,420px)!important;overflow-y:auto}.msel.sgl .mi{align-items:flex-start;padding-block:8px}.msel.sgl .mi span{white-space:normal;overflow-wrap:anywhere;line-height:1.3}'; document.head.append(st); }
  const b = msel(id, noun); b.classList.add('sgl'); const q = b.querySelector('.mq'); if (q) q.remove(); return b;
};
function sfill(id, items, sel, set, noun, o) {
  o = o || {};
  const box = $('#' + id), list = $('.ml', box), st = list.scrollTop;
  list.textContent = '';
  items.forEach(([v, t]) => {
    const rb = h('input', { type: 'radio', name: id, value: v, onchange: () => { box.classList.remove('open'); $('.mbtn', box).setAttribute('aria-expanded', 'false'); set(v); } });
    rb.checked = v === sel;
    list.append(h('label', { class: 'mi' }, rb, h('span', { text: t })));
  });
  list.scrollTop = st;
  const hit = items.find(i => i[0] === sel);
  $('.mt', box).textContent = !items.length ? (o.empty || 'Nothing to pick') : hit ? hit[1].replace(/\s*\(\d+ questions?\)$/, '') : 'Pick ' + noun;
}
const chLabel = () => LS.chs.length === 1 ? CHMAP.get(LS.chs[0]).n : LS.chs.length + ' chapters';
const lvSuffix = () => LS.lv.length === 3 ? '' : ' ' + LS.lv.join('+');
const yrSuffix = () => (LS.ex.length ? ' ' + LS.ex.join('+') : '') + (LS.yrs.length ? ' ' + (LS.yrs.length > 3 ? LS.yrs.length + ' years' : LS.yrs.join('+')) : '');
function renderLib() {
  if (!$('#libCh')) return;
  syncOos();
  const was = LS.shown;
  const chOf = [...new Set(BANK.qs.map(q => q.cc))].filter(cc => CHMAP.get(cc)).sort((a, b) => chOrd2(a) - chOrd2(b));
  LS.chs = mfill('libCh', chOf.map(cc => [cc, cc + ' ' + CHMAP.get(cc).n]), LS.chs, v => { LS.chs = v; renderLib(); }, 'chapters');
  const multiCh = LS.chs.length > 1;
  /* sources: PYQ plus every practice source, all listed */
  const cnt = {}; BANK.qs.forEach(q => { if (LS.chs.includes(q.cc)) cnt[srcOf(q)] = (cnt[srcOf(q)] || 0) + 1; });
  const srcItems = EXAMS.concat(PUBS).map(x => [x, x + ' (' + (cnt[x] || 0) + ')']);
  LS.srcs = mfill('libSrc', srcItems, LS.srcs, v => { LS.srcs = v; renderLib(); }, 'sources', { none: 'No source picked' });
  const hasP = LS.srcs.some(x => EXAMS.includes(x)), hasN = LS.srcs.some(x => !EXAMS.includes(x));
  $('#fldYear').hidden = !hasP;
  if (hasP) {
    const cy = {}; BANK.qs.forEach(q => { if (q.s === 'P' && LS.chs.includes(q.cc) && q.y && LS.lv.includes('L' + practiceLevel(q))) cy[q.y] = (cy[q.y] || 0) + 1; });
    const ys = Object.keys(cy).sort((a, b) => b - a);
    LS.yrs = mfill('libYr', ys.map(y => [y, y + ' (' + cy[y] + ')']), LS.yrs, v => { LS.yrs = v; renderLib(); }, 'years', { none: 'All years' });
  }
  /* subtopics of the picked chapters */
  const pool0 = dppPool(true), per = {}; pool0.forEach(q => { const k = topicKeyOf(q); per[k] = (per[k] || 0) + 1; });
  const items = []; LS.chs.slice().sort((a, b) => chOrd2(a) - chOrd2(b)).forEach(cc => {
    const pre = multiCh ? cc + ' ' + CHMAP.get(cc).n + ' · ' : '';
    ((BANK.syl || {})[cc] || []).forEach(t => items.push([cc + '|' + t[0], pre + t[2] + ' · ' + t[1] + ' (' + (per[cc + '|' + t[0]] || 0) + ')']));
    if (per[cc + '|other']) items.push([cc + '|other', pre + 'Other topics (' + per[cc + '|other'] + ')']);
  });
  const k = LS.chs.join(',');
  if (LS.idk !== k) { LS.idk = k; LS.ids = items.map(i => i[0]); }
  LS.ids = mfill('libDpp', items, LS.ids, v => { LS.ids = v; renderLib(); }, 'subtopics', { empty: 'Pick a chapter first' });
  /* sliders */
  const tl = ['', 'All easy: L1 questions only.', 'Mixed: about one third from each level.', 'All tough: L3 questions only.'][LS.tough];
  $('#toughHint').textContent = tl + '';
  const mx = $('#mixSl'), canMix = hasP && hasN; mx.disabled = !canMix;
  $('#mixHint').textContent = !canMix ? (hasP ? 'Only exams are picked, so every question is a PYQ.' : hasN ? 'No exam is picked, so every question is a practice question.' : 'Pick at least one source.') : ['', 'N: all practice questions, no PYQs.', 'O: half practice questions, half PYQs.', 'P: all PYQs, no practice questions.'][LS.mixv];
  const n = pool0.filter(q => LS.ids.includes(topicKeyOf(q)) && LS.lv.includes('L' + practiceLevel(q)) && (q.s !== 'P' || !LS.yrs.length || LS.yrs.includes(String(q.y)))).length;
  const np = pool0.filter(q => q.s === 'P' && LS.ids.includes(topicKeyOf(q)) && (!LS.yrs.length || LS.yrs.includes(String(q.y)))).length;
  const info = !LS.chs.length ? 'Pick one or more chapters first.' : n ? '<b>' + qWord(n) + ' available</b> (' + np + ' PYQ, ' + (n - np) + ' practice). The DPP uses 1 A4 page if they are few, otherwise 2, at 11 to 12 pt.' : '<b>0 questions</b> for this pick so far.';
  $('#libNote').textContent = 'Pick chapters and subtopics. The DPP takes as many questions as fit on 2 A4 pages (text 11 to 12 pt), in topic order. A short list stays on 1 page. Every question shows its level (L1, L2 or L3).';
  LS.shown = false; LS.page = 0;
  const wrap = $('#libPrev'); wrap.textContent = '';
  const ip = h('p', { class: 'msg' }); ip.innerHTML = info;
  wrap.append(h('div', { class: 'ph' }, ip, h('button', { type: 'button', class: 'btn', 'data-act': 'libshow', text: 'Show preview' })));
  $('#libMsg').textContent = ''; $('#libPages').hidden = true;
  if (was && n) showLibPrev();
}
function addKeyPages(wrap, pages) {
  const kp = pages.filter(p => p.key);
  if (kp.length) {
    const hst = exportHost();
    try { keySheets(kp, hst).forEach(sh => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox keypg' }, sc)); sc.append(sh); }); }
    finally { hst.remove(); }
    rescale();
  }
  const ep = pages.filter(p => p.exp); if (ep.length) addExplPages(wrap, ep);
}
async function addExplPages(wrap, pages) {
  const tok = wrap._et = (wrap._et || 0) + 1, items = await explItems(pages);
  if (wrap._et !== tok || !wrap.isConnected) return;
  if (!items.length) { wrap.append(h('div', { class: 'empty', text: 'None of these questions has an explanation yet.' })); return; }
  const hst = exportHost();
  try { explSheets(items, pages[0], hst).forEach(sh => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox keypg' }, sc)); sc.append(sh); }); }
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
  const say = done => { msg.className = 'msg' + (warn ? ' warn' : ''); msg.innerHTML = (LS.stat || '') + (done ? '' : ' Loading\u2026') + (pages.length > 1 && done ? ' Scroll to see both pages. Download includes both.' : ''); };
  say(false);
  let i = 0;
  const step = () => { if (LS.tok !== tok) return; const end = Math.min(i + 3, pages.length); for (; i < end; i++) { const L = layoutSheet(pages[i], scalers[i]); if (L.overflow) warn = true; L.nodes.forEach((nd, j) => { nd.style.position = 'relative'; nd.append(h('button', { type: 'button', class: 'dswap', 'data-act': 'libswap', 'data-k': pages[i].qs[j].i, title: 'Swap this question for another one', 'aria-label': 'Swap this question for another one', text: '\u21c4' })); }); } rescale(); say(i >= pages.length); if (i < pages.length) setTimeout(step, 0); else addKeyPages(wrap, pages); };
  step();
}
/* Print and Share, used by every tab that downloads: they all go through the same PDF as "Download PDF" */
const pdfBlobOf = payload => new Promise((res, rej) => { doExport('pdf', Object.assign({}, payload, { onBlob: (blob, file) => res({ blob, file }), onFail: rej })).then(() => rej(new Error('The PDF was not made')), rej); });
async function sendPdf(app, blob, file, title) {
  if (!need('share')) return;
  if (window.AvantiPortal && window.AvantiPortal.shareReady) { window.AvantiPortal.shareReady(blob, file, title); return; }
  await downloads.save({ filename: file, data: blob }); toast('PDF saved. Attach "' + file + '" in your app.');
}
function shareFrom(btn, title, get) {
  if (!need('share')) return;
  closeShare(); toast('Preparing the PDF\u2026');
  if (btn) btn.disabled = true;
  Promise.resolve().then(get).then(r => sendPdf('', r.blob, r.file, title))
    .catch(e => toast('Could not prepare the PDF' + (e && e.message ? ': ' + e.message : '')))
    .then(() => { if (btn) btn.disabled = false; });
}
function printFrom(get) {
  if (!need('print')) return;
  const w = window.open('', '_blank');
  if (!w) { toast('This view does not allow a print window. Use Download PDF, then print the file.'); return; }
  try { w.document.write('<!doctype html><title>Preparing…</title><body style="font-family:sans-serif;padding:24px">Preparing the PDF for printing…</body>'); } catch (e) { /* ignore */ }
  Promise.resolve().then(get).then(r => { w.location.href = URL.createObjectURL(r.blob); setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* the PDF is open: print from there */ } }, 1000); })
    .catch(e => { try { w.close(); } catch (x) { /* ignore */ } toast('Could not prepare the PDF' + (e && e.message ? ': ' + e.message : '')); });
}
window.__pdfPrint = printFrom; window.__pdfShare = shareFrom;
const prtBtn = src => h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'xprint', 'data-src': src, title: 'Print', 'aria-label': 'Print', html: ICO.print });
const shrBtn = src => h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'xshare', 'data-src': src, title: 'Share the PDF (WhatsApp, Discord, email)', 'aria-label': 'Share the PDF', html: ICO.share });
/* "Save as worksheet" and "Create test" for Premium and Staff teachers, under the downloads of DPPs, PYQs and Must Solve */
const WS_ICO = {
  save: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  test: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>'
};
function wsRow(src) {
  if (!G('createTests')) return null;
  return h('div', { class: 'wsrow' },
    G('worksheets') ? h('button', { type: 'button', class: 'btn wsbtn', 'data-act': 'wssave', 'data-src': src, title: 'Keep these questions in Saved worksheets', html: WS_ICO.save + '<span>Save as worksheet</span>' }) : null,
    h('button', { type: 'button', class: 'btn pri wsbtn', 'data-act': 'wstest', 'data-src': src, title: 'Make an online test from these questions', html: WS_ICO.test + '<span>Create test</span>' }));
}
function wsSource(src) {
  let pages = null, title = '';
  if (src === 'lib') { pages = currentPages(); title = pages.length ? pages[0].title + ' DPP' : ''; }
  else if (src === 'cw' || src === 'sw') { const P = PDFT[src], r = P.sel && pdfRows(src).find(x => x.k === P.sel); if (!r) { toast('Pick a ' + (src === 'cw' ? 'chapter' : 'question paper') + ' first'); return null; } pages = pdfPages(src, r); title = r.name; }
  else if (src === 'must') { const m = mustPages(); if (!m) return null; pages = m.pages; title = m.title === 'Must Solve' ? 'Must Solve' : m.title + ' · Must Solve'; }
  const ids = [...new Set((pages || []).flatMap(p => p.qs || []).map(q => q && q.i).filter(i => i && BYID.has(i)))];
  if (!ids.length) { toast('No questions here yet'); return null; }
  return { ids, title };
}
function pdfSource(t) {
  const src = t.dataset.src;
  if (src === 'lib') { const pages = currentPages(); if (!pages.length) { toast('No questions here yet'); return null; } return { title: pages[0].title + ' DPP', get: () => pdfBlobOf({ pages, file: pages[0].file }) }; }
  if (src === 'pyq') {
    const T = t.dataset.t, r = pdfRows(T).find(x => x.k === t.dataset.k); if (!r) { toast('Pick a paper or chapter first'); return null; }
    const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key, exp: !!PDFT[T].exp }));
    return { title: r.name, get: () => pdfBlobOf({ pages, file: r.file }) };
  }
  if (src === 'must') { const m = mustPages(); if (!m) return null; return { title: m.title, get: () => pdfBlobOf({ pages: m.pages, file: m.file }) }; }
  return null;
}
function exportLib(kind) {
  if (!need(kind)) return;
  const pages = currentPages(); if (!pages.length) { toast('No questions here yet'); return; }
  if (pages.length === 1) { doExport(kind, Object.assign({}, pages[0], { file: pages[0].file })); return; }
  doExport(kind, { pages, file: pages[0].file });
}
/* ---------- "PYQ ChapterWise PDF" and "Shift Wise PDF" tabs ---------- */
const PDFT = { cw: { bucket: 'Main', sel: null, page: 0, v: 0, years: [], key: false }, sw: { bucket: 'Main', sel: null, page: 0, v: 0, year: 'all', key: false } };
const BUCKET_NAME = { Main: 'JEE Main', Adv: 'JEE Advanced', KCET: 'KCET', IAT: 'IAT', NDA: 'NDA' };
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
    const sk = k => { const q = by[k][0], m = /^(?:J[MA]|IIT)(\d{4})(\d{2})(\d{2})(\d)/.exec(q.i) || /^(?:KCET|IAT|NDA)(\d{4})(\d{2})(\d{2})()/.exec(q.i); return m ? m[1] + m[2] + m[3] + m[4] : String(q.y || '') + '0000' + (/(\d)\s*$/.exec(q.p) || [0, 0])[1]; };
    rows = Object.keys(by).sort((a, b) => sk(b).localeCompare(sk(a))).map(k => {
      const q = by[k][0], name = P.bucket === 'Adv' && q.y >= 2013 ? q.y + ' \u00b7 ' + q.p : q.p.replace(/\s+(Shift|Screening|Mains|Paper)/, ' \u00b7 $1');
      return { k, name, qs: by[k], file: BUCKET_NAME[P.bucket] + ' ' + name + ' PYQs' };
    });
  }
  return (BK[key] = rows);
}
/* one page set per row; chapter wise = topic wise inside the chapter, shift wise = chapter order */
function pdfPages(T, r) {
  const key = 'pg|' + T + '|' + PDFT[T].bucket + '|' + (T === 'cw' ? cwYrKey() + '|' : '') + r.k; if (BK[key]) return BK[key];
  const bucket = PDFT[T].bucket, sub = (T !== 'cw' && bucket === 'Adv' && r.qs[0] && r.qs[0].y && r.qs[0].y < 2013 ? 'IIT-JEE' : BUCKET_NAME[bucket]) + (T === 'cw' ? ' \u00b7 all topics' : '');
  let flat = [];
  if (T === 'cw') {
    const c = PYQT[r.k], topics = c ? c.topics.map(t => ({ label: t.code || ('Topic ' + t.no), name: t.name, qs: t.qs.filter(q => q.e === bucket && cwYearOk(q)) })).concat([{ label: 'Other', name: 'Other topics', qs: c.other.filter(q => q.e === bucket && cwYearOk(q)) }]) : [{ label: '', name: 'All topics', qs: r.qs }];
    topics.forEach(t => t.qs.forEach((q, i) => flat.push(Object.assign({}, q, { _pf: 1, _t: (t.label ? t.label + ' \u00b7 ' : '') + t.name, head: i === 0 ? (t.label ? t.label + ' \u00b7 ' : '') + t.name : '' }))));
  } else {
    r.qs.slice().sort((a, b) => chOrder(a.cc) - chOrder(b.cc)).forEach(q => flat.push(Object.assign({}, q, { _pf: 1, _t: '', head: '' }))); /* question paper: no chapter names, like a real paper */
  }
  const pages = packPages(flat, (g, i, n) => ({ title: r.name, sub, pyq: true, pg: n > 1 ? (i + 1) + ' of ' + n : '' }));
  if (T === 'cw') pages.forEach(pg => { if (pg.qs.length && !pg.qs[0].head) pg.qs = [Object.assign({}, pg.qs[0], { head: pg.qs[0]._t + ' (continued)' })].concat(pg.qs.slice(1)); });
  return (BK[key] = pages);
}
/* ---------- chapter PowerPoint (PYQ ChapterWise PDF tab) ---------- */
let PYQMETA = null;
function pyqMeta() { return PYQMETA || (PYQMETA = fetch('qb/data/pyq.json').then(r => r.json()).then(list => { const m = {}; list.forEach(x => { m[x.id] = x; }); return m; }).catch(() => ({}))); }
async function cwPptxData(r) {
  const P = PDFT.cw, bucket = P.bucket, cc = r.k, c = CHMAP.get(cc), pc = PYQT[cc];
  const years = {}; pyqOf(bucket).filter(q => q.cc === cc && q.y).forEach(q => { years[q.y] = (years[q.y] || 0) + 1; });
  const inScope = q => q.e === bucket && cwYearOk(q);
  const flat = pc ? [].concat(...pc.topics.map(t => t.qs.filter(inScope).map(q => Object.assign({}, q, { _t: t.name, _lab: pyqLabel(q) }))), pc.other.filter(inScope).map(q => Object.assign({}, q, { _t: 'Other topics', _lab: pyqLabel(q) }))) : r.qs.map(q => Object.assign({}, q, { _t: r.name, _lab: pyqLabel(q) }));
  const topics = pc ? pc.topics.map(t => ({ name: t.name, n: t.qs.filter(inScope).length })).concat(pc.other.filter(inScope).length ? [{ name: 'Other topics', n: pc.other.filter(inScope).length }] : []) : [];
  const figs = {}; for (const q of flat) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  let logo = null; try { const rs = await fetch('img/avanti-logo.png'); if (rs.ok) { const bl = await rs.blob(), bm = await createImageBitmap(bl), dataUrl = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }); logo = { dataUrl, w: bm.width, h: bm.height }; } } catch (e) { /* no logo file: skip */ }
  return { logo, chapter: c.n, cl: c.cl, cc, bucket, bucketName: BUCKET_NAME[bucket], bucketLabel: bucket, year: cwYrText(), count: flat.length, years, topics, qs: flat, figs, meta: await pyqMeta() };
}
async function exportCwPptx(r) {
  if (!need('pptx')) return;
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  const btns = document.querySelectorAll('[data-act="pdfdl"]'); btns.forEach(b => { b.disabled = true; });
  toast('Preparing PowerPoint…');
  try {
    const d = await cwPptxData(r); if (PDFT.cw.exp) d.expl = await explForQs(d.qs);
    await Promise.all([loadScript('mathdoc.b3.js'), loadScript('office.b9.js'), loadScript(CDN.zip), loadScript(CDN.pptx)]);
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
const QB_EXAM = { 'JEE Main': 'Main', 'AIEEE': 'Main', 'JEE Advanced': 'Adv', 'IIT': 'Adv', 'KCET': 'KCET', 'IAT': 'IAT', 'NDA': 'NDA' };
function qbCompact(r, withKcet) {
  const e = QB_EXAM[r.exam]; if (!e) return null;
  const P = r.source === 'PYQ';
  let o = r.options || []; if (typeof o === 'string') { try { o = JSON.parse(o); } catch (x) { o = []; } }
  const q = { i: String(r.id), s: P ? 'P' : 'N', e, y: P && r.year != null && r.year !== '' ? Number(r.year) : null, p: r.paper, t: r.type, cc: r.chapter_code, tc: String(r.topic_code || '').replace(/^JM-/, ''), tp: r.topic || '', d: r.difficulty, q: r.question || '', o, a: r.answer == null ? '' : String(r.answer) };
  if (!P) { q.pb = r.publisher || 'Practice'; q.sec = r.section || ''; if (r.pyq) q.pq = r.pyq_ref || ''; }
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
window.__qbCwPptx = async function (ids, explain) {
  if (!need('pptx')) throw new Error('Your plan includes PDF downloads only');
  if (!BANK) { const bank = await loadBank(); BANK = bank; BANK.all = bank.qs.slice(); bank.qs.forEach(q => BYID.set(q.i, q)); bank.chapters.forEach(c => CHMAP.set(c.c, c)); }
  /* KCET questions are kept out of the main bank (a separate exam), so look any id that is not there up in the raw PYQ file */
  let xtra = null; if (ids.some(i => !BYID.has(i))) { xtra = new Map(); (await qbJson('pyq')).forEach(r => { if (r.exam === 'KCET' || r.exam === 'IAT' || r.exam === 'NDA') { const q = qbCompact(r, true); if (q) xtra.set(q.i, q); } }); }
  const qs = ids.map(i => BYID.get(i) || (xtra && xtra.get(String(i)))).filter(Boolean); if (!qs.length) throw new Error('no questions found');
  const ccs = [...new Set(qs.map(q => q.cc))].sort((a, b) => chOrder(a) - chOrder(b)), one = ccs.length === 1, c0 = CHMAP.get(ccs[0]);
  const cls = [...new Set(ccs.map(cc => CHMAP.get(cc).cl))].sort();
  const synIdx = (cc, tp) => { const s = (BANK.syl || {})[cc] || []; const k = s.findIndex(t => norm(t[1]) === norm(tp)); return k < 0 ? 999 : k; };
  const tname = q => (one ? '' : CHMAP.get(q.cc).n + ' · ') + (/^UNMAPPED/.test(q.tc || '') || !q.tp || q.tp === 'Unmapped' ? 'Other topics' : q.tp);
  const flat = qs.map(q => Object.assign({}, q, { _t: tname(q), _lab: q.s === 'P' ? pyqLabel(q) : '' }));
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
  await Promise.all([loadScript('mathdoc.b3.js'), loadScript('office.b9.js'), loadScript(CDN.zip), loadScript(CDN.pptx)]);
  if (explain) d.expl = await explForQs(qs);
  return window.OfficeDoc.buildCwPptx(window.PptxGenJS, window.JSZip, d, { CHMAP, figs });
};
function markPdfRows(T) { document.querySelectorAll('#' + T + 'List .pdfrow').forEach(e => e.setAttribute('aria-current', String(e.dataset.k === PDFT[T].sel))); }
const keySwitch = (id, act, extra) => h('label', { class: 'pick1 tgl tgl-hl' }, h('input', Object.assign({ type: 'checkbox', role: 'switch', id, 'data-act': act }, extra || {})), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Answer Key' }));
const expSwitch = (id, act, extra) => h('label', { class: 'pick1 tgl tgl-hl' }, h('input', Object.assign({ type: 'checkbox', role: 'switch', id, 'data-act': act }, extra || {})), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Explanation' }));
function renderPdfTab(T) {
  const view = $('#view' + (T === 'cw' ? 'Cw' : 'Sw')), P = PDFT[T]; if (!view || !BANK) return;
  if (!$('#' + T + 'List')) {
    view.textContent = '';
    view.append(
      h('div', { class: 'rail' }, h('div', { class: 'card' },
        h('div', { class: 'tglrow' }, keySwitch(T + 'Key', 'pdfkey', { 'data-t': T }), expSwitch(T + 'Expl', 'pdfexp', { 'data-t': T })),
        h('div', { class: 'pyqkind', role: 'group', 'aria-label': 'PYQs' }, [['sw', 'Question Paper', 'A whole shift paper'], ['cw', 'Chapterwise', 'Every chapter, all topics']].map(([k, t, d]) =>
          h('button', { type: 'button', class: 'pyqk', 'aria-pressed': String(T === k), onclick: () => { if (PYQSUB !== k) { PYQSUB = k; pyqShow(); } } }, h('strong', { text: t }), h('span', { text: d })))),
        h('div', { class: 'fld' }, h('label', { class: 'lbl', for: T + 'Ex', text: 'Exam' }), h('select', { id: T + 'Ex', onchange: e => { PDFT[T].bucket = e.target.value; PDFT[T].sel = null; PDFT[T].page = 0; renderPdfTab(T); } }, ['Main', 'Adv', 'KCET', 'IAT', 'NDA'].map(k => h('option', { value: k, text: BUCKET_NAME[k] })))),
        T === 'cw' ? h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Years (tick one or many)' }), msel('cwYr', 'years')) : h('div', { class: 'fld' }, h('label', { class: 'lbl', for: T + 'Year', text: 'Year' }), h('select', { id: T + 'Year', onchange: e => { PDFT[T].year = e.target.value; PDFT[T].sel = null; PDFT[T].page = 0; renderPdfTab(T); } })),
        h('div', { class: 'pdflist', id: T + 'List' }, h('div', { class: 'fld' }, h('span', { class: 'lbl', text: T === 'cw' ? 'Chapter' : 'Question paper (date and shift)' }), ssel(T + 'Pick', T === 'cw' ? 'a chapter' : 'a shift'))))),
      h('div', { class: 'stage' }, h('div', { class: 'statbar' }, h('div', { class: 'msg', id: T + 'Msg', 'aria-live': 'polite' }), h('div', { class: 'pgbtns', id: T + 'Pages', hidden: true }), h('div', { class: 'rowbtns', id: T + 'Exp', hidden: true }, ...[['docx', 'Word (editable)'], ['pdf', 'PDF'], ['pptx', 'PowerPoint (editable)']].map(([f, nm]) => h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'pdfdl', 'data-t': T, 'data-k': '', 'data-f': f, title: 'Download ' + nm, 'aria-label': 'Download ' + nm, html: FIMG[f] })), ...['xprint', 'xshare'].map(a => { const b = a === 'xprint' ? prtBtn('pyq') : shrBtn('pyq'); b.dataset.t = T; b.dataset.k = ''; return b; }), wsRow(T)), h('button', { type: 'button', class: 'btn ibtn maxbtn', 'data-act': 'max', 'aria-pressed': 'false', title: 'Maximize', 'aria-label': 'Maximize', html: ICO.max })), h('div', { class: 'pgwrap', id: T + 'Prev' })));
    if (window.ResizeObserver) new ResizeObserver(rescale).observe($('#' + T + 'Prev'));
  }
  $('#' + T + 'Ex').value = P.bucket;
  const list = $('#' + T + 'List'); list.querySelectorAll('.hint').forEach(e => e.remove());
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
  if (P.sel && !rows.some(r => r.k === P.sel)) P.sel = null;
  if (!rows.length) { list.append(h('p', { class: 'hint', text: 'No questions here yet.' })); }
  sfill(T + 'Pick', rows.map(r => [r.k, (T === 'cw' ? r.k + ' ' : '') + r.name + ' (' + qWord(r.qs.length) + ')']), P.sel, k => { P.sel = k; P.page = 0; const r0 = rows.find(r => r.k === k); if (r0) $('.mt', $('#' + T + 'Pick')).textContent = (T === 'cw' ? r0.k + ' ' : '') + r0.name; showPdfPrev(T); }, T === 'cw' ? 'a chapter' : 'a shift', { empty: 'No questions here yet' });
  markPdfRows(T);
  showPdfPrev(T);
}
function showPdfPrev(T) {
  const P = PDFT[T], wrap = $('#' + T + 'Prev'), msg = $('#' + T + 'Msg'), pb = $('#' + T + 'Pages'); if (!wrap) return;
  wrap.textContent = ''; pb.hidden = true; pb.textContent = '';
  const r = P.sel && pdfRows(T).find(x => x.k === P.sel), ex = $('#' + T + 'Exp'); if (ex) { ex.hidden = !r; ex.querySelectorAll('button:not(.wsbtn)').forEach(b => { b.dataset.k = r ? r.k : ''; }); }
  if (!r) { msg.className = 'msg'; msg.textContent = 'Click a row to preview it. The PDF, Word and PowerPoint buttons above the preview save it.'; return; }
  const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!P.key, exp: !!P.exp })), tok = P.tok = (P.tok || 0) + 1; let warn = false;
  const scalers = pages.map(() => { const sc = h('div', { class: 'pgscale' }); wrap.append(h('div', { class: 'pgbox' }, sc)); return sc; }); rescale();
  const say = (done) => { msg.className = 'msg' + (warn ? ' warn' : ''); msg.innerHTML = '<b>' + r.name + ':</b> ' + qWord(r.qs.length) + ', ' + pages.length + (pages.length === 1 ? ' page.' : ' pages' + (done ? ' (scroll to see all).' : ', loading\u2026')); };
  say(pages.length === 1);
  let i = 0;
  const step = () => { if (P.tok !== tok) return; const end = Math.min(i + 3, pages.length); for (; i < end; i++) { const L = layoutSheet(pages[i], scalers[i]); if (L.overflow) warn = true; } rescale(); say(i >= pages.length); if (i < pages.length) setTimeout(step, 0); else addKeyPages(wrap, pages); };
  step();
}
/* ---------- Handouts tab: compact PDF list ---------- */
let HO = null;
/* In-page handout viewer (PDF.js draws the pages; no download or print button). Everyone can view; downloads need Premium. */
let PDFJS_P = null;
function loadPdfJs() {
  if (!PDFJS_P) PDFJS_P = loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').then(() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; return window.pdfjsLib; }).catch(e => { PDFJS_P = null; throw e; });
  return PDFJS_P;
}
async function viewHandout(x, url) {
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); document.body.classList.remove('hv-on'); if (io) io.disconnect(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const pages = h('div', { class: 'hv-pages' }, h('p', { class: 'hv-msg', text: 'Loading the handout\u2026' }));
  const m = h('div', { class: 'hv', role: 'dialog', 'aria-modal': 'true', 'aria-label': x.title },
    h('div', { class: 'hv-bar' }, h('span', { class: 'hv-code', text: x.code }), h('strong', { class: 'hv-title', text: x.title }), h('span', { class: 'hv-n' }),
      h('button', { type: 'button', class: 'hv-x', 'aria-label': 'Close viewer', html: '&times;', onclick: () => close() })), pages);
  let io = null;
  document.body.append(m); document.body.classList.add('hv-on'); document.addEventListener('keydown', onKey); m.querySelector('.hv-x').focus();
  try {
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ url }).promise;
    m.querySelector('.hv-n').textContent = doc.numPages + ' pages';
    pages.textContent = '';
    const draw = async (n, holder) => {
      if (holder.dataset.done) return; holder.dataset.done = '1';
      const pg = await doc.getPage(n), w = Math.min(pages.clientWidth - 24, 1000), v0 = pg.getViewport({ scale: 1 }), sc = w / v0.width, dpr = Math.min(window.devicePixelRatio || 1, 2), vp = pg.getViewport({ scale: sc * dpr });
      const c = h('canvas', { class: 'hv-page', width: Math.floor(vp.width), height: Math.floor(vp.height), 'aria-label': 'Page ' + n });
      c.style.width = Math.floor(vp.width / dpr) + 'px'; holder.textContent = ''; holder.style.height = ''; holder.append(c);
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    };
    const first = await doc.getPage(1), ratio = first.getViewport({ scale: 1 }).height / first.getViewport({ scale: 1 }).width, wd = Math.min(pages.clientWidth - 24, 1000);
    const holders = [];
    for (let n = 1; n <= doc.numPages; n++) { const d = h('div', { class: 'hv-slot', 'data-n': n, style: 'height:' + Math.round(wd * ratio) + 'px;width:' + wd + 'px' }); holders.push(d); pages.append(d); }
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) draw(+e.target.dataset.n, e.target).catch(() => {}); }), { root: pages, rootMargin: '600px 0px' });
    holders.forEach(d => io.observe(d));
  } catch (e) { pages.textContent = ''; pages.append(h('p', { class: 'hv-msg', text: 'The handout could not be opened. Check your internet connection and try again.' })); }
}
async function renderHandouts() {
  const view = $('#viewHo'); if (!view) return;
  if (!HO) { try { HO = await (await fetch('handouts/index.json')).json(); } catch (e) { HO = []; } }
  view.textContent = '';
  if (!document.getElementById('hp-css')) {
    const st = document.createElement('style'); st.id = 'hp-css';
    st.textContent = '#viewHo.hoview{max-width:1080px;gap:16px;padding-block:4px 20px}'
      + '.hp-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 16px;padding-bottom:10px;border-bottom:1px solid var(--rule)}'
      + '.hp-head h1{margin:0;font-size:22px;line-height:1.2;letter-spacing:-.01em;color:var(--ink)}'
      + '.hp-head p{margin:0;font-size:13px;color:var(--muted)}'
      + '.hp-sec{display:flex;flex-direction:column;gap:8px;min-width:0}'
      + '.hp-sech{margin:6px 0 0;font-size:11.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}'
      + '.hp-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:10px}'
      + '.hp-card{--ac:#0a86c2;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:6px 14px;min-width:0;background:var(--panel);border:1px solid var(--rule);border-left:4px solid var(--ac);border-radius:10px;padding:11px 14px;transition:box-shadow .12s,border-color .12s}'
      + '.hp-card:hover{box-shadow:0 3px 12px color-mix(in srgb,var(--ac) 18%,transparent)}'
      + '.hp-code{font:700 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent);border-radius:6px;padding:6px 8px;white-space:nowrap}'
      + '.hp-main{min-width:0}'
      + '.hp-title{margin:0;font-size:15px;line-height:1.3;font-weight:650;color:var(--ink);overflow-wrap:anywhere}'
      + '.hp-meta{margin:2px 0 0;font-size:12px;color:var(--muted)}'
      + '.hp-act{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}'
      + '.hp-btn{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:5px 11px;border-radius:8px;border:1px solid var(--ac);background:var(--ac);color:#fff;font:600 12.5px Figtree,system-ui,sans-serif;cursor:pointer;white-space:nowrap}'
      + '.hp-btn:hover{filter:brightness(1.08)}.hp-btn:focus-visible{outline:3px solid color-mix(in srgb,var(--ac) 40%,transparent);outline-offset:2px}'
      + '.hp-btn.bw{background:transparent;color:var(--ink);border-color:var(--rule)}.hp-btn.bw:hover{background:var(--ink);color:var(--bg);filter:none}'
      + '.hp-btn svg{width:14px;height:14px;flex:none}'
      + '@media(max-width:480px){.hp-list{grid-template-columns:1fr}.hp-card{grid-template-columns:auto 1fr}.hp-act{grid-column:1 / -1;justify-content:flex-start}}';
    document.head.append(st);
  }
  const list = (HO || []).filter(Boolean);
  if (!list.length) { view.append(h('p', { class: 'hint', text: 'No handouts yet.' })); return; }
  const base = x => x.file.replace(/\.pdf$/, '');
  const path = (x, bw) => 'handouts/' + (bw ? x.dir + '/bw/' + base(x) + '_BW.pdf' : x.file);
  const dl = async (x, bw) => {
    const name = base(x) + (bw ? '_BW' : '') + '.pdf';
    if (!downloads) { toast('Downloads are not available in this view'); return; }
    try { toast('Preparing ' + name + '…'); const r = await fetch(path(x, bw)); await downloads.save({ filename: name, data: await r.blob() }); toast('Saved ' + name); }
    catch (er) { if (er && er.code === 'declined') toast('Download cancelled'); else toast('Could not download'); }
  };
  const ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v8m0 0L4.8 6.8M8 10l3.2-3.2M3 13h10"/></svg>';
  const btn = (x, bw) => h('button', { type: 'button', class: 'hp-btn' + (bw ? ' bw' : ''), title: bw ? 'Download PDF (black and white, for printing)' : 'Download PDF', 'aria-label': 'Download ' + x.title + (bw ? ' PDF, black and white' : ' PDF'), html: ICON + (bw ? 'PDF · B&W' : 'PDF'), onclick: () => dl(x, bw) });
  const ACC = ['#e0197a', '#0a86c2', '#16a06a', '#d98200', '#7a3fd1', '#e8590c', '#5a9a00'];
  const EYE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>';
  const viewBtn = x => h('button', { type: 'button', class: 'hp-btn hp-view', title: 'Open in the viewer', 'aria-label': 'View ' + x.title, html: EYE + 'View', onclick: () => viewHandout(x, path(x, false)) });
  const card = (x, k) => h('article', { class: 'hp-card', style: '--ac:' + ACC[k % ACC.length] },
    h('span', { class: 'hp-code', text: x.code }),
    h('div', { class: 'hp-main' }, h('h3', { class: 'hp-title', text: x.title }), h('p', { class: 'hp-meta', text: [x.pages ? x.pages + ' pages' : '', x.orient || 'A4'].filter(Boolean).join(' · ') })),
    h('div', { class: 'hp-act' }, viewBtn(x), G('pdf') ? [btn(x, false), x.nobw ? null : btn(x, true)] : null));
  const secs = [['11', 'Class 11'], ['12', 'Class 12']].map(([c, t]) => { const L = list.filter(x => x.code.startsWith(c)); return L.length ? h('section', { class: 'hp-sec' }, h('h2', { class: 'hp-sech', text: t }), h('div', { class: 'hp-list' }, L.map((x, k) => card(x, k)))) : null; }).filter(Boolean);
  view.append(h('div', { class: 'hp-head' }, h('h1', { text: 'Handouts' }), h('p', { text: G('pdf') ? 'Handwritten revision notes · view or download as PDF' : 'Handwritten revision notes · view online (PDF download with Premium)' })), ...secs);
}

/* ---------- Must Solve tab: questions that repeat in JEE (exact or very similar) and sure-shot picks, by chapter and topic ---------- */
let MUST = null, MTOP = null; const MS = { sel: new Set(), chs: [], kind: 'all', lv: ['L1', 'L2', 'L3'], ans: false, key: false };
const MKIND = { e: ['Exact repeat', 'mk-e'], i: ['Similar type', 'mk-i'], u: ['Sure-shot', 'mk-u'] };
const mYear = q => (q.y ? q.y : 'n/a') + ' ' + (q.e === 'KCET' ? 'KCET' : q.e === 'IAT' ? 'IAT' : q.e === 'NDA' ? 'NDA' : q.e === 'Adv' ? 'Adv' : 'Main');
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
    h('div', { class: 'tglrow' }, keySwitch('mustKey', 'mkey'), expSwitch('mustExpl', 'mexp')),
    h('div', { class: 'fld mtop' },
      h('div', { class: 'mexp' }, ['docx', 'pdf', 'pptx'].map(k => h('button', { type: 'button', class: 'btn ibtn mexpb', 'data-mexp': k, title: 'Download ' + ({ pdf: 'PDF', docx: 'Word (editable)', pptx: 'PowerPoint (editable)' })[k], 'aria-label': 'Download ' + ({ pdf: 'PDF', docx: 'Word', pptx: 'PowerPoint' })[k], html: FIMG[k] || ICO.dl, onclick: () => exportMust(k) })).concat([h('button', { type: 'button', class: 'btn ibtn mexpb', 'data-act': 'xprint', 'data-src': 'must', title: 'Print', 'aria-label': 'Print', html: ICO.print }), h('button', { type: 'button', class: 'btn ibtn mexpb', 'data-act': 'xshare', 'data-src': 'must', title: 'Share the PDF (WhatsApp, Discord, email)', 'aria-label': 'Share the PDF', html: ICO.share })]))),
    wsRow('must'),
    h('p', { class: 'hint', text: 'Questions that came again and again in JEE, in the same or a very similar form, plus questions that are sure to come. Solve these first.' }),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Chapters (tick one or many)' }), chSel),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Type' }), seg([['all', 'All'], ['e', 'Exact repeat'], ['i', 'Similar type'], ['u', 'Sure-shot']], () => MS.kind, k => { MS.kind = k; })),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Level' }), lvBtns),
    h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Choose questions' }),
      h('div', { class: 'mselbar' }, h('button', { type: 'button', class: 'btn', text: 'Select all shown', onclick: () => tick(true) }), h('button', { type: 'button', class: 'btn', text: 'Clear', onclick: () => tick(false) })),
      selCnt),
    h('div', { class: 'mlegend' }, h('p', { class: 'hint', html: '<b>Exact repeat:</b> the same question came again. <b>Similar type:</b> the same idea and method, different numbers or wording. <b>Sure-shot:</b> a standard JEE must-know picked by us.' })))),
    h('div', { class: 'stage' }, h('div', { class: 'statbar' }, msg), list));
  draw(); fillCh();
  KATEX_P && KATEX_P.then(() => math(list)).catch(() => {});
}
const chName0 = c => (CHMAP.get(c) || { n: c }).n;
function mustPages() {
  const all = (MS.flat || []).filter(f => BYID.get(f.it.r)), chosen = all.filter(f => MS.sel.has(f.it.r)), flat = chosen.length ? chosen : all;
  if (!flat.length) { toast('No questions to export'); return null; }
  const chs = [...new Set(flat.map(f => f.c))], one = chs.length === 1;
  const title = one ? chName0(chs[0]) : 'Must Solve';
  const file = 'Must Solve ' + (one ? chs[0] + ' ' + title : chs.length > 3 ? chs.length + ' chapters' : chs.join(' ')) + (MS.kind !== 'all' ? ' ' + MKIND[MS.kind][0] : '') + (MS.lv.length < 3 ? ' ' + MS.lv.join('+') : '');
  const groups = [], gi = new Map();
  flat.forEach(f => { const k = f.c + '|' + f.tp; if (!gi.has(k)) { gi.set(k, { label: (one ? '' : f.c + ' · ') + f.tp, qs: [] }); groups.push(gi.get(k)); } gi.get(k).qs.push(BYID.get(f.it.r)); });
  const lf = levelFlat(groups);
  const pages = packPages(lf, (g, i, n) => ({ title, sub: 'Must Solve · questions to solve first', badge: n > 1 ? 'Page ' + (i + 1) + ' of ' + n : 'Must Solve' }));
  pages.forEach(pg => { if (pg.qs.length && !pg.qs[0].head) pg.qs = [Object.assign({}, pg.qs[0], { head: contHead(pg.qs[0]) })].concat(pg.qs.slice(1)); });
  pages.forEach(pg => { pg.key = !!MS.key; pg.exp = !!MS.exp; });
  return { flat, title, file, pages };
}
async function exportMust(kind) {
  if (!need(kind)) return;
  const m = mustPages(); if (!m) return;
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  const btns = document.querySelectorAll('[data-mexp]'); btns.forEach(b => { b.disabled = true; });
  try {
    if (kind === 'pptx') {
      toast('Preparing PPT…');
      const blob = await window.__qbCwPptx(m.flat.map(f => f.it.r), MS.exp);
      await downloads.save({ filename: m.file.replace(/[\\/:*?"<>|]+/g, ' ') + '.pptx', data: blob }); toast('Saved the PPT');
    } else {
      btns.forEach(b => { b.disabled = false; });
      await doExport(kind, { pages: m.pages, file: m.file });
      return;
    }
  } catch (e) {
    if (e && e.code === 'declined') toast('Download cancelled'); else toast('Export failed: ' + (e && e.message ? e.message : 'try again'));
  } finally { btns.forEach(b => { b.disabled = false; }); }
}
let PYQSUB = (() => { try { return localStorage.getItem('avanti-pyqsub') === 'cw' ? 'cw' : 'sw'; } catch (e) { return 'sw'; } })();
function pyqShow() {
  hideViews();
  try { localStorage.setItem('avanti-pyqsub', PYQSUB); } catch (e) { /* optional */ }
  setTabInner(PYQSUB);
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === 'pyq')));
  setTimeout(rescale, 0);
}
function setTab(t) {
  if (t === 'pyq') { pyqShow(); return; }
  const pv = $('#viewPyq'); if (pv) pv.hidden = true;
  setTabInner(t);
}
function hideViews() { ['Qb', 'Lib', 'Cw', 'Sw', 'Ho', 'Must', 'Syl', 'Pyq', 'Portal'].forEach(n => { const e = $('#view' + n); if (e) e.hidden = true; }); }
function setTabInner(t) {
  hideViews(); const v = $('#view' + ({ qb: 'Qb', lib: 'Lib', cw: 'Cw', sw: 'Sw', ho: 'Ho', must: 'Must', syl: 'Syl' })[t]); if (v) v.hidden = false;
  if (window.AvantiPortal) window.AvantiPortal.leave();
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === t)));
  if (t === 'qb') qbInit(); else if (t === 'syl') renderSyl(); else if (t === 'ho') renderHandouts(); else if (t === 'must') ensureDpp().then(renderMust); else if (t === 'cw' || t === 'sw') ensureDpp().then(() => { renderPdfTab(t); setTimeout(rescale, 0); }); else ensureDpp().then(() => { renderLib(); setTimeout(rescale, 0); });
  setTimeout(rescale, 0);
}

/* ---------- preview ---------- */
function rescale() {
  ['#pgwrap', '#libPrev', '#cwPrev', '#swPrev'].forEach(id => {
    const wrap = $(id); if (!wrap || !wrap.clientWidth) return;
    const cs = getComputedStyle(wrap), k = Math.min(1.35, (wrap.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)) / SHEET_W);
    wrap.querySelectorAll('.pgbox').forEach(bx => { const sc = $('.pgscale', bx); if (!sc) return; sc.style.transform = 'scale(' + k + ')'; bx.style.height = Math.ceil(SHEET_H * k) + 'px'; bx.style.width = Math.floor(SHEET_W * k) + 'px'; bx.style.margin = '0 auto'; });
  });
}

/* ---------- rail (settings) ---------- */

/* ---------- actions ---------- */
function onAct(e) {
  if (e.type === 'click' && e.target.isConnected && !e.target.closest('.msel')) document.querySelectorAll('.msel.open').forEach(x => { x.classList.remove('open'); x.querySelector('.mbtn').setAttribute('aria-expanded', 'false'); });
  if (e.type === 'click' && !e.target.closest('#qbInfoBtn')) { const pp = $('#qbPop'); if (pp && !pp.hidden) { if (e.target.closest('#qbPop')) { const vq = $('#viewQb'); if (vq && vq.hidden) setTab('qb'); } pp.hidden = true; const ib = $('#qbInfoBtn'); if (ib) ib.setAttribute('aria-expanded', 'false'); } }
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act, k = t.dataset.k;
  if (e.type === 'change' && t.tagName !== 'INPUT' && t.tagName !== 'SELECT') return;
  if (e.type === 'click' && t.tagName === 'INPUT') return;
  const gate = { lexp: k, pdfdl: t.dataset.f || 'pdf', xprint: 'print', xshare: 'share', pdfshare: 'share' }[a];
  if (gate && !need(gate)) return;
  switch (a) {
    case 'lexp': exportLib(k); break;
    case 'theme': themeToggle(); break;
    case 'guide': guideOpen(); break;
    case 'guideclose': guideClose(); break;
    case 'guideback': if (e.target === t) guideClose(); break;
    case 'qbinfo': { const pp = $('#qbPop'), op = pp.hidden; pp.hidden = !op; t.setAttribute('aria-expanded', String(op)); break; }
    case 'tab': setTab(k); break;
    case 'pyqsub': PYQSUB = k; pyqShow(); break;
    case 'libkind': LS.kind = k; LS.idk = ''; LS.chTouched = false; renderLib(); break;
    case 'oos': { OOS.ex = k === 'ex'; try { localStorage.setItem('oosEx2', OOS.ex ? '1' : '0'); } catch (e) {} applyOos(); LS.idk = ''; syncOos(); renderLib(); toast(OOS.ex ? 'Out-of-syllabus questions excluded' : 'Out-of-syllabus questions included'); break; }
    case 'pdfex': { const T = t.dataset.t; PDFT[T].bucket = k; PDFT[T].sel = null; PDFT[T].page = 0; renderPdfTab(T); break; }
    case 'pdfrow': { const T = t.dataset.t; PDFT[T].sel = k; PDFT[T].page = 0; markPdfRows(T); showPdfPrev(T); break; }
    case 'max': toggleMax(t); break;
    case 'pdfshare': { const T = t.dataset.t, r = pdfRows(T).find(x => x.k === k); if (r) { const mk = extra => () => { const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key, exp: !!PDFT[T].exp })); doExport('pdf', Object.assign({ pages, file: r.file }, extra)); }; shareMenu(t, { title: r.name, drive: mk({ drive: true }), download: mk({}) }); } break; }
    case 'pdfpage': { const T = t.dataset.t; PDFT[T].page = +k; showPdfPrev(T); break; }
    case 'pdfdl': { const T = t.dataset.t, r = pdfRows(T).find(x => x.k === k); if (r && T === 'cw' && t.dataset.f === 'pptx') { exportCwPptx(r); break; } if (r) { const pages = pdfPages(T, r).map(p => Object.assign({}, p, { key: !!PDFT[T].key, exp: !!PDFT[T].exp })); doExport(t.dataset.f || 'pdf', { pages, file: r.file }); } break; }
    case 'libpub': { const n = LS.pubs.includes(k) ? LS.pubs.filter(x => x !== k) : LS.pubs.concat(k); if (!n.length) { toast('Keep at least one source'); break; } LS.pubs = PUBS.filter(x => n.includes(x)); LS.idk = ''; renderLib(); break; }
    case 'liblv': { const n = LS.lv.includes(k) ? LS.lv.filter(x => x !== k) : LS.lv.concat(k); if (!n.length) { toast('Keep at least one level'); break; } LS.lv = ['L1', 'L2', 'L3'].filter(x => n.includes(x)); renderLib(); break; }
    case 'mall': case 'mnone': { const boxe = $('#' + k); boxe.querySelectorAll('.ml input').forEach(x => { x.checked = a === 'mall'; }); boxe.querySelector('.ml input') ? boxe.querySelector('.ml input').dispatchEvent(new Event('change')) : 0; break; }
    case 'libshow': showLibPrev(); break;
    case 'wssave': case 'wstest': { const w = window.AvantiPortal && wsSource(t.dataset.src); if (w) { if (a === 'wssave') window.AvantiPortal.saveWorksheet(w.ids, w.title); else window.AvantiPortal.createTestFrom(w.ids, w.title); } break; }
    case 'xprint': { const g = pdfSource(t); if (g) printFrom(g.get); break; }
    case 'xshare': { const g = pdfSource(t); if (g) shareFrom(t, g.title, g.get); break; }
    case 'libshuffle': { LS.seed = 1 + Math.floor(Math.random() * 2147483000); showLibPrev(); toast('New set of questions'); break; }
    case 'libswap': { const r = dppCur(); if (dppSwap(r, k)) showLibPrev(); else toast('No other question can replace this one'); break; }
    case 'libpage': LS.page = +k; showLibPrev(); break;
    case 'pdfkey': PDFT[t.dataset.t].key = t.checked; if (PDFT[t.dataset.t].sel) showPdfPrev(t.dataset.t); break;
    case 'mkey': MS.key = t.checked; if (MS.redraw) MS.redraw(); break;
    case 'mexp': MS.exp = t.checked; break;
    case 'pdfexp': PDFT[t.dataset.t].exp = t.checked; if (PDFT[t.dataset.t].sel) showPdfPrev(t.dataset.t); break;
    case 'libexp': LS.exp = $('#libExpl').checked; if (LS.shown) showLibPrev(); break;
    case 'libkey': LS.key = $('#libKey').checked; if (LS.shown) showLibPrev(); break;
  }
}
async function copyText(txt) {
  if (!need('copy')) return;
  try { await navigator.clipboard.writeText(txt); toast('Copied'); }
  catch (e) { toast('Select the text and copy it'); }
}

/* ---------- export ---------- */
function exportHost() { const hst = h('div', { 'data-exphost': '', style: 'position:absolute;left:-10000px;top:0;width:794px;background:#fff' }); document.body.append(hst); return hst; }
async function shot(node, scale) {
  await document.fonts.ready;
  await Promise.all([...node.querySelectorAll('img')].map(im => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  return window.html2canvas(node, { scale, backgroundColor: '#ffffff', logging: false, useCORS: true, onclone: d => { try { const ks = d.createElement('style'); ks.textContent = '.katex-mathml{display:none!important}'; d.head.appendChild(ks); } catch (e) { /* ignore */ } const x = d.querySelector('[data-exphost]'); if (x) { x.style.left = '0px'; x.style.top = '0px'; x.style.zIndex = '-1'; } } });
}
const ansText = q => (q.a || '\u2014').replace(/\\[()\[\]]/g, '');
const fname = (p, ext) => (p.file || p.title || 'sheet').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') + ext;
/* ---------- Print handouts and share menu ---------- */
async function printHandout(x, bw) {
  if (!need('print')) return;
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
const DASH_URL = location.origin + location.pathname;
function closeShare() { const m = document.getElementById('shareMenu'); if (m) m.remove(); document.removeEventListener('click', closeShareOut, true); document.removeEventListener('keydown', closeShareKey, true); }
function closeShareOut(e) { const m = document.getElementById('shareMenu'); if (m && !m.contains(e.target)) closeShare(); }
function closeShareKey(e) { if (e.key === 'Escape') closeShare(); }
function shareMenu(btn, o) {
  if (!need('share')) return;
  closeShare();
  const text = o.title + ' (Avanti Fellows Mathematics Dashboard)', link = o.url || DASH_URL, full = text + '\n' + link;
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
  if (!need(kind)) return;
  if (!p0) return;
  const pages = p0.pages ? p0.pages : [p0], pk = p0 && p0.pages ? p0 : pages[0];
  if (!pages.length || !pages[0].qs.length) { toast('Add some questions first'); return; }
  if (!downloads) { toast('Downloads are not available in this view'); return; }
  const btns = document.querySelectorAll('[data-act="exp"],[data-act="lexp"],[data-act="lexpall"],[data-act="pdfdl"],[data-act="xprint"],[data-act="xshare"]'); btns.forEach(b => { b.disabled = true; });
  const multi = pages.length > 1, file = fname(pk, '.' + kind);
  toast('Preparing ' + kind.toUpperCase() + '\u2026');
  if (kind !== 'pdf') {
    try {
      const blob = await buildEditable(kind, pages.map(p => Object.assign({}, p, { key: p.key }, kind === 'docx' ? { cols: 2 } : {})));
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
      const ep = pages.filter(p => p.exp);
      if (ep.length) { const items = await explItems(ep); if (!items.length) toast('None of these questions has an explanation yet'); else for (const es of explSheets(items, ep[0], hst)) { const c3 = await shot(es, 2); pdf.addPage(); pdf.addImage(c3.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297); es.remove(); } }
      blob = pdf.output('blob');
    }
    if (pk.onBlob) await pk.onBlob(blob, file); else { await downloads.save({ filename: file, data: blob }); toast('Saved ' + file); }
  } catch (e) {
    if (pk.onFail) pk.onFail(e);
    if (e && e.code === 'declined') toast('Download cancelled');
    else toast('Export failed: ' + (e && e.message ? e.message : 'try again'));
  } finally { hst.remove(); btns.forEach(b => { b.disabled = false; }); }
}
/* Explanation toggle: full solutions come from qb/data/sol.json, shown after the answer key on their own pages */
let SOLT = null;
function loadSolsT() { if (!SOLT) SOLT = fetch('qb/data/sol.json').then(r => { if (!r.ok) throw new Error('sol'); return r.json(); }).catch(() => { SOLT = null; return {}; }); return SOLT; }
async function explItems(pages) {
  const m = await loadSolsT(), out = [];
  pages.forEach(p => { const lab = String(p.badge || p.title).replace(/\s*\u00b7\s*Page \d+ of \d+$/, ''); p.qs.forEach((q, i) => { const sv = m[q.i]; if (!sv) return; const t = typeof sv === 'string' ? sv : sv.t; if (!t || !String(t).trim()) return; out.push({ n: i + 1 + (p.start || 0), lab, text: String(t), f: typeof sv === 'string' ? null : (sv.f || null) }); }); });
  return out;
}
async function explForQs(qs) {
  const m = await loadSolsT(), out = [];
  for (let k = 0; k < qs.length; k++) { const sv = m[qs[k].i]; if (!sv) continue; const t = typeof sv === 'string' ? sv : sv.t; if (!t || !String(t).trim()) continue; let fig = null; const f = typeof sv === 'string' ? null : sv.f; if (f && f.svg) { try { fig = await figPng(f); } catch (e) { /* skip the picture */ } } out.push({ n: k + 1, text: String(t), fig }); }
  return out;
}
(function () { const st = document.createElement('style'); st.textContent = '.tglrow{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;margin:4px 0 14px}.tglrow .tgl-hl{margin:0!important;padding:0 0 0 0!important;background:transparent!important;border:0!important;box-shadow:none!important;min-height:0!important;border-radius:0!important;font-weight:600}.tglrow .tgl-hl input{left:0!important}.gd-note{border-left:4px solid var(--accent,#0e6b84);background:var(--accent-soft,#dbeef3);padding:10px 14px;border-radius:8px;margin:0 0 14px;font-weight:600}'; document.head.append(st); })();
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
  const ep0 = pages.filter(p => p.exp), eItems = ep0.length ? await explItems(ep0) : [], eLab = new Set(eItems.map(x => x.lab)).size > 1;
  for (const e of eItems) { e.lab = eLab ? e.lab : ''; e.fig = null; if (e.f && e.f.svg) { try { e.fig = await figPng(e.f); } catch (x) { /* skip the picture */ } } }
  if (pages.length > 1 && pages[0].kind === 'test') pages = [Object.assign({}, pages[0], { qs: [].concat(...pages.map(p => p.qs)), start: 0, pageOf: '' })];
  await Promise.all([loadScript('mathdoc.b3.js'), loadScript('office.b9.js'), loadScript(CDN.zip), kind === 'docx' ? loadScript(CDN.docx) : loadScript(CDN.pptx)]);
  const figs = {};
  for (const p of pages) for (const q of p.qs) if (q.f && !figs[q.i]) { try { figs[q.i] = await figPng(q.f); } catch (e) { /* skip the picture */ } }
  let logo = null; try { const rs = await fetch('img/avanti-logo-dark.png'); if (rs.ok) { const bl = await rs.blob(), bm = await createImageBitmap(bl); logo = { data: new Uint8Array(await bl.arrayBuffer()), w: bm.width, h: bm.height, dataUrl: await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); }) }; } } catch (e) { /* no logo file: skip */ }
  const H = { CHMAP, DIFF, tagText, keyLine, figs, matchParts, expl: eItems, logo };
  return kind === 'docx' ? window.OfficeDoc.buildDocx(window.docx, window.JSZip, pages, H) : window.OfficeDoc.buildPptx(window.PptxGenJS, window.JSZip, pages, H);
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
          h('td', { class: 'mono sy-code' }, String(s.code).replace(/^JM-/, '')),
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
const GUIDE_HTML = () => `
<p class="gd-note">Questions and solutions for exams before 2000 are in working mode and will take time to update.</p>
<p class="gd-lead">The Mathematics Dashboard is Avanti Fellows' one place for JEE Maths teaching material: a searchable question bank, ready-made DPPs, past-year papers, must-solve lists and revision handouts. Everything can be downloaded as Word, PDF or PowerPoint.</p>
<nav class="gd-toc" aria-label="Guide sections"><a href="#gd-qb">Question Bank</a><a href="#gd-dpp">DPPs</a><a href="#gd-pyq">PYQs</a><a href="#gd-must">Must Solve</a><a href="#gd-ho">Handouts</a><a href="#gd-dates">Exam dates</a><a href="#gd-exp">Downloads</a><a href="#gd-tips">Tips</a></nav>
<h3 id="gd-qb">1. Question Bank</h3>
<p>Every question in one list: JEE Main, JEE Advanced, AIEEE and IIT-JEE previous-year questions (PYQs) plus practice questions from different sources.</p>
<ul>
<li><b>Find questions:</b> search by words or question id; filter by chapter, source, exam, year, class, level (L1 easy, L2 medium, L3 hard), type (single, multiple, numerical) and topic.</li>
<li><b>Each question card</b> shows exam, date and shift, level and tags. Use the eye icon to show the answer, the book icon to open the solution, and the ≡ menu for the topic, type, question id and <b>Flag</b> (to report a wrong question).</li>
<li><b>Show all answers / Hide options / Show selected only</b> change how the whole page looks. <b>Attention</b> lists questions flagged for checking; <b>Out of syllabus</b> marks questions on topics no longer in JEE.</li>
<li><b>Tick questions</b> (or Select all filtered) and export just those as Word, PDF or PowerPoint. "Answer Key" adds the key at the end and "Explanation" adds the full solutions on new pages after it.</li>
<li><b>Overview icon</b> (bar-chart circle at the top right) opens the question counts, the chapter-wise count, the syllabus priority and the chapter weightage charts.</li>
</ul>
<h3 id="gd-dpp">2. DPPs</h3>
<p>Ready-made practice sheets. Choose what you need:</p>
<ul>
<li><b>Subtopic DPPs</b> – practice questions grouped by subtopic of a chapter.</li>
<li><b>Level 1, 2, 3 booklet</b> – a chapter booklet by difficulty and source.</li>
<li><b>PYQs topic-wise</b> – past-year questions of a chapter by topic, filtered by exam, year and level.</li>
</ul>
<p>Pick one or many chapters, see the live preview page by page, and download. Turn on "Answer Key" to add answers on a separate page and "Explanation" to add the full solutions.</p>
<h3 id="gd-pyq">3. PYQs</h3>
<p>Past-year papers in two forms: <b>Question Paper</b> (a full shift paper by date and shift, in paper order) and <b>Chapterwise</b> (all PYQs of a chapter). Pick JEE Main, JEE Advanced, KCET, IAT or NDA, preview, then download.</p>
<h3 id="gd-must">4. Must Solve</h3>
<p>Questions that came again and again in JEE, in the same or a very similar form, plus questions that are sure to come. Choose chapters with the tick-box list. Inside a chapter, questions are grouped by topic; each group shows a note on why it matters (<i>Sure-shot</i>, <i>Must know</i>) and in which years the question came. Tick and download like the Question Bank.</p>
<h3 id="gd-ho">5. Handouts</h3>
<p>Short revision notes chapter by chapter (PDF). Preview each page, switch to the black-and-white print version with the half-filled circle icon, maximise to read, or download.</p>
<h3 id="gd-dates">Exam dates</h3>
<p>Dates of every exam whose papers are in the bank. New exams are added to this table when they are uploaded.</p>
<div id="gd-dates-box" style="max-height:340px;overflow:auto;border:1px solid var(--color-border-line,#ccc);border-radius:8px">Loading…</div>
<h3 id="gd-exp">Downloads</h3>
<ul>
<li><b>Word</b> is fully editable, with real equations. <b>PowerPoint</b> is editable too. <b>PDF</b> is ready to print.</li>
<li>Question papers use two columns. Papers exported from chapters do not repeat chapter headings.</li>
<li>If your browser blocks a download, allow downloads for this page and try again.</li>
</ul>
<h3 id="gd-tips">Tips</h3>
<ul>
<li>The <b>moon/sun icon</b> switches light and dark mode.</li>
<li>On a phone the menu wraps into two rows; every feature works there too.</li>
<li>Seen a wrong question, answer or figure? Open the ≡ menu and press <b>Flag</b>.</li>
<li>Maths is written in proper notation; if a formula looks broken, refresh the page once.</li>
</ul>

<p class="gd-foot">Built by Ankit for the Avanti Fellows teaching team.</p>`;

function guideOpen() {
  let m = document.getElementById('guideModal');
  if (m) m.remove();
  m = h('div', { class: 'gd-back', id: 'guideModal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Site guide', 'data-act': 'guideback' },
    h('div', { class: 'gd-card' },
      h('div', { class: 'gd-top' }, h('h2', { text: 'How to use this dashboard' }), h('button', { type: 'button', class: 'gd-x', 'data-act': 'guideclose', 'aria-label': 'Close guide', html: '&times;' })),
      h('div', { class: 'gd-body', html: GUIDE_HTML() })));
  document.body.append(m);
  m.querySelectorAll('.gd-toc a').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); const t = m.querySelector(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  guideDates(m);
  const x = m.querySelector('.gd-x'); if (x) x.focus();
}
function guideDates(m) {
  const box = m.querySelector('#gd-dates-box'); if (!box) return;
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  box.style.cssText = 'max-height:none;overflow:visible;border:0';
  fetch('qb/data/examdates.json').then(r => { if (!r.ok) throw new Error('dates'); return r.json(); }).then(d => {
    const exams = d.exams || []; let cur = 0;
    const line = 'var(--color-border-line,#d8d2c4)', mute = 'var(--color-text-secondary,#6E6757)';
    const draw = () => {
      const ex = exams[cur] || { rows: [] };
      let h = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px">' + exams.map((e, i) => '<button type="button" data-ex="' + i + '" style="cursor:pointer;font:inherit;font-size:12.5px;padding:4px 12px;border-radius:999px;border:1px solid ' + (i === cur ? 'transparent' : line) + ';background:' + (i === cur ? 'var(--color-fg,#1c1a16)' : 'transparent') + ';color:' + (i === cur ? 'var(--color-bg,#fff)' : 'inherit') + '">' + esc(e.name) + '</button>').join('') + '</div>';
      if (ex.sub) h += '<div style="font-size:12px;color:' + mute + ';margin:0 0 8px">' + esc(ex.sub) + ' · ' + (ex.rows || []).length + ' years</div>';
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px">';
      (ex.rows || []).forEach(r => {
        h += '<div style="border:1px solid ' + line + ';border-radius:10px;padding:8px 10px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px">' + esc(r.y) + '</b>' + (r.v ? '<span title="Checked against official or news sources" style="font-size:11px;color:#2f7d4f">✓ checked</span>' : '<span title="As stored in the bank, not checked online" style="font-size:11px;color:' + mute + '">from bank</span>') + '</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">';
        if (!(r.d || []).length) h += '<span style="font-size:12px;color:' + mute + ';font-style:italic">Date not added yet</span>';
        (r.d || []).forEach(x => { h += '<span style="font-size:12px;border-radius:6px;padding:2px 7px;background:var(--color-bg-subtle,rgba(127,127,127,.12))">' + esc(x[0]) + (x[1] ? ' <span style="color:' + mute + '">· ' + esc(x[1]) + '</span>' : '') + '</span>'; });
        h += '</div></div>';
      });
      h += '</div>';
      if (d.note) h += '<p style="font-size:12px;color:' + mute + ';margin:10px 0 0">' + esc(d.note) + (d.asof ? ' Updated ' + esc(d.asof) + '.' : '') + '</p>';
      box.innerHTML = h;
      box.querySelectorAll('button[data-ex]').forEach(b => b.addEventListener('click', () => { cur = +b.getAttribute('data-ex'); draw(); }));
    };
    draw();
  }).catch(() => { box.textContent = 'The dates could not load. Please refresh the page.'; });
}
function guideClose() { const m = document.getElementById('guideModal'); if (m) m.remove(); const b = document.getElementById('guideBtn'); if (b) b.focus(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('guideModal')) guideClose(); });
function buildShell() {
  const root = $('#app');
  root.innerHTML = '';
  const tb = (k, text, on) => h('button', { type: 'button', class: 'tb', 'data-act': 'tab', 'data-k': k, 'aria-pressed': String(!!on), text });
  root.append(
    h('div', { class: 'shell' },
      h('header', { class: 'topbar' },
        h('div', { class: 'tb-head' }, h('img', { class: 'tb-logo', src: 'img/avanti-logo.png', alt: 'Avanti Fellows', width: 150, height: 51 }), h('h1', { class: 'tb-title', text: 'Mathematics Dashboard' }), h('span', { class: 'tb-sub', text: "JEE, CET, NDA, IAT, PYQ's, DPP's, Handouts" })),
        h('button', { type: 'button', class: 'tb-theme', id: 'themeBtn', 'data-act': 'theme', 'aria-pressed': 'false' }),
        h('button', { type: 'button', class: 'tb-theme tb-guide', id: 'guideBtn', 'data-act': 'guide', title: 'Guide: what is in this site', 'aria-label': 'Guide: what is in this site', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>' }),
        h('button', { type: 'button', class: 'tb-theme tb-info', id: 'qbInfoBtn', 'data-act': 'qbinfo', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'Question Bank overview', 'aria-label': 'Question Bank overview', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' }),
        h('div', { class: 'tb-pop', id: 'qbPop', hidden: true, role: 'menu' }, [['heroov', 'Mathematics Bank: Question Counts'], ['overview', 'Chapter-wise Count'], ['syl', 'Syllabus Priority'], ['wchart', 'Chapter Weightage']].map(([k, t]) => k === 'syl' ? h('button', { type: 'button', class: 'tb-item', role: 'menuitem', 'data-act': 'tab', 'data-k': 'syl', text: t }) : h('button', { type: 'button', class: 'tb-item', role: 'menuitemradio', 'aria-selected': 'false', 'aria-checked': 'false', 'data-qbpanel': k, text: t }))),
        h('nav', { class: 'tb-menu' }, tb('qb', 'Question Bank', true), tb('lib', 'DPPs'), tb('pyq', 'PYQs'), tb('must', 'Must Solve'), tb('ho', 'Handouts'), h('div', { class: 'tb-prof', id: 'tbProfile' }))),
      h('main', { class: 'main' },
        h('div', { id: 'viewQb', class: 'qbhost' }),
        h('div', { id: 'viewLib', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewPyq', class: 'pyqpick', hidden: true }),
        h('div', { id: 'viewCw', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewSw', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewHo', class: 'hoview', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewMust', class: 'make', hidden: true }, h('p', { class: 'hint', text: 'Loading\u2026' })),
        h('div', { id: 'viewSyl', class: 'sy-wrap', hidden: true }),
        h('div', { id: 'viewPortal', class: 'pt-wrap', hidden: true })),
      h('footer', { class: 'app-foot', id: 'appFoot' },
        h('span', { class: 'af-brand' }, 'Made with ', h('span', { class: 'af-heart', style: 'color:#e11d48', 'aria-label': 'love', text: '\u2665' }), ' by Ankit'),
        h('span', { class: 'af-ver', id: 'appFootSite' }),
        h('span', { class: 'af-ver', id: 'appFootVer' }),
        h('span', { class: 'af-link', id: 'appFootLink' }))));
  if (!document.getElementById('app-fit-css')) { const fs2 = document.createElement('style'); fs2.id = 'app-fit-css'; fs2.textContent = 'html,body{max-width:100%;overflow-x:hidden;overscroll-behavior-x:none}.tb-menu{max-width:100%}.katex-mathml{max-width:1px!important;overflow:hidden!important}'; document.head.appendChild(fs2); }
  if (!document.getElementById('app-foot-css')) { const st = document.createElement('style'); st.id = 'app-foot-css'; st.textContent = '.app-foot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 14px;margin:28px auto 0;padding:14px 16px 20px;border-top:1px solid var(--color-border-line,rgba(128,128,128,.28));font-size:12px;line-height:1.4;letter-spacing:.02em;color:var(--color-fg-muted,#6b7280)}.app-foot .af-brand{font-weight:600;order:3;flex-basis:100%;text-align:center;margin-top:8px}.app-foot .af-ver::before{display:none!important}.app-foot .af-ver:not(:empty)::before,.app-foot .af-link:not(:empty)::before{content:"|";margin-right:14px;opacity:.45}.app-foot .qb-sstat-link{font:inherit;color:inherit;text-decoration:none;cursor:pointer;border-bottom:1px dotted currentColor;padding:0}.app-foot .qb-sstat-link:hover{color:var(--color-fg,#111);border-bottom-style:solid}'; document.head.append(st); }
}
function buildLib() {
  if (!document.getElementById('dpp-css')) { const st = document.createElement('style'); st.id = 'dpp-css'; st.textContent = '.dslide{width:100%;margin:6px 0 2px;accent-color:#16306b;cursor:pointer}.dslide:disabled{opacity:.4;cursor:not-allowed}.dticks{display:flex;justify-content:space-between;gap:6px;font-size:12px;font-weight:600;color:var(--muted,#6b7280)}.dticks span:nth-child(2){text-align:center}.dticks span:last-child{text-align:right}.dswap{position:absolute;top:1.9em;left:0;z-index:3;width:23px;height:23px;display:flex;align-items:center;justify-content:center;font:700 13px/1 system-ui,sans-serif;padding:0;border-radius:999px;border:1px solid #c9d1e3;background:#fff;color:#1f3f95;cursor:pointer;opacity:.85}.dswap:hover{opacity:1;background:#e8eefc}'; document.head.append(st); }
  const slide = (id, label, key, ticks) => h('div', { class: 'fld' }, h('span', { class: 'lbl', text: label }),
    h('input', { type: 'range', class: 'dslide', id, min: '1', max: '3', step: '1', value: String(LS[key]), 'aria-label': label, onchange: e => { LS[key] = +e.target.value; renderLib(); }, oninput: e => { LS[key] = +e.target.value; } }),
    h('div', { class: 'dticks', 'aria-hidden': 'true' }, ticks.map(t => h('span', { text: t }))), h('p', { class: 'hint', id: id === 'toughSl' ? 'toughHint' : 'mixHint' }));
  return h('div', { id: 'viewLib', class: 'make' },
    h('div', { class: 'rail' },
      h('div', { class: 'card' },
        h('h3', { text: 'Topicwise DPPs (After every class)' }),
        h('p', { class: 'hint', id: 'libNote' }),
        h('div', { class: 'tglrow' },
          h('label', { class: 'pick1 tgl tgl-hl' }, h('input', { type: 'checkbox', role: 'switch', id: 'libKey', 'data-act': 'libkey' }), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Answer Key' })),
          h('label', { class: 'pick1 tgl tgl-hl' }, h('input', { type: 'checkbox', role: 'switch', id: 'libExpl', 'data-act': 'libexp' }), h('span', { class: 'tgl-track', 'aria-hidden': 'true' }), h('span', { text: 'Explanation' }))),
        h('div', { class: 'fld' }, h('span', { class: 'lbl', text: 'Chapters (tick one or many)' }), msel('libCh', 'chapters')),
        h('div', { class: 'fld', id: 'fldDpp' }, h('span', { class: 'lbl', id: 'lblDpp', text: 'Subtopics (tick one or many)' }), msel('libDpp', 'subtopics')),
        h('div', { class: 'fld', id: 'fldSrc' }, h('span', { class: 'lbl', text: 'Source (tick one or many)' }), msel('libSrc', 'sources')),
        h('div', { class: 'fld', id: 'fldYear', hidden: true }, h('span', { class: 'lbl', text: 'Year of the exam (leave blank for all)' }), msel('libYr', 'years')),
        slide('toughSl', 'Toughness of the DPP', 'tough', ['1 · Easy', '2 · Mixed', '3 · Tough']),
        slide('mixSl', 'Practice questions or PYQs', 'mixv', ['N · Practice', 'O · 50 : 50', 'P · PYQ']),
        oosBox())),
    h('div', { class: 'rail' },
      h('div', { class: 'stage' }, h('div', { class: 'statbar' }, h('div', { class: 'msg', id: 'libMsg', 'aria-live': 'polite' }),
        h('div', { class: 'pgbtns', id: 'libPages', hidden: true }),
        h('div', { class: 'rowbtns', id: 'libExp' },
          h('button', { type: 'button', class: 'btn', 'data-act': 'libshuffle', title: 'Pick a different set of questions for the same settings', text: '\u21bb Shuffle' }),
          h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'docx', title: 'Download Word (editable)', 'aria-label': 'Download Word (editable)', html: FIMG.docx }),
          h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'pdf', title: 'Download PDF', 'aria-label': 'Download PDF', html: FIMG.pdf }),
          h('button', { type: 'button', class: 'btn ibtn', 'data-act': 'lexp', 'data-k': 'pptx', title: 'Download PowerPoint (editable)', 'aria-label': 'Download PowerPoint (editable)', html: FIMG.pptx }),
          prtBtn('lib'), shrBtn('lib'), wsRow('lib'))),
        h('div', { class: 'pgwrap', id: 'libPrev' }))));
}
/* Whole shift paper: take every question of one past paper, in paper order, as a 3 hour test */

let dppP = null, listeners = false;
function ensureDpp() {
  if (dppP) return dppP;
  return (dppP = (async () => {
    const [bank, css] = await Promise.all([loadBank(), document.getElementById('kcss') ? Promise.resolve(null) : fetch('katex.css').then(r => r.text())]);
    if (css) { const st = h('style', { text: css }); st.id = 'kcss'; document.head.append(st); }
    BANK = bank; BANK.all = bank.qs.slice(); bank.qs.forEach(q => BYID.set(q.i, q)); bank.chapters.forEach(c => CHMAP.set(c.c, c));
    initPubs(); applyOos();
    KATEX_P = loadScript(CDN.katex).then(() => loadScript(CDN.auto)).then(() => { if (LS.shown) showLibPrev(); PDFT.cw.v++; PDFT.sw.v++; ['cw', 'sw'].forEach(t => { if ($('#' + t + 'List') && !$('#view' + (t === 'cw' ? 'Cw' : 'Sw')).hidden) renderPdfTab(t); }); }).catch(() => {});
    const lib = $('#viewLib'); const wasLib = lib.hidden;
    const nl = buildLib();
    nl.hidden = wasLib; lib.replaceWith(nl);
    if (window.ResizeObserver) { const ro = new ResizeObserver(rescale); ro.observe($('#libPrev')); }
    renderLib();
  })().catch(e => { dppP = null; const m = $('#viewLib'); if (m) { m.textContent = ''; m.append(h('p', { class: 'hint', text: 'The library did not load. Refresh the page.' })); } throw e; }));
}
function boot() {
  buildShell(); themeInit();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMax(); }); document.addEventListener('click', onAct); document.addEventListener('change', onAct);
  window.addEventListener('resize', rescale);
  downloads = gatedDownloads(downloads);
  qbInit();
}
/* ---------- Question bank tab: the question bank's own page and code, loaded on first use ---------- */
let qbLoaded = false;
async function qbInit() {
  if (qbLoaded) return; qbLoaded = true;
  const host = $('#viewQb'); host.textContent = ''; host.append(h('div', { class: 'qbload' }, h('div', { class: 'spin' }), h('p', { text: 'Loading the question bank\u2026' })));
  try {
    const pre = window.__qbPre || {};
    const html = await (pre.html || fetch('qb/qb.b525.html').then(r => r.text()));
    const js = await (pre.js || fetch('qb/qb-all.b537.js').then(r => r.text()));
    await Promise.all([document.getElementById('kcss') ? null : fetch('katex.css').then(r => r.text()).then(c => { if (!document.getElementById('kcss')) { const st = h('style', { text: c }); st.id = 'kcss'; document.head.append(st); } }), loadScript(CDN.katex)]).catch(() => {});
    host.innerHTML = '<div id="dash-root">' + html + '</div>';
    const sc = document.createElement('script'); sc.textContent = js; document.head.append(sc);
    await window.__qbStart();
  } catch (e) { qbLoaded = false; host.textContent = 'The question bank did not load. Refresh the page.'; }
}
window.AvantiTeacher = {
  start: o => { OPTS = o; boot(); },
  setTab: t => setTab(t), hideViews: () => hideViews(), toast: m => toast(m),
  /* the question bank (same data as the Question Bank, DPPs and PYQs tabs), for the test maker */
  bank: () => ensureDpp().then(() => ({ qs: BANK.all, byId: BYID, chapters: CHMAP })),
  /* saved worksheets: the same PDF / Word / PowerPoint export and share menu as DPPs (plan checks inside) */
  exportIds: async (ids, title, kind) => { await ensureDpp(); const pages = idPages(ids, title); if (!pages.length) { toast('None of these questions is in the question bank now'); return; } doExport(kind, { pages, file: title }); },
  pdfIds: async (ids, title) => { await ensureDpp(); const pages = idPages(ids, title); if (!pages.length) { toast('None of these questions is in the question bank now'); return null; } return pdfBlobOf({ pages, file: title }); },
  shareIds: async (btn, ids, title) => { await ensureDpp(); const pages = idPages(ids, title); if (!pages.length) { toast('None of these questions is in the question bank now'); return; } shareFrom(btn, title, () => pdfBlobOf({ pages, file: title })); },
  math: node => math(node)
};


})();
