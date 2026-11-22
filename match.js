/* "Match the following" questions: split the text into the intro and two lists, and draw the lists as a table.
   Used by the tests (portal.js) and by the lists (dash-list.js). Handles List-I / Column I headers and the labels (P), (A), (a), (i), (1) ... */
(function () {
  'use strict';
  const HA = /^\s*\**\s*(List|Column)[\s\-]*(I|1)\s*(\([^)]*\))?\s*(?::\**\s*(.*)|\**\s*$)/i, HB = /^\s*\**\s*(List|Column)[\s\-]*(II|2)\s*(\([^)]*\))?\s*(?::\**\s*(.*)|\**\s*$)/i;
  const LBL = /^\(([A-Za-z]|\d{1,2}|[IVXLCivxlc]{2,5})\)\s*([\s\S]*)$/;
  function parse(text) {
    /* "Column" on one line and "**I:**" on the next */
    const s = String(text == null ? '' : text).replace(/(^|\n)[ \t]*(List|Column)[ \t]*\n[ \t]*\**(I{1,2}|[12]):\**[ \t]*/gi, '$1$2-$3:\n');
    const ls = s.split('\n'); let a = -1, b = -1, ma = null, mb = null;
    for (let k = 0; k < ls.length; k++) { if (a < 0) { ma = HA.exec(ls[k]); if (ma) a = k; } else if (b < 0) { mb = HB.exec(ls[k]); if (mb) b = k; } }
    if (a < 0 || b < 0) return null;
    const items = (inline, lines) => {
      const raw = []; if (inline && inline.trim()) inline.split(/\s;\s+(?=\()/).forEach(x => { if (x.trim()) raw.push(x.trim()); }); lines.forEach(l => { if (l.trim()) raw.push(l.trim()); });
      const out = []; raw.forEach(x => { const k = LBL.exec(x); if (k) out.push([k[1], k[2]]); else if (out.length) out[out.length - 1][1] += '\n' + x; });
      return out;
    };
    const A = items(ma[4], ls.slice(a + 1, b)), B = items(mb[4], ls.slice(b + 1));
    if (A.length < 2 || B.length < 2) return null;
    const word = m => (/^column/i.test(m[1]) ? 'Column ' : 'List-') + m[2].toUpperCase();
    return { pre: ls.slice(0, a).join('\n').trim(), h1: word(ma), h2: word(mb), a: A, b: B };
  }
  /* the table as HTML; render(text) turns one cell's text into HTML; cls = [wrapper, table, label] */
  function table(m, render, cls) {
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cell = x => x ? '<b class="' + cls[2] + '">(' + esc(x[0]) + ')</b> <span>' + render(x[1]) + '</span>' : '';
    let rows = ''; for (let i = 0; i < Math.max(m.a.length, m.b.length); i++) rows += '<tr><td>' + cell(m.a[i]) + '</td><td>' + cell(m.b[i]) + '</td></tr>';
    const wl = arr => Math.max(8, ...arr.map(x => String(x[1]).replace(/\\[()]/g, '').replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\\^_]/g, '').length)), la = wl(m.a), lb = wl(m.b), wa = Math.max(34, Math.min(80, Math.round(100 * la / (la + lb))));
    return '<div class="' + cls[0] + '"><table class="' + cls[1] + '"><colgroup><col style="width:' + wa + '%"><col style="width:' + (100 - wa) + '%"></colgroup><thead><tr><th scope="col">' + esc(m.h1) + '</th><th scope="col">' + esc(m.h2) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  window.AvantiMatch = Object.freeze({ parse, table });
})();
