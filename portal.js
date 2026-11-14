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
const CLASSES = ['11', '12', 'Dropper'];
const STREAMS = ['JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)'];
const sessionFor = c => { const d = new Date(); d.setMonth(d.getMonth() - 3); const y = d.getFullYear(); return c === '11' ? y + '-' + String((y + 2) % 100).padStart(2, '0') : c ? y + '-' + String((y + 1) % 100).padStart(2, '0') : ''; };
const SESSIONS = (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); const y = d.getFullYear(), out = []; for (let k = y - 2; k <= y + 1; k++) { out.push(k + '-' + String((k + 1) % 100).padStart(2, '0'), k + '-' + String((k + 2) % 100).padStart(2, '0')); } return [...new Set(out)].sort().reverse(); })();
/* common spellings in uploads: 11th, XI, Class 12, PCM, NEET ... */
const normClass = v => { const t = String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return /^(11|11th|xi|class11|class11th|classxi|eleven|eleventh)$/.test(t) ? '11' : /^(12|12th|xii|class12|class12th|classxii|twelve|twelfth)$/.test(t) ? '12' : /^(dropper|drop|droppers|repeater|repeaters)$/.test(t.replace(/[0-9]/g, '')) ? 'Dropper' : String(v || '').trim(); };
const normStream = v => { const t = String(v || '').toLowerCase().replace(/[^a-z]/g, ''); return /^(jee|pcm|pcmb|jeemain|jeemains|jeeadvanced|engineering|iit|iitjee)$/.test(t) ? 'JEE' : /^(neet|pcb|medical|neetug)$/.test(t) ? 'NEET' : /^(kcetpcm|kcet|cetpcm|kcetengineering)$/.test(t) ? 'KCET (PCM)' : /^(kcetpcb|cetpcb|kcetmedical)$/.test(t) ? 'KCET (PCB)' : String(v || '').trim(); };
const CATEGORIES = ['General', 'EWS', 'OBC-NCL', 'SC', 'ST'];
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];
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
function nope(title, text) { show(card(empty(title, text, link('#/membership', 'Upgrade to Premium', 'btn pt-gold')))); }
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
    create: pageCreate, edit: pageCreate, students: pageStudents, 'add-student': pageAddStudent, help: pageHelp, approvals: pageApprovals, 'my-tests': pageMyTests, results: pageResults, worksheets: pageWorksheets };
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
let SCHOOLS_P = null;
function schools(fresh) { if (!SCHOOLS_P || fresh) SCHOOLS_P = rpc('list_schools').catch(e => { SCHOOLS_P = null; throw e; }); return SCHOOLS_P; }
const OTHER = '__other__';
/* School dropdown from the database. With allowOther, a teacher can pick "Other" and type a school that is not on the list. */
function schoolSelect(id, val, first, allowOther) {
  const s = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: first }));
  const other = allowOther ? h('input', { type: 'text', class: 'pt-in', id: id + 'Other', maxlength: 160, placeholder: 'Type your school name', hidden: true, 'aria-label': 'Your school name' }) : null;
  const sync = () => { if (other) { other.hidden = s.value !== OTHER; if (!other.hidden) other.focus(); } };
  s.addEventListener('change', sync);
  schools().then(list => {
    const all = list.slice(); if (val && !all.includes(val)) all.unshift(val);
    all.forEach(x => s.append(h('option', { value: x, text: x })));
    if (allowOther) s.append(h('option', { value: OTHER, text: 'Other (my school is not in the list)…' }));
    s.value = val || '';
    if (!all.length && !allowOther) s.firstChild.textContent = 'No schools in the database yet';
  }).catch(() => { s.firstChild.textContent = 'Could not load schools'; });
  const wrap = h('div', { class: 'pt-school' }, s, other);
  wrap.value = () => (s.value === OTHER ? (other.value || '').trim().replace(/\s+/g, ' ') : s.value);
  wrap.sel = s;
  return wrap;
}
/* The profile form: every field is required. Teachers give name and school; students give name, school, class, stream, category and gender.
   For Avanti ID students, details that come from the Avanti list are shown but cannot be changed; only missing ones can be filled. */
function profileForm(p, o) {
  const student = p.role === 'student', avanti = !!p.avanti_id, locked = k => (student || avanti) && !!p[k];
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const ro = (label, value) => h('div', { class: 'pt-fld' }, h('span', { text: label }), h('div', { class: 'pt-ro', text: value || '—' }));
  const fld = (label, input, hint) => h('label', { class: 'pt-fld', for: input.id || (input.sel && input.sel.id) }, h('span', {}, label, h('b', { class: 'pt-req', text: ' *' })), input, hint ? h('small', { text: hint }) : null);
  const sel = (id, list, val) => { const x = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: 'Choose…' }), list.map(v => h('option', { value: v, text: v }))); x.value = val || ''; return x; };
  const F = {
    full_name: h('input', { id: 'pfName', class: 'pt-in', type: 'text', maxlength: 120, value: p.full_name || '', autocomplete: 'name' }),
    school: schoolSelect('pfSchool', p.school, student ? 'Choose your school…' : 'Choose your school…', !student),
    class: sel('pfClass', CLASSES, p.class), stream: sel('pfStream', STREAMS, p.stream),
    category: sel('pfCat', CATEGORIES, p.category), gender: sel('pfGender', GENDERS, p.gender)
  };
  const val = k => (locked(k) ? p[k] : k === 'school' ? F.school.value() : F[k].value.trim());
  const LBL = { full_name: 'Full name', school: 'School', class: 'Class', stream: 'Stream', category: 'Category', gender: 'Gender' };
  const keys = student ? ['full_name', 'school', 'class', 'stream', 'category', 'gender'] : ['full_name', 'school'];
  const box = k => (locked(k) ? ro(LBL[k], p[k]) : fld(LBL[k], F[k], k === 'school' ? (student ? 'Used for your rank within your school.' : 'Not in the list? Choose "Other" and type it.') : null));
  const btn = h('button', { type: 'submit', class: 'btn pri' + (o.big ? ' pt-big' : ''), text: o.submitText || 'Save profile' });
  return h('form', { class: 'pt-form', onsubmit: async e => {
    e.preventDefault(); msg.textContent = ''; msg.className = 'pt-msg';
    const miss = keys.filter(k => !val(k));
    if (miss.length) { msg.textContent = 'Please fill in: ' + miss.map(k => LBL[k]).join(', ') + '. All details are required.'; msg.classList.add('bad'); return; }
    btn.disabled = true; const t0 = btn.textContent; btn.textContent = 'Saving…';
    try {
      await rpc('update_my_profile', { p_full_name: val('full_name'), p_school: val('school'), p_class: student ? val('class') : (p.class || null), p_stream: student ? val('stream') : (p.stream || null), p_category: student ? val('category') : null, p_gender: student ? val('gender') : null });
      schools(true); await AU().refresh(); msg.textContent = 'Saved.'; msg.classList.add('ok');
      if (o.onSaved) o.onSaved();
    } catch (x) { msg.textContent = 'Could not save: ' + x.message; msg.classList.add('bad'); }
    btn.disabled = false; btn.textContent = t0;
  } },
    box('full_name'), box('school'),
    student ? h('div', { class: 'pt-row2' }, box('class'), box('stream')) : null,
    student ? h('div', { class: 'pt-row2' }, box('category'), box('gender')) : null,
    student && keys.some(k => locked(k)) ? h('p', { class: 'pt-hint', text: 'Saved details cannot be changed here. Ask your teacher if something is wrong.' }) : null,
    student && keys.some(k => !locked(k)) ? h('div', { class: 'pt-note pt-warnnote', role: 'note' }, h('b', { text: 'Please check carefully before you continue. ' }), 'Once saved, you cannot change these details yourself. Only your teacher can correct them.') : null,
    keys.some(k => !locked(k)) || !student ? h('div', { class: 'pt-actions' }, btn) : null, msg);
}
function profileMissing(p) {
  const keys = p.role === 'student' ? ['full_name', 'school', 'class', 'stream', 'category', 'gender'] : ['full_name', 'school'];
  return keys.filter(k => !p[k]);
}
/* Full-page step right after sign-in, shown until every required detail is filled. */
function onboard(root, done) {
  const p = P();
  root.textContent = '';
  root.append(h('div', { class: 'lg' },
    h('header', { class: 'lg-head' }, h('img', { src: 'img/avanti-logo.png', alt: 'Avanti Fellows', width: 150, height: 51 }), h('h1', { text: 'Welcome' + (p.full_name ? ', ' + p.full_name.split(' ')[0] : '') }),
      h('p', { text: p.role === 'student' ? 'Tell us about yourself to continue. All details are required.' : 'Tell us your school to continue.' })),
    h('main', { class: 'lg-main lg-wide' }, h('section', { class: 'lg-card pt-onb' }, h('h2', { text: 'Complete your profile' }),
      p.school_note && !p.school ? h('p', { class: 'pt-note pt-warnnote', text: p.school_note }) : null,
      profileForm(p, { big: true, submitText: 'Continue', onSaved: () => { if (!profileMissing(P()).length) done(); } }),
      h('button', { type: 'button', class: 'lg-btn lg-ghost', text: 'Sign out', onclick: () => AU().signOut() })))));
}
async function pageProfile() {
  const p = P(), avanti = !!p.avanti_id, plan = AU().perm.plan;
  const ro = (label, value) => h('div', { class: 'pt-fld' }, h('span', { text: label }), h('div', { class: 'pt-ro', text: value || '—' }));
  const account = card(h('h2', { text: 'Account' }),
    ro('Signed in as', avanti ? p.avanti_id : p.email),
    ro('Role', p.role === 'teacher' ? 'Teacher' : 'Student'),
    p.role === 'teacher' && !p.is_staff ? ro('School approval', p.school_approved ? 'Approved by Avanti Fellows' : 'Waiting for approval by Avanti Fellows') : null,
    ro('Plan', { free: 'Free', premium: 'Premium', staff: 'Staff (full access)' }[plan] + (plan === 'premium' && p.premium_until ? ' · until ' + day(p.premium_until) : '')),
    h('p', { class: 'pt-hint', text: 'Role and plan are set by the server. Contact Avanti Fellows if your role is wrong.' }),
    h('div', { class: 'pt-actions' }, plan === 'free' ? link('#/membership', '★ Purchase membership', 'btn pt-gold') : null, h('button', { type: 'button', class: 'btn', text: 'Logout', onclick: () => AU().signOut() })));
  show(head(avanti ? 'Your profile' : 'Edit profile', avanti ? 'These details come from Avanti records.' : 'Your name and school appear on test results. All details are required.'),
    h('div', { class: 'pt-grid2' }, card(h('h2', { text: 'Your details' }), profileForm(p, { onSaved: () => {} })), account));
}

