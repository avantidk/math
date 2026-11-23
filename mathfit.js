/* Long formulas wrap onto the next line instead of scrolling or being cut off.
   1) CSS lets KaTeX break a formula after + - = (see dash.css / portal.css).
   2) A part that cannot break (a bracket made with \left ... \right) is drawn again with plain brackets, which can break.
   3) If something is still too wide, the formula is shrunk to fit. */
(function () {
  'use strict';
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
