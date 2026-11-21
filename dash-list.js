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
  test: svg('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'), sort: svg('<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>') };

/* ---------- maths in text: \( inline \) and \[ display \], line breaks kept ---------- */
const plainTxt = x => esc(x).replace(/\n/g, '<br>');
function rich(t) {
  const K = window.katex, s = String(t == null ? '' : t), re = /\\\((.+?)\\\)|\\\[([\s\S]+?)\\\]/g; let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += plainTxt(s.slice(last, m.index));
    const tex = m[1] != null ? m[1] : m[2];
    try { out += K ? K.renderToString(tex, { displayMode: m[2] != null, throwOnError: false }) : esc(m[0]); } catch (e) { out += esc(m[0]); }
    last = re.lastIndex;
  }
  return out + plainTxt(s.slice(last));
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
  let list = [], shown = 0, openId = '';
  const wrap = h('div', { class: 'dl' }), ul = h('ul', { class: 'dl-list' }), more = h('div', { class: 'dl-more' }), count = h('span', { class: 'dl-count', role: 'status' });
  const solved = pool.filter(r => res()[r.id]).length, right = pool.filter(r => res()[r.id] === 'c').length;

  /* what is shown: filters, then the order */
  const apply = () => {
    list = pool.filter(r => (!F.hide || !res()[r.id]) && (!F.years.size || F.years.has(r.y)) && (!F.lv.size || F.lv.has(r.d)) && (!F.types.size || F.types.has(typeOf(r)))
      && (!F.status || (F.status === 'u' ? !res()[r.id] : res()[r.id] === F.status)) && (o.filters || []).every(f => !F.extra[f.key].size || F.extra[f.key].has(f.get(r))));
    const key = r => (r.y || 0) * 1e3;
    const chOrd = c => ((env.D.chByCode[c] || {}).order || 999), qn = r => +((env.D.raw.get(r.id) || {}).qno) || 0;
    list.sort((a, b) => F.sort === 'seq' ? chOrd(a.ch) - chOrd(b.ch) || String(a.bk).localeCompare(String(b.bk)) || (a.shn || 0) - (b.shn || 0) || qn(a) - qn(b) || (a.id < b.id ? -1 : 1) : F.sort === 'new' ? (b.y || 0) - (a.y || 0) || (a.id < b.id ? 1 : -1) : F.sort === 'old' ? (a.y || 0) - (b.y || 0) || (a.id < b.id ? -1 : 1) : F.sort === 'easy' ? String(a.d).localeCompare(String(b.d)) || (b.y || 0) - (a.y || 0) : String(b.d).localeCompare(String(a.d)) || (b.y || 0) - (a.y || 0));
    shown = Math.min(PAGE, list.length); openId = ''; ul.textContent = '';
    for (let i = 0; i < shown; i++) ul.append(row(list[i], i));
    paint();
  };
  const filtered = () => F.hide || F.years.size || F.lv.size || F.types.size || F.status || (o.filters || []).some(f => F.extra[f.key].size);
  const paint = () => {
    count.textContent = 'Showing ' + (filtered() ? '' : 'all ') + 'Qs (' + Math.min(shown, list.length) + '/' + list.length + (filtered() ? ' of ' + pool.length : '') + ')';
    more.textContent = '';
    if (!list.length) { ul.textContent = ''; ul.append(h('li', { class: 'dl-empty' }, h('b', { text: 'No questions match' }), h('span', { text: filtered() ? 'Change or clear the filters above.' : (o.emptyText || 'Nothing here yet.') }))); return; }
    if (shown < list.length) { const b = h('button', { type: 'button', class: 'btn', text: 'Show ' + Math.min(PAGE, list.length - shown) + ' more (' + (list.length - shown) + ' left)', onclick: loadMore }); more.append(b); watch(b); }
  };
  const loadMore = () => { const to = Math.min(shown + PAGE, list.length); for (let i = shown; i < to; i++) ul.append(row(list[i], i)); shown = to; paint(); };
  let io = null;
  const watch = b => { if (!('IntersectionObserver' in window)) return; if (io) io.disconnect(); io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); loadMore(); } }, { rootMargin: '300px' }); io.observe(b); };

  /* one compact row */
  function row(r, i) {
    const x = D.raw.get(r.id) || {}, st = res()[r.id];
    const bm = h('button', { type: 'button', class: 'dl-bm', 'aria-label': 'Mark as important', 'aria-pressed': String(D.sum.bookmarks.includes(r.id)), html: ICON.bm, onclick: e => { e.stopPropagation(); toggleBm(r.id, bm); } });
    const li = h('li', { class: 'dl-row', 'data-id': r.id });
    const mark = h('span', { class: 'dl-st ' + (st || ''), title: st === 'c' ? 'You got this right in a test' : st === 'w' ? 'You got this wrong in a test' : st === 's' ? 'Left unanswered in a test' : 'Not attempted', text: st === 'c' ? '✓' : st === 'w' ? '✕' : st === 's' ? '–' : '' });
    const head = h('button', { type: 'button', class: 'dl-main', 'aria-expanded': 'false', onclick: () => toggle(li, r) },
      h('span', { class: 'dl-n' }, h('b', { text: String(i + 1) }), mark),
      h('span', { class: 'dl-qt' }, h('span', { class: 'dl-q', html: rich(x.question) }), h('span', { class: 'dl-meta', text: srcLine(x) })));
    li.append(head, h('span', { class: 'dl-sd' }, h('span', { class: 'dl-lv ' + r.d, text: r.d || '' }), bm), h('div', { class: 'dl-detail', hidden: true }));
    return li;
  }
  const toggle = (li, r) => {
    const det = li.querySelector('.dl-detail'), btn = li.querySelector('.dl-main'), was = !det.hidden;
    ul.querySelectorAll('.dl-row.open').forEach(o => { o.classList.remove('open'); o.querySelector('.dl-detail').hidden = true; o.querySelector('.dl-main').setAttribute('aria-expanded', 'false'); });
    if (was) { openId = ''; return; }
    openId = r.id; li.classList.add('open'); det.hidden = false; btn.setAttribute('aria-expanded', 'true');
    if (!det.dataset.built) { det.dataset.built = '1'; det.append(detail(r)); }
    setTimeout(() => li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
  };
  const toggleBm = (id, btn) => {
    btn.disabled = true;
    A().sb.rpc('toggle_bookmark', { p_qid: id }).then(r => {
      if (r.error) throw new Error(r.error.message); const on = !!r.data;
      D.sum.bookmarks = on ? [id].concat(D.sum.bookmarks.filter(i => i !== id)) : D.sum.bookmarks.filter(i => i !== id);
      document.querySelectorAll('.dl-row[data-id="' + id + '"] .dl-bm, .dl-d-bm[data-id="' + id + '"]').forEach(b => b.setAttribute('aria-pressed', String(on)));
    }).catch(e => env.toast(e.message || 'Could not save')).then(() => { btn.disabled = false; });
  };

  /* the opened question: full text, options, answer, solution, others' solutions, comments, report */
  function detail(r) {
    const x = D.raw.get(r.id) || {}, box = h('div', { class: 'dl-d' });
    const opts = (x.options || []).slice(0, 8), keys = String(x.answer || '').toUpperCase().split(/[^A-H]+/).filter(Boolean), isKey = /^[A-H](\s*,\s*[A-H])*$/i.test(String(x.answer || '').trim());
    const ans = h('div', { class: 'dl-ans', hidden: true }, h('b', { text: 'Answer: ' }), h('span', { html: rich(String(x.answer == null || x.answer === '' ? 'not available' : x.answer)) }));
    const fig = h('div', { class: 'dl-fig' }); figures(env).then(f => { const v = f[r.id]; if (v && v.svg) fig.innerHTML = v.svg; });
    const optEls = opts.map((t, k) => h('li', { class: 'dl-opt' }, h('b', { text: LETTERS[k] }), h('span', { html: rich(t) })));
    const reveal = h('button', { type: 'button', class: 'btn', text: 'Show answer', 'aria-expanded': 'false', onclick: () => { const on = ans.hidden; ans.hidden = !on; reveal.textContent = on ? 'Hide answer' : 'Show answer'; reveal.setAttribute('aria-expanded', String(on)); optEls.forEach((li, k) => li.classList.toggle('ok', on && isKey && keys.includes(LETTERS[k]))); } });
    const bm = h('button', { type: 'button', class: 'btn dl-d-bm', 'data-id': r.id, 'aria-pressed': String(D.sum.bookmarks.includes(r.id)), html: ICON.bm + '<span>Important</span>', onclick: () => toggleBm(r.id, bm) });
    const rep = reportBox(env, r.id), warn = h('button', { type: 'button', class: 'btn', html: ICON.warn + '<span>Report an error</span>', onclick: () => { rep.hidden = !rep.hidden; } });
    const idx = list.findIndex(z => z.id === r.id);
    const nav = h('span', { class: 'dl-nav' }, h('button', { type: 'button', class: 'btn', 'aria-label': 'Previous question', html: ICON.prev, disabled: idx <= 0, onclick: () => step(idx - 1) }), h('button', { type: 'button', class: 'btn', 'aria-label': 'Next question', html: ICON.next, disabled: idx >= list.length - 1, onclick: () => step(idx + 1) }));
    const panes = { sol: h('div', { class: 'dl-pane' }), oth: h('div', { class: 'dl-pane', hidden: true }), com: h('div', { class: 'dl-pane', hidden: true }) }, loaded = {}, tabs = h('div', { class: 'dl-tabs', role: 'tablist' });
    const tabBtns = {}; [['sol', 'Full explanation'], ['oth', 'Others’ solutions'], ['com', 'Comments']].forEach(([k, t]) => { const b = h('button', { type: 'button', role: 'tab', class: 'dl-tab', 'aria-selected': 'false', text: t, onclick: () => show(k) }); tabBtns[k] = b; tabs.append(b); });
    const body = h('div', { class: 'dl-tabbody', hidden: true }, panes.sol, panes.oth, panes.com);
    const show = k => {
      const was = !body.hidden && tabBtns[k].getAttribute('aria-selected') === 'true'; body.hidden = was;
      Object.keys(panes).forEach(p => { panes[p].hidden = was || p !== k; tabBtns[p].setAttribute('aria-selected', String(!was && p === k)); });
      if (was || loaded[k]) return; loaded[k] = true;
      if (k === 'sol') solution(env, r.id, panes.sol); else if (k === 'oth') others(env, r.id, panes.oth, n => { tabBtns.oth.textContent = 'Others’ solutions' + (n ? ' (' + n + ')' : ''); }); else comments(env, r.id, panes.com, n => { tabBtns.com.textContent = 'Comments' + (n ? ' (' + n + ')' : ''); });
    };
    box.append(h('div', { class: 'dl-chips' }, h('span', { class: 'dl-code', text: r.id }), h('span', { class: 'dl-chip', text: x.type || 'MCQ' }), r.tp ? h('span', { class: 'dl-chip', text: r.tp }) : null),
      h('div', { class: 'dl-fullq', html: rich(x.question) }), fig, optEls.length ? h('ol', { class: 'dl-opts' }, optEls) : null, ans,
      h('div', { class: 'dl-acts' }, reveal, bm, warn, nav), rep, tabs, body);
    env.mathReady().then(() => { box.querySelector('.dl-fullq').innerHTML = rich(x.question); optEls.forEach((li, k) => { li.lastChild.innerHTML = rich(opts[k]); }); });
    return box;
  }
  const step = i => { if (i < 0 || i >= list.length) return; while (i >= shown) loadMore(); const li = ul.querySelector('.dl-row[data-id="' + list[i].id + '"]'); if (li) toggle(li, list[i]); };

  /* controls */
  const tog = h('label', { class: 'dl-switch' }, h('input', { type: 'checkbox', role: 'switch', onchange: e => { F.hide = e.target.checked; apply(); } }), h('span', { class: 'dl-track', 'aria-hidden': 'true' }), h('span', { text: 'Hide attempted' }));
  const multi = (label, vals, set, nice) => menu(label, (panel, api) => {
    const sync = () => api.setLabel(set.size ? label + ' (' + set.size + ')' : label, set.size);
    vals.forEach(v => panel.append(h('label', { class: 'dl-opt-i' }, h('input', { type: 'checkbox', onchange: e => { e.target.checked ? set.add(v) : set.delete(v); sync(); apply(); } }), h('span', { text: nice ? nice(v) : String(v) }))));
    panel.append(h('button', { type: 'button', class: 'dl-clear', text: 'Clear', onclick: () => { set.clear(); panel.querySelectorAll('input').forEach(i => { i.checked = false; }); sync(); apply(); } }));
  });
  const statusMenu = menu('Attempt status', (panel, api) => {
    [['', 'All'], ['c', 'Solved correctly'], ['w', 'Got wrong'], ['s', 'Left unanswered'], ['u', 'Not attempted']].forEach(([k, t]) => panel.append(h('label', { class: 'dl-opt-i' }, h('input', { type: 'radio', name: 'dl-st', checked: k === '', onchange: () => { F.status = k; api.setLabel(k ? t : 'Attempt status', k); api.close(); apply(); } }), h('span', { text: t }))));
  });
  const sortSel = h('select', { class: 'dl-sort', 'aria-label': 'Order', onchange: e => { F.sort = e.target.value; apply(); } }, (o.seqOrder ? [['seq', 'Exercise order'], ['easy', 'Level (Easy to Hard)'], ['hard', 'Level (Hard to Easy)']] : [['new', 'Year-wise (New to Old)'], ['old', 'Year-wise (Old to New)'], ['easy', 'Level (Easy to Hard)'], ['hard', 'Level (Hard to Easy)']]).map(([k, t]) => h('option', { value: k, text: t })));
  const typeChips = types.length > 1 ? h('div', { class: 'dl-types' }, types.map(t => { const n = pool.filter(r => typeOf(r) === t).length, b = h('button', { type: 'button', class: 'dl-chipb', 'aria-pressed': 'false', onclick: () => { F.types.has(t) ? F.types.delete(t) : F.types.add(t); b.setAttribute('aria-pressed', String(F.types.has(t))); apply(); } }, t, h('i', { text: String(n) })); return b; })) : null;
  const exportMenu = menu('', (panel, api) => {
    api.box.querySelector('.dl-fbtn').className = 'dl-fbtn dl-ico'; api.box.querySelector('.dl-fbtn').innerHTML = ICON.more; api.box.querySelector('.dl-fbtn').setAttribute('aria-label', 'More options');
    panel.classList.add('dl-pop-r');
    panel.append(h('button', { type: 'button', class: 'dl-mi', text: 'Export, print or share these questions', onclick: () => { api.close(); env.openQB(list.map(r => r.id), o.title); } }),
      h('small', { class: 'dl-mnote', text: 'Opens the Question Bank with exactly these ' + list.length + ' questions selected.' }));
    (o.menuExtra || []).forEach(x => panel.append(h('button', { type: 'button', class: 'dl-mi', text: x.text, onclick: () => { api.close(); x.onclick(); } }), x.note ? h('small', { class: 'dl-mnote', text: x.note }) : null));
  });
  const practice = () => { const r = list.find(z => !res()[z.id]) || list[0]; if (r) step(list.indexOf(r)); };
  const act = (cls, ic, text, fn) => h('button', { type: 'button', class: 'dl-act ' + cls, onclick: fn }, h('b', { text }), h('span', { class: 'dl-act-i', html: ic }));
  const testBtn = act('test', ICON.test, o.testLabel + ' →', async () => { testBtn.disabled = true; try { await o.startTest(list.length ? list : pool); } catch (e) { env.toast(e.message || 'Could not start'); testBtn.disabled = false; } });

  const levelMenu = multi('Difficulty', ['L1', 'L2', 'L3'], F.lv, v => ({ L1: 'Level 1 · Easy', L2: 'Level 2 · Moderate', L3: 'Level 3 · Tough' })[v]);
  const extraMenus = (o.filters || []).map(f => { const nice = new Map(f.values); return multi(f.label, f.values.map(v => v[0]), F.extra[f.key], v => nice.get(v)); });
  if (o.compact) {
    /* DPP pages: everything in one line on top, then the questions */
    const typeMenu = types.length > 1 ? multi('Type', types, F.types) : null;
    const smallTest = h('button', { type: 'button', class: 'btn pri dl-small', text: (o.testLabel || 'Take test') + ' →', onclick: async e => { const btn = e.currentTarget; btn.disabled = true; try { await o.startTest(list.length ? list : pool); } catch (x) { env.toast(x.message || 'Could not start'); } btn.disabled = false; } });
    wrap.append(h('div', { class: 'dl-top' }, h('h2', { text: o.title }), h('div', { class: 'dl-top-r' }, o.startTest ? smallTest : null, exportMenu)),
      h('div', { class: 'dl-filters dl-oneline' }, tog, extraMenus, years.length ? multi('Years', years, F.years) : null, levelMenu, typeMenu, statusMenu, h('label', { class: 'dl-sortw dl-sort-r' }, h('span', { html: ICON.sort }), sortSel)),
      h('div', { class: 'dl-bar' }, count), ul, more);
  } else wrap.append(
    h('div', { class: 'dl-top' }, h('h2', { text: o.title }), exportMenu),
    h('div', { class: 'd-stats dl-stats' }, env.stat(env.IC.all, solved + '/' + pool.length, 'Qs attempted'), env.stat(env.IC.target, right + '/' + pool.length, 'Correct Qs'), env.stat(env.IC.up, solved ? env.pct(right, solved) + '%' : '—', 'Accuracy')),
    h('div', { class: 'dl-acts2' }, act('prac', ICON.prac, o.practiceLabel + ' →', practice), testBtn),
    h('div', { class: 'dl-filters' }, tog, extraMenus, years.length ? multi('Years', years, F.years) : null, statusMenu, levelMenu),
    typeChips, h('div', { class: 'dl-bar' }, count, h('label', { class: 'dl-sortw' }, h('span', { html: ICON.sort }), sortSel)),
    ul, more);
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
