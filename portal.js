/* Avanti Fellows · Mathematics Dashboard · account pages, tests and results.
   Everything here reads and writes Supabase (tables with row-level security, and database functions).
   Routes (address bar hash):
     #/profile  #/membership  #/tests  #/reports  #/report/<attempt>  #/t/<code> (take a test)
     #/create  #/edit/<test>  #/my-tests  #/results/<test>  #/worksheets */
(function () {
'use strict';
const AU = () => window.AvantiAuth;
const TE = () => window.AvantiTeacher;
const sb = () => AU().sb;
const rpc = (n, a) => AU().rpc(n, a);
const $ = (s, r) => (r || document).querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
function toast(m) { if (TE()) TE().toast(m); else window.alert(m); }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d) => (v == null || isNaN(v) ? '—' : (+v).toFixed(d == null ? 0 : d).replace(/\.0+$/, ''));
const pct = v => (v == null ? '—' : num(v, 1) + '%');
const mmss = s => (s == null ? '—' : Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0'));
const when = d => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const day = d => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const testLink = code => location.origin + location.pathname + '#/t/' + code;
const CLASSES = ['9', '10', '11', '12', 'Dropper'];
const STREAMS = ['PCM', 'PCB', 'PCMB', 'Commerce', 'Arts', 'Other'];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* ---------- maths ---------- */
let katexP = null;
function ensureKatex() {
  if (!katexP) {
    const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
    katexP = (window.katex ? Promise.resolve() : load('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js'))
      .then(() => (window.renderMathInElement ? null : load('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js')))
      .then(() => { if (!document.getElementById('kcss')) return fetch('katex.css').then(r => r.text()).then(c => { if (!document.getElementById('kcss')) { const st = h('style', { text: c }); st.id = 'kcss'; document.head.append(st); } }); })
      .catch(() => { katexP = null; });
  }
  return katexP || Promise.resolve();
}
function mathIn(node) {
  return ensureKatex().then(() => {
    if (!window.renderMathInElement) return;
    try { window.renderMathInElement(node, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false }); } catch (e) { /* raw text stays */ }
  });
}
const qText = t => esc(t).replace(/\n/g, '<br>');
function figure(f) {
  if (!f || !f.svg) return null;
  return h('img', { class: 'pt-fig', alt: 'Figure', src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(f.svg) });
}

/* ---------- page frame ---------- */
function view() { return $('#viewPortal'); }
function show(...nodes) {
  const v = view(); if (!v) return null;
  if (TE()) TE().hideViews();
  document.querySelectorAll('[data-act="tab"]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  v.hidden = false; v.textContent = ''; v.append(...nodes.filter(Boolean));
  window.scrollTo(0, 0);
  return v;
}
function head(title, sub, ...actions) {
  return h('div', { class: 'pt-head' }, h('div', {}, h('h1', { text: title }), sub ? h('p', { class: 'pt-sub', text: sub }) : null), actions.length ? h('div', { class: 'pt-actions' }, actions) : null);
}
const loading = t => h('div', { class: 'pt-state' }, h('div', { class: 'spin' }), h('p', { text: t || 'Loading…' }));
function errorBox(msg, retry) {
  return h('div', { class: 'pt-state pt-bad', role: 'alert' }, h('p', { class: 'pt-st-t', text: 'Something went wrong' }), h('p', { text: msg }),
    retry ? h('button', { type: 'button', class: 'btn', text: 'Try again', onclick: retry }) : null);
}
const empty = (title, text, ...act) => h('div', { class: 'pt-state' }, h('p', { class: 'pt-st-t', text: title }), text ? h('p', { text }) : null, act.length ? h('div', { class: 'pt-actions' }, act) : null);
const card = (...kids) => h('section', { class: 'pt-card' }, ...kids);
const link = (href, text, cls) => h('a', { class: cls || 'btn', href, text });
function stat(label, value, sub) { return h('div', { class: 'pt-stat' }, h('span', { class: 'pt-stat-l', text: label }), h('strong', { text: value }), sub ? h('span', { class: 'pt-stat-s', text: sub }) : null); }
function badge(text, kind) { return h('span', { class: 'pt-badge' + (kind ? ' pt-b-' + kind : ''), text }); }
function bar(p, kind) { return h('span', { class: 'pt-bar' }, h('span', { class: 'pt-bar-f' + (kind ? ' ' + kind : ''), style: 'width:' + Math.max(0, Math.min(100, p || 0)) + '%' })); }
function modal(title, body, buttons) {
  const back = h('div', { class: 'pt-modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  back.append(h('div', { class: 'pt-modal' }, h('h2', { text: title }), body, h('div', { class: 'pt-actions' }, (buttons || []).map(b => h('button', { type: 'button', class: 'btn' + (b.pri ? ' pri' : '') + (b.bad ? ' pt-danger' : ''), text: b.text, onclick: () => { if (b.onclick(close) !== false) close(); } })))));
  back.addEventListener('click', e => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(back);
  const f = back.querySelector('input,select,textarea,button.pri'); if (f) f.focus();
  return close;
}
function confirmBox(title, text, okText, bad) { return new Promise(res => modal(title, h('p', { text }), [{ text: 'Cancel', onclick: () => res(false) }, { text: okText, pri: !bad, bad, onclick: () => res(true) }])); }
function promptBox(title, label, value) {
  return new Promise(res => {
    const inp = h('input', { type: 'text', class: 'pt-in', value: value || '', maxlength: 200 });
    modal(title, h('label', { class: 'pt-fld' }, h('span', { text: label }), inp), [{ text: 'Cancel', onclick: () => res(null) }, { text: 'Save', pri: true, onclick: () => { const v = inp.value.trim(); if (!v) { inp.focus(); return false; } res(v); } }]);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.closest('.pt-modal').querySelector('.btn.pri').click(); } });
  });
}
async function copy(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg || 'Copied'); }
  catch (e) { promptBox('Copy this link', 'Select and copy', text); }
}
function nope(title, text) { show(card(empty(title, text, link('#/profile', 'Edit profile', 'btn'), link('#/membership', 'Membership', 'btn pri')))); }
const P = () => AU().profile || {};
const can = k => !!(AU().perm && AU().perm[k]);

/* ---------- router ---------- */
let curRoute = '';
function route() {
  if (!AU() || !AU().profile || !view()) return;
  const m = location.hash.match(/^#\/([a-z-]+)(?:\/([^?]+))?/);
  if (!m) { if (curRoute) { curRoute = ''; leave(true); } return; }
  const r = m[1], arg = m[2] ? decodeURIComponent(m[2]) : '';
  if (r !== 't') exitExam();
  curRoute = location.hash;
  const pages = { profile: pageProfile, membership: pageMembership, tests: pageAvailable, reports: pageReports, report: pageReport, t: pageTake,
    create: pageCreate, edit: pageCreate, 'my-tests': pageMyTests, results: pageResults, worksheets: pageWorksheets };
  const fn = pages[r];
  if (!fn) { leave(); return; }
  Promise.resolve(fn(arg, r)).catch(e => show(errorBox(e.message || String(e), route)));
}
function leave(keepTab) {
  if (/^#\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
  curRoute = '';
  const v = view(); if (v) { v.hidden = true; v.textContent = ''; }
  if (keepTab === true && TE()) TE().setTab('qb');
}
window.addEventListener('hashchange', route);

/* ---------- Edit profile ---------- */
function pageProfile() {
  const p = P(), student = p.role === 'student';
  const sel = (id, list, val) => { const s = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: 'Choose…' }), list.map(x => h('option', { value: x, text: x }))); s.value = val || ''; return s; };
  const fName = h('input', { id: 'pfName', class: 'pt-in', type: 'text', maxlength: 120, value: p.full_name || '', required: true, autocomplete: 'name' });
  const fSchool = h('input', { id: 'pfSchool', class: 'pt-in', type: 'text', maxlength: 160, value: p.school || '', placeholder: student ? 'e.g. JNV Pune' : 'School or centre (optional)' });
  const fClass = sel('pfClass', CLASSES, p.class), fStream = sel('pfStream', STREAMS, p.stream);
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const fld = (label, input, hint) => h('label', { class: 'pt-fld', for: input.id }, h('span', { text: label }), input, hint ? h('small', { text: hint }) : null);
  const ro = (label, value) => h('div', { class: 'pt-fld' }, h('span', { text: label }), h('div', { class: 'pt-ro', text: value || '—' }));
  const incomplete = student ? !(p.full_name && p.school && p.class) : !p.full_name;
  show(head('Edit profile', incomplete ? 'Please complete your profile to continue.' : 'Your name and school appear on test results.'),
    h('div', { class: 'pt-grid2' },
      card(h('h2', { text: 'Your details' }),
        h('form', { class: 'pt-form', onsubmit: async e => {
          e.preventDefault(); msg.textContent = ''; msg.className = 'pt-msg';
          if (!fName.value.trim()) { msg.textContent = 'Please enter your name.'; msg.classList.add('bad'); fName.focus(); return; }
          if (student && (!fSchool.value.trim() || !fClass.value)) { msg.textContent = 'Students need a school and a class.'; msg.classList.add('bad'); return; }
          const b = e.target.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Saving…';
          try { await rpc('update_my_profile', { p_full_name: fName.value, p_school: fSchool.value, p_class: student ? fClass.value : (fClass.value || null), p_stream: student ? fStream.value : (fStream.value || null) }); await AU().refresh(); msg.textContent = 'Saved.'; msg.classList.add('ok'); }
          catch (x) { msg.textContent = 'Could not save: ' + x.message; msg.classList.add('bad'); }
          b.disabled = false; b.textContent = 'Save profile';
        } },
          fld('Full name', fName), fld('School', fSchool, student ? 'Used for your rank within your school.' : null),
          student ? h('div', { class: 'pt-row2' }, fld('Class', fClass), fld('Stream', fStream)) : null,
          h('div', { class: 'pt-actions' }, h('button', { type: 'submit', class: 'btn pri', text: 'Save profile' })), msg)),
      card(h('h2', { text: 'Account' }),
        ro('Signed in as', p.email || (p.avanti_id ? 'Avanti ID ' + p.avanti_id : '')),
        ro('Role', p.role === 'teacher' ? 'Teacher' : 'Student'),
        ro('Plan', { free: 'Free', premium: 'Premium', staff: 'Staff (full access)' }[AU().perm.plan] + (AU().perm.plan === 'premium' && p.premium_until ? ' · until ' + day(p.premium_until) : '')),
        p.avanti_id ? ro('Avanti ID', p.avanti_id) : null,
        h('p', { class: 'pt-hint', text: 'Role and plan are set by the server. Contact Avanti Fellows if your role is wrong.' }),
        h('div', { class: 'pt-actions' }, AU().perm.plan === 'free' ? link('#/membership', 'Purchase membership', 'btn pri') : null, h('button', { type: 'button', class: 'btn', text: 'Logout', onclick: () => AU().signOut() })))));
}

