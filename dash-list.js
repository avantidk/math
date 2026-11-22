/* The question list inside the dashboard (/dashboard): All PYQs, a topic, a difficulty bucket, Must Do or Bookmarked.
   Only 20 questions are drawn at a time (more load as you scroll), each as one compact row; a row opens to the full question with
   answer, solution, other people's solutions, comments, bookmark and an error report. Needs dash.js (it passes the data and the menus). */
(function () {
'use strict';
const { h, esc } = window.AvantiUtil;
const PAGE = 20;
const EXAM_NAME = { 'JEE Main': 'JEE Main', 'JEE Advanced': 'JEE Advanced', 'AIEEE': 'AIEEE', 'IIT': 'IIT-JEE', 'KCET': 'KCET', 'IAT': 'IAT', 'NDA': 'NDA' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const svg = d => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const ICON = { bm: svg('<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>'), warn: svg('<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.3h.01"/>'), more: svg('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),
  caret: svg('<path d="m6 9 6 6 6-6"/>'), prev: svg('<path d="m15 18-6-6 6-6"/>'), next: svg('<path d="m9 18 6-6-6-6"/>'), prac: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8"/>'),
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'), chk: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'), x: svg('<path d="M6 6l12 12M18 6 6 18"/>'), up: svg('<path d="m6 15 6-6 6 6"/>'), down: svg('<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>'),
  test: svg('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'), sort: svg('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>') };

/* ---------- maths in text: \( inline \) and \[ display \], line breaks kept ---------- */
const plainTxt = x => esc(x).replace(/\n/g, '<br>');
function richBase(t) {
  const K = window.katex, s = String(t == null ? '' : t), re = /\\\((.+?)\\\)|\\\[([\s\S]+?)\\\]/g; let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += plainTxt(s.slice(last, m.index));
    const tex = m[1] != null ? m[1] : m[2];
    try { out += K ? K.renderToString(tex, { displayMode: m[2] != null, throwOnError: false }) : esc(m[0]); } catch (e) { out += esc(m[0]); }
    last = re.lastIndex;
  }
  return (out + plainTxt(s.slice(last))).replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');   /* **bold** in the question text */
}
/* Layout of the four options: 1 row when all are short, 2 rows (2 columns) when they fit comfortably, otherwise 4 rows. Never 3 + 1. */
const optCls = arr => { const w = x => String(x == null ? '' : x).replace(/\\[()]/g, '').replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\\^_]/g, '').length, m = Math.max(0, ...(arr || []).map(w)); return (arr || []).length === 4 ? (m <= 14 ? 'c4' : m <= 48 ? 'c2' : 'c1') : 'c1'; };
/* Match the following: List-I and List-II side by side in a table (P with 1, Q with 2, ...) */
function rich(t) {
  const m = /^([\s\S]*?)\n\s*List[\s-]*(?:I|1)\s*:?\s*\n([\s\S]*?)\n\s*List[\s-]*(?:II|2)\s*:?\s*\n([\s\S]*)$/.exec(String(t == null ? '' : t));
  if (!m) return richBase(t);
  const items = (body, re) => { const out = []; String(body).split('\n').forEach(l => { const k = re.exec(l); if (k) out.push([k[1], k[2]]); else if (out.length && l.trim()) out[out.length - 1][1] += '\n' + l; }); return out; };
  const a = items(m[2], /^\s*\(([P-T])\)\s*(.*)$/), b = items(m[3], /^\s*\(([1-9])\)\s*(.*)$/);
  if (a.length < 2 || b.length < 2) return richBase(t);
  const cell = x => x ? '<b class="dl-mtk">(' + esc(x[0]) + ')</b> <span>' + richBase(x[1]) + '</span>' : '';
  let rows = ''; for (let i = 0; i < Math.max(a.length, b.length); i++) rows += '<tr><td>' + cell(a[i]) + '</td><td>' + cell(b[i]) + '</td></tr>';
  const wl = arr => Math.max(8, ...arr.map(x => String(x[1]).replace(/\\[()]/g, '').replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}\\^_]/g, '').length)), la = wl(a), lb = wl(b), wa = Math.max(34, Math.min(80, Math.round(100 * la / (la + lb))));
  return richBase(m[1]) + '<div class="dl-mtw"><table class="dl-mt"><colgroup><col style="width:' + wa + '%"><col style="width:' + (100 - wa) + '%"></colgroup><thead><tr><th scope="col">List-I</th><th scope="col">List-II</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}
const srcLine = x => {
  if (x.source && x.source !== 'PYQ') return (x.paper ? String(x.paper) : (x.book || x.publisher || 'Practice')) + (x.qno ? ' · Q' + x.qno : '');
  const name = EXAM_NAME[x.exam] || x.exam || '', p = String(x.paper || '').replace(String(x.year || ''), '').replace(/\s*\(([^)]*)\)/g, ' · $1').replace(/\s+/g, ' ').replace(/^[\s,.\-–·]+|[\s,.\-–·]+$/g, '');
  return name + (x.year ? ' ' + x.year : '') + (p ? ' (' + p + ')' : '');
};
let FIGS = null;
const figures = env => (FIGS || (FIGS = env.content.get('qb/data/figures.json').catch(() => ({}))));

