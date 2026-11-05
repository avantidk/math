/* Avanti Fellows · editable Word and PowerPoint export.
   Text stays text and every formula is a native Office equation. */
(function (root) {
'use strict';
const M = () => root.MathDoc;
const NAVY = '1E3A8A', GREY = '6B7280';
const LET = 'ABCD';

/* ---------- shared bits ---------- */
/* "match the lists" questions (List-I / List-II, Column I / Column II): intro + two lists, for every matching question whatever its type */
function MP(text) {
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
/* how many options per line: 4 if they fit, else 2 (A B / C D), else 1. W = usable width in twips */
function optPerLine(q, W) {
  if (!q.o.length) return 1;
  const mx = Math.max(...q.o.map(o => M().width(o)));
  for (const n of [4, 2]) if (mx <= (W / n / 210 - 2.1) * 0.92) return n;
  return 1;
}
function optLayout(q) { const L = q.o.map(o => M().width(o)); return q.o.length && Math.max(...L) <= 3.5 && L.reduce((x, y) => x + y, 0) <= 11 ? 'row' : 'col'; }
function chapterName(H, q) { const c = H.CHMAP.get(q.cc); return c ? c.n : ''; }

/* answer-key text: pages of the same sheet become one continuous line; a label only when there are several sheets */
function keyBlocks(keys) {
  const groups = [];
  keys.forEach(p => { const lab = String(p.badge || p.title).replace(/\s*·\s*Page \d+ of \d+$/, ''), g = groups[groups.length - 1], items = p.qs.map((q, i) => (i + 1 + (p.start || 0)) + '-' + M().plainText(q.a || '—')); if (g && g.lab === lab) g.items.push(...items); else groups.push({ lab, items }); });
  return groups.map(g => ({ lab: groups.length > 1 ? g.lab : '', line: g.items.join('    ') }));
}

/* ---------- Word ---------- */
/* tall formulas inside a line of text (matrices, cases, chains of fractions) go on a line of their own, like in the PDF */
function tall(s) {
  return String(s).replace(/\\\(([\s\S]+?)\\\)/g, (m, x) => ((/\\begin\{/.test(x) || ((x.match(/\\d?frac/g) || []).length >= 2 && x.length > 24)) ? '\\[' + x + '\\]' : m));
}
/* measure a question the way Word will lay it out: the same text and maths drawn off screen at the Word column width (px at 96 dpi) */
let MHOST = null;
function measureQ(q, stem, per, colTw, tag) {
  const K = root.katex, doc = root.document; if (!K || !doc) return 0;
  if (!MHOST) { MHOST = doc.createElement('div'); MHOST.style.cssText = 'position:absolute;left:-20000px;top:0;visibility:hidden;font:14px Calibri,Carlito,"Segoe UI",Arial,sans-serif;line-height:1.22'; doc.body.appendChild(MHOST); }
  const px = colTw / 15, esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
  const html = s => M().split(s).map(p => { if (p.t === 'text') return esc(p.s); try { return p.display ? '<div style="text-align:center;margin:3px 0 4px">' + K.renderToString(p.s, { displayMode: true, throwOnError: false }) + '</div>' : K.renderToString(p.s, { throwOnError: false }); } catch (e) { return esc(p.s); } }).join('');
  const opts = q.o.length ? '<div style="display:grid;grid-template-columns:repeat(' + per + ',1fr);margin-left:23px;row-gap:' + (q.o.some(o => /\\d?frac|\\begin/.test(o)) ? 8 : 2) + 'px">' + q.o.map((o, k) => '<div style="padding-right:4px"><b>(' + LET[k] + ')</b> ' + html(o) + '</div>').join('') + '</div>' : '<div style="height:7px"></div>';
  MHOST.style.width = px + 'px';
  MHOST.innerHTML = '<div style="padding-left:23px;margin-top:7px">' + html(stem) + '</div>' + (tag ? '<div style="font-size:11px;padding-left:23px">' + esc(tag) + '</div>' : '') + opts;
  return MHOST.offsetHeight;
}
async function buildDocx(D, JSZip, pages, H) {
  const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const FS = 21; // half-points: 10.5 pt
  const eqs = [];
  const mk = (tex, display) => { eqs.push({ tex, display }); return new D.TextRun({ text: '⟦E' + (eqs.length - 1) + '⟧', size: FS }); };
  const eq = tex => mk(tex, false), eqd = tex => mk(tex, true);
  const tr = (text, o) => new D.TextRun(Object.assign({ text, size: FS, font: 'Calibri' }, o || {}));
  function textRuns(s, o) {
    const lines = s.split('\n'), out = [];
    lines.forEach((ln, k) => { if (k) out.push(new D.TextRun(Object.assign({ break: 1, size: FS, font: 'Calibri' }, o || {}))); if (ln) out.push(tr(ln, o)); });
    return out;
  }
  let curW = 4683;
  /* a ruled array (\begin{array}{|l|l|} ... \hline) becomes a real Word table, so its lines show */
  const ARR = /^\s*(?:\\def\\arraystretch\{[\d.]+\})?\s*\\begin\{array\}\{([^}]*)\}([\s\S]*)\\end\{array\}\s*$/;
  const isArr = t => { const m = ARR.exec(t); return !!(m && m[1].includes('|')); };
  /* a table cell: words in \text{...} stay ordinary text (so they wrap), only the maths between them is an equation */
  const cellMixed = c => ('\\(' + c.replace(/\\text(?:bf|rm)?\{([^{}]*)\}/g, (m, x) => '\\)' + x + '\\(') + '\\)').replace(/\\\(\s*(?:\\ |\\,|\;|\\quad|\s)*\\\)/g, ' ').replace(/^\s+|\s+$/g, '');
  function arrayTable(t, popt, out) {
    const m = ARR.exec(t), rows = m[2].split(/\\\\(?:\[[^\]]*\])?/).map(r => r.replace(/\\hline/g, '').trim()).filter(Boolean).map(r => r.split(/(?<!\\)&/).map(c => c.trim()));
    const nc = Math.max(...rows.map(r => r.length)), ind = (popt.indent && popt.indent.left) || 0, tw = curW - ind, cw = Math.floor(tw / nc);
    const bd = { style: D.BorderStyle.SINGLE, size: 4, color: '9AA3B8' }, cb = { top: bd, bottom: bd, left: bd, right: bd };
    out.push(new D.Table({ width: { size: cw * nc, type: D.WidthType.DXA }, columnWidths: Array(nc).fill(cw), layout: D.TableLayoutType.FIXED, indent: { size: ind, type: D.WidthType.DXA },
      rows: rows.map((r, ri) => new D.TableRow({ cantSplit: true, children: Array.from({ length: nc }, (_, j) => new D.TableCell({ width: { size: cw, type: D.WidthType.DXA }, borders: cb, margins: { top: 30, bottom: 30, left: 80, right: 60 }, shading: ri === 0 && /\\textbf/.test(r.join('')) ? { type: D.ShadingType.CLEAR, fill: 'EEF1F8', color: 'auto' } : undefined,
        children: r[j] ? blocks(cellMixed(r[j]), [], { spacing: { before: 0, after: 0 } }, ri === 0 && /\\textbf/.test(r[j]) ? { bold: true } : null) : [new D.Paragraph({ children: [] })] })) })) }));
    out.push(new D.Paragraph({ spacing: { before: 0, after: 60 }, children: [new D.TextRun({ text: '', size: 8 })] }));
  }
  /* one question part (stem or option) -> paragraphs; display maths gets its own paragraph */
  function blocks(text, first, popt, runOpt) {
    const out = []; let cur = first.slice();
    let firstP = true;
    const flush = () => { if (cur.length) { const po = (!firstP && popt.indent && popt.indent.hanging) ? Object.assign({}, popt, { indent: { left: popt.indent.left } }) : popt; out.push(new D.Paragraph(Object.assign({ children: cur }, po))); firstP = false; } cur = []; };
    M().split(text).forEach(p => {
      if (p.t === 'text') textRuns(p.s, runOpt).forEach(r => cur.push(r));
      else if (p.display && isArr(p.s)) { flush(); firstP = false; arrayTable(p.s, popt, out); }
      else if (p.display) { flush(); firstP = false; out.push(new D.Paragraph({ children: [eqd(p.s)], spacing: { before: 40, after: 60 }, indent: popt.indent && { left: (popt.indent.left || 0) } })); }
      else { const t = p.s.replace(/\s+$/, ''); if (/[^=<>]=$/.test(t)) { cur.push(eq(t.slice(0, -1))); cur.push(tr(' =', runOpt)); } else cur.push(eq(p.s)); }
    });
    flush();
    return out;
  }
  const sections = [];
  const page = { size: { width: 11906, height: 16838 }, margin: { top: 640, bottom: 760, left: 700, right: 700, footer: 380 } };
  const W = 10506, COLW = 5023;
  const nob = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, nb = { top: nob, bottom: nob, left: nob, right: nob };
  const dppNo = p => { const m = /^DPP \d+/.exec(p.badge || ''); return m ? m[0] : ''; };
  /* pages that share a title become one document part with ONE header (no chapter or topic line repeated on every page) */
  const groups = [];
  pages.forEach(p => { const g = groups[groups.length - 1]; if (g && g.p.title === p.title && g.p.mode === p.mode) g.pages.push(p); else groups.push({ p, pages: [p] }); });
  /* rough height of a block in text lines (10.5 pt Calibri, column about 21 em wide) */
  const LINE_EM = 21;
  const texH = tex => { const rows = (tex.match(/\\\\/g) || []).length + 1; if (/\\begin\{/.test(tex)) return rows * 1.25 + 0.6; return 1 + ((tex.match(/\\d?frac/g) || []).length ? 1.3 : 0) + (/\\(int|sum|prod|lim)/.test(tex) ? 0.6 : 0); };
  const textH = (s, wEm) => { let h = 0, em = 0, tall = 0; M().split(s).forEach(pt => { if (pt.t === 'math' && pt.display) { h += texH(pt.s) * Math.max(1, Math.ceil(M().width('\\(' + pt.s + '\\)') / wEm)) + 0.4; } else { em += M().width(pt.t === 'text' ? pt.s : '\\(' + pt.s + '\\)'); if (pt.t === 'math' && /\\d?frac|\\int|\\sum|\\lim|\\sqrt\{[^}]*\\frac/.test(pt.s)) tall++; } }); const ln = em ? Math.ceil(em / wEm) + (String(s).match(/\n/g) || []).length : 0; return h + ln + Math.min(tall, ln) * 0.7; };
  for (const G of groups) {
    const p = G.p, test = p.mode === 'test';
    const dt = p.date ? new Date(p.date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const items = []; G.pages.forEach(pg => pg.qs.forEach((q, i) => items.push({ q, n: i + 1 + (pg.start || 0), pg })));
    const dpps = [...new Set(G.pages.map(dppNo))];
    const hp = (children, align, after) => new D.Paragraph({ alignment: align, spacing: { before: 0, after: after || 0 }, children });
    const hc = (w, kidsP, va) => new D.TableCell({ width: { size: w, type: D.WidthType.DXA }, borders: nb, verticalAlign: va || D.VerticalAlign.BOTTOM, margins: { left: 0, right: 0, top: 0, bottom: 40 }, children: kidsP });
    const brand = [hp([new D.TextRun({ text: 'Avanti Fellows', bold: true, color: NAVY, size: 28, font: 'Cambria' })]), hp([new D.TextRun({ text: 'JEE MATHS', size: 15, color: GREY, font: 'Calibri', characterSpacing: 24 })])];
    const sub = dpps.length > 1 ? '' : p.sub;
    const mid = [hp([new D.TextRun({ text: p.title, bold: true, size: 36, font: 'Cambria' })], D.AlignmentType.CENTER, 20)].concat(sub ? [hp([new D.TextRun({ text: sub, size: 18, color: GREY, font: 'Calibri' })], D.AlignmentType.CENTER)] : []);
    const badge = p.kind === 'dpp' ? (dpps.length === 1 && dpps[0] ? dpps[0] : (dpps.filter(Boolean).length > 1 ? dpps.filter(Boolean)[0] + ' – ' + dpps.filter(Boolean).slice(-1)[0] : '')) : '';
    const right = [hp([new D.TextRun({ text: badge || dt, size: 19, font: 'Calibri' })], D.AlignmentType.RIGHT)].concat(p.batch ? [hp([new D.TextRun({ text: p.batch, size: 19, font: 'Calibri' })], D.AlignmentType.RIGHT)] : []);
    const headTable = new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [2700, 5106, 2700], borders: { top: nob, bottom: nob, left: nob, right: nob, insideHorizontal: nob, insideVertical: nob },
      rows: [new D.TableRow({ children: [hc(2700, brand), hc(5106, mid), hc(2700, right)] })] });
    const rule = new D.Paragraph({ spacing: { before: 0, after: 0 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 18, color: NAVY, space: 1 } }, children: [] });
    const fi = { size: 18, font: 'Calibri' }, nq = items.length;
    const infoTxt = test ? ['Name: ______________________', 'Avanti ID: __________', nq + ' questions', 'Time: ' + p.mins + ' min', 'Max marks: ' + nq * p.pos + '  (+' + p.pos + ' / −' + p.neg + ')']
      : ['Name: ______________________', 'Date: ______________', nq + ' questions', 'Marks: ____ / ' + nq];
    const tabsAt = test ? [3000, 5100, 6700, 8300] : [3600, 6200, 8200];
    const info = new D.Paragraph({ spacing: { before: 100, after: 100 }, tabStops: tabsAt.map(pos => ({ type: D.TabStopType.LEFT, position: pos })), border: { bottom: { style: D.BorderStyle.SINGLE, size: 4, color: 'CBD2E0', space: 6 } }, children: infoTxt.flatMap((t, k) => [new D.TextRun(Object.assign({ text: t }, fi))].concat(k < infoTxt.length - 1 ? [new D.TextRun(Object.assign({ text: '\t' }, fi))] : [])) });
    const footer = new D.Footer({ children: [new D.Paragraph({ tabStops: [{ type: D.TabStopType.RIGHT, position: W }], border: { top: { style: D.BorderStyle.SINGLE, size: 4, color: 'CBD2E0', space: 4 } },
      children: [new D.TextRun({ text: 'Avanti Fellows · ' + p.title, size: 16, color: GREY, font: 'Calibri' }), new D.TextRun({ text: '\tPage ', size: 16, color: GREY, font: 'Calibri' }), new D.TextRun({ children: [D.PageNumber.CURRENT], size: 16, color: GREY, font: 'Calibri' })] })] });
    const two = p.cols !== 1, colW = (two ? COLW : W) - 340, wEm = LINE_EM * colW / (COLW - 340);
    curW = colW + 340;
    /* every question -> its own list of blocks + an estimated height */
    const blocksOf = [];
    let lastHead = '', lastDpp = dppNo(G.pages[0]);
    items.forEach(({ q, n, pg }, idx) => {
      const kids = []; let h = 0.5, xh = 0;
      const dn = dppNo(pg);
      if (dn && dn !== lastDpp) { lastDpp = dn; kids.push(new D.Paragraph({ keepNext: true, spacing: { before: 160, after: 60 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: NAVY, space: 2 } }, children: [new D.TextRun({ text: dn, bold: true, size: FS, color: NAVY, font: 'Calibri' })] })); h += 1.6; xh += 1.6; }
      if (q.head && q.head !== lastHead) { lastHead = q.head; kids.push(new D.Paragraph({ keepNext: true, spacing: { before: 120, after: 60 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: NAVY, space: 2 } }, children: [new D.TextRun({ text: q.head, bold: true, size: FS, color: NAVY, font: 'Calibri' })] })); h += 1.6; xh += 1.6; }
      const hint = q.t === 'MSQ' ? '(one or more options correct)' : '';
      const tag = p.tag ? H.tagText(q) : '';
      const numRun = new D.TextRun({ text: n + '.', bold: true, size: FS, color: NAVY, font: 'Calibri' });
      const mt = MP(q.q), stemTxt = tall(mt ? mt.pre : q.q).replace(/\s*\{\{figure\}\}\s*/g, '\n').replace(/^\n+|\n+$/g, '');
      let perM = q.o.length ? optPerLine(q, colW) : 1; if (perM > 2 && q.o.some(o => /\\d?frac|\\begin/.test(o))) perM = 2;
      blocks(stemTxt, [numRun, new D.TextRun({ text: '\t', size: FS })], { spacing: { before: 100, after: 40, line: 264, lineRule: D.LineRuleType.AUTO }, indent: { left: 340, hanging: 340 }, keepNext: true }, null).forEach(x => kids.push(x));
      h += textH(stemTxt, wEm);
      const tail = [hint, tag].filter(Boolean).join('  ');
      if (tail) { kids.push(new D.Paragraph({ spacing: { after: 20 }, indent: { left: 340 }, children: [new D.TextRun({ text: tail, italics: true, size: 16, color: GREY, font: 'Calibri' })], keepNext: !!q.o.length })); h += 0.8; }
      if (mt) {
        const wl = Math.max(...mt.left.map(x => M().width(x)), 2), wr = Math.max(...mt.right.map(x => M().width(x)), 2), fl = Math.min(0.7, Math.max(0.3, wl / (wl + wr)));
        const cwL = Math.floor(colW * fl), cwR = colW - cwL, cw = Math.floor(colW / 2), bd = { style: D.BorderStyle.SINGLE, size: 4, color: '9AA3B8' }, cb = { top: bd, bottom: bd, left: bd, right: bd };
        const cell = (text, head, right) => new D.TableCell({ width: { size: right ? cwR : cwL, type: D.WidthType.DXA }, borders: cb, margins: { top: 30, bottom: 30, left: 80, right: 60 }, shading: head ? { type: D.ShadingType.CLEAR, fill: 'EEF1F8', color: 'auto' } : undefined,
          children: text ? blocks(text, [], { spacing: { before: 0, after: 0 } }, head ? { bold: true } : null) : [new D.Paragraph({ children: [] })] });
        const rowsM = [new D.TableRow({ cantSplit: true, tableHeader: true, children: [cell(mt.head[0], true), cell(mt.head[1], true, true)] })];
        for (let r = 0; r < Math.max(mt.left.length, mt.right.length); r++) { rowsM.push(new D.TableRow({ cantSplit: true, children: [cell(mt.left[r] || ''), cell(mt.right[r] || '', false, true)] })); h += Math.max(textH(mt.left[r] || '', wEm / 2), textH(mt.right[r] || '', wEm / 2), 1) + 0.3; }
        kids.push(new D.Table({ width: { size: cwL + cwR, type: D.WidthType.DXA }, columnWidths: [cwL, cwR], layout: D.TableLayoutType.FIXED, indent: { size: 340, type: D.WidthType.DXA }, rows: rowsM }));
        kids.push(new D.Paragraph({ spacing: { before: 0, after: 60 }, children: [new D.TextRun({ text: '', size: 8 })], keepNext: !!q.o.length }));
        h += 1.6; xh += 1.6 + mt.left.length * 1.3;
      }
      if (q.f && H.figs && H.figs[q.i]) { const f = H.figs[q.i]; const w = Math.min(f.w, 230), fh = Math.round(f.h * w / f.w); kids.push(new D.Paragraph({ indent: { left: 340 }, spacing: { after: 40 }, keepNext: !!q.o.length, children: [new D.ImageRun({ data: f.data, transformation: { width: w, height: fh } })] })); h += fh * 0.75 / 13.5 + 0.5; xh += fh / 18 + 0.4; }
      if (q.o.length) {
        const hasFrac = q.o.some(o => /\\d?frac|\\begin/.test(o));
        const per = perM;
        const labelRun = k => new D.TextRun({ text: '(' + LET[k] + ') ', bold: true, size: FS, font: 'Calibri' });
        const op = { spacing: { before: hasFrac ? 60 : 0, after: hasFrac ? 60 : 20, line: 264, lineRule: D.LineRuleType.AUTO } };
        if (per > 1) {
          const cw = Math.floor(colW / per), rows = [];
          for (let r = 0; r < q.o.length; r += per) {
            const cells = []; let rh = 1;
            for (let c = 0; c < per; c++) {
              const k = r + c, kidsC = k < q.o.length ? blocks(q.o[k], [labelRun(k)], op, null) : [new D.Paragraph({ children: [] })];
              if (k < q.o.length) rh = Math.max(rh, textH(q.o[k], wEm / per));
              cells.push(new D.TableCell({ width: { size: cw, type: D.WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, margins: { top: 0, bottom: 0, left: 0, right: 60 }, children: kidsC }));
            }
            rows.push(new D.TableRow({ cantSplit: true, children: cells })); h += rh + (hasFrac ? 0.4 : 0.15);
          }
          kids.push(new D.Table({ width: { size: cw * per, type: D.WidthType.DXA }, columnWidths: Array(per).fill(cw), layout: D.TableLayoutType.FIXED, indent: { size: 340, type: D.WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows }));
          kids.push(new D.Paragraph({ spacing: { before: 0, after: 40 }, children: [new D.TextRun({ text: '', size: 8 })] }));
        } else q.o.forEach((o, k) => { blocks(o, [labelRun(k)], Object.assign({}, op, { indent: { left: 700, hanging: 360 }, keepNext: k < q.o.length - 1 }), null).forEach(x => kids.push(x)); h += textH(o, wEm - 1) + 0.15; });
      } else { kids.push(new D.Paragraph({ spacing: { after: 100 }, children: [] })); h += 0.6; }
      const mh = measureQ(q, stemTxt, perM, colW, [q.t === 'MSQ' ? '(one or more options correct)' : '', p.tag ? H.tagText(q) : ''].filter(Boolean).join('  '));
      blocksOf.push({ kids, h: mh ? mh + xh * 18 : h * 18 });
    });
    const head = [headTable, rule, info];
    if (!two) { sections.push({ properties: { page }, footers: { default: footer }, children: head.concat(...blocksOf.map(b => b.kids)) }); continue; }
    /* two columns, page by page: questions fill the left column, then the right one, then a new page (a question is never split) */
    const CAP1 = 760, CAP = 850, pagesW = []; let cur = null;
    const newPage = () => { cur = { cols: [[], []], hs: [0, 0], c: 0, cap: pagesW.length ? CAP : CAP1 }; pagesW.push(cur); };
    newPage();
    blocksOf.forEach(b => {
      if (cur.hs[cur.c] + b.h > cur.cap && cur.cols[cur.c].length) { if (cur.c === 0) cur.c = 1; else newPage(); }
      cur.cols[cur.c].push(b); cur.hs[cur.c] += b.h;
    });
    /* last page: balance the two columns */
    const last = pagesW[pagesW.length - 1], all = last.cols[0].concat(last.cols[1]);
    if (all.length > 1) { const tot = all.reduce((a, b) => a + b.h, 0); let acc = 0, s = 0; while (s < all.length - 1 && acc + all[s].h / 2 < tot / 2) { acc += all[s].h; s++; } last.cols = [all.slice(0, Math.max(1, s)), all.slice(Math.max(1, s))]; }
    const dot = { style: D.BorderStyle.DOTTED, size: 4, color: '9AA3B8' };
    const cellOf = (bs, first) => new D.TableCell({ width: { size: 5253, type: D.WidthType.DXA }, borders: { top: nob, bottom: nob, left: nob, right: first ? dot : nob }, margins: { top: 0, bottom: 0, left: first ? 0 : 160, right: first ? 160 : 0 }, children: [].concat(...bs.map(b => b.kids)).concat([new D.Paragraph({ spacing: { before: 0, after: 0 }, children: [] })]) });
    const bodyKids = head.slice();
    pagesW.forEach((pw, k) => {
      if (k) bodyKids.push(new D.Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0, line: 20, lineRule: D.LineRuleType.EXACT }, children: [] }));
      bodyKids.push(new D.Table({ width: { size: W, type: D.WidthType.DXA }, columnWidths: [5253, 5253], layout: D.TableLayoutType.FIXED, borders: { top: nob, bottom: nob, left: nob, right: nob, insideHorizontal: nob, insideVertical: nob }, rows: [new D.TableRow({ children: [cellOf(pw.cols[0], true), cellOf(pw.cols[1], false)] })] }));
    });
    sections.push({ properties: { page }, footers: { default: footer }, children: bodyKids });
  }
  const keys = pages.filter(p => p.key);
  if (keys.length) sections.push({ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
    children: [new D.Paragraph({ children: [new D.TextRun({ text: 'Answer key', bold: true, size: 30, font: 'Cambria', color: NAVY })] })].concat(keyBlocks(keys).flatMap(g => (g.lab ? [new D.Paragraph({ keepNext: true, spacing: { before: 160 }, children: [new D.TextRun({ text: g.lab, bold: true, size: 22 })] })] : []).concat([
      new D.Paragraph({ spacing: { before: 60 }, children: [new D.TextRun({ text: g.line, size: 22 })] })]))) });
  const doc = new D.Document({ sections });
  const raw = D.Packer.toBlob ? await (await D.Packer.toBlob(doc)).arrayBuffer() : await D.Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(raw), f = zip.file('word/document.xml');
  let xml = await f.async('string');
  xml = xml.replace(/<w:r>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>⟦E(\d+)⟧<\/w:t><\/w:r>/g, (all, id) => { const e = eqs[+id]; return M().omml(e.tex, e.display, 'docx'); });
  zip.file('word/document.xml', xml);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/* ---------- PowerPoint ---------- */