/* ---------- Membership (Razorpay) ---------- */
async function pageMembership() {
  const p = P(), plan = AU().perm.plan;
  show(loading());
  const { data: pays } = await sb().from('payments').select('order_id,payment_id,amount_paise,status,created_at,paid_at').order('created_at', { ascending: false }).limit(20);
  const feats = ['Must Solve and Handouts', 'Download every DPP, PYQ paper and handout as PDF', 'Print and share PDFs', 'Create online tests with a share link (teachers)', 'Results, ranks and CSV export (teachers)'];
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const payBtn = h('button', { type: 'button', class: 'btn pri pt-big', text: plan === 'premium' ? 'Renew for 1 more year · ₹1' : 'Pay ₹1 · Get Premium for 1 year', onclick: () => pay(payBtn, msg) });
  const status = plan === 'staff' ? card(h('h2', { text: 'Staff account' }), h('p', { text: 'Your @avantifellows.org account has full access to everything. No payment is needed.' }))
    : plan === 'premium' ? card(h('h2', { text: 'Premium' }), h('p', { text: 'Your Premium membership is active until ' + day(p.premium_until) + '. After that the account returns to Free unless you renew.' }), payBtn, msg)
      : card(h('h2', { text: 'Premium membership' }), h('p', { class: 'pt-price' }, h('strong', { text: '₹1' }), ' for 1 year'), h('ul', { class: 'pt-feats' }, feats.map(f => h('li', { text: f }))), payBtn, msg,
        h('p', { class: 'pt-hint', text: 'Payment is handled by Razorpay (UPI, cards, net banking). Premium starts as soon as the payment is confirmed.' }));
  const hist = (pays || []).length ? card(h('h2', { text: 'Payment history' }), h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Date', 'Amount', 'Status', 'Payment ID'].map(t => h('th', { text: t })))),
    h('tbody', {}, pays.map(x => h('tr', {}, h('td', { text: when(x.created_at) }), h('td', { text: '₹' + num(x.amount_paise / 100, 2) }), h('td', {}, badge({ paid: 'Paid', failed: 'Failed', created: 'Not completed' }[x.status], { paid: 'ok', failed: 'bad' }[x.status])), h('td', { class: 'pt-mono', text: x.payment_id || '—' }))))))) : null;
  show(head('Membership', 'Your plan: ' + { free: 'Free', premium: 'Premium', staff: 'Staff' }[plan]), h('div', { class: 'pt-grid2' }, status, hist));
}
let rzpP = null;
async function callPay(body) {
  const { data } = await sb().auth.getSession();
  const tok = data.session && data.session.access_token;
  const r = await fetch(AU().url + '/functions/v1/razorpay', { method: 'POST', headers: { apikey: AU().key, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Payment service error (' + r.status + ')');
  return j;
}
async function pay(btn, msg) {
  msg.className = 'pt-msg'; msg.textContent = 'Starting payment…'; btn.disabled = true;
  try {
    if (!rzpP) rzpP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = res; s.onerror = () => { rzpP = null; rej(new Error('Could not load Razorpay. Check your internet connection.')); }; document.head.append(s); });
    await rzpP;
    const o = await callPay({ action: 'create-order' });
    msg.textContent = 'Complete the payment in the Razorpay window.';
    const rz = new window.Razorpay({
      key: o.key_id, order_id: o.order_id, amount: o.amount, currency: o.currency, name: 'Avanti Fellows', description: 'Mathematics Dashboard · Premium (1 year)',
      prefill: { name: o.name || '', email: o.email || '' }, theme: { color: '#1f3f95' },
      handler: async resp => {
        msg.textContent = 'Confirming your payment with the server…';
        try { const v = await callPay(Object.assign({ action: 'verify' }, resp)); await waitPremium(v.status === 'paid'); msg.textContent = 'Payment confirmed. Premium is now active.'; msg.classList.add('ok'); toast('Premium is active. Thank you!'); setTimeout(() => location.reload(), 1200); }
        catch (e) { msg.textContent = 'We could not confirm the payment yet: ' + e.message + '. If money was taken, Premium starts automatically within a few minutes.'; msg.classList.add('bad'); btn.disabled = false; }
      },
      modal: { ondismiss: () => { msg.textContent = 'Payment was not completed. You are still on the Free plan.'; btn.disabled = false; } }
    });
    rz.on('payment.failed', r => { msg.textContent = 'Payment failed: ' + ((r && r.error && r.error.description) || 'please try again') + '. You are still on the Free plan.'; msg.classList.add('bad'); btn.disabled = false; });
    rz.open();
  } catch (e) { msg.textContent = e.message; msg.classList.add('bad'); btn.disabled = false; }
}
async function waitPremium(sure) {
  for (let i = 0; i < (sure ? 2 : 10); i++) {
    const p = await AU().refresh();
    if (p.plan === 'premium' || p.plan === 'staff') return;
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('the server has not confirmed it yet');
}

/* ---------- Saved worksheets ---------- */
async function myWorksheets() {
  const { data, error } = await sb().from('worksheets').select('id,title,question_ids,updated_at').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
async function pageWorksheets() {
  if (!can('createTests')) return nope('Saved worksheets are for Premium teachers', 'Buy a membership to save worksheets and create tests.');
  show(head('Saved worksheets', 'Question lists you kept from the Question Bank or the test maker.'), loading());
  const list = await myWorksheets();
  const body = list.length ? h('div', { class: 'pt-cards' }, list.map(w => card(
    h('div', { class: 'pt-ct' }, h('h3', { text: w.title }), badge(w.question_ids.length + ' questions')),
    h('p', { class: 'pt-hint', text: 'Updated ' + when(w.updated_at) }),
    h('div', { class: 'pt-actions' },
      h('button', { type: 'button', class: 'btn pri', text: 'Create test', onclick: () => createTestFrom(w.question_ids, w.title) }),
      h('button', { type: 'button', class: 'btn', text: 'View questions', onclick: () => previewIds(w.title, w.question_ids) }),
      h('button', { type: 'button', class: 'btn', text: 'Rename', onclick: async () => { const t = await promptBox('Rename worksheet', 'Title', w.title); if (!t) return; const { error } = await sb().from('worksheets').update({ title: t, updated_at: new Date().toISOString() }).eq('id', w.id); if (error) toast('Could not rename: ' + error.message); else pageWorksheets(); } }),
      h('button', { type: 'button', class: 'btn pt-danger', text: 'Delete', onclick: async () => { if (!await confirmBox('Delete worksheet?', '"' + w.title + '" will be deleted. Tests made from it are not affected.', 'Delete', true)) return; const { error } = await sb().from('worksheets').delete().eq('id', w.id); if (error) toast('Could not delete: ' + error.message); else pageWorksheets(); } }))))) :
    empty('No saved worksheets yet', 'In the Question Bank, tick questions and press "Save as worksheet". You can also save the questions of a test while creating it.', h('button', { type: 'button', class: 'btn pri', text: 'Open Question Bank', onclick: () => { leave(); TE().setTab('qb'); } }));
  show(head('Saved worksheets', 'Question lists you kept from the Question Bank or the test maker.', link('#/create', 'Create Test', 'btn pri')), body);
}
async function saveWorksheet(ids, name) {
  if (!can('createTests')) { toast('Saving worksheets needs a Premium teacher membership.'); return; }
  const t = await promptBox('Save as worksheet', 'Worksheet title', name || 'Worksheet');
  if (!t) return;
  const { error } = await sb().from('worksheets').insert({ title: t, question_ids: ids.slice(0, 300) });
  if (error) toast('Could not save the worksheet: ' + error.message); else toast('Saved "' + t + '" (' + ids.length + ' questions) in Saved worksheets.');
}
let PREFILL = null;
function createTestFrom(ids, name) {
  if (!can('createTests')) { toast('Creating tests needs a Premium teacher membership.'); return; }
  PREFILL = { ids: ids.slice(), title: name || '' };
  if (location.hash === '#/create') route(); else location.hash = '#/create';
}
async function previewIds(title, ids) {
  const B = await TE().bank();
  const qs = ids.map(i => B.byId.get(i)).filter(Boolean).map(snap);
  previewQs(title, qs, true);
}
function previewQs(title, qs, withAns) {
  const body = h('div', { class: 'pt-plist' }, qs.map((q, i) => qCard(q, i, { answer: withAns ? q.a : null })));
  modal(title + ' · ' + qs.length + ' questions', body, [{ text: 'Close', pri: true, onclick: () => {} }]);
  mathIn(body);
}

/* one question rendered (preview, report and exam) */
function qCard(q, i, o) {
  o = o || {};
  const opts = (q.o || []).map((t, k) => {
    const L = LETTERS[k], chosen = o.response && String(o.response).split(',').includes(L), right = o.answer && String(o.answer).toUpperCase().split(',').map(x => x.trim()).includes(L);
    return h('li', { class: 'pt-opt' + (right ? ' right' : '') + (chosen ? ' chosen' : '') }, h('b', { text: L }), h('span', { html: qText(t) }));
  });
  return h('article', { class: 'pt-q' + (o.status ? ' st-' + o.status : '') },
    h('div', { class: 'pt-qh' }, h('strong', { text: 'Q' + (i + 1) }), badge(q.type || 'MCQ'), q.tp ? h('span', { class: 'pt-hint', text: q.tp }) : null, o.right),
    h('div', { class: 'pt-qt', html: qText(q.q) }), figure(q.f),
    opts.length ? h('ol', { class: 'pt-opts' }, opts) : null,
    o.answer != null && !(q.o || []).length ? h('p', { class: 'pt-ans' }, 'Answer: ', h('b', { text: o.answer })) : null,
    o.extra);
}

/* ---------- Create / edit test ---------- */
const gradable = q => { if (!q || !q.a) return false; if (q.t === 'Numerical') return /^-?\d+(\.\d+)?$/.test(q.a.trim()) || /^-?\d+(\.\d+)?\s*to\s*-?\d+(\.\d+)?$/i.test(q.a.trim()); return (q.t === 'MCQ' || q.t === 'MSQ') && (q.o || []).length > 0 && /^[A-D](,[A-D])*$/.test(q.a); };
let CHN = new Map();
function snap(q) { const ch = CHN.get(q.cc); return { id: q.i, type: q.t, q: q.q, o: q.o || [], a: q.a, ch: q.cc, chn: ch ? ch.n : q.cc, tp: q.tp || '', f: q.f && q.f.svg ? { svg: q.f.svg } : null, d: q.d, src: q.s === 'P' ? (q.e === 'Main' ? 'JEE Main' : q.e === 'Adv' ? 'JEE Advanced' : q.e) + (q.y ? ' ' + q.y : '') : 'Practice' }; }
async function pageCreate(arg, r) {
  if (!can('createTests')) return nope('Creating tests is for Premium teachers', 'Buy a membership to create tests, share links and see results.');
  show(head(r === 'edit' ? 'Edit test' : 'Create Test', 'Loading the question bank…'), loading('Loading the question bank…'));
  const B = await TE().bank(); CHN = B.chapters;
  const all = B.qs.filter(gradable);
  const S = { title: '', mins: 60, pos: 4, neg: 1, cls: '', stream: '', school: '', active: true, sel: [], id: null, locked: false };
  if (r === 'edit') {
    const { data: t, error } = await sb().from('tests').select('*').eq('id', arg).maybeSingle();
    if (error || !t) { show(errorBox(error ? error.message : 'Test not found.', null)); return; }
    Object.assign(S, { id: t.id, code: t.code, title: t.title, mins: t.duration_min, pos: +t.marks_correct, neg: +t.marks_wrong, cls: t.target_class || '', stream: t.target_stream || '', school: t.school || '', active: t.is_active, sel: t.questions });
    const { data: mt } = await sb().rpc('my_tests'); const me = (mt || []).find(x => x.id === t.id); S.locked = !!(me && me.submitted > 0);
  } else if (PREFILL) {
    S.sel = PREFILL.ids.map(i => B.byId.get(i)).filter(gradable).map(snap); S.title = PREFILL.title || '';
    const skipped = PREFILL.ids.length - S.sel.length; if (skipped) setTimeout(() => toast(skipped + ' question(s) were left out: tests use only MCQ, MSQ and numerical questions with an answer key.'), 300);
    PREFILL = null;
  }
  const F = { src: 'all', exam: '', paper: '', ch: '', tp: '', lv: new Set(), ty: new Set(), q: '', ws: '', page: 0 };
  const selIds = () => new Set(S.sel.map(x => x.id));
  const inp = (id, type, val, attrs) => h('input', Object.assign({ id, type, class: 'pt-in', value: val }, attrs || {}));
  const fTitle = inp('ctTitle', 'text', S.title, { maxlength: 200, placeholder: 'e.g. Quadratic Equations · Weekly test 3', required: true });
  const fMins = inp('ctMins', 'number', S.mins, { min: 1, max: 600 }), fPos = inp('ctPos', 'number', S.pos, { min: 0.5, max: 100, step: 'any' }), fNeg = inp('ctNeg', 'number', S.neg, { min: 0, max: 100, step: 'any' });
  const mkSel = (id, first, list, val) => { const s = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: first }), list.map(x => h('option', { value: x, text: x }))); s.value = val; return s; };
  const fCls = mkSel('ctCls', 'Any class', CLASSES, S.cls), fStr = mkSel('ctStr', 'Any stream', STREAMS, S.stream);
  const fSchool = inp('ctSchool', 'text', S.school, { maxlength: 160, placeholder: 'Leave blank for all schools' });
  const fAct = h('input', { type: 'checkbox', id: 'ctAct', role: 'switch' }); fAct.checked = S.active;
  const fld = (label, el, hint) => h('label', { class: 'pt-fld', for: el.id }, h('span', { text: label }), el, hint ? h('small', { text: hint }) : null);
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const selBox = h('div', { class: 'pt-sel' }), selHead = h('h2', {});
  const results = h('div', { class: 'pt-plist' }), resHead = h('div', { class: 'pt-rh' }), pager = h('div', { class: 'pt-pager' });
  const filt = h('div', { class: 'pt-filters' });
  let wsList = null;

  function pool() {
    if (F.src === 'ws') { const w = (wsList || []).find(x => x.id === F.ws); return w ? w.question_ids.map(i => B.byId.get(i)).filter(gradable) : []; }
    const q = F.q.trim().toLowerCase();
    return all.filter(x => (F.src === 'all' || (F.src === 'pyq' ? x.s === 'P' : x.s === 'N'))
      && (!F.exam || x.e === F.exam) && (!F.paper || x.p === F.paper) && (!F.ch || x.cc === F.ch) && (!F.tp || x.tp === F.tp)
      && (!F.lv.size || F.lv.has(x.d)) && (!F.ty.size || F.ty.has(x.t))
      && (!q || x.i.toLowerCase().includes(q) || x.q.toLowerCase().includes(q)));
  }
  function drawFilters() {
    filt.textContent = '';
    const seg = h('div', { class: 'seg pt-seg' }, [['all', 'Question Bank'], ['dpp', 'DPPs (practice)'], ['pyq', 'PYQs'], ['ws', 'Saved worksheet']].map(([k, t]) =>
      h('button', { type: 'button', 'aria-pressed': String(F.src === k), text: t, onclick: async () => { F.src = k; F.page = 0; F.paper = ''; if (k === 'ws' && !wsList) { wsList = await myWorksheets().catch(() => []); } drawFilters(); drawResults(); } })));
    filt.append(seg);
    if (F.src === 'ws') {
      const s = h('select', { class: 'pt-in', 'aria-label': 'Worksheet', onchange: e => { F.ws = e.target.value; F.page = 0; drawResults(); } }, h('option', { value: '', text: (wsList || []).length ? 'Choose a saved worksheet…' : 'No saved worksheets yet' }), (wsList || []).map(w => h('option', { value: w.id, text: w.title + ' (' + w.question_ids.length + ')' })));
      s.value = F.ws; filt.append(s); return;
    }
    const chs = [...CHN.values()].sort((a, b) => a.cl - b.cl || a.o - b.o);
    const chSel = h('select', { class: 'pt-in', 'aria-label': 'Chapter', onchange: e => { F.ch = e.target.value; F.tp = ''; F.page = 0; drawFilters(); drawResults(); } }, h('option', { value: '', text: 'All chapters' }),
      [11, 12].map(c => h('optgroup', { label: 'Class ' + c }, chs.filter(x => +x.cl === c).map(x => h('option', { value: x.c, text: x.c + ' ' + x.n })))));
    chSel.value = F.ch;
    const tps = F.ch ? [...new Set(all.filter(x => x.cc === F.ch && x.tp).map(x => x.tp))].sort() : [];
    const tpSel = h('select', { class: 'pt-in', 'aria-label': 'Topic', disabled: !F.ch, onchange: e => { F.tp = e.target.value; F.page = 0; drawResults(); } }, h('option', { value: '', text: F.ch ? 'All topics' : 'Pick a chapter for topics' }), tps.map(t => h('option', { value: t, text: t })));
    tpSel.value = F.tp;
    const row = h('div', { class: 'pt-frow' }, chSel, tpSel);
    if (F.src === 'pyq') {
      const exSel = h('select', { class: 'pt-in', 'aria-label': 'Exam', onchange: e => { F.exam = e.target.value; F.paper = ''; F.page = 0; drawFilters(); drawResults(); } }, h('option', { value: '', text: 'All exams' }), [['Main', 'JEE Main / AIEEE'], ['Adv', 'JEE Advanced / IIT'], ['KCET', 'KCET'], ['IAT', 'IAT'], ['NDA', 'NDA']].map(([v, t]) => h('option', { value: v, text: t })));
      exSel.value = F.exam;
      const papers = [...new Set(all.filter(x => x.s === 'P' && x.p && (!F.exam || x.e === F.exam)).map(x => x.p))].sort((a, b) => (Date.parse(b) || 0) - (Date.parse(a) || 0) || b.localeCompare(a));
      const pSel = h('select', { class: 'pt-in', 'aria-label': 'Paper', onchange: e => { F.paper = e.target.value; F.page = 0; drawFilters(); drawResults(); } }, h('option', { value: '', text: 'Any paper' }), papers.map(p => h('option', { value: p, text: p })));
      pSel.value = F.paper;
      row.prepend(exSel, pSel);
    }
    const chip = (set, k, t) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(set.has(k)), text: t, onclick: () => { set.has(k) ? set.delete(k) : set.add(k); F.page = 0; drawFilters(); drawResults(); } });
    filt.append(row, h('div', { class: 'pt-frow' },
      h('div', { class: 'chips' }, chip(F.lv, 'L1', 'L1 easy'), chip(F.lv, 'L2', 'L2 medium'), chip(F.lv, 'L3', 'L3 hard')),
      h('div', { class: 'chips' }, chip(F.ty, 'MCQ', 'MCQ'), chip(F.ty, 'MSQ', 'MSQ'), chip(F.ty, 'Numerical', 'Numerical'))),
      h('input', { type: 'search', class: 'pt-in', placeholder: 'Search question text or ID', value: F.q, 'aria-label': 'Search', oninput: e => { F.q = e.target.value; F.page = 0; clearTimeout(drawFilters.t); drawFilters.t = setTimeout(drawResults, 250); } }));
  }
  const PER = 12;
  function drawResults() {
    const P0 = pool(), have = selIds(), pages = Math.max(1, Math.ceil(P0.length / PER)); F.page = Math.min(F.page, pages - 1);
    const slice = P0.slice(F.page * PER, F.page * PER + PER);
    resHead.textContent = '';
    resHead.append(h('span', { text: P0.length + ' question' + (P0.length === 1 ? '' : 's') + ' match' }),
      h('span', { class: 'pt-actions' },
        h('button', { type: 'button', class: 'btn', text: 'Add this page', disabled: !slice.length, onclick: () => add(slice) }),
        h('button', { type: 'button', class: 'btn', text: 'Add 10 random', disabled: !P0.length, onclick: () => add(P0.filter(x => !have.has(x.i)).sort(() => Math.random() - 0.5).slice(0, 10)) }),
        F.paper || F.src === 'ws' ? h('button', { type: 'button', class: 'btn pri', text: F.paper ? 'Add whole paper' : 'Add whole worksheet', disabled: !P0.length, onclick: () => add(P0) }) : null));
    results.textContent = '';
    if (!P0.length) results.append(empty('No questions match', F.src === 'ws' ? 'Pick a worksheet above.' : 'Loosen a filter above. Only MCQ, MSQ and numerical questions with an answer key can be used in online tests.'));
    slice.forEach(q => {
      const on = have.has(q.i), s = snap(q);
      const b = h('button', { type: 'button', class: 'btn' + (on ? '' : ' pri'), text: on ? 'Added ✓' : 'Add', disabled: on || S.locked, onclick: () => add([q]) });
      results.append(qCard(s, 0, { right: h('span', { class: 'pt-qmeta' }, h('span', { class: 'pt-hint', text: s.id + ' · ' + s.src + ' · ' + (q.d || '') }), b) }));
    });
    results.querySelectorAll('.pt-qh strong').forEach(x => x.remove());
    pager.textContent = '';
    if (pages > 1) pager.append(h('button', { type: 'button', class: 'btn', text: '‹ Previous', disabled: F.page === 0, onclick: () => { F.page--; drawResults(); } }), h('span', { text: 'Page ' + (F.page + 1) + ' of ' + pages }), h('button', { type: 'button', class: 'btn', text: 'Next ›', disabled: F.page >= pages - 1, onclick: () => { F.page++; drawResults(); } }));
    mathIn(results);
  }
  function add(qs) {
    if (S.locked) { toast('Students have submitted this test, so its questions cannot change.'); return; }
    const have = selIds(); let n = 0;
    qs.forEach(q => { if (!have.has(q.i) && S.sel.length < 200) { S.sel.push(snap(q)); have.add(q.i); n++; } });
    if (S.sel.length >= 200) toast('A test can have at most 200 questions.');
    if (n) toast(n + ' question' + (n === 1 ? '' : 's') + ' added');
    drawSel(); drawResults();
  }
  function drawSel() {
    const pos = parseFloat(fPos.value) || 0;
    selHead.textContent = 'Selected questions · ' + S.sel.length + (S.sel.length ? ' · ' + num(S.sel.length * pos, 1) + ' marks' : '');
    selBox.textContent = '';
    if (!S.sel.length) { selBox.append(empty('No questions yet', 'Add questions from the list.')); return; }
    S.sel.forEach((q, i) => selBox.append(h('div', { class: 'pt-si' }, h('b', { text: i + 1 }), h('span', { class: 'pt-si-t', html: qText(String(q.q).slice(0, 160)) + (String(q.q).length > 160 ? '…' : '') }),
      h('span', { class: 'pt-hint', text: q.type + (q.tp ? ' · ' + q.tp : '') }),
      S.locked ? null : h('span', { class: 'pt-si-b' },
        h('button', { type: 'button', class: 'pt-ib', title: 'Move up', 'aria-label': 'Move question ' + (i + 1) + ' up', text: '↑', disabled: i === 0, onclick: () => { [S.sel[i - 1], S.sel[i]] = [S.sel[i], S.sel[i - 1]]; drawSel(); } }),
        h('button', { type: 'button', class: 'pt-ib', title: 'Move down', 'aria-label': 'Move question ' + (i + 1) + ' down', text: '↓', disabled: i === S.sel.length - 1, onclick: () => { [S.sel[i + 1], S.sel[i]] = [S.sel[i], S.sel[i + 1]]; drawSel(); } }),
        h('button', { type: 'button', class: 'pt-ib', title: 'Remove', 'aria-label': 'Remove question ' + (i + 1), text: '✕', onclick: () => { S.sel.splice(i, 1); drawSel(); drawResults(); } })))));
    mathIn(selBox);
  }
  async function save() {
    msg.className = 'pt-msg'; msg.textContent = '';
    const row = { title: fTitle.value.trim(), duration_min: parseInt(fMins.value, 10), marks_correct: parseFloat(fPos.value), marks_wrong: parseFloat(fNeg.value) || 0,
      target_class: fCls.value || null, target_stream: fStr.value || null, school: fSchool.value.trim() || null, is_active: fAct.checked, questions: S.sel.map(q => ({ id: q.id, type: q.type, q: q.q, o: q.o, a: q.a, ch: q.ch, chn: q.chn, tp: q.tp, f: q.f || null })) };
    const bad = !row.title ? 'Give the test a title.' : !(row.duration_min >= 1 && row.duration_min <= 600) ? 'Duration must be 1 to 600 minutes.' : !(row.marks_correct > 0) ? 'Marks for a correct answer must be more than 0.' : row.marks_wrong < 0 ? 'Negative marks cannot be below 0.' : !S.sel.length ? 'Add at least one question.' : '';
    if (bad) { msg.textContent = bad; msg.classList.add('bad'); return; }
    if (S.locked) { delete row.questions; delete row.marks_correct; delete row.marks_wrong; }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    const q = S.id ? sb().from('tests').update(row).eq('id', S.id).select('id,code').single() : sb().from('tests').insert(row).select('id,code').single();
    const { data, error } = await q;
    saveBtn.disabled = false; saveBtn.textContent = S.id ? 'Save changes' : 'Save test';
    if (error) { msg.textContent = 'Could not save: ' + error.message; msg.classList.add('bad'); return; }
    S.id = data.id; S.code = data.code;
    const url = testLink(data.code);
    modal('Test saved', h('div', {}, h('p', { text: 'Share this link with your students. They sign in, then take the test.' }), h('div', { class: 'pt-link' }, h('code', { text: url }))),
      [{ text: 'My Tests', onclick: () => { location.hash = '#/my-tests'; } }, { text: 'Copy link', pri: true, onclick: () => { copy(url, 'Link copied'); return false; } }]);
  }
  const saveBtn = h('button', { type: 'button', class: 'btn pri', text: S.id ? 'Save changes' : 'Save test', onclick: save });
  fPos.addEventListener('input', drawSel);
  show(head(S.id ? 'Edit test' : 'Create Test', S.id ? 'Link: ' + testLink(S.code) : 'Pick questions, set the marking, save, then share the link.', link('#/my-tests', 'My Tests', 'btn')),
    h('div', { class: 'pt-make' },
      h('div', { class: 'pt-col' },
        card(h('h2', { text: 'Test details' }), fld('Title', fTitle),
          h('div', { class: 'pt-row3' }, fld('Duration (minutes)', fMins), fld('Marks if correct', fPos), fld('Negative marks', fNeg, 'Taken off for a wrong MCQ answer')),
          h('div', { class: 'pt-row2' }, fld('Class', fCls), fld('Stream', fStr)), fld('School (optional)', fSchool, 'Only students of this school see it in Available tests. Anyone with the link can still open it.'),
          h('label', { class: 'pt-switch', for: 'ctAct' }, fAct, h('span', { text: 'Active: students can open the test now' })),
          S.locked ? h('p', { class: 'pt-note', text: 'Students have already submitted this test, so the questions and marks are locked. You can still change the title, class, school and on/off.' }) : null),
        card(selHead, selBox, h('div', { class: 'pt-actions' }, saveBtn,
          h('button', { type: 'button', class: 'btn', text: 'Save as worksheet', onclick: () => { if (!S.sel.length) { toast('Add questions first'); return; } saveWorksheet(S.sel.map(x => x.id), fTitle.value.trim() || 'Worksheet'); } }),
          S.sel.length && !S.locked ? h('button', { type: 'button', class: 'btn', text: 'Clear all', onclick: async () => { if (await confirmBox('Remove all questions?', 'The selected list will be emptied.', 'Clear', true)) { S.sel = []; drawSel(); drawResults(); } } }) : null), msg)),
      h('div', { class: 'pt-col' }, card(h('h2', { text: 'Pick questions' }), filt, resHead, results, pager))));
  drawFilters(); drawSel(); drawResults();
}