/* ---------- small pop-up menus for the filters ---------- */
let openMenu = null;
document.addEventListener('click', e => { if (openMenu && !openMenu.box.contains(e.target)) { openMenu.close(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && openMenu) openMenu.close(); });
function menu(label, build) {   /* build(panel, refreshLabel) fills the panel; returns the button box */
  const box = h('div', { class: 'dl-menu' }), btn = h('button', { type: 'button', class: 'dl-fbtn', 'aria-haspopup': 'true', 'aria-expanded': 'false' }, h('span', { class: 'dl-fl', text: label }), h('span', { html: ICON.caret })), panel = h('div', { class: 'dl-pop', hidden: true });
  const api = { box, close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (openMenu === api) openMenu = null; }, setLabel(t, on) { btn.firstChild.textContent = t; btn.classList.toggle('on', !!on); } };
  btn.addEventListener('click', e => { e.stopPropagation(); if (!panel.hidden) { api.close(); return; } if (openMenu) openMenu.close(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); openMenu = api; });
  box.append(btn, panel); build(panel, api); return box;
}

/* ---------- the list ---------- */
function render(env, o) {
  const { D, A, main } = env, pool = o.rows, res = () => D.sum.results;
  const F = { hide: false, years: new Set(), status: '', lv: new Set(), types: new Set(), sort: o.seqOrder ? 'seq' : 'new', extra: {} };
  (o.filters || []).forEach(f => { F.extra[f.key] = new Set(); });
  const typeOf = r => (D.raw.get(r.id) || {}).type || 'MCQ';
  const years = [...new Set(pool.map(r => r.y).filter(Boolean))].sort((a, b) => b - a), types = [...new Set(pool.map(typeOf))];
  let list = [], page = 0, openId = '';
  const wrap = h('div', { class: 'dl' }), ul = h('ul', { class: 'dl-list' }), pager = h('nav', { class: 'dl-pager', 'aria-label': 'Pages' }), count = h('span', { class: 'dl-count', role: 'status' });
  let expCount = null;
  const att = st => st === 'c' || st === 'w', solved = pool.filter(r => att(res()[r.id])).length, right = pool.filter(r => res()[r.id] === 'c').length;

  /* what is shown: filters, then the order */
  const apply = () => {
    list = pool.filter(r => (!F.hide || !att(res()[r.id])) && (!F.years.size || F.years.has(r.y)) && (!F.lv.size || F.lv.has(r.d)) && (!F.types.size || F.types.has(typeOf(r)))
      && (!F.status || (F.status === 'u' ? !res()[r.id] : res()[r.id] === F.status)) && (o.filters || []).every(f => !F.extra[f.key].size || F.extra[f.key].has(f.get(r))));
    const key = r => (r.y || 0) * 1e3;
    const chOrd = c => ((env.D.chByCode[c] || {}).order || 999), qn = r => +((env.D.raw.get(r.id) || {}).qno) || 0;
    list.sort((a, b) => F.sort === 'seq' ? chOrd(a.ch) - chOrd(b.ch) || String(a.bk).localeCompare(String(b.bk)) || (a.shn || 0) - (b.shn || 0) || qn(a) - qn(b) || (a.id < b.id ? -1 : 1) : F.sort === 'new' ? (b.y || 0) - (a.y || 0) || (a.id < b.id ? 1 : -1) : F.sort === 'old' ? (a.y || 0) - (b.y || 0) || (a.id < b.id ? -1 : 1) : F.sort === 'easy' ? String(a.d).localeCompare(String(b.d)) || (b.y || 0) - (a.y || 0) : String(b.d).localeCompare(String(a.d)) || (b.y || 0) - (a.y || 0));
    page = 0; draw();
  };
  const pages = () => Math.max(1, Math.ceil(list.length / PAGE));
  const draw = () => {
    openId = ''; ul.textContent = '';
    const from = page * PAGE, to = Math.min(list.length, from + PAGE);
    for (let i = from; i < to; i++) ul.append(row(list[i], i));
    paint();
  };
  const goPage = (n, scroll) => { page = Math.max(0, Math.min(pages() - 1, n)); draw(); if (scroll !== false) { const t = wrap.querySelector('.dl-bar') || wrap; t.scrollIntoView({ block: 'start', behavior: 'smooth' }); } };
  const filtered = () => F.hide || F.years.size || F.lv.size || F.types.size || F.status || (o.filters || []).some(f => F.extra[f.key].size);
  const paint = () => {
    const from = page * PAGE, to = Math.min(list.length, from + PAGE);
    count.textContent = list.length ? 'Showing ' + (from + 1) + '–' + to + ' of ' + list.length + (filtered() ? ' (filtered from ' + pool.length + ')' : '') : 'No questions';
    pager.textContent = ''; if (expCount) expCount.textContent = String(list.length);
    if (!list.length) { ul.textContent = ''; ul.append(h('li', { class: 'dl-empty' }, h('b', { text: 'No questions match' }), h('span', { text: filtered() ? 'Change or clear the filters above.' : (o.emptyText || 'Nothing here yet.') }))); return; }
    const n = pages(); if (n < 2) return;
    const btn = (t, p, cur, dis, label) => h('button', { type: 'button', class: 'dl-pg' + (cur ? ' on' : ''), disabled: !!dis, 'aria-label': label || 'Page ' + t, 'aria-current': cur ? 'page' : null, html: typeof t === 'string' && t[0] === '<' ? t : null, text: typeof t === 'string' && t[0] === '<' ? null : String(t), onclick: () => goPage(p) });
    const set = new Set([0, n - 1, page - 1, page, page + 1]); if (page < 2) { set.add(1); set.add(2); } if (page > n - 3) { set.add(n - 2); set.add(n - 3); }
    const nums = [...set].filter(x => x >= 0 && x < n).sort((a, b) => a - b); let prev = -1; const items = [];
    nums.forEach(x => { if (prev >= 0 && x - prev > 1) items.push(h('span', { class: 'dl-gap', text: '…' })); items.push(btn(x + 1, x, x === page)); prev = x; });
    pager.append(btn(ICON.prev, page - 1, false, page === 0, 'Previous page'), h('span', { class: 'dl-pgs' }, items), btn(ICON.next, page + 1, false, page >= n - 1, 'Next page'));
  };

  /* one compact row */
  function row(r, i) {
    const x = D.raw.get(r.id) || {}, st = res()[r.id];
    const li = h('li', { class: 'dl-row', 'data-id': r.id });
    const mark = h('span', { class: 'dl-st ' + (st || ''), title: st === 'c' ? 'You got this right in a test' : st === 'w' ? 'You got this wrong in a test' : st === 's' ? 'Left unanswered in a test' : 'Not attempted', text: st === 'c' ? '✓' : st === 'w' ? '✕' : st === 's' ? '–' : '' });
    const head = h('button', { type: 'button', class: 'dl-main', 'aria-expanded': 'false', onclick: () => toggle(li, r) },
      h('span', { class: 'dl-n' }, h('b', { text: String(i + 1) }), mark),
      h('span', { class: 'dl-qt' }, h('span', { class: 'dl-q', html: rich(x.question) }), h('span', { class: 'dl-meta', text: srcLine(x) })));
    li.append(head, h('span', { class: 'dl-sd' }, rowMenu(r, x, li)), h('div', { class: 'dl-detail', hidden: true }));
    return li;
  }
  const LVN = { L1: 'Level 1 · Easy', L2: 'Level 2 · Moderate', L3: 'Level 3 · Tough' };
  /* the three-line menu of a question: subtopic, type, level, bookmark and report an error */
  function rowMenu(r, x, li) {
    const box = menu('', (panel, api) => {
      const b = api.box.querySelector('.dl-fbtn'); b.className = 'dl-fbtn dl-ico dl-rowmenu'; b.innerHTML = ICON.menu; b.setAttribute('aria-label', 'Question options');
      b.addEventListener('click', e => { e.stopPropagation(); requestAnimationFrame(() => { if (panel.hidden) return; const r = b.getBoundingClientRect(), pw = Math.min(280, window.innerWidth * 0.88), ph = panel.offsetHeight, top = r.bottom + 6 + ph > window.innerHeight - 8 ? Math.max(8, r.top - ph - 6) : r.bottom + 6; panel.style.setProperty('position', 'fixed', 'important'); panel.style.setProperty('top', top + 'px', 'important'); panel.style.setProperty('bottom', 'auto', 'important'); panel.style.setProperty('left', Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw)) + 'px', 'important'); panel.style.setProperty('right', 'auto', 'important'); panel.style.setProperty('z-index', '600', 'important'); const off = () => { api.close(); window.removeEventListener('scroll', off, true); }; window.addEventListener('scroll', off, true); }); });
      panel.classList.add('dl-pop-r', 'dl-rpop'); panel.addEventListener('click', e => e.stopPropagation());
      const info = (k, v) => h('div', { class: 'dl-ri' }, h('span', { text: k }), h('b', { text: v }));
      const bm = h('button', { type: 'button', class: 'dl-mi dl-mi-bm', 'data-id': r.id, onclick: () => { api.close(); toggleBm(r.id); } });
      const warn = h('button', { type: 'button', class: 'dl-mi dl-warn', html: ICON.warn + '<span>Report an error</span>', onclick: () => { api.close(); if (li.querySelector('.dl-detail').hidden) toggle(li, r); const rb = li.querySelector('.dl-rbox'); if (rb) { rb.hidden = false; rb.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } });
      bmLabel(bm);
      const mk = info('Marking', '…'), mkb = mk.querySelector('b');
      let mkDone = false; api.box.querySelector('.dl-fbtn').addEventListener('click', () => { if (mkDone) return; mkDone = true; env.marking(x).then(t => { mkb.textContent = t || 'Not available'; }); });
      panel.append(info('Subtopic', x.topic || r.tp || '—'), info('Type', x.type || 'MCQ'), info('Level', LVN[r.d] || r.d || '—'), mk, h('div', { class: 'dl-sep' }), bm, warn);
    });
    return box;
  }
  const bmLabel = b => { const on = D.sum.bookmarks.includes(b.dataset.id); b.innerHTML = ICON.bm + '<span>' + (on ? 'Remove bookmark' : 'Bookmark question') + '</span>'; b.classList.toggle('on', on); };
  const toggle = (li, r) => {
    const det = li.querySelector('.dl-detail'), btn = li.querySelector('.dl-main'), was = !det.hidden;
    ul.querySelectorAll('.dl-row.open').forEach(o => { o.classList.remove('open'); o.querySelector('.dl-detail').hidden = true; o.querySelector('.dl-main').setAttribute('aria-expanded', 'false'); });
    if (was) { openId = ''; return; }
    openId = r.id; li.classList.add('open'); det.hidden = false; btn.setAttribute('aria-expanded', 'true');
    if (!det.dataset.built) { det.dataset.built = '1'; det.append(detail(r)); }
    setTimeout(() => li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  };
  /* an answer given here (tap an option or check a number) is saved, so it counts as attempted */
  const record = (id, good) => {
    const prev = res()[id]; D.sum.results[id] = good ? 'c' : (prev === 'c' ? 'c' : 'w');
    document.querySelectorAll('.dl-row[data-id="' + id + '"] .dl-st').forEach(m => { const st = D.sum.results[id]; m.className = 'dl-st ' + st; m.textContent = st === 'c' ? '✓' : '✕'; });
    const sv = pool.filter(r => att(res()[r.id])).length, rt = pool.filter(r => res()[r.id] === 'c').length, setT = (k, t) => { const b = wrap.querySelector('.lh-s[data-k="' + k + '"] b'); if (b) b.textContent = t; };   /* the banner numbers follow at once */
    setT('attempted', sv + ' / ' + pool.length); setT('correct', String(rt)); setT('accuracy', sv ? env.pct(rt, sv) + '%' : '—');
    try { A().sb.rpc('record_practice', { p_qid: id, p_correct: !!good }).then(() => {}, () => {}); } catch (e) { /* the numbers still update on this page */ }
  };
  const toggleBm = id => {
    A().sb.rpc('toggle_bookmark', { p_qid: id }).then(r => {
      if (r.error) throw new Error(r.error.message); const on = !!r.data;
      D.sum.bookmarks = on ? [id].concat(D.sum.bookmarks.filter(i => i !== id)) : D.sum.bookmarks.filter(i => i !== id);
      document.querySelectorAll('.dl-mi-bm[data-id="' + id + '"]').forEach(bmLabel); env.toast(on ? 'Bookmarked' : 'Bookmark removed');
    }).catch(e => env.toast(e.message || 'Could not save'));
  };

  /* the opened question: full text, options, answer, solution, others' solutions, comments, report */
  function detail(r) {
    const x = D.raw.get(r.id) || {}, box = h('div', { class: 'dl-d' }), type = x.type || 'MCQ';
    const opts = (x.options || []).slice(0, 8), raw = String(x.answer == null ? '' : x.answer).trim(), isKey = /^[A-H](\s*,\s*[A-H])*$/i.test(raw), keys = isKey ? raw.toUpperCase().split(/[^A-H]+/).filter(Boolean) : [];
    const fig = h('div', { class: 'dl-fig' }); figures(env).then(f => { const v = f[r.id]; if (v && v.svg) fig.innerHTML = v.svg; });
    const multi = keys.length > 1, tried = new Set(); let wrongTapped = false;
    let locked = false;
    const optEls = opts.map((t, k) => {
      const L = LETTERS[k], el = h('button', { type: 'button', class: 'dl-opt', 'aria-label': 'Option ' + L }, h('b', { text: L }), h('span', { class: 'dl-ot', html: rich(t) }), h('span', { class: 'dl-mk', 'aria-hidden': 'true' }));
      el.addEventListener('click', () => {
        if (!keys.length) { env.toast('The answer for this question is not available yet.'); return; }
        if (locked || tried.has(L)) return; tried.add(L);
        const good = keys.includes(L); if (!multi) record(r.id, good); else if (!good) { if (!wrongTapped) record(r.id, false); wrongTapped = true; } else if (!wrongTapped && [...tried].filter(z => keys.includes(z)).length === keys.length) record(r.id, true);
        el.classList.add(good ? 'ok' : 'bad'); el.lastChild.innerHTML = good ? ICON.chk : ICON.x;
        el.setAttribute('aria-label', 'Option ' + L + (good ? ', correct' : ', wrong'));
        if (!multi) { locked = true; if (!good) optEls.forEach((o, j) => { if (keys.includes(LETTERS[j])) { o.classList.add('ok', 'show'); o.lastChild.innerHTML = ICON.chk; } }); }
        else if ([...tried].filter(z => keys.includes(z)).length === keys.length) locked = true;
      });
      return el;
    });
    /* numerical: type the value and check it */
    let numBox = null;
    if (!opts.length) {
      const inp = h('input', { type: 'text', inputmode: 'decimal', class: 'dl-numin', placeholder: 'Type your answer', 'aria-label': 'Your answer', autocomplete: 'off' }), res = h('div', { class: 'dl-numres', role: 'status' });
      const check = () => {
        const v = inp.value.trim(); if (!v) { inp.focus(); return; } if (!raw) { env.toast('The answer for this question is not available yet.'); return; }
        const range = /^(-?\d+(?:\.\d+)?)\s*to\s*(-?\d+(?:\.\d+)?)$/i.exec(raw), n = parseFloat(v.replace(/[^0-9eE+\-.]/g, '')); let good = false;
        if (range) good = n >= Math.min(+range[1], +range[2]) - 1e-9 && n <= Math.max(+range[1], +range[2]) + 1e-9; else if (/^-?\d+(\.\d+)?$/.test(raw)) good = Math.abs(n - parseFloat(raw)) < 1e-6 || Math.abs(n - parseFloat(raw)) <= Math.abs(parseFloat(raw)) * 1e-9; else good = v.replace(/\s/g, '').toLowerCase() === raw.replace(/\s/g, '').toLowerCase();
        record(r.id, good); res.className = 'dl-numres ' + (good ? 'ok' : 'bad'); res.innerHTML = (good ? ICON.chk + '<b>Correct</b>' : ICON.x + '<b>Wrong</b> · correct answer: ') + (good ? '' : rich(raw));
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      numBox = h('div', { class: 'dl-num' }, h('div', { class: 'dl-numrow' }, inp, h('button', { type: 'button', class: 'btn pri', text: 'Check', onclick: check })), res);
    }
    const rep = reportBox(env, r.id);
    const idx = list.findIndex(z => z.id === r.id);
    const nav = h('span', { class: 'dl-nav' }, h('button', { type: 'button', class: 'btn', 'aria-label': 'Previous question', html: ICON.prev, disabled: idx <= 0, onclick: () => step(idx - 1) }), h('button', { type: 'button', class: 'btn', 'aria-label': 'Next question', html: ICON.next, disabled: idx >= list.length - 1, onclick: () => step(idx + 1) }));
    const panes = { sol: h('div', { class: 'dl-pane' }), oth: h('div', { class: 'dl-pane', hidden: true }), com: h('div', { class: 'dl-pane', hidden: true }) }, loaded = {}, tabs = h('div', { class: 'dl-tabs', role: 'tablist' });
    const small = window.matchMedia && window.matchMedia('(max-width: 520px)').matches, TN = small ? { sol: 'Explanation', oth: 'Others’', com: 'Comments' } : { sol: 'Full explanation', oth: 'Others’ solutions', com: 'Comments' };
    const tabBtns = {}; [['sol', TN.sol], ['oth', TN.oth], ['com', TN.com]].forEach(([k, t]) => { const b = h('button', { type: 'button', role: 'tab', class: 'dl-tab', 'aria-selected': 'false', text: t, onclick: () => show(k) }); tabBtns[k] = b; tabs.append(b); });
    const body = h('div', { class: 'dl-tabbody', hidden: true }, panes.sol, panes.oth, panes.com);
    const show = k => {
      const was = !body.hidden && tabBtns[k].getAttribute('aria-selected') === 'true'; body.hidden = was;
      Object.keys(panes).forEach(p => { panes[p].hidden = was || p !== k; tabBtns[p].setAttribute('aria-selected', String(!was && p === k)); });
      if (was || loaded[k]) return; loaded[k] = true;
      if (k === 'sol') solution(env, r.id, panes.sol); else if (k === 'oth') others(env, r.id, panes.oth, n => { tabBtns.oth.textContent = TN.oth + (n ? ' (' + n + ')' : ''); }); else comments(env, r.id, panes.com, n => { tabBtns.com.textContent = TN.com + (n ? ' (' + n + ')' : ''); });
    };
    const q = h('div', { class: 'dl-fullq', html: rich(x.question) });
    const kids = [q, fig,
      optEls.length ? h('div', { class: 'dl-opts ' + optCls(opts) }, optEls) : null, numBox,
      rep, h('div', { class: 'dl-tabrow' }, tabs, nav), body].filter(Boolean);
    box.append(...kids);
    env.mathReady().then(() => { q.innerHTML = rich(x.question); optEls.forEach((li, k) => { li.querySelector('.dl-ot').innerHTML = rich(opts[k]); }); });
    return box;
  }
  const step = i => { if (i < 0 || i >= list.length) return; const pg = Math.floor(i / PAGE); if (pg !== page) { page = pg; draw(); } const li = ul.querySelector('.dl-row[data-id="' + list[i].id + '"]'); if (li) toggle(li, list[i]); };

  /* controls */
  const tog = h('label', { class: 'dl-switch' }, h('input', { type: 'checkbox', role: 'switch', onchange: e => { F.hide = e.target.checked; apply(); } }), h('span', { class: 'dl-track', 'aria-hidden': 'true' }), h('span', { text: 'Hide attempted' }));
  const multi = (label, vals, set, nice, cnt) => menu(label, (panel, api) => {
    const sync = () => api.setLabel(set.size ? label + ' (' + set.size + ')' : label, set.size);
    vals.forEach(v => panel.append(h('label', { class: 'dl-opt-i' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? set.add(v) : set.delete(v); sync(); apply(); } }), h('span', { class: 'dl-ot2', text: nice ? nice(v) : String(v) }), cnt ? h('em', { class: 'dl-cn', text: String(cnt(v)) }) : null)));
    panel.append(h('button', { type: 'button', class: 'dl-clear', text: 'Clear', onclick: () => { set.clear(); panel.querySelectorAll('input').forEach(i => { i.checked = false; }); sync(); apply(); } }));
  });
  const statusMenu = menu('Attempt status', (panel, api) => {
    [['', 'All'], ['c', 'Solved correctly'], ['w', 'Got wrong'], ['s', 'Left unanswered'], ['u', 'Not attempted']].forEach(([k, t]) => { const n = k === '' ? pool.length : k === 'u' ? pool.filter(r => !res()[r.id]).length : pool.filter(r => res()[r.id] === k).length; panel.append(h('label', { class: 'dl-opt-i' }, h('input', { type: 'radio', name: 'dl-st', checked: k === '', onchange: () => { F.status = k; api.setLabel(k ? t : 'Attempt status', k); api.close(); apply(); } }), h('span', { class: 'dl-ot2', text: t }), h('em', { class: 'dl-cn', text: String(n) }))); });
  });
  const sortSel = h('select', { class: 'dl-sort', 'aria-label': 'Order', onchange: e => { F.sort = e.target.value; apply(); } }, (o.seqOrder ? [['seq', 'Exercise order'], ['easy', 'Level (Easy to Hard)'], ['hard', 'Level (Hard to Easy)']] : [['new', 'Year-wise (New to Old)'], ['old', 'Year-wise (Old to New)'], ['easy', 'Level (Easy to Hard)'], ['hard', 'Level (Hard to Easy)']]).map(([k, t]) => h('option', { value: k, text: t })));
  /* the export box: exactly the questions of the current list (after the filters) are exported */
  const exportPanel = () => {
    const P = window.AvantiPortal, T = () => window.AvantiTeacher, can = k => !!(A().perm && A().perm[k]), S = { key: false, exp: false };
    const ids = () => list.map(r => r.id), need = () => { if (!list.length) { env.toast('There are no questions to export.'); return false; } return true; };
    expCount = h('b', { text: String(list.length) });
    const sw = (label, key) => h('label', { class: 'dl-switch dl-xsw' }, h('input', { type: 'checkbox', role: 'switch', onchange: e => { S[key] = e.target.checked; } }), h('span', { class: 'dl-track', 'aria-hidden': 'true' }), h('span', { text: label }));
    const run = kind => () => { if (!need()) return; env.toast('Preparing the download…'); T().exportIds(ids(), o.title, kind, 'Questions', '', '', { key: S.key, exp: S.exp }).catch(e => env.toast('Could not make the file: ' + ((e && e.message) || 'try again'))); };
    const pdfBlob = async () => { if (!need()) return null; env.toast('Preparing the PDF…'); try { return await T().pdfIds(ids(), o.title, 'Questions', '', ''); } catch (e) { env.toast('Could not make the PDF: ' + ((e && e.message) || 'try again')); return null; } };
    const exp = h('button', { type: 'button', class: 'btn pri dl-xbtn', 'aria-haspopup': 'menu', 'aria-expanded': 'false', html: ICON.down + '<span>Export</span><i aria-hidden="true">▾</i>', onclick: e => P.dropMenu(e.currentTarget, [
      { icon: P.icons.pdf, text: 'Download PDF', sub: 'Print-ready', onclick: run('pdf') },
      can('docx') ? { icon: P.icons.docx, text: 'Download Word', sub: 'Editable document', onclick: run('docx') } : null,
      can('pptx') ? { icon: P.icons.pptx, text: 'Download PowerPoint', sub: 'One question per slide', onclick: run('pptx') } : null,
      '-',
      { icon: P.icons.print, text: 'Print', sub: 'Opens the PDF to print', onclick: async () => { const r = await pdfBlob(); if (r) { const u = URL.createObjectURL(r.blob), w = window.open(u, '_blank'); if (w) w.addEventListener('load', () => { try { w.print(); } catch (x) { /* user prints from the viewer */ } }); setTimeout(() => URL.revokeObjectURL(u), 180000); } } },
      can('share') ? { icon: P.icons.share, text: 'Share PDF…', sub: 'WhatsApp, email or your phone’s apps', onclick: async () => { const r = await pdfBlob(); if (r) P.shareReady(r.blob, r.file, o.title); } } : null,
      { icon: P.icons.link, text: 'Copy link to this page', sub: 'The page link, not the PDF', onclick: () => { try { navigator.clipboard.writeText(location.href).then(() => env.toast('Page link copied')); } catch (x) { env.toast(location.href); } } }]) });
    return h('section', { class: 'dl-export', 'aria-label': 'Export these questions' },
      h('div', { class: 'dl-x-l' }, h('div', { class: 'dl-x-n' }, expCount, h('span', { text: ' questions selected' })), h('small', { text: 'Exactly the questions of this list (after your filters) are exported.' })),
      h('div', { class: 'dl-x-sw' }, sw('Answer key', 'key'), sw('Explanation', 'exp')),
      h('div', { class: 'dl-x-b' }, exp,
        can('worksheets') ? h('button', { type: 'button', class: 'btn', text: 'Save as worksheet', onclick: () => { if (need()) P.saveWorksheet(ids(), o.title); } }) : null,
        can('createTests') ? h('button', { type: 'button', class: 'btn', text: 'Create test', onclick: () => { if (need()) P.createTestFrom(ids(), o.title); } }) : null));
  };
  const act = (cls, ic, text, fn) => h('button', { type: 'button', class: 'dl-act ' + cls, onclick: fn }, h('b', { text }), h('span', { class: 'dl-act-i', html: ic }));
  const testBtn = act('test', ICON.test, o.testLabel + ' →', async () => { testBtn.disabled = true; try { await o.startTest(list.length ? list : pool); } catch (e) { env.toast(e.message || 'Could not start'); testBtn.disabled = false; } });

  const levelMenu = multi('Difficulty', ['L1', 'L2', 'L3'], F.lv, v => ({ L1: 'Confidence Booster · Level 1', L2: 'Balanced · Level 2', L3: 'Rank Booster · Level 3' })[v], v => pool.filter(r => r.d === v).length);
  const extraMenus = (o.filters || []).map(f => { const nice = new Map(f.values); return multi(f.label, f.values.map(v => v[0]), F.extra[f.key], v => nice.get(v), v => pool.filter(r => f.get(r) === v).length); });
  if (o.compact) {
    /* DPP pages: everything in one line on top, then the questions */
    const typeMenu = types.length > 0 ? multi('Type', types, F.types, null, v => pool.filter(r => typeOf(r) === v).length) : null;
    const smallTest = h('button', { type: 'button', class: 'btn pri dl-small', text: (o.testLabel || 'Take test') + ' →', onclick: async e => { const btn = e.currentTarget; btn.disabled = true; try { await o.startTest(list.length ? list : pool); } catch (x) { env.toast(x.message || 'Could not start'); } btn.disabled = false; } });
    wrap.append(h('div', { class: 'dl-top' }, h('div', { class: 'dl-ttl' }, h('h2', { text: o.title }), o.sub ? h('small', { text: o.sub }) : ''), h('div', { class: 'dl-top-r' }, o.startTest ? smallTest : null)),
      exportPanel(),
      h('div', { class: 'dl-filters dl-oneline' }, tog, extraMenus, years.length ? multi('Years', years, F.years, null, v => pool.filter(r => r.y === v).length) : null, levelMenu, typeMenu, statusMenu, h('label', { class: 'dl-sortw dl-sort-r' }, h('span', { html: ICON.sort }), sortSel)),
      h('div', { class: 'dl-bar' }, count), ul, pager);
  } else wrap.append(
    h('section', { class: 'lh' },
      h('div', { class: 'lh-t' }, h('div', { class: 'lh-ttl' }, h('h2', { text: o.title }), o.sub ? h('p', { text: o.sub }) : ''), o.startTest ? h('button', { type: 'button', class: 'btn lh-go', onclick: async e => { const b = e.currentTarget; b.disabled = true; try { await o.startTest(list.length ? list : pool); } catch (x) { env.toast(x.message || 'Could not start'); } b.disabled = false; } }, h('span', { html: env.IC.bolt }), (o.testLabel || 'Take test')) : ''),
      h('div', { class: 'lh-st' }, [[String(pool.length), 'questions'], [solved + ' / ' + pool.length, 'attempted'], [String(right), 'correct'], [solved ? env.pct(right, solved) + '%' : '—', 'accuracy']].map(([n, l]) => h('div', { class: 'lh-s', 'data-k': l }, h('b', { text: n }), h('span', { text: l }))))),
    exportPanel(),
    h('div', { class: 'dl-filters' }, tog, extraMenus, years.length ? multi('Years', years, F.years, null, v => pool.filter(r => r.y === v).length) : null, statusMenu, levelMenu, types.length ? multi('Type', types, F.types, null, v => pool.filter(r => typeOf(r) === v).length) : null),
    h('div', { class: 'dl-bar' }, count, h('label', { class: 'dl-sortw' }, h('span', { html: ICON.sort }), sortSel)),
    ul, pager);
  if (o.head) o.head.querySelectorAll('.d-crumb').forEach(c => c.classList.add('d-crumb-sr'));   /* kept in the page, not shown */
  main(o.head || null, wrap);
  env.mathReady().then(() => { apply(); }); apply();
}

