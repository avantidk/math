/* The layout of a question's options, the same on every page (owner's rule, see CLAUDE.md):
   4 short options = ONE line (4 in a row); two medium pairs = 2 lines (2x2); any very long option (even with 3 short ones) = 4 lines
   (one per row). NEVER 3 lines. The decision is made from the rendered widths (after KaTeX has drawn the maths) and is made again
   when the box changes width (phone turned, window resized).

   Usage: AvantiOpts.layout(box)  where box is the element whose children are the options (any markup inside them).
          It adds the class opts-auto and one of opts-1row / opts-2x2 / opts-4row (and --opts-n for other option counts).
          Call it again after the option text changes (for example after KaTeX renders). AvantiOpts.layoutAll(root) lays out every
          [data-opts] or .opts-auto box inside root. AvantiOpts.mode(box) returns '1row', '2x2' or '4row'. */
(function () {
  'use strict';
  if (window.AvantiOpts) return;
  const CSS = '.opts-auto{display:grid!important;gap:8px;align-items:stretch}' +
    '.opts-auto>*{min-width:0;box-sizing:border-box}' +
    '.opts-auto.opts-1row{grid-template-columns:repeat(var(--opts-n,4),minmax(0,1fr))!important}' +
    '.opts-auto.opts-2x2{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
    '.opts-auto.opts-4row{grid-template-columns:minmax(0,1fr)!important}' +
    /* measuring: every option at its natural one-line width */
    '.opts-auto.opts-measure{display:flex!important;flex-wrap:nowrap!important;overflow:hidden!important}' +
    '.opts-auto.opts-measure>*{flex:none!important;width:max-content!important;max-width:none!important}' +
    '.opts-auto.opts-measure .katex-display{display:inline-block!important;margin:0!important}';
  function addCss() {
    if (document.getElementById('avanti-opts-css')) return;
    const s = document.createElement('style'); s.id = 'avanti-opts-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  const gapOf = box => { const cs = getComputedStyle(box), g = parseFloat(cs.columnGap || cs.gap); return isFinite(g) ? g : 8; };
  const LAST = new WeakMap();
  function decide(ws, W, g) {
    const n = ws.length, max = Math.max(0, ...ws);
    if (n <= 1) return '4row';
    if (max * n + g * (n - 1) <= W) return '1row';                 /* all on one line */
    if (n === 4 && max * 2 + g <= W) return '2x2';                 /* two pairs */
    if (n === 2 && max * 2 + g <= W) return '1row';
    return '4row';                                                 /* one per row: never 3 + 1 */
  }
  function layout(box) {
    if (!box || !box.children) return '';
    addCss();
    const kids = [...box.children].filter(k => !k.hidden && k.nodeType === 1);
    box.classList.add('opts-auto');
    box.style.setProperty('--opts-n', String(Math.max(1, kids.length)));
    const W = box.clientWidth - (parseFloat(getComputedStyle(box).paddingLeft) || 0) - (parseFloat(getComputedStyle(box).paddingRight) || 0);
    if (!kids.length || W <= 0) { watch(box); return mode(box); }   /* hidden: done when it is shown (ResizeObserver) */
    /* zoom set by mathfit for a narrow column must not count when measuring */
    const zoomed = [...box.querySelectorAll('[data-fit="1"]')].filter(z => z.style.zoom);
    const zs = zoomed.map(z => z.style.zoom); zoomed.forEach(z => { z.style.zoom = ''; });
    box.classList.add('opts-measure');
    const ws = kids.map(k => Math.ceil(k.getBoundingClientRect().width) + 1);
    box.classList.remove('opts-measure');
    zoomed.forEach((z, i) => { z.style.zoom = zs[i]; });
    const m = decide(ws, W, gapOf(box));
    box.classList.remove('opts-1row', 'opts-2x2', 'opts-4row');
    box.classList.add('opts-' + m);
    box.dataset.optsMode = m;
    LAST.set(box, Math.round(box.clientWidth));
    watch(box);
    return m;
  }
  const mode = box => (box && box.dataset && box.dataset.optsMode) || '';
  /* width changes (resize, rotation, a panel opening) lay the box out again */
  let RO = null; const pend = new Set(); let raf = 0;
  const flush = () => { raf = 0; const l = [...pend]; pend.clear(); l.forEach(b => { if (b.isConnected) layout(b); }); };
  function watch(box) {
    if (!window.ResizeObserver) return;
    if (!RO) RO = new ResizeObserver(es => { es.forEach(e => { const b = e.target, w = Math.round(b.clientWidth); if (w && LAST.get(b) !== w) { pend.add(b); } }); if (pend.size && !raf) raf = requestAnimationFrame(flush); });
    if (!box.__optsWatched) { box.__optsWatched = true; RO.observe(box); }
  }
  function layoutAll(root) { (root || document).querySelectorAll('[data-opts], .opts-auto').forEach(layout); }
  if (!window.ResizeObserver) { let t = 0; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => layoutAll(document), 150); }); }
  /* web fonts change the widths once they arrive */
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layoutAll(document)); } catch (e) { /* optional */ }
  window.AvantiOpts = Object.freeze({ layout, layoutAll, mode });
})();