/* ---------- My Tests ---------- */
async function pageMyTests() {
  if (!can('createTests') && !can('staff')) return nope('My Tests is for Premium teachers', 'Buy a membership to create tests and see results.');
  show(head('My Tests and Results', ''), loading());
  const list = await rpc('my_tests');
  const top = head('My Tests and Results', list.length ? list.length + ' test' + (list.length === 1 ? '' : 's') : '', link('#/create', '+ Create Test', 'btn pri'));
  if (!list.length) { show(top, card(empty('No tests yet', 'Create your first test from the Question Bank, DPPs or PYQs.', link('#/create', 'Create Test', 'btn pri')))); return; }
  const toggle = async t => { const { error } = await sb().from('tests').update({ is_active: !t.is_active }).eq('id', t.id); if (error) toast('Could not change: ' + error.message); else { toast(t.is_active ? 'Test deactivated: students cannot start it.' : 'Test activated.'); pageMyTests(); } };
  const del = async t => {
    if (!await confirmBox('Delete "' + t.title + '"?', 'The test, its link and ' + (t.submitted ? 'all ' + t.submitted + ' student results' : 'any results') + ' will be deleted for good. Export the CSV first if you need it.', 'Delete', true)) return;
    const { error } = await sb().from('tests').delete().eq('id', t.id); if (error) toast('Could not delete: ' + error.message); else { toast('Test deleted'); pageMyTests(); }
  };
  const preview = async t => { const { data, error } = await sb().from('tests').select('title,questions').eq('id', t.id).single(); if (error) { toast(error.message); return; } previewQs(data.title, data.questions, true); };
  show(top, h('div', { class: 'pt-cards' }, list.map(t => card(
    h('div', { class: 'pt-ct' }, h('h3', { text: t.title }), t.is_active ? badge('Active', 'ok') : badge('Inactive', 'mute')),
    h('p', { class: 'pt-meta', text: [t.n_questions + ' questions', t.duration_min + ' min', '+' + num(t.marks_correct, 2) + ' / −' + num(t.marks_wrong, 2), t.target_class ? 'Class ' + t.target_class : 'Any class', t.target_stream || 'Any stream', t.school || 'All schools'].join(' · ') }),
    h('p', { class: 'pt-meta' }, h('b', { text: t.submitted }), ' submitted', t.in_progress ? ' · ' + t.in_progress + ' writing now' : '', ' · created ' + day(t.created_at)),
    h('div', { class: 'pt-link' }, h('code', { text: testLink(t.code) })),
    h('div', { class: 'pt-actions' },
      h('button', { type: 'button', class: 'btn pri', text: 'Copy link', onclick: () => copy(testLink(t.code), 'Link copied') }),
      link('#/results/' + t.id, 'Results', 'btn'),
      link('#/edit/' + t.id, 'Edit', 'btn'),
      h('button', { type: 'button', class: 'btn', text: 'Preview', onclick: () => preview(t) }),
      h('button', { type: 'button', class: 'btn', text: t.is_active ? 'Deactivate' : 'Activate', onclick: () => toggle(t) }),
      h('button', { type: 'button', class: 'btn pt-danger', text: 'Delete', onclick: () => del(t) }))))));
}