/* ---------- full explanation ---------- */
function solution(env, id, pane) {
  pane.textContent = 'Loading…';
  env.content.sols([id]).then(m => {
    const sv = m && m[id]; pane.textContent = '';
    if (!sv) { pane.append(h('p', { class: 'dl-soft', text: 'Full explanation not added yet.' })); return; }
    const t = typeof sv === 'string' ? sv : sv.t; pane.append(h('div', { class: 'dl-sol', html: rich(t) }));
  }).catch(() => { pane.textContent = ''; pane.append(h('p', { class: 'dl-soft bad', text: 'Could not load the explanation. Check your connection.' })); });
}
/* ---------- other people's solutions (up to 3 images each) ---------- */
function shrink(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), img = new Image();
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => (b ? res(b) : rej(new Error('Could not read the image'))), 'image/jpeg', 0.82); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('That file is not an image')); }; img.src = u;
  });
}
const when = t => { try { return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } };
const who = (a, at) => h('div', { class: 'dl-who' }, h('b', { text: (a && a.name) || 'Member' }), h('span', { class: 'dl-role', text: (a && a.role) || '' }), h('span', { class: 'dl-when', text: when(at) }));
function others(env, id, pane, count) {
  const A = env.A; pane.textContent = '';
  const form = h('div', { class: 'dl-form', hidden: true }), msg = h('span', { class: 'dl-soft', text: 'Up to 3 images, handwritten or typed.' });
  const pick = h('input', { type: 'file', accept: 'image/*', multiple: true, 'aria-label': 'Choose up to 3 images' }), prev = h('div', { class: 'dl-prev' }), note = h('textarea', { rows: 2, maxlength: 500, placeholder: 'Optional note (for example: shorter method)' });
  let files = []; const drawPrev = () => { prev.textContent = ''; files.forEach((f, i) => prev.append(h('span', {}, h('img', { src: URL.createObjectURL(f), alt: 'Image ' + (i + 1) }), h('button', { type: 'button', 'aria-label': 'Remove image', text: '×', onclick: () => { files.splice(i, 1); drawPrev(); } })))); };
  pick.addEventListener('change', () => { Array.from(pick.files || []).forEach(f => { if (files.length < 3) files.push(f); }); pick.value = ''; drawPrev(); });
  const send = h('button', { type: 'button', class: 'btn pri', text: 'Post solution', onclick: async () => {
    if (!files.length) { msg.textContent = 'Choose at least one image.'; return; }
    const s = A().session, uid = s && s.user ? s.user.id : (A().profile || {}).id; if (!uid) { msg.textContent = 'Please sign in again.'; return; }
    send.disabled = true; msg.textContent = 'Uploading…';
    try {
      const paths = await Promise.all(files.map((f, i) => shrink(f).then(async b => { const path = uid + '/' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 8) + '.jpg'; const r = await A().sb.storage.from('user-solutions').upload(path, b, { contentType: 'image/jpeg' }); if (r.error) throw r.error; return path; })));
      const r = await A().sb.rpc('add_qb_solution', { p_qid: id, p_images: paths, p_note: note.value.trim() || null }); if (r.error) throw new Error(r.error.message);
      others(env, id, pane, count);
    } catch (e) { send.disabled = false; msg.textContent = 'Could not post: ' + (e.message || 'try again') + '.'; }
  } });
  form.append(pick, prev, note, h('div', { class: 'dl-row2' }, send, msg));
  const list = h('div', {}, 'Loading…');
  pane.append(h('button', { type: 'button', class: 'btn pri', text: 'Add your solution', onclick: () => { form.hidden = !form.hidden; } }), form, list);
  A().sb.rpc('qb_solutions_for', { p_qid: id }).then(async r => {
    if (r.error) throw new Error(r.error.message); const rows = r.data || []; count(rows.length);
    const paths = rows.flatMap(x => x.images || []); let urls = {};
    if (paths.length) { const s = await A().sb.storage.from('user-solutions').createSignedUrls(paths, 3600); ((s && s.data) || []).forEach(z => { if (z.signedUrl) urls[z.path] = z.signedUrl; }); }
    list.textContent = ''; if (!rows.length) { list.append(h('p', { class: 'dl-soft', text: 'No one has added a solution yet. Be the first.' })); return; }
    rows.forEach(x => { const it = h('div', { class: 'dl-item' }), w = who(x.author, x.at);
      if (x.mine || A().perm.isAdmin) w.append(h('button', { type: 'button', class: 'dl-del', text: 'Delete', onclick: () => { if (window.confirm('Delete this solution?')) A().sb.rpc('delete_qb_solution', { p_id: x.id }).then(() => others(env, id, pane, count)); } }));
      it.append(w); if (x.note) it.append(h('p', { class: 'dl-text', text: x.note }));
      const imgs = h('div', { class: 'dl-imgs' }); (x.images || []).forEach((p, i) => { const u = urls[p]; if (u) imgs.append(h('img', { src: u, alt: 'Solution image ' + (i + 1), loading: 'lazy', onclick: () => window.open(u, '_blank', 'noopener') })); }); it.append(imgs); list.append(it); });
  }).catch(() => { list.textContent = ''; list.append(h('p', { class: 'dl-soft bad', text: 'Could not load solutions. Check your connection.' })); });
}
/* ---------- comments (post at once) ---------- */
function comments(env, id, pane, count) {
  const A = env.A; pane.textContent = '';
  const ta = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Write a comment, a doubt or a shorter method', 'aria-label': 'Your comment' }), msg = h('span', { class: 'dl-soft' }), list = h('div', {}, 'Loading…'); let n = 0;
  const draw = r => { const it = h('div', { class: 'dl-item' }), w = who(r.author, r.at); if (r.mine || A().perm.isAdmin) w.append(h('button', { type: 'button', class: 'dl-del', text: 'Delete', onclick: () => A().sb.rpc('delete_qb_comment', { p_id: r.id }).then(() => { it.remove(); n--; count(n); }) })); it.append(w, h('p', { class: 'dl-text', text: r.body })); return it; };
  const post = h('button', { type: 'button', class: 'btn pri', text: 'Post comment', onclick: async () => {
    const t = ta.value.trim(); if (!t) { msg.textContent = 'Write something first.'; return; } post.disabled = true; msg.textContent = 'Posting…';
    const r = await A().sb.rpc('add_qb_comment', { p_qid: id, p_body: t }); post.disabled = false;
    if (r.error) { msg.textContent = r.error.message + '.'; return; } ta.value = ''; msg.textContent = ''; if (!n) list.textContent = ''; n++; count(n); list.insertBefore(draw(r.data), list.firstChild);
  } });
  pane.append(h('div', { class: 'dl-form' }, ta, h('div', { class: 'dl-row2' }, post, msg)), list);
  A().sb.rpc('qb_comments_for', { p_qid: id }).then(r => { if (r.error) throw new Error(r.error.message); const rows = (r.data || []).slice().reverse(); n = rows.length; count(n); list.textContent = ''; if (!rows.length) { list.append(h('p', { class: 'dl-soft', text: 'No comments yet.' })); return; } rows.forEach(x => list.append(draw(x))); })
    .catch(() => { list.textContent = ''; list.append(h('p', { class: 'dl-soft bad', text: 'Could not load comments. Check your connection.' })); });
}
/* ---------- report an error (only the admin sees it) ---------- */
function reportBox(env, id) {
  const A = env.A, ta = h('textarea', { rows: 3, maxlength: 1000, placeholder: 'What is wrong? (for example: option C should be 2π/3, the answer key is B, figure missing)', 'aria-label': 'Describe the error' }), msg = h('span', { class: 'dl-soft', text: 'Only the admin sees this.' });
  const box = h('div', { class: 'dl-rbox', hidden: true }, h('b', { text: 'Report an error in this question' }), ta, h('div', { class: 'dl-row2' }, h('button', { type: 'button', class: 'btn pri', text: 'Send report', onclick: async e => {
    if (ta.value.trim().length < 5) { msg.textContent = 'Describe the error first.'; return; } e.target.disabled = true; msg.textContent = 'Sending…';
    const r = await A().sb.rpc('submit_qb_report', { p_qid: id, p_note: ta.value.trim() }); e.target.disabled = false;
    if (r.error) { msg.textContent = r.error.message + '.'; return; } ta.value = ''; msg.textContent = 'Only the admin sees this.'; box.hidden = true; env.toast('Thanks. The admin will check this.');
  } }), h('button', { type: 'button', class: 'btn', text: 'Close', onclick: () => { box.hidden = true; } }), msg));
  return box;
}

window.DashList = Object.freeze({ render });
})();