async function buildPptx(PptxGenJS, JSZip, pages, H) {
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
  const eqs = [];
  const mathRun = (tex, display, opt) => { eqs.push({ tex, display }); return { text: '⟦M' + (eqs.length - 1) + '⟧', options: Object.assign({}, opt) }; };
  const p0 = pages[0], s0 = pptx.addSlide(); s0.background = { color: 'FDFAF1' };
  s0.addText(p0.title, { x: 0.7, y: 2.4, w: 12, h: 1.2, fontFace: 'Cambria', bold: true, fontSize: 40, color: NAVY });
  s0.addText(p0.kind === 'dpp' ? (pages.length > 1 ? 'DPP booklet · ' + pages.length + ' pages' : p0.sub) : 'Avanti Fellows · JEE Maths' + (p0.batch ? ' · ' + p0.batch : '') + ' · ' + p0.mins + ' min', { x: 0.7, y: 3.7, w: 12, h: 0.5, fontFace: 'Calibri', fontSize: 18, color: '3C3C3C' });
  function runs(text, opt) {
    const out = [];
    M().split(text).forEach(pt => {
      if (pt.t === 'text') { const ls = pt.s.split('\n'); ls.forEach((ln, k) => { if (k) out.push({ text: '\n', options: Object.assign({ breakLine: false }, opt) }); if (ln) out.push({ text: ln, options: Object.assign({}, opt) }); }); }
      else { const t = pt.s.replace(/\s+$/, ''); if (/[^=<>]=$/.test(t)) { out.push(mathRun(t.slice(0, -1), false, opt)); out.push({ text: ' =', options: Object.assign({}, opt) }); } else out.push(mathRun(pt.s, false, opt)); }
    });
    return out;
  }
  for (const p of pages) for (let i = 0; i < p.qs.length; i++) {
    const q = p.qs[i], s = pptx.addSlide(); s.background = { color: 'FFFFFF' };
    s.addText('Q' + (i + 1 + (p.start || 0)), { x: 0.5, y: 0.3, w: 1.6, h: 0.6, fontFace: 'Calibri', bold: true, fontSize: 24, color: NAVY });
    const LVW = { L1: '16A34A', L2: 'CA8A04', L3: 'DC2626' }, lvl = LVW[q.d] ? q.d : '';  /* level box: L1 green, L2 yellow, L3 red */
    const meta = [p.kind === 'dpp' ? p.badge : '', chapterName(H, q), lvl ? '' : H.DIFF[q.d], H.tagText(q).replace(/[\[\]]/g, '')].filter(Boolean).join(' · ');
    s.addText(meta, { x: 2.2, y: 0.3, w: lvl ? 9.4 : 10.6, h: 0.6, fontFace: 'Calibri', fontSize: 13, color: GREY, align: 'right' });
    if (lvl) { s.addShape(pptx.ShapeType.roundRect, { x: 11.75, y: 0.4, w: 0.8, h: 0.4, fill: { type: 'none' }, line: { color: LVW[lvl], width: 1.5 }, rectRadius: 0.2 });
      s.addText(lvl, { x: 11.75, y: 0.4, w: 0.8, h: 0.4, fontFace: 'Calibri', bold: true, fontSize: 14, color: LVW[lvl], align: 'center', valign: 'middle', margin: 0 }); }
    const total = M().plainText(q.q).length + q.o.reduce((a, o) => a + M().plainText(o).length + 6, 0);
    const fs = total > 900 ? 14 : total > 600 ? 16 : total > 380 ? 18 : 20, base = { fontFace: 'Calibri', fontSize: fs, color: '141413' };
    const paras = [];
    const mt = MP(q.q);
    paras.push(runs(mt ? mt.pre : q.q, base).concat(q.t === 'MSQ' ? [{ text: '   (one or more options correct)', options: Object.assign({}, base, { italic: true, color: GREY, fontSize: fs - 4 }) }] : []));
    if (q.o.length) {
      if (optLayout(q) === 'row') paras.push([].concat(...q.o.map((o, k) => [{ text: (k ? '        ' : '') + '(' + LET[k] + ') ', options: Object.assign({}, base, { bold: true, color: '0070C0' }) }].concat(runs(o, base)))));
      else q.o.forEach((o, k) => paras.push([{ text: '(' + LET[k] + ') ', options: Object.assign({}, base, { bold: true, color: '0070C0' }) }].concat(runs(o, base))));
    }
    // pptxgenjs wants one flat run list; paragraph ends carry breakLine
    const flat = [];
    paras.forEach((pr, k) => { pr.forEach((r, j) => { const o = Object.assign({}, r.options); if (j === pr.length - 1 && k < paras.length - 1) o.breakLine = true; o.paraSpaceAfter = 8; flat.push({ text: r.text, options: o }); }); });
    const hasFig = q.f && H.figs && H.figs[q.i];
    if (mt) {
      const nTab = Math.max(mt.left.length, mt.right.length), bd = { type: 'solid', pt: 0.75, color: '9AA3B8' }, cellOpt = { fontFace: 'Calibri', fontSize: Math.min(fs, 16), color: '141413', border: [bd, bd, bd, bd], valign: 'middle' };
      const row = (a, b, head) => [a, b].map(t => ({ text: runs(t || ' ', Object.assign({}, cellOpt, head ? { bold: true } : {})), options: Object.assign({}, cellOpt, head ? { bold: true, fill: { color: 'EEF1F8' } } : {}) }));
      const rowsT = [row(mt.head[0], mt.head[1], true)]; for (let r = 0; r < nTab; r++) rowsT.push(row(mt.left[r], mt.right[r]));
      const pre = M().plainText(mt.pre).trim();
      if (pre) s.addText(runs(mt.pre, base), { x: 0.6, y: 1.1, w: 12.1, h: 1.0, valign: 'top', margin: 4, fit: 'shrink' });
      s.addTable(rowsT, { x: 0.6, y: pre ? 2.2 : 1.2, w: 12.1, colW: [6.05, 6.05] });
      if (q.o.length) { const of = []; q.o.forEach((opt, k) => { const pr = [{ text: '(' + LET[k] + ') ', options: Object.assign({}, base, { bold: true, color: '0070C0' }) }].concat(runs(opt, base)); pr.forEach((r, j) => { const ro = Object.assign({}, r.options); if (j === pr.length - 1 && k < q.o.length - 1) ro.breakLine = true; of.push({ text: r.text, options: ro }); }); }); s.addText(of, { x: 0.6, y: 5.3, w: 12.1, h: 1.9, valign: 'top', margin: 4, fit: 'shrink' }); }
      continue;
    }
    s.addText(flat, { x: 0.6, y: 1.1, w: hasFig ? 7.6 : 12.1, h: 5.9, valign: 'top', margin: 4, fit: 'shrink' });
    if (hasFig) { const f = H.figs[q.i]; const w = 4.4, h = w * f.h / f.w; s.addImage({ data: f.dataUrl, x: 8.5, y: 1.4, w, h }); }
  }
  const keys = pages.filter(p => p.key);
  if (keys.length) {
    const sk = pptx.addSlide(); sk.background = { color: 'FDFAF1' };
    sk.addText('Answer key', { x: 0.7, y: 0.4, w: 12, h: 0.8, fontFace: 'Cambria', bold: true, fontSize: 32, color: NAVY });
    sk.addText(keyBlocks(keys).flatMap(g => (g.lab ? [{ text: g.lab + '\n', options: { bold: true, fontSize: 14, color: NAVY } }] : []).concat([{ text: g.line + '\n', options: { fontSize: 14, color: '141413' } }])), { x: 0.7, y: 1.3, w: 12, h: 5.8, fontFace: 'Calibri', valign: 'top' });
  }
  const buf = await pptx.write({ outputType: 'arraybuffer' });
  if (!eqs.length) return new Blob([buf]);
  const zip = await JSZip.loadAsync(buf);
  const NS_MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006', NS_A14 = 'http://schemas.microsoft.com/office/drawing/2010/main', NS_M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  const re = /<a:r>((?:(?!<\/a:r>)[\s\S])*?)<a:t>⟦M(\d+)⟧<\/a:t><\/a:r>/g;
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    let xml = await zip.file(name).async('string');
    if (xml.indexOf('⟦M') < 0) continue;
    xml = xml.replace(re, (all, rpr, id) => {
      const e = eqs[+id], sz = (/\bsz="(\d+)"/.exec(rpr) || [])[1], inner = M().omml(e.tex, false, 'pptx' + (sz ? '@' + sz : '')).replace('<m:oMath>', '<m:oMath xmlns:m="' + NS_M + '">');
      const fb = '<a:r>' + rpr.replace(/<a:rPr/, '<a:rPr').trim() + '<a:t>' + M().esc(M().toText(e.tex)) + '</a:t></a:r>';
      return '<mc:AlternateContent xmlns:mc="' + NS_MC + '"><mc:Choice xmlns:a14="' + NS_A14 + '" Requires="a14"><a14:m>' + inner + '</a14:m></mc:Choice><mc:Fallback>' + fb + '</mc:Fallback></mc:AlternateContent>';
    });
    zip.file(name, xml);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

/* ---------- PowerPoint: one PYQ chapter, black slides (c12 PYQ PPTX) ---------- */
async function buildCwPptx(PptxGenJS, JSZip, d, H) {
  const BLACK = '000000', NAVYC = '1B2A41', CORAL = 'E8573E', TEAL = '2A9D8F', GRAYC = '9CA3AF', LIME = '9BE15D', YEL = 'F4D35E', WHITE = 'FFFFFF', GREEN = '4ADE80', RED = 'EF4444'; const LVC = { L1: GREEN, L2: YEL, L3: RED };  /* level pill: L1 green, L2 yellow, L3 red */
  const FH = 'Georgia', FB = 'Arial', FM = 'Cambria Math', FQ = 'Times New Roman';
  const QFS = 24, CARD_MAX = 5.25;
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
  const eqs = [];
  const mathRun = (tex, opt) => { eqs.push({ tex, color: opt.color, sz: opt.fontSize }); return { text: '⟦M' + (eqs.length - 1) + '⟧', options: Object.assign({}, opt) }; };
  function runs(text, base, mathColor) {
    const out = [];
    M().split(text).forEach(pt => {
      if (pt.t === 'text') pt.s.split('\n').forEach((ln, k) => { if (k) out.push({ text: '\n', options: Object.assign({ breakLine: false }, base) }); if (ln) out.push({ text: ln, options: Object.assign({}, base) }); });
      else out.push(mathRun(pt.s.replace(/\s+$/, ''), Object.assign({}, base, { color: mathColor || base.color })));
    });
    return out;
  }
  /* question text: the maths asked for (the quantity to find) is yellow, given maths lime, words white */
  const FIND = /(find|evaluate|value of|determine|compute|calculate|prove|show that|what is|hence)/i, EQW = /^\s*(is|are|equals?|equal to)\b/i;
  function qRuns(text, base) {
    const parts = M().split(text);
    const pure = parts.length === 1 && parts[0].t !== 'text';
    const yel = parts.map((pt, i) => {
      if (pt.t === 'text') return false;
      if (pure) return true;
      const prev = parts[i - 1], next = parts[i + 1];
      return !!((prev && prev.t === 'text' && FIND.test(prev.s.slice(-40))) || (next && next.t === 'text' && EQW.test(next.s)));
    });
    if (!pure && !yel.some(Boolean)) for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t !== 'text') { yel[i] = true; break; }
    const out = [];
    parts.forEach((pt, i) => {
      if (pt.t === 'text') pt.s.split('\n').forEach((ln, k) => { if (k) out.push({ text: '\n', options: Object.assign({ breakLine: false }, base) }); if (ln) ln.split(/(\((?:I|II|III|IV|V)\))/).forEach(g => { if (!g) return; out.push({ text: g, options: Object.assign({}, base, /^\((?:I|II|III|IV|V)\)$/.test(g) ? { color: YEL, bold: true } : {}) }); }); });
      else out.push(mathRun(pt.s.replace(/\s+$/, ''), Object.assign({}, base, { color: yel[i] ? YEL : LIME })));
    });
    return out;
  }
  /* height of a line of text with maths, in inches: stacked fractions, roots and powers make a line taller; width comes from the maths width model, so stacked maths is not over-counted */
  const hEm = nodes => { let h = 1; nodes.forEach(n => { let v = 1; switch (n.k) {
    case 'frac': v = 0.75 * (hEm(n.n) + hEm(n.d)) + 0.15; break;
    case 'rad': v = hEm(n.e) + 0.15; break;
    case 'nary': v = Math.max(1.7, hEm(n.e)); break;
    case 'grp': case 'delim': case 'acc': case 'bar': v = hEm(n.e); break;
    case 'script': v = hEm(n.e) + (n.sup ? 0.45 : 0) + (n.sub ? 0.25 : 0); break;
    case 'mat': v = n.rows.length * 1.15; break; }
    h = Math.max(h, v); }); return h; };
  /* simulate PowerPoint's wrapping: words and equations fill lines up to the box width, a line is as tall as its tallest equation (at least 1.2 line heights). Calibrated on real PowerPoint screenshots (20pt: plain line 0.31in, stacked-fraction line 0.6in). Returns inches. */
  const textH = (text, fs, boxW) => {
    const limit = boxW * 72 / fs * 0.985;
    let total = 0, cur = 0, h = 1.2;
    const flush = () => { total += h; cur = 0; h = 1.2; };
    M().split(text).forEach(p => {
      if (p.t === 'text') p.s.split('\n').forEach((seg, k) => { if (k) flush(); seg.split(/(\s+)/).forEach(tok => { if (!tok) return; const w = tok.length * 0.5; if (cur + w > limit && /\S/.test(tok)) flush(); cur += w; }); });
      else {
        const w = M().width('\\(' + p.s + '\\)'); let ht = 1.2; try { ht = Math.max(1.2, hEm(M().parse(p.s))); } catch (e) { /* plain height */ }
        if (cur + w > limit && cur > 0) flush(); cur += w; h = Math.max(h, ht);
      }
    });
    flush(); return total * fs / 72;
  };
  /* options side by side: 4 per row if they fit, else 2, else 1 */
  function optRows(q, fs, cw) {
    const n = q.o.length; if (!n) return [];
    const wid = k => (M().width('(' + LET[k] + ') ') + M().width(q.o[k])) * fs / 72;
    const fits = ix => ix.reduce((a, k) => a + wid(k), 0) * 1.05 + (ix.length - 1) * 2.4 * fs / 72 <= cw - 0.95;
    const idx = [...Array(n).keys()];
    for (const per of [4, 2, 1]) {
      const chunks = []; for (let i = 0; i < n; i += per) chunks.push(idx.slice(i, i + per));
      if (chunks.every(fits)) return chunks;
    }
    return idx.map(k => [k]);
  }
  const card = (s, x, y, w, h, color) => s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color }, line: { type: 'none' }, rectRadius: 0.1 });
  const blank = () => { const b = pptx.addSlide(); b.background = { color: BLACK }; };
  const yrs = Object.keys(d.years).map(Number).sort((a, b) => a - b);
  const chNum = d.cc ? d.cc.split('M')[1] : '';
  const clLabel = d.clLabel || 'CLASS ' + d.cl, chLabel = d.chLabel || 'CHAPTER ' + chNum, kindLabel = d.kindLabel || (d.bucketName + ' PYQs');
  const yearLabel = d.year === 'all' ? (yrs.length ? 'All years · ' + yrs[0] + '–' + yrs[yrs.length - 1] : 'All years') : String(d.year);
  function leftBlock(s, big, bigColor, bigSize) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 0.6, w: clLabel.length > 8 ? 2.4 : 1.6, h: 0.42, fill: { type: 'none' }, line: { color: CORAL, width: 1.5 }, rectRadius: 0.2 });
    s.addText(clLabel, { x: 0.6, y: 0.6, w: clLabel.length > 8 ? 2.4 : 1.6, h: 0.42, fontFace: FB, bold: true, fontSize: 13, color: CORAL, align: 'center', valign: 'middle', charSpacing: 3 });
    s.addText(chLabel, { x: 0.6, y: 1.55, w: 7.6, h: 0.4, fontFace: FB, bold: true, fontSize: 16, color: TEAL, charSpacing: 3 });
    s.addText(d.chapter, { x: 0.6, y: 2.0, w: 7.6, h: 1.9, fontFace: FH, bold: true, fontSize: 44, color: WHITE, valign: 'top', lineSpacingMultiple: 0.9 });
    s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 4.05, w: 0.9, h: 0.07, fill: { color: CORAL }, line: { type: 'none' } });
    if (big) s.addText(big, { x: 0.6, y: 4.35, w: 7.6, h: 1.2, fontFace: FH, bold: true, fontSize: bigSize || 54, color: bigColor || CORAL, valign: 'top' });
  }
  /* 1. cover */
  { const s = pptx.addSlide(); s.background = { color: BLACK }; leftBlock(s, '', WHITE);
    s.addText('YEAR', { x: 0.6, y: 4.35, w: 3, h: 0.3, fontFace: FB, bold: true, fontSize: 12, color: GRAYC, charSpacing: 3 });
    s.addText(yearLabel, { x: 0.6, y: 4.65, w: 7.6, h: 0.5, fontFace: FB, bold: true, fontSize: 22, color: WHITE });
    s.addText('QUESTIONS', { x: 0.6, y: 5.3, w: 3, h: 0.3, fontFace: FB, bold: true, fontSize: 12, color: GRAYC, charSpacing: 3 });
    s.addText(d.count + ' · ' + kindLabel, { x: 0.6, y: 5.6, w: 7.6, h: 0.5, fontFace: FB, bold: true, fontSize: 22, color: WHITE });
    card(s, 8.9, 1.55, 3.8, 4.4, NAVYC);
    s.addText(String(d.count), { x: 8.9, y: 2.6, w: 3.8, h: 1.4, fontFace: FH, bold: true, fontSize: 88, color: CORAL, align: 'center' });
    s.addText('questions', { x: 8.9, y: 4.1, w: 3.8, h: 0.5, fontFace: FB, fontSize: 18, color: WHITE, align: 'center' });
    if (d.logo) { const lw = 2.4; s.addImage({ data: d.logo.dataUrl, x: 13.33 - 0.5 - lw, y: 0.4, w: lw, h: lw * d.logo.h / d.logo.w }); } }
  if (!d.noFront) {
  /* 2. contents: every topic, zero when it has no question */
  { const s = pptx.addSlide(); s.background = { color: BLACK };
    s.addText(d.chapter, { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontFace: FH, bold: true, fontSize: 30, color: WHITE });
    s.addText('CONTENTS · ' + d.topics.length + ' TOPICS', { x: 0.5, y: 0.95, w: 12.3, h: 0.35, fontFace: FB, bold: true, fontSize: 13, color: CORAL, charSpacing: 3 });
    /* one grid: every card has the same size, rows line up across columns, topics run down the left column first. 20pt when every name fits; type shrinks (or a third column is added) only when a name would not fit */
    const nT = d.topics.length, gap = 0.12, top = 1.45, avail = 5.7, GW = 12.33;
    let G = null;
    for (const [fs, cols] of [[20, 2], [18, 2], [18, 3], [16, 3], [14, 3]]) {
      const rows = Math.max(1, Math.ceil(nT / cols)), cwid = (GW - (cols - 1) * 0.2) / cols, nameW = cwid - 1.25;
      const chAvail = Math.min(1.0, (avail - (rows - 1) * gap) / rows);
      const need = Math.max(0.45, ...d.topics.filter(t => String(t.name).length <= 70).map(t => Math.max(1, Math.ceil(String(t.name).length * fs * 0.52 / 72 / nameW)) * fs * 1.2 / 72 + 0.16));
      G = { fs, cols, rows, cwid, nameW, ch: chAvail };
      if (need <= chAvail) break;
    }
    d.topics.forEach((t, i) => { const c = Math.floor(i / G.rows), r = i % G.rows, x = 0.5 + c * (G.cwid + 0.2), y = top + r * (G.ch + gap);
      card(s, x, y, G.cwid, G.ch, NAVYC);
      s.addText(String(i + 1).padStart(2, '0'), { x: x + 0.12, y, w: 0.65, h: G.ch, fontFace: FH, bold: true, fontSize: G.fs + 2, color: CORAL, valign: 'middle', margin: 0 });
      let nf = G.fs; while (nf > 12 && Math.max(1, Math.ceil(String(t.name).length * nf * 0.52 / 72 / G.nameW)) * nf * 1.2 / 72 + 0.12 > G.ch) nf -= 1;
      s.addText(t.name, { x: x + 0.85, y, w: G.nameW, h: G.ch, fontFace: FB, fontSize: nf, color: WHITE, valign: 'middle', margin: 0 });
      s.addText(String(t.n), { x: x + G.cwid - 0.55, y, w: 0.45, h: G.ch, fontFace: FB, bold: true, fontSize: G.fs, color: t.n ? TEAL : GRAYC, align: 'right', valign: 'middle', margin: 0 }); });
    if (!d.topics.length) s.addText('No topics', { x: 0.5, y: 1.5, w: 6, h: 0.5, fontFace: FB, fontSize: 16, color: WHITE }); }
  /* 3. year-wise stats, from 2020 */
  { const s = pptx.addSlide(); s.background = { color: BLACK };
    s.addText('Questions per year', { x: 0.5, y: 0.3, w: 12.3, h: 0.7, fontFace: FH, bold: true, fontSize: 30, color: WHITE });
    s.addText(d.chapter + ' · ' + (d.kindLabel ? d.kindLabel : d.bucketName) + ' · 2020 onwards', { x: 0.5, y: 0.95, w: 12.3, h: 0.35, fontFace: FB, bold: true, fontSize: 13, color: CORAL, charSpacing: 2 });
    const first = 2020, last = yrs.length ? yrs[yrs.length - 1] : 0;
    if (last >= first) {
      const labels = [], values = [];
      for (let y = first; y <= last; y++) { labels.push(String(y)); values.push(d.years[y] || 0); }
      s.addChart(pptx.ChartType.bar, [{ name: 'Questions', labels, values }], { x: 0.4, y: 1.5, w: 12.5, h: 5.6, barDir: 'col', chartColors: [CORAL], showValue: labels.length <= 30, dataLabelColor: WHITE, dataLabelFontSize: 10, dataLabelFontFace: FB, catAxisLabelColor: WHITE, catAxisLabelFontSize: 10, catAxisLabelFontFace: FB, catAxisLabelRotate: labels.length > 14 ? -45 : 0, valAxisLabelColor: GRAYC, valAxisLabelFontSize: 10, valGridLine: { color: '2A2A2A', size: 0.5 }, catGridLine: { style: 'none' }, showLegend: false, barGapWidthPct: 60, plotArea: { fill: { color: BLACK } } });
    } else s.addText('No questions from 2020 onwards.', { x: 0.5, y: 1.5, w: 12, h: 0.5, fontFace: FB, fontSize: 16, color: WHITE }); }
  }
  /* 4+. one question per slide, followed by a blank slide */
  const ansText = q => /^[A-D](,\s*[A-D])*$/.test(q.a || '') ? q.a.split(/,\s*/).map(l => '(' + l + ')').join(', ') : (q.a || '—');
  const exam0 = d.bucket === 'Main' ? ['JEE MAINS', GREEN] : ['JEE ADVANCED', RED];
  const examOf = q => d.perQ ? (q.s === 'P' ? (q.e === 'Main' ? ['JEE MAINS', GREEN] : q.e === 'KCET' ? ['KCET', 'F472B6'] : ['JEE ADVANCED', RED]) : ['PRACTICE · ' + String(q.pb || 'AVANTI').toUpperCase(), TEAL]) : exam0;
  d.qs.forEach((q, i) => {
    const exam = examOf(q), practice = d.perQ && q.s !== 'P';
    const s = pptx.addSlide(); s.background = { color: BLACK }; const pm = d.meta[q.i] || {}, pStr = String(pm.paper || q.p || '');
    const dm = /\d{1,2} [A-Za-z]{3} \d{4}/.exec(pStr), sd = /^(\d{4})-(\d{2})-(\d{2})/.exec(pm.sort_date || '');
    const date = dm ? dm[0] : sd && sd[2] !== '00' ? new Date(+sd[1], +sd[2] - 1, +sd[3]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const shift = pStr.replace(/\d{1,2} [A-Za-z]{3} \d{4}/, '').replace(/IIT-JEE|JEE (Main|Advanced)|AIEEE|KCET/g, '').replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
    const when = [date || (q.y ? String(q.y) : 'Year not printed'), shift].filter(Boolean).join(' · ');
    const pillText = practice ? exam[0] : exam[0] + ' · ' + when, pillW = Math.min(8.2, 0.5 + pillText.length * 0.135);
    s.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 0.3, w: 1.05, h: 0.42, fill: { type: 'none' }, line: { color: CORAL, width: 2 }, rectRadius: 0.1 });
    s.addText('Ques', { x: 0.5, y: 0.3, w: 1.05, h: 0.42, fontFace: FH, bold: true, fontSize: 20, color: WHITE, align: 'center', valign: 'middle', margin: 0 });
    s.addShape(pptx.ShapeType.roundRect, { x: 1.7, y: 0.3, w: pillW, h: 0.42, fill: { type: 'none' }, line: { color: exam[1], width: 1.25 }, rectRadius: 0.21 });
    s.addText(pillText, { x: 1.7, y: 0.3, w: pillW, h: 0.42, fontFace: FB, bold: true, fontSize: 16, margin: 0, color: exam[1], align: 'center', valign: 'middle' });
    /* level pill (L1 / L2 / L3), outline only, Arial bold 16pt, right after the exam pill */
    const lvl = /^L[123]$/.test(q.d || '') ? q.d : '', lvX = 1.7 + pillW + 0.15, lvW = 0.8;
    if (lvl) {
      s.addShape(pptx.ShapeType.roundRect, { x: lvX, y: 0.3, w: lvW, h: 0.42, fill: { type: 'none' }, line: { color: LVC[lvl], width: 1.25 }, rectRadius: 0.21 });
      s.addText(lvl, { x: lvX, y: 0.3, w: lvW, h: 0.42, fontFace: FB, bold: true, fontSize: 16, color: LVC[lvl], align: 'center', valign: 'middle', margin: 0 });
    }
    const tpX = Math.max(8.0, (lvl ? lvX + lvW : 1.7 + pillW) + 0.2);
    if (!d.noTopic && tpX < 12.6) s.addText(q._t || '', { x: tpX, y: 0.3, w: 12.83 - tpX, h: 0.5, fontFace: FB, bold: true, fontSize: 14, color: YEL, align: 'right', valign: 'middle', fit: 'shrink' });
    const hasFig = q.f && H.figs && H.figs[q.i], blockX = 61 / 72, blockW = (hasFig ? 8.4 : 924 / 72) - blockX, TOP = 68 / 72;
    /* list labels in the stem ((I), (II), (1), (2) ...) start their own line, like a list; maths is left alone */
    const QT = q.q.split(/(\\\([\s\S]*?\\\))/).map((seg, i) => i % 2 ? seg : seg.replace(/\s*(\((?:I{1,3}|IV|V|VI)\)|\([1-9]\))(?=\s)/g, (m, lab, off) => (off === 0 && i === 0) ? m : '\n' + lab)).join('');
    const mtc = MP(q.q);
    if (mtc) {
      const bdc = { type: 'solid', pt: 1, color: '9CA3AF' }, colW = (blockW - 0.0) / 2, nT = Math.max(mtc.left.length, mtc.right.length);
      const mk = (fs) => {
        const fsT = Math.max(14, fs - 2), rowH = [], rowsT = [];
        const hH = textH(mtc.head[0] + ' ' + mtc.head[1], fsT, colW - 0.25) + 0.16; let th = hH;
        for (let r = 0; r < nT; r++) { const hh = Math.max(textH(mtc.left[r] || ' ', fsT, colW - 0.25), textH(mtc.right[r] || ' ', fsT, colW - 0.25)) + 0.16; rowH.push(hh); th += hh; }
        const preT = mtc.pre ? textH(mtc.pre, fs, blockW) + 0.15 : 0, opH = (q.o || []).reduce((a, o, k) => a + textH('(' + LET[k] + ') ' + o, fs, blockW) + 0.083, 0);
        return { fsT, rowH, hH, th, preT, opH, tot: preT + th + 0.15 + opH };
      };
      let fs2 = Math.min(QFS, 22), G = mk(fs2);
      while (G.tot > 5.44 && fs2 > 14) { fs2 -= 2; G = mk(fs2); }
      const baseT = { fontFace: FQ, fontSize: G.fsT, color: WHITE }, cellO = (hd) => ({ fontFace: FQ, fontSize: G.fsT, color: WHITE, bold: !!hd, border: [bdc, bdc, bdc, bdc], valign: 'middle', margin: [0.04, 0.08, 0.04, 0.08], fill: hd ? { color: '262626' } : undefined });
      const cellT = (t, hd) => ({ text: runs(t || ' ', Object.assign({}, baseT, { bold: !!hd }), WHITE), options: cellO(hd) });
      const rowsT = [[cellT(mtc.head[0], true), cellT(mtc.head[1], true)]]; for (let r = 0; r < nT; r++) rowsT.push([cellT(mtc.left[r]), cellT(mtc.right[r])]);
      const baseQ = { fontFace: FQ, fontSize: fs2, color: WHITE }; let yy = TOP;
      s.addShape(pptx.ShapeType.rect, { x: 0.5, y: TOP, w: 6 / 72, h: G.tot, fill: { color: CORAL }, line: { type: 'none' } });
      if (mtc.pre) { s.addText(qRuns(mtc.pre, baseQ), { x: blockX, y: yy, w: blockW, h: G.preT, valign: 'top', margin: 0 }); yy += G.preT; }
      s.addTable(rowsT, { x: blockX, y: yy, w: colW * 2, colW: [colW, colW], rowH: [G.hH].concat(G.rowH) }); yy += G.th + 0.15;
      if (q.o && q.o.length) { const of = []; q.o.forEach((o, k) => { const pr = [{ text: '(' + LET[k] + ') ', options: Object.assign({}, baseQ, { bold: true, color: '3B9EFF' }) }].concat(runs(o, baseQ, WHITE)); pr.forEach((r, j) => { const ro = Object.assign({}, r.options); if (j === pr.length - 1 && k < q.o.length - 1) ro.breakLine = true; ro.paraSpaceAfter = 6; of.push({ text: r.text, options: ro }); }); }); s.addText(of, { x: blockX, y: yy, w: blockW, h: G.opH + 0.1, valign: 'top', margin: 0 }); }
      if (hasFig) { const f = H.figs[q.i], w = 3.7, h = w * f.h / f.w; s.addImage({ data: f.dataUrl, x: 9.1, y: TOP, w, h }); }
      s.addText([{ text: 'Ans: ', options: { bold: true, fontFace: FB, fontSize: 16, color: GRAYC } }].concat(runs(ansText(q), { fontFace: FB, fontSize: 16, color: GRAYC }, GRAYC)), { x: 0.5, y: 6.6, w: 6, h: 0.5, valign: 'middle', margin: 0 });
      blank(); return;
    }
    const build = fs => {
      const base = { fontFace: FQ, fontSize: fs, color: WHITE }, paras = [qRuns(QT, base)];
      if (q.t === 'MSQ') paras[0] = paras[0].concat([{ text: '   (one or more options correct)', options: Object.assign({}, base, { italic: true, color: GRAYC, fontSize: Math.max(12, fs - 4) }) }]);
      const rows = (q.o || []).map((o, k) => [k]);
      rows.forEach(ix => { const pr = [{ text: '(' + LET[ix[0]] + ') ', options: Object.assign({}, base, { bold: true, color: '3B9EFF' }) }]; pr.push(...runs(q.o[ix[0]], base, WHITE)); paras.push(pr); });
      const hs = [textH(QT + (q.t === 'MSQ' ? '   (one or more options correct)' : ''), fs, blockW)].concat(rows.map(ix => textH('(' + LET[ix[0]] + ') ' + q.o[ix[0]], fs, blockW)));
      return { paras, h: hs.reduce((a, b) => a + b, 0) + (paras.length - 1) * 0.083 };
    };
    let fs = QFS, L = build(fs);
    while (L.h > 5.44 && fs > 20) { fs -= 2; L = build(fs); }
    const flat = [];
    L.paras.forEach((pr, k) => pr.forEach((r, j) => { const o = Object.assign({}, r.options); if (j === pr.length - 1 && k < L.paras.length - 1) o.breakLine = true; o.paraSpaceAfter = 6; flat.push({ text: r.text, options: o }); }));
    s.addShape(pptx.ShapeType.rect, { x: 0.5, y: TOP, w: 6 / 72, h: L.h, fill: { color: CORAL }, line: { type: 'none' } });
    s.addText(flat, { x: blockX, y: TOP, w: blockW, h: L.h + 0.1, valign: 'top', margin: 0 });
    if (hasFig) { const f = H.figs[q.i], w = 3.7, h = w * f.h / f.w; s.addImage({ data: f.dataUrl, x: 9.1, y: TOP, w, h }); }
    s.addText([{ text: 'Ans: ', options: { bold: true, fontFace: FB, fontSize: 16, color: GRAYC } }].concat(runs(ansText(q), { fontFace: FB, fontSize: 16, color: GRAYC }, GRAYC)), { x: 0.5, y: 6.6, w: 6, h: 0.5, valign: 'middle', margin: 0 });
    blank();
  });
  /* last: closing slide */
  { const s = pptx.addSlide(); s.background = { color: BLACK };
    s.addShape(pptx.ShapeType.roundRect, { x: 4.17, y: 0.9, w: 5.0, h: 0.42, fill: { type: 'none' }, line: { color: CORAL, width: 1.5 }, rectRadius: 0.2 });
    s.addText(clLabel + '  ·  ' + chLabel, { x: 4.17, y: 0.9, w: 5.0, h: 0.42, fontFace: FB, bold: true, fontSize: 13, color: CORAL, align: 'center', valign: 'middle', charSpacing: 2 });
    s.addText('Thank you', { x: 0.5, y: 1.9, w: 12.33, h: 1.9, fontFace: FH, bold: true, fontSize: 72, color: CORAL, align: 'center', valign: 'middle' });
    s.addShape(pptx.ShapeType.rect, { x: 6.17, y: 4.0, w: 1.0, h: 0.07, fill: { color: CORAL }, line: { type: 'none' } });
    s.addText(d.chapter, { x: 0.5, y: 4.3, w: 12.33, h: 0.8, fontFace: FH, bold: true, fontSize: 30, color: WHITE, align: 'center', valign: 'middle' });
    s.addText(kindLabel + ' · ' + d.count + ' questions', { x: 0.5, y: 5.1, w: 12.33, h: 0.5, fontFace: FB, fontSize: 16, color: GRAYC, align: 'center' });
    s.addText('Avanti Fellows', { x: 0.5, y: 6.7, w: 12.33, h: 0.4, fontFace: FB, fontSize: 12, color: GRAYC, align: 'center', charSpacing: 2 }); }
  const buf = await pptx.write({ outputType: 'arraybuffer' });
  if (!eqs.length) return new Blob([buf]);
  const zip = await JSZip.loadAsync(buf);
  const NS_MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006', NS_A14 = 'http://schemas.microsoft.com/office/drawing/2010/main', NS_M = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
  const re = /<a:r>((?:(?!<\/a:r>)[\s\S])*?)<a:t>⟦M(\d+)⟧<\/a:t><\/a:r>/g;
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    let xml = await zip.file(name).async('string');
    if (xml.indexOf('⟦M') < 0) continue;
    xml = xml.replace(re, (all, rpr, id) => {
      const e = eqs[+id], sz = (/\bsz="(\d+)"/.exec(rpr) || [])[1];
      let inner = M().omml(e.tex, false, 'pptx' + (sz ? '@' + sz : '')).replace('<m:oMath>', '<m:oMath xmlns:m="' + NS_M + '">');
      inner = inner.replace(/<a:rPr\b[^>]*>/g, m0 => m0 + '<a:solidFill><a:srgbClr val="' + (e.color || WHITE) + '"/></a:solidFill>');
      const fb = '<a:r>' + rpr + '<a:t>' + M().esc(M().toText(e.tex)) + '</a:t></a:r>';
      return '<mc:AlternateContent xmlns:mc="' + NS_MC + '"><mc:Choice xmlns:a14="' + NS_A14 + '" Requires="a14"><a14:m>' + inner + '</a14:m></mc:Choice><mc:Fallback>' + fb + '</mc:Fallback></mc:AlternateContent>';
    });
    zip.file(name, xml);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
}

root.OfficeDoc = { buildDocx, buildPptx, buildCwPptx };
if (typeof module !== 'undefined') module.exports = root.OfficeDoc;
})(typeof window !== 'undefined' ? window : globalThis);