/* ---------- Teacher results ---------- */
function csv(rows) { return rows.map(r => r.map(v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n'); }
function saveCsv(name, rows) {
  const blob = new Blob(['﻿' + csv(rows)], { type: 'text/csv;charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function pageResults(id) {
  show(head('Results', ''), loading('Loading results…'));
  const R = await rpc('test_results', { p_test: id });
  const t = R.test, s = R.summary || {}, st = R.students || [];
  const fname = t.title.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const exportStudents = () => saveCsv(fname + '_results.csv', [['Rank', 'School rank', 'Name', 'Avanti ID', 'School', 'Class', 'Stream', 'Score', 'Max score', 'Correct', 'Wrong', 'Skipped', 'Accuracy %', 'Time (min:sec)', 'Tab switches', 'Submitted at']]
    .concat(st.map(x => [x.rank, x.school_rank, x.name, x.avanti_id, x.school, x.class, x.stream, x.score, x.max_score, x.correct, x.wrong, x.skipped, x.accuracy, mmss(x.time_taken_sec), x.tab_switches, when(x.submitted_at)])));
  const exportQs = () => saveCsv(fname + '_questions.csv', [['Q', 'Question ID', 'Chapter', 'Topic', 'Students', 'Correct', 'Wrong', 'Skipped', 'Correct %', 'Average seconds']]
    .concat((R.questions || []).map(q => [q.pos, q.qid, q.chapter, q.topic, q.total, q.correct, q.wrong, q.skipped, q.correct_pct, q.avg_time_sec])));
  const top = head(t.title, t.n_questions + ' questions · ' + t.duration_min + ' min · max ' + num(t.max_score, 2) + ' marks' + (t.is_active ? '' : ' · inactive'),
    h('button', { type: 'button', class: 'btn', text: 'Copy link', onclick: () => copy(testLink(t.code), 'Link copied') }),
    h('button', { type: 'button', class: 'btn pri', text: 'Export CSV', disabled: !st.length, onclick: exportStudents }),
    link('#/my-tests', 'My Tests', 'btn'));
  if (!st.length) { show(top, card(empty('No results yet', (s.in_progress ? s.in_progress + ' student(s) are writing the test now. ' : '') + 'Results appear here when students submit. Share the link: ' + testLink(t.code)))); return; }
  const maxD = Math.max(1, ...R.distribution.map(d => d.count));
  const dist = card(h('h2', { text: 'Score distribution' }), h('p', { class: 'pt-hint', text: 'Students by percentage of the maximum score' }),
    h('div', { class: 'pt-hist', role: 'img', 'aria-label': 'Score distribution chart' }, R.distribution.map(d => h('div', { class: 'pt-hcol', title: d.from + '–' + d.to + '%: ' + d.count + ' students' },
      h('span', { class: 'pt-hv', text: d.count || '' }), h('span', { class: 'pt-hb', style: 'height:' + (d.count / maxD * 100) + '%' }), h('span', { class: 'pt-hl', text: d.from + (d.from === 90 ? '+' : '') })))));
  let filter = '';
  const tbody = h('tbody', {});
  const drawRows = () => {
    tbody.textContent = '';
    st.filter(x => !filter || (String(x.name || '') + ' ' + (x.school || '') + ' ' + (x.avanti_id || '')).toLowerCase().includes(filter)).forEach(x => tbody.append(h('tr', { class: 'pt-click', tabindex: '0', onclick: () => { location.hash = '#/report/' + x.attempt_id; }, onkeydown: e => { if (e.key === 'Enter') location.hash = '#/report/' + x.attempt_id; } },
      h('td', { class: 'pt-num', text: x.rank }), h('td', {}, h('b', { text: x.name || 'Unnamed' }), x.avanti_id ? h('div', { class: 'pt-hint', text: x.avanti_id }) : null),
      h('td', {}, x.school || '—', h('div', { class: 'pt-hint', text: '#' + x.school_rank + ' in school' })), h('td', { text: [x.class, x.stream].filter(Boolean).join(' · ') || '—' }),
      h('td', { class: 'pt-num' }, h('b', { text: num(x.score, 2) }), ' / ' + num(x.max_score, 2)), h('td', { class: 'pt-num', text: x.correct + ' / ' + x.wrong + ' / ' + x.skipped }),
      h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-num', text: mmss(x.time_taken_sec) }), h('td', { class: 'pt-num' + (x.tab_switches > 2 ? ' pt-warnc' : ''), text: x.tab_switches }))));
  };
  const table = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Students (ranked)' }), h('input', { type: 'search', class: 'pt-in pt-search', placeholder: 'Search name, school or Avanti ID', 'aria-label': 'Search students', oninput: e => { filter = e.target.value.trim().toLowerCase(); drawRows(); } })),
    h('p', { class: 'pt-hint', text: 'Rank: higher score first, then less time. Click a student to open their report.' }),
    h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Rank', 'Student', 'School', 'Class', 'Score', 'C / W / S', 'Accuracy', 'Time', 'Tab switches'].map(x => h('th', { text: x })))), tbody)));
  drawRows();
  const qs = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Question-wise correctness' }), h('button', { type: 'button', class: 'btn', text: 'Export CSV', onclick: exportQs })),
    h('div', { class: 'pt-legend' }, h('span', { class: 'lg-c', text: 'Correct' }), h('span', { class: 'lg-w', text: 'Wrong' }), h('span', { class: 'lg-s', text: 'Skipped' })),
    h('div', { class: 'pt-qbars' }, (R.questions || []).map(q => h('div', { class: 'pt-qbar' }, h('b', { text: 'Q' + q.pos }),
      h('span', { class: 'pt-stack', title: q.correct + ' correct, ' + q.wrong + ' wrong, ' + q.skipped + ' skipped' },
        h('span', { class: 'c', style: 'width:' + (100 * q.correct / q.total) + '%' }), h('span', { class: 'w', style: 'width:' + (100 * q.wrong / q.total) + '%' }), h('span', { class: 's', style: 'width:' + (100 * q.skipped / q.total) + '%' })),
      h('span', { class: 'pt-num', text: pct(q.correct_pct) }), h('span', { class: 'pt-hint pt-qtp', text: q.topic || '' })))));
  const tps = card(h('h2', { text: 'Topic-wise weak areas' }), h('p', { class: 'pt-hint', text: 'Weakest first: share of all answers in the topic that were correct.' }),
    h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Topic', 'Chapter', 'Correct', 'Accuracy (attempted)', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, (R.topics || []).map(x => h('tr', {}, h('td', {}, h('b', { text: x.topic })), h('td', { text: x.chapter || '—' }), h('td', { class: 'pt-num', text: pct(x.correct_pct) }), h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-barcell' }, bar(x.correct_pct, x.correct_pct < 40 ? 'bad' : x.correct_pct < 70 ? 'mid' : 'ok'))))))));
  const maxAvg = Math.max(1, ...(R.schools || []).map(x => Math.max(0, x.average || 0)));
  const sch = card(h('h2', { text: 'Schools compared' }), h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['School', 'Students', 'Average', 'Top', 'Accuracy', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, (R.schools || []).map(x => h('tr', {}, h('td', {}, h('b', { text: x.school })), h('td', { class: 'pt-num', text: x.students }), h('td', { class: 'pt-num', text: num(x.average, 2) }), h('td', { class: 'pt-num', text: num(x.top, 2) }), h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-barcell' }, bar(100 * Math.max(0, x.average) / maxAvg))))))));
  show(top,
    h('div', { class: 'pt-stats' }, stat('Submitted', s.submitted, s.in_progress ? s.in_progress + ' writing now' : null), stat('Average', num(s.average, 2), 'of ' + num(t.max_score, 2)), stat('Highest', num(s.top, 2)), stat('Median', num(s.median, 2)), stat('Accuracy', pct(s.accuracy)), stat('Average time', mmss(s.avg_time_sec))),
    h('div', { class: 'pt-grid2' }, dist, sch), table, qs, tps);
}

/* ---------- Student: available tests, reports ---------- */
async function pageAvailable() {
  show(head('Available tests', ''), loading());
  const list = await rpc('list_available_tests');
  const codeIn = h('input', { type: 'text', class: 'pt-in', placeholder: 'Test code or link', 'aria-label': 'Test code or link' });
  const go = h('form', { class: 'pt-frow', onsubmit: e => { e.preventDefault(); const v = codeIn.value.trim(); const m = v.match(/#\/t\/([a-z0-9]+)/i) || v.match(/^([a-z0-9]{6,12})$/i); if (m) location.hash = '#/t/' + m[1].toLowerCase(); else toast('Paste the test link or its code'); } }, codeIn, h('button', { type: 'submit', class: 'btn', text: 'Open' }));
  const p = P();
  const top = head('Available tests', 'Tests for ' + ['Class ' + (p.class || '?'), p.stream, p.school].filter(Boolean).join(' · '), link('#/reports', 'My Reports', 'btn'));
  if (!list.length) { show(top, card(empty('No tests for you right now', 'When a teacher shares a test for your class, it appears here. Got a link? Open it, or paste it below.')), card(h('h2', { text: 'Have a test link?' }), go)); return; }
  show(top, h('div', { class: 'pt-cards' }, list.map(t => card(
    h('div', { class: 'pt-ct' }, h('h3', { text: t.title }), t.attempt_status === 'submitted' ? badge('Done', 'ok') : t.attempt_status === 'in_progress' ? badge('In progress', 'mid') : badge('New')),
    h('p', { class: 'pt-meta', text: [t.n_questions + ' questions', t.duration_min + ' min', '+' + num(t.marks_correct, 2) + ' / −' + num(t.marks_wrong, 2), 'by ' + t.teacher].join(' · ') }),
    t.attempt_status === 'submitted' ? h('p', { class: 'pt-meta' }, 'Your score: ', h('b', { text: num(t.score, 2) + ' / ' + num(t.max_score, 2) })) : null,
    h('div', { class: 'pt-actions' }, t.attempt_status === 'submitted' ? link('#/report/' + t.attempt_id, 'View report', 'btn pri') : link('#/t/' + t.code, t.attempt_status ? 'Resume test' : 'Start test', 'btn pri'))))),
  card(h('h2', { text: 'Have a test link?' }), go));
}
async function pageReports() {
  show(head('My Reports', ''), loading());
  const list = await rpc('my_attempts');
  const top = head('My Reports', 'Every test you have taken', link('#/tests', 'Available tests', 'btn'));
  if (!list.length) { show(top, card(empty('No tests taken yet', 'Your reports appear here after you submit a test.', link('#/tests', 'See available tests', 'btn pri')))); return; }
  show(top, card(h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', 'Correct / Wrong / Skipped', 'Time', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, list.map(a => h('tr', {}, h('td', {}, h('b', { text: a.title })), h('td', { text: when(a.submitted_at || a.started_at) }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? num(a.score, 2) + ' / ' + num(a.max_score, 2) : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? a.correct + ' / ' + a.wrong + ' / ' + a.skipped : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? mmss(a.time_taken_sec) : '—' }),
      h('td', {}, a.status === 'submitted' ? link('#/report/' + a.id, 'Open report', 'btn pri') : link('#/t/' + a.code, 'Resume', 'btn')))))))));
}
async function pageReport(id) {
  show(head('Report', ''), loading('Loading the report…'));
  const R = await rpc('attempt_report', { p_attempt: id });
  const a = R.attempt, t = R.test, rk = R.rank || {};
  const att = a.correct + a.wrong, acc = att ? 100 * a.correct / att : null;
  const mine = AU().profile.id && P().role === 'student';
  const top = head(t.title, (mine ? '' : (a.student_name || 'Student') + (a.school ? ' · ' + a.school : '') + ' · ') + 'Submitted ' + when(a.submitted_at),
    mine ? link('#/reports', 'My Reports', 'btn') : h('button', { type: 'button', class: 'btn', text: '‹ Back to results', onclick: () => history.back() }));
  const items = R.items || [];
  const st = { correct: ['Correct', 'ok'], wrong: ['Wrong', 'bad'], skipped: ['Not answered', 'mute'] };
  const review = h('div', { class: 'pt-plist' }, items.map(it => qCard({ type: it.type, q: it.q, o: it.o, f: it.f, tp: it.topic }, it.pos - 1, {
    status: it.status, response: it.response, answer: it.correct_answer,
    right: h('span', { class: 'pt-qmeta' }, badge(st[it.status][0], st[it.status][1]), h('span', { class: 'pt-hint', text: (it.marks > 0 ? '+' : '') + num(it.marks, 2) + ' marks · ' + mmss(it.time_sec) })),
    extra: h('p', { class: 'pt-yours' }, 'Your answer: ', h('b', { text: it.response || '—' }), ' · Correct answer: ', h('b', { text: it.correct_answer || '—' })) })));
  let only = 'all';
  const filt = h('div', { class: 'seg pt-seg' }, [['all', 'All'], ['wrong', 'Wrong'], ['skipped', 'Not answered'], ['correct', 'Correct']].map(([k, tx]) => h('button', { type: 'button', 'aria-pressed': String(k === only), text: tx, onclick: e => { only = k; filt.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.target))); review.querySelectorAll('.pt-q').forEach(q => { q.hidden = only !== 'all' && !q.classList.contains('st-' + only); }); } })));
  show(top,
    h('div', { class: 'pt-stats' }, stat('Score', num(a.score, 2) + ' / ' + num(a.max_score, 2), 'Average ' + num(R.stats && R.stats.average, 2) + ' · Top ' + num(R.stats && R.stats.top, 2)),
      stat('Accuracy', pct(acc), a.correct + ' correct of ' + att + ' attempted'), stat('Time taken', mmss(a.time_taken_sec), 'of ' + t.duration_min + ' min'),
      stat('Rank (all students)', rk.overall ? rk.overall + ' of ' + rk.overall_of : '—'), stat('Rank in school', rk.school ? rk.school + ' of ' + rk.school_of : '—', a.school || ''),
      stat('Answers', a.correct + ' / ' + a.wrong + ' / ' + a.skipped, 'correct / wrong / not answered')),
    card(h('h2', { text: 'Topic-wise performance' }), h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Topic', 'Questions', 'Correct', 'Wrong', 'Not answered', 'Marks', 'Accuracy', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, (R.topics || []).map(x => h('tr', {}, h('td', {}, h('b', { text: x.topic }), x.chapter ? h('div', { class: 'pt-hint', text: x.chapter }) : null), h('td', { class: 'pt-num', text: x.total }), h('td', { class: 'pt-num', text: x.correct }), h('td', { class: 'pt-num', text: x.wrong }), h('td', { class: 'pt-num', text: x.skipped }), h('td', { class: 'pt-num', text: num(x.marks, 2) }), h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-barcell' }, bar(x.accuracy, x.accuracy == null ? '' : x.accuracy < 40 ? 'bad' : x.accuracy < 70 ? 'mid' : 'ok')))))))),
    card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Question-wise review' }), filt), review));
  mathIn(review);
}