/* ---------- Membership (Razorpay) ---------- */
async function pageMembership() {
  const p = P(), plan = AU().perm.plan;
  show(loading());
  const { data: pays } = await sb().from('payments').select('order_id,payment_id,amount_paise,status,created_at,paid_at').order('created_at', { ascending: false }).limit(20);
  const teacher = p.role === 'teacher', price = Math.round((p.price_paise || (teacher ? 59900 : 29900)) / 100);
  const feats = teacher
    ? ['Everything in Free: view all material, create tests with a link for your school, add students one by one', 'Download every DPP, PYQ paper, Must Solve list and handout as PDF; print and share', 'Saved worksheets', 'My Students: the list of your school\'s students by class and batch, with their performance', 'Bulk upload students from Excel or CSV, and edit their details', 'Export results as CSV']
    : ['Everything in Free: view all material, take your school\'s tests, your report with your school rank', 'Download every DPP, PYQ paper, Must Solve list and handout as PDF; print and share', 'Reports with your rank among all students who took the test, not just your school'];
  const msg = h('p', { class: 'pt-msg', role: 'status' });
  const payBtn = h('button', { type: 'button', class: 'btn pt-gold pt-big', text: plan === 'premium' ? 'Renew for 1 more year · ₹' + price : 'Get Premium · ₹' + price + ' a year', onclick: () => pay(payBtn, msg) });
  const status = plan === 'staff' ? card(h('h2', { text: 'Avanti Fellows account' }), h('p', { text: 'Your @avantifellows.org account has full access to everything. No payment is needed.' }))
    : p.is_avanti ? card(h('h2', { text: 'Avanti student · Premium' }), h('p', { text: 'Premium is included for students on the Avanti list. No payment is needed.' }), h('ul', { class: 'pt-feats' }, feats.map(f => h('li', { text: f }))))
    : plan === 'premium' ? card(h('h2', { text: 'Premium' }), h('p', { text: 'Your Premium membership is active until ' + day(p.premium_until) + '. After that the account returns to Free unless you renew.' }), h('ul', { class: 'pt-feats' }, feats.map(f => h('li', { text: f }))), payBtn, msg)
      : card(h('h2', { text: 'Premium for ' + (teacher ? 'teachers' : 'students') }), h('p', { class: 'pt-price' }, h('strong', { text: '₹' + price }), ' for 1 year'), h('ul', { class: 'pt-feats' }, feats.map(f => h('li', { text: f }))), payBtn, msg,
        h('p', { class: 'pt-hint', text: 'Payment is handled by Razorpay (UPI, cards, net banking). Premium starts as soon as the payment is confirmed.' }));
  const hist = (pays || []).length ? card(h('h2', { text: 'Payment history' }), h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Date', 'Amount', 'Status', 'Payment ID'].map(t => h('th', { text: t })))),
    h('tbody', {}, pays.map(x => h('tr', {}, h('td', { text: when(x.created_at) }), h('td', { text: '₹' + num(x.amount_paise / 100, 2) }), h('td', {}, badge({ paid: 'Paid', failed: 'Failed', created: 'Not completed' }[x.status], { paid: 'ok', failed: 'bad' }[x.status])), h('td', { class: 'pt-mono', text: x.payment_id || '—' }))))))) : null;
  show(head('Membership', 'Your plan: ' + (plan === 'staff' ? 'Avanti · Full access' : p.is_avanti ? 'Avanti · Premium' : plan === 'premium' ? 'Premium' : 'Free')), h('div', { class: 'pt-grid2' }, status, hist));
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
  if (!can('worksheets')) return nope('Saved worksheets are for Premium teachers', 'Upgrade to keep question lists as worksheets and reuse them in tests.');
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
  if (!can('worksheets')) { toast('Saved worksheets are for Premium teachers.'); return; }
  const t = await promptBox('Save as worksheet', 'Worksheet title', name || 'Worksheet');
  if (!t) return;
  const { error } = await sb().from('worksheets').insert({ title: t, question_ids: ids.slice(0, 300) });
  if (error) toast('Could not save the worksheet: ' + error.message); else toast('Saved "' + t + '" (' + Math.min(ids.length, 300) + ' questions' + (ids.length > 300 ? ', the first 300 of ' + ids.length : '') + ') in Saved worksheets.');
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
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const EXN = { Main: 'JEE Main', Adv: 'JEE Advanced', KCET: 'KCET', IAT: 'IAT', NDA: 'NDA' };
const paperKey = x => x.e + '|' + (x.y || '') + '|' + x.p;
function paperInfo(x) {
  const p = String(x.p || ''), m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})/.exec(p), y = (/\b(19|20)\d{2}\b/.exec(p) || [])[0] || x.y;
  const t = m && MON[m[2].toLowerCase()] != null ? Date.UTC(+m[3], MON[m[2].toLowerCase()], +m[1]) : y ? Date.UTC(+y, 4, 15) : 0;
  const sh = +((/shift\s*(\d)/i.exec(p) || /paper\s*(\d)/i.exec(p) || [])[1] || 0);
  const label = (/\b(19|20)\d{2}\b/.test(p) ? p : (EXN[x.e] || x.e) + ' ' + (x.y || '') + ' · ' + p).trim();
  return { key: paperKey(x), e: x.e, label, t, sh };
}
const gradable = q => { if (!q || !q.a) return false; if (q.t === 'Numerical') return /^-?\d+(\.\d+)?$/.test(q.a.trim()) || /^-?\d+(\.\d+)?\s*to\s*-?\d+(\.\d+)?$/i.test(q.a.trim()); return (q.t === 'MCQ' || q.t === 'MSQ') && (q.o || []).length > 0 && /^[A-D](,[A-D])*$/.test(q.a); };
let CHN = new Map();
function snap(q) { const ch = CHN.get(q.cc); return { id: q.i, type: q.t, q: q.q, o: q.o || [], a: q.a, ch: q.cc, chn: ch ? ch.n : q.cc, tp: q.tp || '', f: q.f && q.f.svg ? { svg: q.f.svg } : null, d: q.d, src: q.s === 'P' ? (q.e === 'Main' ? 'JEE Main' : q.e === 'Adv' ? 'JEE Advanced' : q.e) + (q.y ? ' ' + q.y : '') : 'Practice' }; }
async function pageCreate(arg, r) {
  if (!can('createTests')) return nope('Creating tests is for teachers', 'Sign in as a teacher to create tests.');
  show(head(r === 'edit' ? 'Edit test' : 'Create Test', 'Loading the question bank…'), loading('Loading the question bank…'));
  const B = await TE().bank(); CHN = B.chapters;
  const all = B.qs.filter(gradable);
  const S = { title: '', mins: 60, pos: 4, neg: 1, cls: new Set(), streams: new Set(), school: '', active: true, sel: [], id: null, locked: false };
  if (r === 'edit') {
    const { data: t, error } = await sb().from('tests').select('*').eq('id', arg).maybeSingle();
    if (error || !t) { show(errorBox(error ? error.message : 'Test not found.', null)); return; }
    Object.assign(S, { id: t.id, code: t.code, title: t.title, mins: t.duration_min, pos: +t.marks_correct, neg: +t.marks_wrong, cls: new Set(t.target_classes || []), streams: new Set(t.target_streams || []), school: t.school || '', active: t.is_active, sel: t.questions });
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
  const chipSet = (id, list, set) => { const box = h('div', { class: 'chips', id, role: 'group' }); const draw = () => { box.textContent = ''; list.forEach(v => box.append(h('button', { type: 'button', class: 'chip', 'aria-pressed': String(set.has(v)), text: id === 'ctCls' && v !== 'Dropper' ? 'Class ' + v : v, onclick: () => { set.has(v) ? set.delete(v) : set.add(v); draw(); } }))); }; draw(); return box; };
  const fCls = chipSet('ctCls', CLASSES, S.cls), fStr = chipSet('ctStr', STREAMS, S.streams);
  const fSchool = can('isAdmin') ? schoolSelect('ctSchool', S.school, 'All schools') : (() => { const d = h('div', { class: 'pt-ro', id: 'ctSchool', text: P().school || '—' }); d.value = () => P().school; return d; })();
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
      && (!F.exam || x.e === F.exam) && (!F.paper || paperKey(x) === F.paper) && (!F.ch || x.cc === F.ch) && (!F.tp || x.tp === F.tp)
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
      const pm = new Map(); all.forEach(x => { if (x.s === 'P' && x.p && (!F.exam || x.e === F.exam)) { const k = paperKey(x); if (!pm.has(k)) pm.set(k, paperInfo(x)); } });
      const papers = [...pm.values()].sort((a, b) => b.t - a.t || a.sh - b.sh || a.label.localeCompare(b.label));
      const pSel = h('select', { class: 'pt-in', 'aria-label': 'Paper', onchange: e => { F.paper = e.target.value; F.page = 0; drawFilters(); drawResults(); } }, h('option', { value: '', text: 'Any paper (newest first)' }), papers.map(p => h('option', { value: p.key, text: (F.exam ? '' : (EXN[p.e] || p.e) + ' · ') + p.label.replace(/^JEE (Main|Advanced) (?=\d{4} ·)/, '') })));
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
      target_classes: [...S.cls], target_streams: [...S.streams], school: fSchool.value() || null, is_active: fAct.checked, questions: S.sel.map(q => ({ id: q.id, type: q.type, q: q.q, o: q.o, a: q.a, ch: q.ch, chn: q.chn, tp: q.tp, f: q.f || null })) };
    const bad = !row.title ? 'Give the test a title.' : !S.cls.size ? 'Choose the class (or classes) that should take this test.' : !S.streams.size ? 'Choose the stream (or streams) that should take this test.' : !(row.duration_min >= 1 && row.duration_min <= 600) ? 'Duration must be 1 to 600 minutes.' : !(row.marks_correct > 0) ? 'Marks for a correct answer must be more than 0.' : row.marks_wrong < 0 ? 'Negative marks cannot be below 0.' : !S.sel.length ? 'Add at least one question.' : '';
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
          h('div', { class: 'pt-fld' }, h('span', {}, 'Class', h('b', { class: 'pt-req', text: ' *' })), fCls), h('div', { class: 'pt-fld' }, h('span', {}, 'Stream', h('b', { class: 'pt-req', text: ' *' })), fStr),
          fld('School', fSchool, can('isAdmin') ? 'Only students of this school can take it. Choose All schools for everyone.' : 'Only students of your school, in the classes and streams chosen above, can see and take this test.'),
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
  if (!can('createTests')) return nope('My Tests is for teachers', 'Sign in as a teacher to create tests.');
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
    t.mine === false ? h('p', { class: 'pt-meta' }, 'By ', h('b', { text: t.owner_name || 'Teacher' }), ' · ' + (t.school || 'All schools')) : null,
    h('p', { class: 'pt-meta', text: [t.n_questions + ' questions', t.duration_min + ' min', '+' + num(t.marks_correct, 2) + ' / −' + num(t.marks_wrong, 2), 'Class ' + (t.target_classes || []).join(', '), (t.target_streams || []).join(', '), t.school || 'All schools'].join(' · ') }),
    h('p', { class: 'pt-meta' }, h('b', { text: t.submitted }), ' submitted', t.in_progress ? ' · ' + t.in_progress + ' writing now' : '', ' · created ' + day(t.created_at)),
    h('div', { class: 'pt-link' }, h('code', { text: testLink(t.code) })),
    h('div', { class: 'pt-actions' },
      h('button', { type: 'button', class: 'btn pri', text: 'Copy link', onclick: () => copy(testLink(t.code), 'Link copied') }),
      link('#/results/' + t.id, 'Results', 'btn'),
      t.mine === false ? null : link('#/edit/' + t.id, 'Edit', 'btn'),
      h('button', { type: 'button', class: 'btn', text: 'Preview', onclick: () => preview(t) }),
      t.mine === false ? null : h('button', { type: 'button', class: 'btn', text: t.is_active ? 'Deactivate' : 'Activate', onclick: () => toggle(t) }),
      t.mine === false ? null : h('button', { type: 'button', class: 'btn pt-danger', text: 'Delete', onclick: () => del(t) }))))));
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
  const exportStudents = () => saveCsv(fname + '_results.csv', [['Rank', 'School rank', 'Name', 'Avanti ID', 'School', 'Class', 'Stream', 'Category', 'Gender', 'Score', 'Max score', 'Correct', 'Wrong', 'Skipped', 'Accuracy %', 'Time (min:sec)', 'Tab switches', 'Submitted at']]
    .concat(st.map(x => [x.rank, x.school_rank, x.name, x.avanti_id, x.school, x.class, x.stream, x.category, x.gender, x.score, x.max_score, x.correct, x.wrong, x.skipped, x.accuracy, mmss(x.time_taken_sec), x.tab_switches, when(x.submitted_at)])));
  const exportQs = () => saveCsv(fname + '_questions.csv', [['Q', 'Question ID', 'Chapter', 'Topic', 'Students', 'Correct', 'Wrong', 'Skipped', 'Correct %', 'Average seconds']]
    .concat((R.questions || []).map(q => [q.pos, q.qid, q.chapter, q.topic, q.total, q.correct, q.wrong, q.skipped, q.correct_pct, q.avg_time_sec])));
  const top = head(t.title, t.n_questions + ' questions · ' + t.duration_min + ' min · max ' + num(t.max_score, 2) + ' marks' + (t.is_active ? '' : ' · inactive'),
    h('button', { type: 'button', class: 'btn', text: 'Copy link', onclick: () => copy(testLink(t.code), 'Link copied') }),
    can('pdf') ? h('button', { type: 'button', class: 'btn pri', text: 'Export CSV', disabled: !st.length, onclick: exportStudents }) : link('#/membership', 'Export CSV (Premium)', 'btn'),
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
      h('td', {}, x.school || '—', h('div', { class: 'pt-hint', text: '#' + x.school_rank + ' in school' })), h('td', {}, [x.class, x.stream].filter(Boolean).join(' · ') || '—', h('div', { class: 'pt-hint', text: [x.category, x.gender].filter(Boolean).join(' · ') })),
      h('td', { class: 'pt-num' }, h('b', { text: num(x.score, 2) }), ' / ' + num(x.max_score, 2)), h('td', { class: 'pt-num', text: x.correct + ' / ' + x.wrong + ' / ' + x.skipped }),
      h('td', { class: 'pt-num', text: pct(x.accuracy) }), h('td', { class: 'pt-num', text: mmss(x.time_taken_sec) }), h('td', { class: 'pt-num' + (x.tab_switches > 2 ? ' pt-warnc' : ''), text: x.tab_switches }))));
  };
  const table = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Students (ranked)' }), h('input', { type: 'search', class: 'pt-in pt-search', placeholder: 'Search name, school or Avanti ID', 'aria-label': 'Search students', oninput: e => { filter = e.target.value.trim().toLowerCase(); drawRows(); } })),
    h('p', { class: 'pt-hint', text: 'Rank: higher score first, then less time. Click a student to open their report.' }),
    h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Rank', 'Student', 'School', 'Class / category', 'Score', 'C / W / S', 'Accuracy', 'Time', 'Tab switches'].map(x => h('th', { text: x })))), tbody)));
  drawRows();
  const qs = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Question-wise correctness' }), can('pdf') ? h('button', { type: 'button', class: 'btn', text: 'Export CSV', onclick: exportQs }) : null),
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
  const [list, past] = await Promise.all([rpc('list_available_tests'), rpc('my_attempts').catch(() => [])]);
  const pastCard = card(h('div', { class: 'pt-ct' }, h('h2', { text: 'Past tests' }), past.length ? h('span', { class: 'pt-meta', text: past.filter(a => a.status === 'submitted').length + ' submitted' }) : null),
    past.length ? pastTable(past) : empty('No tests taken yet', 'Your past tests and reports appear here after you submit a test.'));
  const codeIn = h('input', { type: 'text', class: 'pt-in', placeholder: 'Test code or link', 'aria-label': 'Test code or link' });
  const go = h('form', { class: 'pt-frow', onsubmit: e => { e.preventDefault(); const v = codeIn.value.trim(); const m = v.match(/#\/t\/([a-z0-9]+)/i) || v.match(/^([a-z0-9]{6,12})$/i); if (m) location.hash = '#/t/' + m[1].toLowerCase(); else toast('Paste the test link or its code'); } }, codeIn, h('button', { type: 'submit', class: 'btn', text: 'Open' }));
  const p = P();
  const top = head('Available tests', 'Tests for ' + ['Class ' + (p.class || '?'), p.stream, p.school].filter(Boolean).join(' · '));
  const open = list.filter(t => t.attempt_status !== 'submitted');
  if (!open.length) { show(top, card(empty('No new tests for you right now', 'When your teacher shares a test for your class and stream, it appears here. Got a link? Open it, or paste it below.'), go), pastCard); return; }
  show(top, h('div', { class: 'pt-cards' }, open.map(t => card(
    h('div', { class: 'pt-ct' }, h('h3', { text: t.title }), t.attempt_status === 'submitted' ? badge('Done', 'ok') : t.attempt_status === 'in_progress' ? badge('In progress', 'mid') : badge('New')),
    h('p', { class: 'pt-meta', text: [t.n_questions + ' questions', t.duration_min + ' min', '+' + num(t.marks_correct, 2) + ' / −' + num(t.marks_wrong, 2), 'by ' + t.teacher].join(' · ') }),
    t.attempt_status === 'submitted' ? h('p', { class: 'pt-meta' }, 'Your score: ', h('b', { text: num(t.score, 2) + ' / ' + num(t.max_score, 2) })) : null,
    h('div', { class: 'pt-actions' }, t.attempt_status === 'submitted' ? link('#/report/' + t.attempt_id, 'View report', 'btn pri') : link('#/t/' + t.code, t.attempt_status ? 'Resume test' : 'Start test', 'btn pri'))))),
  pastCard, card(h('h2', { text: 'Have a test link?' }), go));
}
function pastTable(list) {
  return h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', 'Correct / Wrong / Skipped', 'Time', ''].map(x => h('th', { text: x })))),
    h('tbody', {}, list.map(a => h('tr', {}, h('td', {}, h('b', { text: a.title })), h('td', { text: when(a.submitted_at || a.started_at) }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? num(a.score, 2) + ' / ' + num(a.max_score, 2) : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? a.correct + ' / ' + a.wrong + ' / ' + a.skipped : '—' }),
      h('td', { class: 'pt-num', text: a.status === 'submitted' ? mmss(a.time_taken_sec) : '—' }),
      h('td', {}, a.status === 'submitted' ? link('#/report/' + a.id, 'Open report', 'btn pri') : link('#/t/' + a.code, 'Resume', 'btn')))))));
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
    !R.full ? h('div', { class: 'pt-upsell' }, h('span', { text: 'You see how you did within your school. Premium students also see their rank among all students who took this test.' }), link('#/membership', 'Upgrade to Premium', 'btn pt-gold')) : null,
    h('div', { class: 'pt-stats' }, stat('Score', num(a.score, 2) + ' / ' + num(a.max_score, 2), R.full && R.stats ? 'Average ' + num(R.stats.average, 2) + ' · Top ' + num(R.stats.top, 2) : 'School average ' + num(R.school_stats && R.school_stats.average, 2) + ' · Top ' + num(R.school_stats && R.school_stats.top, 2)),
      stat('Accuracy', pct(acc), a.correct + ' correct of ' + att + ' attempted'), stat('Time taken', mmss(a.time_taken_sec), 'of ' + t.duration_min + ' min'),
      R.full ? stat('Rank (all students)', rk.overall ? rk.overall + ' of ' + rk.overall_of : '—') : null, stat('Rank in school', rk.school ? rk.school + ' of ' + rk.school_of : '—', a.school || ''),
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
  if (!info.for_me && !info.attempt_id) {
    const me = P(), otherSchool = info.school && String(info.school).toLowerCase() !== String(me.school || '').toLowerCase();
    const who = otherSchool ? 'students of ' + info.school : (info.target_classes || []).map(c => c === 'Dropper' ? 'Droppers' : 'Class ' + c).join(', ') + ' · ' + (info.target_streams || []).join(', ');
    show(card(empty(info.title, 'This test is only for ' + who + '. You are ' + [me.class === 'Dropper' ? 'a Dropper' : 'in Class ' + (me.class || '?'), me.stream].filter(Boolean).join(' · ') + '. Ask your teacher if you think this is wrong.', link('#/tests', 'Available tests', 'btn')))); return;
  }
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

/* ---------- Teachers: students of their school ---------- */
const COLS = ['student_id', 'dob', 'full_name', 'class', 'stream', 'category', 'gender', 'session'];
const COL_LBL = { student_id: 'Student ID', dob: 'Date of birth', full_name: 'Full name', class: 'Class', stream: 'Stream', category: 'Category', gender: 'Gender', session: 'Session' };
const pickFrom = (list, v) => { const t = String(v == null ? '' : v).trim(); return list.find(x => x.toLowerCase() === t.toLowerCase()) || t; };
function studentForm(o) {
  o = o || {}; const v = o.values || {}, edit = !!o.edit;
  const sel = (id, list, val) => { const x = h('select', { id, class: 'pt-in' }, h('option', { value: '', text: 'Choose…' }), list.map(z => h('option', { value: z, text: z }))); x.value = val || ''; return x; };
  const F = {
    student_id: h('input', { id: 'sfId', class: 'pt-in', type: 'text', maxlength: 40, value: v.student_id || '', placeholder: 'e.g. Avanti ID or roll number', disabled: edit, autocomplete: 'off' }),
    dob: h('input', { id: 'sfDob', class: 'pt-in', type: 'date', max: new Date().toISOString().slice(0, 10) }),
    full_name: h('input', { id: 'sfName', class: 'pt-in', type: 'text', maxlength: 120, value: v.full_name || '' }),
    class: sel('sfClass', CLASSES, v.class), stream: sel('sfStream', STREAMS, v.stream),
    category: sel('sfCat', CATEGORIES, v.category), gender: sel('sfGender', GENDERS, v.gender),
    session: sel('sfSession', SESSIONS, v.session || '')
  };
  const req = k => k !== 'session' && !(edit && k === 'dob');
  const fld = (k, hint) => h('label', { class: 'pt-fld', for: F[k].id }, h('span', {}, COL_LBL[k], req(k) ? h('b', { class: 'pt-req', text: ' *' }) : null), F[k], hint ? h('small', { text: hint }) : null);
  const node = h('div', { class: 'pt-form' },
    o.hideId ? null : h('div', { class: 'pt-row2' }, fld('student_id', edit ? 'The ID cannot be changed.' : 'The student signs in with this ID.'), fld('dob', edit ? 'Leave blank to keep the current date of birth.' : 'Used as the password with the ID.')),
    fld('full_name'), h('div', { class: 'pt-row2' }, fld('class'), fld('stream')), h('div', { class: 'pt-row2' }, fld('category'), fld('gender')), fld('session', 'Filled from the class: Class 11 → ' + sessionFor('11') + ', Class 12 / Dropper → ' + sessionFor('12') + '.'));
  F.class.addEventListener('change', () => { if (F.class.value) F.session.value = sessionFor(F.class.value); });
  node.values = () => { const r = {}; COLS.forEach(k => { r[k] = (F[k].value || '').trim(); }); return r; };
  node.missing = () => COLS.filter(k => req(k) && !(o.hideId && (k === 'student_id' || k === 'dob')) && !node.values()[k]).map(k => COL_LBL[k]);
  return node;
}
async function addStudentFlow(after) {
  const f = studentForm(); const msg = h('p', { class: 'pt-msg', role: 'status' });
  modal('Add a student', h('div', {}, h('p', { class: 'pt-hint', text: 'Adds the student to ' + (P().school || 'your school') + '. They sign in with "Login with Student ID" using this ID and date of birth.' }), f, msg),
    [{ text: 'Cancel', onclick: () => {} }, { text: 'Add student', pri: true, onclick: close => {
      const miss = f.missing(); if (miss.length) { msg.textContent = 'Please fill in: ' + miss.join(', '); msg.className = 'pt-msg bad'; return false; }
      msg.textContent = 'Saving…'; msg.className = 'pt-msg';
      rpc('teacher_add_student', { p: f.values() }).then(r => { close(); toast('Added ' + f.values().full_name + ' (ID ' + r.student_id + ')'); if (after) after(); })
        .catch(e => { msg.textContent = e.message; msg.className = 'pt-msg bad'; });
      return false;
    } }]);
}
function pageAddStudent() {
  if (!can('createTests')) return nope('Adding students is for teachers', '');
  if (can('manageStudents')) { location.replace('#/students'); return; }
  let f = studentForm(); const holder = h('div', {}, f), msg = h('p', { class: 'pt-msg', role: 'status' }), done = h('div', { class: 'pt-plist' });
  const btn = h('button', { type: 'button', class: 'btn pri pt-big', text: 'Add student', onclick: async () => {
    const miss = f.missing(); if (miss.length) { msg.textContent = 'Please fill in: ' + miss.join(', '); msg.className = 'pt-msg bad'; return; }
    btn.disabled = true; msg.textContent = 'Saving…'; msg.className = 'pt-msg';
    try {
      const v = f.values(), r = await rpc('teacher_add_student', { p: v });
      msg.textContent = 'Added. ' + v.full_name + ' can now sign in with Student ID ' + r.student_id + ' and their date of birth.'; msg.className = 'pt-msg ok';
      done.prepend(h('div', { class: 'pt-si' }, h('b', { text: '✓' }), h('span', { class: 'pt-si-t', text: v.full_name + ' · ' + r.student_id }), h('span', { class: 'pt-hint', text: 'Class ' + v.class + ' · ' + v.stream + ' · ' + (v.session || sessionFor(v.class)) })));
      f = studentForm(); holder.textContent = ''; holder.append(f);
    } catch (e) { msg.textContent = e.message; msg.className = 'pt-msg bad'; }
    btn.disabled = false;
  } });
  show(head('Add a student', 'Students of ' + (P().school || 'your school') + ' sign in with their Student ID and date of birth.'),
    h('div', { class: 'pt-grid2' }, card(h('h2', { text: 'Student details' }), holder, h('div', { class: 'pt-actions' }, btn), msg),
      h('div', { class: 'pt-col' }, card(h('h2', { text: 'Added just now' }), done, h('p', { class: 'pt-hint', text: 'Students you add here appear in this list until you leave the page.' })),
        card(h('h2', { text: 'Premium for teachers' }), h('ul', { class: 'pt-feats' }, ['See every student of your school by class and batch, with their test performance', 'Upload a whole class at once from Excel or CSV', 'Edit any student\'s details'].map(x => h('li', { text: x }))), link('#/membership', 'Upgrade to Premium', 'btn pt-gold')))));
}

let XLSX_P = null;
function loadXlsx() { if (!XLSX_P) XLSX_P = new Promise((res, rej) => { if (window.XLSX) return res(); const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = res; sc.onerror = () => { XLSX_P = null; rej(new Error('Could not load the Excel reader. Check your internet connection.')); }; document.head.append(sc); }); return XLSX_P; }
const TEMPLATE = [COLS, ['2401234567', '2008-05-14', 'Priya Sharma', '11', 'JEE', 'OBC-NCL', 'Female', sessionFor('11')], ['ROLL-1102', '2008-01-02', 'Rohan Kumar', '12', 'NEET', 'General', 'Male', sessionFor('12')]];
async function downloadTemplate(kind) {
  if (kind === 'csv') { saveCsv('students_template.csv', TEMPLATE); return; }
  try {
    await loadXlsx();
    const ws = window.XLSX.utils.aoa_to_sheet(TEMPLATE); ws['!cols'] = COLS.map(() => ({ wch: 18 }));
    const help = window.XLSX.utils.aoa_to_sheet([['Column', 'What to write'], ['student_id', 'Avanti ID or roll number. Letters, numbers, . _ / - (3 to 40). Must be unique.'], ['dob', 'Date of birth, YYYY-MM-DD or DD-MM-YYYY. The student signs in with the ID and this date.'], ['full_name', 'Full name'], ['class', CLASSES.join(', ') + ' (11th, XI, 12th, XII also work)'], ['stream', STREAMS.join(', ') + ' (PCM is read as JEE, PCB as NEET)'], ['category', CATEGORIES.join(', ')], ['gender', GENDERS.join(', ')], ['session', 'Optional. Leave blank to fill it from the class: Class 11 → ' + sessionFor('11') + ', Class 12 / Dropper → ' + sessionFor('12')]]);
    help['!cols'] = [{ wch: 14 }, { wch: 90 }];
    const wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, 'Students'); window.XLSX.utils.book_append_sheet(wb, help, 'How to fill');
    window.XLSX.writeFile(wb, 'students_template.xlsx');
  } catch (e) { toast(e.message); }
}
const HDR = { 'student id': 'student_id', studentid: 'student_id', id: 'student_id', 'avanti id': 'student_id', avanti_id: 'student_id', 'date of birth': 'dob', 'date_of_birth': 'dob', birthdate: 'dob', name: 'full_name', 'full name': 'full_name', 'student name': 'full_name', 'class': 'class', grade: 'class' };
function normRow(o) {
  const r = {};
  Object.keys(o).forEach(k => { const key = String(k).trim().toLowerCase(); const c = HDR[key] || key.replace(/\s+/g, '_'); if (COLS.includes(c)) r[c] = o[k]; });
  let d = r.dob;
  if (d instanceof Date && !isNaN(d)) { const x = new Date(d.getTime() + 12 * 3600e3); d = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  else if (typeof d === 'number' && window.XLSX) { const p = window.XLSX.SSF.parse_date_code(d); d = p ? p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : String(d); }
  const out = {}; COLS.forEach(k => { out[k] = String((k === 'dob' ? d : r[k]) == null ? '' : (k === 'dob' ? d : r[k])).trim(); });
  out.class = pickFrom(CLASSES, normClass(out.class)); out.stream = pickFrom(STREAMS, normStream(out.stream)); if (!out.session && CLASSES.includes(out.class)) out.session = sessionFor(out.class); out.category = pickFrom(CATEGORIES, out.category); out.gender = pickFrom(GENDERS, out.gender);
  const err = [];
  if (!out.student_id) err.push('Student ID missing');
  if (out.dob && !/^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(out.dob)) err.push('date of birth not understood');
  [['class', CLASSES], ['stream', STREAMS], ['category', CATEGORIES], ['gender', GENDERS]].forEach(([k, L]) => { if (out[k] && !L.includes(out[k])) err.push(COL_LBL[k] + ' must be one of ' + L.join(', ')); });
  if (out.session && !/^\d{4}-\d{2}$/.test(out.session)) err.push('Session must look like ' + sessionFor('12'));
  ['full_name', 'dob', 'class', 'stream', 'category', 'gender'].forEach(k => { if (!out[k]) err.push(COL_LBL[k] + ' missing'); });
  out._err = err.join('; ');
  return out;
}
async function readSheet(file) {
  await loadXlsx();
  const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }).map(normRow).filter(r => COLS.some(k => r[k]));
}
function bulkUpload(after) {
  const out = h('div', { class: 'pt-bulk' });
  const fileIn = h('input', { type: 'file', accept: '.csv,.xlsx,.xls', id: 'bulkFile', class: 'pt-file' });
  const body = h('div', {}, h('p', { class: 'pt-hint', text: 'Use the template: one row per student. Columns: ' + COLS.join(', ') + '. ' + (can('schoolApproved') ? 'Existing Student IDs of your school are updated; new ones are added.' : 'New students are added. Existing students can be updated once your school is approved.') + (can('staff') ? ' Students you add as Avanti staff get Premium.' : '') }),
    h('div', { class: 'pt-actions' }, h('button', { type: 'button', class: 'btn', text: '⬇ Template (Excel)', onclick: () => downloadTemplate('xlsx') }), h('button', { type: 'button', class: 'btn', text: '⬇ Template (CSV)', onclick: () => downloadTemplate('csv') })),
    h('label', { class: 'pt-drop', for: 'bulkFile' }, h('b', { text: 'Choose a .xlsx or .csv file' }), h('span', { text: 'Excel or CSV, up to 2000 students' }), fileIn), out);
  let rows = [];
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; out.textContent = ''; if (!f) return;
    out.append(loading('Reading ' + f.name + '…'));
    try { rows = await readSheet(f); } catch (e) { out.textContent = ''; out.append(errorBox('Could not read the file: ' + e.message)); return; }
    out.textContent = '';
    if (!rows.length) { out.append(empty('No students found', 'The first sheet has no rows under the headings. Use the template.')); return; }
    if (rows.length > 2000) { out.append(errorBox('This file has ' + rows.length + ' rows. Upload up to 2000 at a time.')); return; }
    const bad = rows.filter(r => r._err).length;
    out.append(h('p', { class: 'pt-meta' }, h('b', { text: rows.length + ' students found' }), bad ? ' · ' + bad + ' with problems (these rows will not be saved; fix them in the file and upload again)' : ''),
      h('div', { class: 'pt-tw pt-tw-s' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['#'].concat(COLS.map(k => COL_LBL[k]), ['Check']).map(x => h('th', { text: x })))),
        h('tbody', {}, rows.slice(0, 200).map((r, i) => h('tr', { class: r._err ? 'pt-badrow' : null }, h('td', { text: i + 1 }), COLS.map(k => h('td', { text: r[k] || '—' })), h('td', { text: r._err || 'OK' })))))),
      rows.length > 200 ? h('p', { class: 'pt-hint', text: 'Showing the first 200 rows.' }) : null);
  });
  const close = modal('Bulk upload students', body, [{ text: 'Close', onclick: () => {} }, { text: 'Upload students', pri: true, onclick: () => {
    if (!rows.length) { toast('Choose a file first'); return false; }
    out.prepend(loading('Uploading ' + rows.length + ' students…'));
    rpc('teacher_add_students', { p_rows: rows.map(r => { const o = Object.assign({}, r); delete o._err; return o; }) }).then(res => {
      const ok = res.filter(x => x.ok), added = ok.filter(x => x.action === 'added').length, upd = ok.length - added, fail = res.filter(x => !x.ok);
      out.textContent = '';
      out.append(h('div', { class: 'pt-stats' }, stat('Added', added), stat('Updated', upd), stat('Not saved', fail.length)),
        fail.length ? h('div', { class: 'pt-tw pt-tw-s' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Row', 'Student ID', 'Problem'].map(x => h('th', { text: x })))),
          h('tbody', {}, fail.map(x => h('tr', { class: 'pt-badrow' }, h('td', { text: x.row }), h('td', { text: (rows[x.row - 1] || {}).student_id || '—' }), h('td', { text: x.error })))))) : h('p', { class: 'pt-msg ok', text: 'All students saved.' }));
      rows = []; fileIn.value = ''; if (after) after();
    }).catch(e => { out.querySelector('.pt-state') && out.querySelector('.pt-state').remove(); out.prepend(errorBox(e.message)); });
    return false;
  } }]);
  return close;
}
function editStudent(st, after) {
  const f = studentForm({ edit: true, values: st, hideId: !st.student_id }); const msg = h('p', { class: 'pt-msg', role: 'status' });
  modal('Edit ' + (st.full_name || 'student'), h('div', {}, st.student_id ? null : h('p', { class: 'pt-hint', text: 'Signs in with Google: ' + (st.email || '') }), f, msg),
    [{ text: 'Cancel', onclick: () => {} }, { text: 'Save changes', pri: true, onclick: close => {
      const miss = f.missing(); if (miss.length) { msg.textContent = 'Please fill in: ' + miss.join(', '); msg.className = 'pt-msg bad'; return false; }
      const v = f.values(); delete v.student_id; if (!v.dob) delete v.dob;
      rpc('teacher_update_student', { p_user: st.student_id ? null : st.user_id, p_student_id: st.student_id || null, p: v })
        .then(() => { close(); toast('Saved'); if (after) after(); }).catch(e => { msg.textContent = e.message; msg.className = 'pt-msg bad'; });
      return false;
    } }]);
}
async function studentTests(st) {
  const body = h('div', {}, loading());
  modal((st.full_name || 'Student') + ' · tests', body, [{ text: 'Close', pri: true, onclick: () => {} }]);
  try {
    const list = await rpc('student_attempts', { p_user: st.user_id });
    body.textContent = '';
    body.append(list.length ? h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Test', 'Date', 'Score', 'C / W / S', ''].map(x => h('th', { text: x })))),
      h('tbody', {}, list.map(a => h('tr', {}, h('td', {}, h('b', { text: a.title })), h('td', { text: day(a.submitted_at) }), h('td', { class: 'pt-num', text: num(a.score, 2) + ' / ' + num(a.max_score, 2) }),
        h('td', { class: 'pt-num', text: a.correct + ' / ' + a.wrong + ' / ' + a.skipped }), h('td', {}, h('a', { class: 'btn', href: '#/report/' + a.id, text: 'Report', onclick: () => { const m = document.querySelector('.pt-modal-back'); if (m) m.remove(); } }))))))) : empty('No tests yet', 'This student has not submitted a test.'));
  } catch (e) { body.textContent = ''; body.append(errorBox(e.message)); }
}
let STU_SCHOOL = '';
async function pageStudents() {
  if (!can('manageStudents')) { if (can('createTests')) { location.replace('#/add-student'); return; } return nope('My Students is for teachers', ''); }
  show(head('My Students', ''), loading('Loading your students…'));
  const R = await rpc('school_students', { p_school: STU_SCHOOL || null });
  const all = R.students || [];
  const F = { cls: '', stream: '', session: '', q: '' };
  const reload = () => pageStudents();
  const uniq = k => [...new Set(all.map(x => x[k]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true }));
  const tbody = h('tbody', {}), countEl = h('span', { class: 'pt-meta' });
  const draw = () => {
    const q = F.q.toLowerCase();
    const rows = all.filter(x => (!F.cls || x.class === F.cls) && (!F.stream || x.stream === F.stream) && (!F.session || x.session === F.session) && (!q || [x.full_name, x.student_id, x.email].some(v => String(v || '').toLowerCase().includes(q))));
    countEl.textContent = rows.length + ' of ' + all.length + ' students';
    tbody.textContent = '';
    if (!rows.length) tbody.append(h('tr', {}, h('td', { colspan: 9 }, empty('No students match', all.length ? 'Change the filters above.' : 'Add students one by one, or upload a whole class from Excel.'))));
    rows.forEach(x => tbody.append(h('tr', {},
      h('td', {}, h('b', { text: x.full_name || '—' }), h('div', { class: 'pt-hint', text: x.student_id ? 'ID ' + x.student_id : (x.email || 'Google sign-in') })),
      h('td', { text: [x.class && (x.class === 'Dropper' ? 'Dropper' : 'Class ' + x.class), x.stream].filter(Boolean).join(' · ') || '—' }), h('td', { text: x.session || '—' }),
      h('td', { text: [x.category, x.gender].filter(Boolean).join(' · ') || '—' }),
      h('td', {}, x.signed_in ? badge('Signed in', 'ok') : badge('Not yet', 'mute'), x.source === 'avanti' ? h('div', { class: 'pt-hint', text: 'Avanti list' }) : null),
      h('td', { class: 'pt-num', text: x.tests }), h('td', { class: 'pt-num pt-barcell' }, x.avg_pct == null ? '—' : [h('span', { text: pct(x.avg_pct) }), bar(x.avg_pct, x.avg_pct < 40 ? 'bad' : x.avg_pct < 70 ? 'mid' : 'ok')]),
      h('td', { class: 'pt-num', text: x.last_at ? day(x.last_at) : '—' }),
      h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, can('schoolApproved') ? h('button', { type: 'button', class: 'btn', text: 'Edit', onclick: () => editStudent(x, reload) }) : null,
        x.user_id && x.tests ? h('button', { type: 'button', class: 'btn', text: 'Tests', onclick: () => studentTests(x) }) : null)))));
  };
  const mkSel = (label, all1, list, key) => h('select', { class: 'pt-in', 'aria-label': label, onchange: e => { F[key] = e.target.value; draw(); } }, h('option', { value: '', text: all1 }), list.map(v => h('option', { value: v, text: v })));
  const signed = all.filter(x => x.signed_in).length, took = all.filter(x => x.tests > 0), avg = took.length ? took.reduce((a, x) => a + (+x.avg_pct || 0), 0) / took.length : null;
  let schoolPick = null;
  if (can('isAdmin')) { schoolPick = schoolSelect('stuSchool', R.school, 'Choose a school'); schoolPick.sel.addEventListener('change', () => { STU_SCHOOL = schoolPick.value(); pageStudents(); }); }
  show(head('My Students', R.school + ' · ' + all.length + ' student' + (all.length === 1 ? '' : 's'),
      h('button', { type: 'button', class: 'btn', text: '+ Add a student', onclick: () => addStudentFlow(reload) }),
      h('button', { type: 'button', class: 'btn pri', text: 'Bulk upload', onclick: () => bulkUpload(reload) })),
    schoolPick ? card(h('label', { class: 'pt-fld' }, h('span', { text: 'School (admin: every school)' }), schoolPick)) : null,
    can('schoolApproved') ? null : h('div', { class: 'pt-note pt-warnnote' }, h('b', { text: 'Your school is waiting for approval by Avanti Fellows. ' }), 'You can add students, upload new students and create tests now. Editing existing students unlocks once your school is approved.'),
    h('div', { class: 'pt-stats' }, stat('Students', all.length), stat('Signed in', signed), stat('Took a test', took.length), stat('Average score', avg == null ? '—' : pct(avg), 'of students who took a test')),
    card(h('div', { class: 'pt-frow' }, mkSel('Class', 'All classes', uniq('class'), 'cls'), mkSel('Stream', 'All streams', uniq('stream'), 'stream'), mkSel('Session', 'All sessions', uniq('session'), 'session'),
        h('input', { type: 'search', class: 'pt-in', placeholder: 'Search name, ID or email', 'aria-label': 'Search students', oninput: e => { F.q = e.target.value.trim(); draw(); } })), countEl,
      h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Student', 'Class · Stream', 'Session', 'Category · Gender', 'Sign-in', 'Tests', 'Average', 'Last test', ''].map(x => h('th', { text: x })))), tbody))));
  draw();
}

/* ---------- Help & Support ---------- */
async function pageHelp() {
  show(head('Help & Support', ''), loading());
  const c = await rpc('support_contact');
  const p = P(), perm = AU().perm;
  const who = [p.full_name, p.email || (p.avanti_id ? 'ID ' + p.avanti_id : ''), p.role, perm.plan, p.school].filter(Boolean).join(' · ');
  const subject = 'Mathematics Dashboard: ';
  const bodyTxt = 'Hello,\n\nDescribe the problem here (what you did, what you expected, what happened):\n\n\n---\nAccount: ' + who + '\nPage: ' + location.href.replace(/#\/help$/, '') + '\nBrowser: ' + navigator.userAgent;
  const topic = h('select', { class: 'pt-in', id: 'hpTopic' }, ['Problem with sign-in', 'Payment or membership', 'A test or report', 'Wrong question, answer or figure', 'My school or student details', 'Something else'].map(t => h('option', { value: t, text: t })));
  const mailto = () => 'mailto:' + c.email + '?subject=' + encodeURIComponent(subject + topic.value) + '&body=' + encodeURIComponent(bodyTxt);
  const gmail = () => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(c.email) + '&su=' + encodeURIComponent(subject + topic.value) + '&body=' + encodeURIComponent(bodyTxt);
  const digits = c.phone ? c.phone.replace(/[^\d]/g, '') : '', wa = digits ? (digits.length === 10 ? '91' + digits : digits) : '';
  const faq = [
    ['I cannot sign in with my Student ID.', 'Check the ID and date of birth with your teacher. After 5 wrong tries the ID is locked for 15 minutes.'],
    ['I paid but I am still on Free.', 'Wait two minutes and refresh the page. If it is still Free, email with the payment ID from Membership → Payment history.'],
    ['My school, class or name is wrong.', 'Students: ask your teacher to correct it. Teachers: email us and we will change the school.'],
    ['A question, answer or figure is wrong.', 'Email the question ID (shown in the question menu) and what should be corrected.']];
  show(head('Help & Support', 'Found a problem or have a question? Write to us and we will get back to you.'),
    h('div', { class: 'pt-grid2' },
      card(h('h2', { text: 'Contact' }),
        h('div', { class: 'pt-contact' }, h('span', { class: 'pt-cic', text: '✉' }), h('div', {}, h('span', { class: 'pt-hint', text: 'Email' }), h('a', { href: 'mailto:' + c.email, text: c.email }))),
        c.phone ? h('div', { class: 'pt-contact' }, h('span', { class: 'pt-cic', text: '☎' }), h('div', {}, h('span', { class: 'pt-hint', text: 'Mobile' }), h('a', { href: 'tel:+' + wa, text: c.phone }))) : null,
        h('label', { class: 'pt-fld', for: 'hpTopic' }, h('span', { text: 'What is it about?' }), topic),
        h('div', { class: 'pt-actions' },
          h('a', { class: 'btn pri', href: '#', text: '✉ Email me', onclick: e => { e.currentTarget.href = mailto(); } }),
          h('a', { class: 'btn', href: '#', target: '_blank', rel: 'noopener', text: 'Write in Gmail', onclick: e => { e.currentTarget.href = gmail(); } }),
          wa ? h('a', { class: 'btn', href: 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Hello, I need help with the Mathematics Dashboard. ' + who), target: '_blank', rel: 'noopener', text: 'WhatsApp' }) : null,
          c.phone ? h('a', { class: 'btn', href: 'tel:+' + wa, text: '☎ Call' }) : null),
        h('p', { class: 'pt-hint', text: 'The email opens with your account details filled in, so we can help faster.' })),
      card(h('h2', { text: 'Common questions' }), h('div', { class: 'pt-faq' }, faq.map(([q, a]) => h('details', {}, h('summary', { text: q }), h('p', { text: a })))))));
}

/* ---------- Admin: approve teachers' schools ---------- */
async function pageApprovals() {
  if (!can('isAdmin')) return show(card(empty('Not available', 'Only Avanti admins can approve schools.')));
  show(head('Teacher approvals', ''), loading());
  const list = await rpc('admin_teachers');
  const pend = list.filter(x => !x.approved);
  const act = async (t, action) => {
    let school = null, note = null;
    if (action === 'approve') { school = await promptBox('Approve ' + (t.full_name || t.email), 'School name (correct it if needed)', t.school); if (!school) return; }
    if (action === 'reject') { note = await promptBox('Not approve ' + (t.full_name || t.email), 'Message for the teacher', 'Your school could not be verified. Please choose your correct school, or email us.'); if (note == null) return; }
    if (action === 'revoke' && !await confirmBox('Remove approval?', (t.full_name || t.email) + ' will not be able to edit students until approved again.', 'Remove approval', true)) return;
    try { await rpc('admin_set_teacher_school', { p_user: t.id, p_action: action, p_school: school, p_note: note }); toast({ approve: 'Approved', reject: 'Teacher will choose the school again', revoke: 'Approval removed' }[action]); await AU().refresh(); pageApprovals(); }
    catch (e) { toast(e.message); }
  };
  const row = t => h('tr', {},
    h('td', {}, h('b', { text: t.full_name || '—' }), h('div', { class: 'pt-hint', text: t.email || '' })),
    h('td', {}, h('b', { text: t.school }), h('div', { class: 'pt-hint', text: t.school_known ? 'On the Avanti list · ' + t.students + ' students' : 'New school (not on the Avanti list)' })),
    h('td', { text: day(t.created_at) }), h('td', {}, badge(t.plan === 'premium' ? 'Premium' : 'Free', t.plan === 'premium' ? 'mid' : null)), h('td', { class: 'pt-num', text: t.tests }),
    h('td', {}, t.approved ? badge('Approved', 'ok') : badge('Waiting', 'mid'), t.approved && t.approved_by ? h('div', { class: 'pt-hint', text: 'by ' + t.approved_by.split('@')[0] + ' · ' + day(t.approved_at) }) : null),
    h('td', {}, h('div', { class: 'pt-actions pt-nowrap' }, t.approved ? h('button', { type: 'button', class: 'btn pt-danger', text: 'Remove approval', onclick: () => act(t, 'revoke') })
      : [h('button', { type: 'button', class: 'btn pri', text: 'Approve', onclick: () => act(t, 'approve') }), h('button', { type: 'button', class: 'btn pt-danger', text: 'Not approve', onclick: () => act(t, 'reject') })])));
  const table = rows => h('div', { class: 'pt-tw' }, h('table', { class: 'pt-t' }, h('thead', {}, h('tr', {}, ['Teacher', 'School', 'Signed up', 'Plan', 'Tests', 'Status', ''].map(x => h('th', { text: x })))), h('tbody', {}, rows.map(row))));
  show(head('Teacher approvals', pend.length + ' waiting · ' + (list.length - pend.length) + ' approved'),
    h('p', { class: 'pt-hint', text: 'Approve a teacher only when you know they teach at that school. Until then they can create tests and add students, but cannot edit students. Not approving asks the teacher to choose the school again.' }),
    card(h('h2', { text: 'Waiting for approval' }), pend.length ? table(pend) : empty('Nothing waiting', 'New teachers appear here after they choose their school.')),
    list.length > pend.length ? card(h('h2', { text: 'Approved' }), table(list.filter(x => x.approved))) : null);
}

window.AvantiPortal = { route, leave: () => leave(false), saveWorksheet, createTestFrom, onboard, profileMissing };
if (AU() && AU().profile && TE()) route();
})();
