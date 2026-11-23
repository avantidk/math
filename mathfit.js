/* Long formulas wrap onto the next line instead of scrolling or being cut off.
   1) CSS lets KaTeX break a formula after + - = (see dash.css / portal.css).
   2) A part that cannot break (a bracket made with \left ... \right) is drawn again with plain brackets, which can break.
   3) If something is still too wide, the formula is shrunk to fit. */
(function () {
  'use strict';

  /* Notation clean-up, for every formula on the site: A\prime B\prime is drawn as the usual A' B' (a small raised prime, not a lone slanted stroke),
     and \widehat{i}, \widehat{j} become the neat unit-vector hats on the dotless i and j. Done by wrapping KaTeX itself, so every page gets it. */
  const norm = t => typeof t !== 'string' ? t : t
    .replace(/(\w|[)\]}])\s*\\prime(?![A-Za-z])/g, "$1'")
    .replace(/\\(?:wide)?hat\{\s*i\s*\}/g, '\\hat{\\imath}').replace(/\\(?:wide)?hat\{\s*j\s*\}/g, '\\hat{\\jmath}')
    .replace(/\\widehat\{\s*([A-Za-z])\s*\}/g, '\\hat{$1}');
  /* an inline fraction is drawn in full size (like a displayed one) so it is easy to read; not inside a power or a subscript */
  const bigFrac = (t, o) => (typeof t === 'string' && !(o && o.displayMode) && /\\frac(?![A-Za-z])/.test(t) && !/[\^_]\{[^{}]*\\frac/.test(t) && !/[\^_]\\frac/.test(t)) ? t.replace(/\\frac(?![A-Za-z])/g, '\\dfrac') : t;
  /* an inline integral is drawn in full size (displaystyle), the small inline integral sign was hard to see */
  const bigInt = (t, o) => (typeof t === 'string' && !(o && o.displayMode) && /\\o?int(?![A-Za-z])/.test(t) && !/^\s*\\displaystyle/.test(t)) ? '\\displaystyle ' + t : t;
  const patchKatex = k => { if (!k || k.__avNorm) return k; try {
      ['render', 'renderToString'].forEach(n => { const f = k[n]; if (typeof f === 'function') k[n] = function (tex, a, b) { const o = n === 'render' ? b : a; return f.call(this, bigInt(bigFrac(norm(tex), o), o), a, b); }; });
      k.__avNorm = true; } catch (e) { /* keep KaTeX as it is */ } return k; };
  if (window.katex) patchKatex(window.katex);
  else { let kk; try { Object.defineProperty(window, 'katex', { configurable: true, get: () => kk, set: v => { kk = patchKatex(v); } }); } catch (e) { /* no patch */ } }
  const top = el => !el.parentElement || !el.parentElement.closest('.katex');
  const box = el => el.closest('.dl-fullq, .ex-q, .pt-qt, .ex-opt, .pt-opt, .dl-ot, .dl-sol, .dl-pane, td, li, p, div') || el.parentElement;
  const avail = c => { const s = getComputedStyle(c); return c.clientWidth - (parseFloat(s.paddingLeft) || 0) - (parseFloat(s.paddingRight) || 0); };
  const tooWide = (el, c) => { const r = c.getBoundingClientRect().left + (parseFloat(getComputedStyle(c).paddingLeft) || 0), w = avail(c); if (w <= 0) return false;
    const bases = el.querySelectorAll('.katex-html > .base'); let right = 0; (bases.length ? bases : [el]).forEach(b => { right = Math.max(right, b.getBoundingClientRect().right); });
    return right - r > w + 1; };
  const plain = t => t.replace(/\\left\s*\\?\./g, '').replace(/\\right\s*\\?\./g, '').replace(/\\left\s*(\\[{|]|\\lbrace|\\lbrack|\\langle|\\lfloor|\\lceil|[(\[|])/g, '$1').replace(/\\right\s*(\\[}|]|\\rbrace|\\rbrack|\\rangle|\\rfloor|\\rceil|[)\]|])/g, '$1');
  function fit(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.katex-display, .katex').forEach(el => {
      if (el.classList.contains('katex') && el.closest('.katex-display')) return;
      if (!top(el) || el.dataset.fit === '1') return;
      const c = box(el); if (!c) return;
      if (!tooWide(el, c)) return;
      const display = el.classList.contains('katex-display'), ann = el.querySelector('annotation[encoding="application/x-tex"]');
      let cur = el;
      if (ann && window.katex && /\\left|\\right/.test(ann.textContent)) {
        try { const host = document.createElement('span'); window.katex.render(plain(ann.textContent), host, { displayMode: display, throwOnError: false }); const n = host.firstChild; if (n) { el.replaceWith(n); cur = n; } } catch (e) { /* keep the first drawing */ }
      }
      cur.dataset.fit = '1';
      if (tooWide(cur, c)) {   /* still too wide: smaller, never a scroll bar */
        let bases = cur.querySelectorAll('.katex-html > .base'), right = 0, left = c.getBoundingClientRect().left; bases.forEach(b => { right = Math.max(right, b.getBoundingClientRect().right); });
        const ratio = Math.max(0.55, avail(c) / Math.max(1, right - left)); if (ratio < 1) cur.style.zoom = String(ratio);
      }
    });
  }
  let t = null; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { const ex = document.querySelector('.ex, .dl, #viewPortal, main'); if (ex) fit(document.body); }, 250); });
  window.AvantiMathFit = Object.freeze({ fit });
})();