/* ---------- Taking a test ---------- */
async function pageTake(code) {
  if (EX) return;
  show(loading('Opening the test…'));
  const info = await rpc('test_info', { p_code: code });
  if (!info) { show(card(empty('Test not found', 'This test link is not valid. Ask your teacher for the link again.', link('#/tests', 'Available tests', 'btn')))); return; }
  if (info.is_owner) { show(card(empty('This is your own test', 'Students open this link to take it. You can preview it and see results from My Tests.', link('#/my-tests', 'My Tests', 'btn pri')))); return; }
  if (info.attempt_status === 'submitted') { location.replace('#/report/' + info.attempt_id); return; }
  if (!info.is_active && !info.attempt_id) { show(card(empty(info.title, 'This test is not open right now. Ask your teacher.', link('#/tests', 'Available tests', 'btn')))); return; }
  const startBtn = h('button', { type: 'button', class: 'btn pri pt-big', text: info.attempt_status === 'in_progress' ? 'Resume test' : 'Start test', onclick: async () => {
    startBtn.disabled = true; startBtn.textContent = 'Starting…';
    try { const d = await rpc('start_attempt', { p_code: code }); if (d.status === 'submitted') { location.replace('#/report/' + d.attempt_id); return; } try { await document.documentElement.requestFullscreen(); } catch (e) { /* not supported */ } runExam(d); }
    catch (e) { startBtn.disabled = false; startBtn.textContent = 'Start test'; toast(e.message); }
  } });
  show(h('div', { class: 'pt-start' }, card(h('p', { class: 'pt-sub', text: 'Test by ' + info.teacher }), h('h1', { text: info.title }),
    h('div', { class: 'pt-stats' }, stat('Questions', info.n_questions), stat('Time', info.duration_min + ' min'), stat('Correct', '+' + num(info.marks_correct, 2)), stat('Wrong (MCQ)', '−' + num(info.marks_wrong, 2))),
    h('h2', { text: 'Instructions' }),
    h('ul', { class: 'pt-feats' }, ['The timer starts when you press Start and keeps running even if you close the page.', 'Your answers are saved automatically. If your internet drops, keep going: they are saved again when it returns.', 'Use "Mark for review" to come back to a question. Marked questions with an answer are still marked.', 'Do not switch tabs or apps. Every switch is recorded and your teacher can see it.', 'The test submits by itself when the time is up.'].map(x => h('li', { text: x }))),
    h('p', { class: 'pt-hint', text: 'Signed in as ' + (P().full_name || P().email || P().avanti_id) + (P().school ? ' · ' + P().school : '') }),
    startBtn)));
}

let EX = null;
function exitExam() {
  if (!EX) return;
  clearInterval(EX.tick); clearInterval(EX.auto);
  document.removeEventListener('visibilitychange', EX.onVis); window.removeEventListener('beforeunload', EX.onUnload);
  EX.root.remove(); document.body.classList.remove('ex-on'); EX = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function runExam(d) {
  exitExam();
  const qs = d.questions, ans = {};
  qs.forEach(q => { const a = (d.answers || {})[q.id] || {}; ans[q.id] = { r: a.r == null ? (q.type === 'MSQ' ? [] : '') : a.r, t: +a.t || 0, m: !!a.m, v: !!a.v }; });
  const offset = Date.parse(d.server_now) - Date.now();
  const deadline = Date.parse(d.started_at) + d.duration_min * 60000;
  const X = EX = { d, qs, ans, cur: 0, tabs: d.tab_switches || 0, dirty: false, saving: false, enter: Date.now(), done: false };
  const root = X.root = h('div', { class: 'ex', role: 'application', 'aria-label': 'Test: ' + d.title });
  document.body.classList.add('ex-on'); document.body.append(root);
  const timer = h('span', { class: 'ex-timer', role: 'timer', 'aria-live': 'off' });
  const saved = h('span', { class: 'ex-saved', role: 'status' });
  const main = h('main', { class: 'ex-main' }), pal = h('div', { class: 'ex-grid' });
  const side = h('aside', { class: 'ex-side', 'aria-label': 'Question palette' },
    h('div', { class: 'ex-who' }, h('b', { text: P().full_name || P().avanti_id || 'Student' }), h('span', { text: qs.length + ' questions' })), pal,
    h('ul', { class: 'ex-legend' }, [['ans', 'Answered'], ['na', 'Not answered'], ['nv', 'Not visited'], ['mk', 'Marked for review'], ['am', 'Answered and marked']].map(([k, t]) => h('li', {}, h('i', { class: 'ex-p ' + k }), t))),
    h('button', { type: 'button', class: 'btn pri ex-submit2', text: 'Submit test', onclick: () => askSubmit() }));
  root.append(h('header', { class: 'ex-top' }, h('strong', { class: 'ex-title', text: d.title }), saved, timer,
    h('button', { type: 'button', class: 'btn ex-palbtn', text: 'Questions', 'aria-expanded': 'false', onclick: e => { const o = root.classList.toggle('pal-open'); e.target.setAttribute('aria-expanded', String(o)); } }),
    h('button', { type: 'button', class: 'btn pri', text: 'Submit', onclick: () => askSubmit() })), h('div', { class: 'ex-body' }, main, side));

  const filled = a => (Array.isArray(a.r) ? a.r.length > 0 : String(a.r).trim() !== '');
  const stateOf = a => (a.m ? (filled(a) ? 'am' : 'mk') : filled(a) ? 'ans' : a.v ? 'na' : 'nv');
  function track() { const now = Date.now(), q = qs[X.cur]; if (q) ans[q.id].t += Math.round((now - X.enter) / 1000); X.enter = now; }
  function payload() { const o = {}; qs.forEach(q => { const a = ans[q.id]; o[q.id] = { r: a.r, t: a.t, m: a.m, v: a.v }; }); return o; }
  async function save(force) {
    if (X.done || X.saving || (!X.dirty && !force)) return;
    X.saving = true; track(); X.dirty = false; saved.textContent = 'Saving…'; saved.className = 'ex-saved';
    try { const r = await rpc('save_attempt', { p_attempt: d.attempt_id, p_answers: payload(), p_tab_switches: X.tabs }); if (r.status === 'time_up') { finish(true); return; } saved.textContent = 'Saved ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { X.dirty = true; saved.textContent = 'Not saved: offline? Retrying…'; saved.className = 'ex-saved bad'; }
    X.saving = false;
  }
  function drawPal() {
    pal.textContent = '';
    qs.forEach((q, i) => pal.append(h('button', { type: 'button', class: 'ex-p ' + stateOf(ans[q.id]) + (i === X.cur ? ' cur' : ''), text: i + 1, 'aria-label': 'Question ' + (i + 1) + ': ' + { ans: 'answered', na: 'not answered', nv: 'not visited', mk: 'marked for review', am: 'answered and marked' }[stateOf(ans[q.id])], onclick: () => go(i) })));
  }
  function go(i) { track(); X.cur = Math.max(0, Math.min(qs.length - 1, i)); root.classList.remove('pal-open'); draw(); save(); }
  function draw() {
    const q = qs[X.cur], a = ans[q.id]; a.v = true;
    main.textContent = '';
    let input;
    if (q.type === 'Numerical') {
      input = h('div', { class: 'ex-num' }, h('label', { for: 'exNum', text: 'Your answer (a number)' }),
        h('input', { id: 'exNum', type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'pt-in', value: a.r || '', maxlength: 20, oninput: e => { const v = e.target.value.replace(/[^0-9.\-]/g, ''); if (v !== e.target.value) e.target.value = v; a.r = v; X.dirty = true; drawPal(); } }));
    } else {
      const multi = q.type === 'MSQ';
      input = h('div', { class: 'ex-opts', role: multi ? 'group' : 'radiogroup', 'aria-label': 'Options' }, (q.o || []).map((t, k) => {
        const L = LETTERS[k], on = multi ? a.r.includes(L) : a.r === L;
        return h('label', { class: 'ex-opt' + (on ? ' on' : '') },
          h('input', { type: multi ? 'checkbox' : 'radio', name: 'exo', value: L, checked: on, onchange: e => {
            if (multi) { const s = new Set(a.r); e.target.checked ? s.add(L) : s.delete(L); a.r = [...s].sort(); } else a.r = L;
            X.dirty = true; main.querySelectorAll('.ex-opt').forEach(l => l.classList.toggle('on', l.querySelector('input').checked)); drawPal();
          } }), h('b', { text: L }), h('span', { html: qText(t) }));
      }));
    }
    main.append(h('div', { class: 'ex-qh' }, h('strong', { text: 'Question ' + (X.cur + 1) + ' of ' + qs.length }), badge(q.type === 'MSQ' ? 'MSQ: one or more correct' : q.type === 'Numerical' ? 'Numerical answer' : 'MCQ: one correct'),
      h('span', { class: 'pt-hint', text: '+' + num(d.marks_correct, 2) + (q.type === 'MCQ' && +d.marks_wrong ? ' / −' + num(d.marks_wrong, 2) : '') })),
      h('div', { class: 'ex-q', html: qText(q.q) }), figure(q.f) || '', input,
      h('div', { class: 'ex-nav' },
        h('button', { type: 'button', class: 'btn', text: '‹ Previous', disabled: X.cur === 0, onclick: () => go(X.cur - 1) }),
        h('button', { type: 'button', class: 'btn', text: 'Clear response', onclick: () => { a.r = q.type === 'MSQ' ? [] : ''; X.dirty = true; draw(); } }),
        h('button', { type: 'button', class: 'btn ex-mk', text: a.m ? 'Unmark review' : 'Mark for review & next', onclick: () => { a.m = !a.m; X.dirty = true; if (a.m && X.cur < qs.length - 1) go(X.cur + 1); else { draw(); save(); } } }),
        h('button', { type: 'button', class: 'btn pri', text: X.cur < qs.length - 1 ? 'Save & next ›' : 'Save', onclick: () => { X.dirty = true; if (X.cur < qs.length - 1) go(X.cur + 1); else { save(true); toast('Saved. Press Submit when you are done.'); } } })));
    drawPal(); mathIn(main);
  }
  function tickTimer() {
    const left = deadline - (Date.now() + offset);
    if (left <= 0) { timer.textContent = '0:00'; finish(true); return; }
    const s = Math.ceil(left / 1000), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    timer.textContent = (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0');
    timer.classList.toggle('low', s <= 300);
    if (s === 300) toast('5 minutes left');
  }
  function askSubmit() {
    track();
    const c = { ans: 0, na: 0, nv: 0, mk: 0, am: 0 }; qs.forEach(q => c[stateOf(ans[q.id])]++);
    modal('Submit the test?', h('div', {}, h('ul', { class: 'pt-feats' }, h('li', { text: 'Answered: ' + (c.ans + c.am) }), h('li', { text: 'Not answered: ' + (c.na + c.nv) }), h('li', { text: 'Marked for review: ' + (c.mk + c.am) })),
      h('p', { class: 'pt-hint', text: 'You cannot change your answers after submitting.' })), [{ text: 'Back to test', onclick: () => {} }, { text: 'Submit', pri: true, onclick: () => { finish(false); } }]);
  }
  async function finish(timeUp) {
    if (X.done) return; X.done = true; track();
    clearInterval(X.tick); clearInterval(X.auto);
    main.textContent = ''; main.append(loading(timeUp ? 'Time is up. Submitting your answers…' : 'Submitting your answers…'));
    for (let i = 0; i < 5; i++) {
      try { const r = await rpc('submit_attempt', { p_attempt: d.attempt_id, p_answers: payload(), p_tab_switches: X.tabs }); exitExam(); location.replace('#/report/' + r.attempt_id); toast('Submitted. Here is your report.'); return; }
      catch (e) { main.textContent = ''; main.append(errorBox('Could not submit yet (' + e.message + '). Trying again…')); await new Promise(r => setTimeout(r, 3000)); }
    }
    main.textContent = ''; main.append(errorBox('Your answers were saved, but the test could not be submitted. Check your internet and press Try again.', () => { X.done = false; finish(timeUp); }));
  }
  X.onVis = () => {
    if (X.done) return;
    if (document.visibilityState === 'hidden') { X.tabs++; X.dirty = true; save(true); }
    else modal('Stay on the test', h('p', { text: 'You left the test window. This has happened ' + X.tabs + ' time' + (X.tabs === 1 ? '' : 's') + ' and your teacher can see it. The timer did not stop.' }), [{ text: 'Back to the test', pri: true, onclick: () => {} }]);
  };
  X.onUnload = e => { if (!X.done) { e.preventDefault(); e.returnValue = ''; } };
  document.addEventListener('visibilitychange', X.onVis);
  window.addEventListener('beforeunload', X.onUnload);
  X.tick = setInterval(tickTimer, 1000); X.auto = setInterval(() => save(), 15000);
  tickTimer(); draw();
}

window.AvantiPortal = { route, leave: () => leave(false), saveWorksheet, createTestFrom };
if (AU() && AU().profile && TE()) route();
})();
