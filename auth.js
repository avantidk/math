/* Avanti Fellows · Mathematics Dashboard · sign-in, plans and the profile menu.
   Supabase Auth (Google) for everyone, plus "Login with Avanti ID" for students on the allow-list.
   The plan (Free / Premium / Staff) and the role (Teacher / Student) are read from the database
   (function my_profile); the page never decides them. Only the public "publishable" key is here. */
(function () {
'use strict';
const SUPABASE_URL = 'https://usehxhvzhdbcmnmqaxoo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QQ_N_B6kl416kbGMF0DQtw_9Jg58PoN';
const ROLE_KEY = 'avanti-md-role', NEXT_KEY = 'avanti-md-next';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

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
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } } };

/* ---------- theme (same setting as the dashboard) ---------- */
(function () { const m = store.get('avanti-teacher-theme'); if (m === 'dark' || m === 'light') document.documentElement.setAttribute('data-theme', m); })();

/* ---------- permissions from the plan ---------- */
function permsFor(p) {
  const plan = p.plan === 'staff' ? 'staff' : p.plan === 'premium' ? 'premium' : 'free';
  const staff = plan === 'staff', paid = staff || plan === 'premium';
  return Object.freeze({
    plan, staff, premium: paid, role: p.role || null,
    pdf: paid, print: paid, share: paid, copy: paid,      // Premium: PDF download, print, share in PDF mode
    docx: staff, pptx: staff,                              // editable Word / PowerPoint: Staff only
    attention: staff,                                      // Attention flags: Staff only
    createTests: !!p.can_create_tests                      // decided by the database
  });
}

/* Free plan: no copying, printing, sharing or downloading anywhere on the page (buttons are hidden by CSS too). */
function applyGuards(perm) {
  const root = document.documentElement;
  ['plan-free', 'plan-premium', 'plan-staff'].forEach(c => root.classList.remove(c));
  root.classList.add('plan-' + perm.plan);
  root.classList.toggle('role-student', perm.role === 'student');
  root.classList.toggle('role-teacher', perm.role === 'teacher');
  if (perm.copy && perm.print && perm.share) return;
  const stop = e => { if (e.target && e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return; e.preventDefault(); };
  if (!perm.copy) {
    ['copy', 'cut', 'dragstart'].forEach(t => document.addEventListener(t, stop, true));
    document.addEventListener('contextmenu', stop, true);
    try {
      if (navigator.clipboard) {
        const no = () => Promise.reject(new Error('Copying needs a Premium membership'));
        Object.defineProperty(navigator.clipboard, 'writeText', { value: no, configurable: false });
        Object.defineProperty(navigator.clipboard, 'write', { value: no, configurable: false });
      }
    } catch (e) { /* the copy events above still block copying */ }
    const ec = document.execCommand.bind(document);
    document.execCommand = function (cmd) { if (/^(copy|cut)$/i.test(String(cmd))) return false; return ec.apply(document, arguments); };
  }
  if (!perm.print) {
    window.print = function () { if (window.AvantiTeacher) window.AvantiTeacher.toast('Printing needs a Premium membership.'); };
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && /^[ps]$/i.test(e.key)) { e.preventDefault(); if (window.AvantiTeacher) window.AvantiTeacher.toast('Printing and saving need a Premium membership.'); } }, true);
  }
  if (!perm.share) { try { Object.defineProperty(navigator, 'share', { value: () => Promise.reject(new Error('Sharing needs a Premium membership')), configurable: false }); } catch (e) { /* share buttons are hidden and gated */ } }
}

/* ---------- state ---------- */
const A = window.AvantiAuth = { sb, url: SUPABASE_URL, key: SUPABASE_KEY, profile: null, perm: permsFor({}), session: null };

async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args || {});
  if (error) throw new Error(error.message || 'The database returned an error');
  return data;
}
A.rpc = rpc;
A.refresh = async function () {
  const p = await rpc('my_profile');
  if (!p) throw new Error('Your profile was not found. Sign out and sign in again.');
  A.profile = p; A.perm = permsFor(p); applyGuards(A.perm);
  renderMenu();
  return p;
};
A.signOut = async function () { try { await sb.auth.signOut(); } catch (e) { /* the page reloads anyway */ } location.hash = ''; location.reload(); };
A.signInWithGoogle = async function (role) {
  store.set(ROLE_KEY, role); rememberNext();
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
  if (error) throw error;
};
A.signInWithAvantiId = async function (avantiId, dob) {
  let r;
  try {
    r = await fetch(SUPABASE_URL + '/functions/v1/avanti-login', { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ avanti_id: avantiId, dob }) });
  } catch (e) { throw new Error('Could not reach the server. Check your internet connection.'); }
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.token_hash) throw new Error(body.error || 'Sign-in failed. Please try again.');
  const { error } = await sb.auth.verifyOtp({ token_hash: body.token_hash, type: 'magiclink' });
  if (error) throw new Error('Sign-in failed: ' + error.message);
  store.set(ROLE_KEY, 'student');
};
function rememberNext() { if (/^#\/t\//.test(location.hash)) store.set(NEXT_KEY, location.hash); }

/* ---------- login page ---------- */
const GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

function loginPage(msg) {
  const root = $('#auth'); root.hidden = false; root.textContent = '';
  $('#app').hidden = true;
  const testLink = /^#\/t\//.test(location.hash) || /^#\/t\//.test(store.get(NEXT_KEY) || '');
  let role = testLink ? 'student' : (store.get(ROLE_KEY) === 'student' ? 'student' : 'teacher');
  const err = h('p', { class: 'lg-err', role: 'alert', hidden: !msg, text: msg || '' });
  const seg = h('div', { class: 'lg-seg', role: 'radiogroup', 'aria-label': 'I am a' });
  const avBox = h('section', { class: 'lg-card lg-av' });
  const paint = () => { seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.r === role))); avBox.hidden = role !== 'student'; };
  [['teacher', 'Teacher'], ['student', 'Student']].forEach(([k, t]) => seg.append(h('button', { type: 'button', role: 'radio', 'data-r': k, text: t, onclick: () => { role = k; paint(); } })));
  const gBtn = h('button', { type: 'button', class: 'lg-google', html: GOOGLE_G + '<span>Continue with Google</span>', onclick: async () => {
    err.hidden = true; gBtn.disabled = true; gBtn.lastChild.textContent = 'Opening Google…';
    try { await A.signInWithGoogle(role); } catch (e) { gBtn.disabled = false; gBtn.lastChild.textContent = 'Continue with Google'; err.textContent = 'Google sign-in did not start: ' + (e.message || e); err.hidden = false; }
  } });
  const idIn = h('input', { type: 'text', id: 'lgId', autocomplete: 'username', placeholder: 'e.g. 2401234567', required: true, maxlength: 40 });
  const dobIn = h('input', { type: 'date', id: 'lgDob', autocomplete: 'bday', required: true, max: new Date().toISOString().slice(0, 10) });
  const avErr = h('p', { class: 'lg-err', role: 'alert', hidden: true });
  const avBtn = h('button', { type: 'submit', class: 'lg-btn', text: 'Login with Avanti ID' });
  avBox.append(h('h2', { text: 'Login with Avanti ID' }), h('p', { class: 'lg-sub', text: 'Only for students on the Avanti list. Use the date of birth given to Avanti.' }),
    h('form', { class: 'lg-form', onsubmit: async e => {
      e.preventDefault(); avErr.hidden = true;
      if (!idIn.value.trim() || !dobIn.value) { avErr.textContent = 'Enter your Avanti ID and date of birth.'; avErr.hidden = false; return; }
      avBtn.disabled = true; avBtn.textContent = 'Checking…';
      try { rememberNext(); await A.signInWithAvantiId(idIn.value.trim(), dobIn.value); await afterSignIn(); }
      catch (x) { avErr.textContent = x.message || String(x); avErr.hidden = false; avBtn.disabled = false; avBtn.textContent = 'Login with Avanti ID'; }
    } },
      h('label', { for: 'lgId', text: 'Avanti ID' }), idIn, h('label', { for: 'lgDob', text: 'Date of birth' }), dobIn, avErr, avBtn));
  root.append(h('div', { class: 'lg' },
    h('header', { class: 'lg-head' }, h('img', { src: 'img/avanti-logo.png', alt: 'Avanti Fellows', width: 150, height: 51 }),
      h('h1', { text: 'Mathematics Dashboard' }), h('p', { text: "JEE, CET, NDA, IAT · PYQ's, DPP's, Handouts and tests" })),
    h('main', { class: 'lg-main' },
      testLink ? h('p', { class: 'lg-note', text: 'Sign in to open your test.' }) : null,
      h('section', { class: 'lg-card' },
        h('h2', { text: 'Sign in or create an account' }),
        h('p', { class: 'lg-sub', text: 'I am a' }), seg,
        gBtn, err,
        h('p', { class: 'lg-fine', text: 'Your choice of Teacher or Student is saved the first time you sign in. Avanti Fellows staff (@avantifellows.org) get full access automatically.' })),
      avBox)));
  paint();
}

/* Asked only when the role was never chosen (for example, the very first sign-in came from another tab). */
function rolePage() {
  const root = $('#auth'); root.hidden = false; root.textContent = ''; $('#app').hidden = true;
  const err = h('p', { class: 'lg-err', role: 'alert', hidden: true });
  const pick = r => async () => { try { await rpc('set_my_role', { p_role: r }); await start(); } catch (e) { err.textContent = e.message; err.hidden = false; } };
  root.append(h('div', { class: 'lg' }, h('header', { class: 'lg-head' }, h('img', { src: 'img/avanti-logo.png', alt: 'Avanti Fellows', width: 150, height: 51 }), h('h1', { text: 'Welcome' })),
    h('main', { class: 'lg-main' }, h('section', { class: 'lg-card' }, h('h2', { text: 'Are you a teacher or a student?' }), h('p', { class: 'lg-sub', text: 'This is saved once and decides what you see.' }),
      h('div', { class: 'lg-two' }, h('button', { type: 'button', class: 'lg-btn', text: 'I am a Teacher', onclick: pick('teacher') }), h('button', { type: 'button', class: 'lg-btn', text: 'I am a Student', onclick: pick('student') })), err))));
}

function fatal(msg) {
  const root = $('#auth'); root.hidden = false; root.textContent = ''; $('#app').hidden = true;
  root.append(h('div', { class: 'lg' }, h('main', { class: 'lg-main' }, h('section', { class: 'lg-card' }, h('h2', { text: 'Something went wrong' }), h('p', { class: 'lg-err', text: msg }),
    h('div', { class: 'lg-two' }, h('button', { type: 'button', class: 'lg-btn', text: 'Try again', onclick: () => location.reload() }), h('button', { type: 'button', class: 'lg-btn lg-ghost', text: 'Sign out', onclick: () => A.signOut() }))))));
}

/* ---------- profile icon and menu (top bar, after sign-in only) ---------- */
function initials(p) { const n = (p.full_name || p.email || p.avanti_id || '?').trim(); return n.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || '?'; }
function renderMenu() {
  const slot = $('#tbProfile'); const p = A.profile; if (!slot || !p) return;
  slot.textContent = '';
  const perm = A.perm, student = p.role === 'student', teacher = p.role === 'teacher';
  const items = [['#/profile', 'Edit profile']];
  if (perm.plan === 'free') items.push(['#/membership', '★ Purchase membership', 'pf-buy']);
  else items.push(['#/membership', 'Membership']);
  if (student) items.push(['#/tests', 'Available tests'], ['#/reports', 'My Reports']);
  if (teacher && perm.createTests) items.push(['#/create', 'Create Test'], ['#/my-tests', 'My Tests and Results'], ['#/worksheets', 'Saved worksheets']);
  const planLabel = { free: 'Free', premium: 'Premium', staff: 'Staff' }[perm.plan];
  const drop = h('div', { class: 'tb-drop pf-drop', id: 'pfDrop', role: 'menu', hidden: true },
    h('div', { class: 'pf-who' }, h('strong', { text: p.full_name || p.avanti_id || 'Your account' }),
      h('span', { class: 'pf-mail', title: p.email || p.avanti_id || '', text: p.email || p.avanti_id || '' }),
      h('span', { class: 'pf-plan pf-' + perm.plan, text: planLabel + (p.role ? ' · ' + (teacher ? 'Teacher' : 'Student') : '') })),
    items.map(([href, t, c]) => h('a', { class: 'tb-item' + (c ? ' ' + c : ''), role: 'menuitem', href, text: t, onclick: close })),
    h('button', { type: 'button', class: 'tb-item pf-out', role: 'menuitem', text: 'Logout', onclick: () => A.signOut() }));
  const btn = h('button', { type: 'button', class: 'pf-btn', id: 'pfBtn', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-label': 'Profile menu', title: 'Profile', text: initials(p),
    onclick: e => { e.stopPropagation(); const open = drop.hidden; drop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); } });
  function close() { drop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  slot.append(btn, drop);
  if (!renderMenu.bound) {
    renderMenu.bound = true;
    document.addEventListener('click', e => { const d = $('#pfDrop'); if (d && !d.hidden && !e.target.closest('#tbProfile')) { d.hidden = true; $('#pfBtn').setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', e => { const d = $('#pfDrop'); if (e.key === 'Escape' && d && !d.hidden) { d.hidden = true; $('#pfBtn').focus(); } });
  }
}
A.renderMenu = renderMenu;

/* ---------- start ---------- */
let started = false;
async function start() {
  let p;
  try { p = await rpc('my_profile'); }
  catch (e) { fatal('Could not load your profile (' + e.message + '). If this keeps happening, the database setup may not be finished.'); return; }
  if (!p) { fatal('Your account has no profile yet. Sign out and sign in again.'); return; }
  if (!p.role) {
    const want = store.get(ROLE_KEY);
    if (want === 'teacher' || want === 'student') { try { p = await rpc('set_my_role', { p_role: want }); } catch (e) { /* asked below */ } }
    if (!p || !p.role) { rolePage(); return; }
  }
  A.profile = p; A.perm = permsFor(p); applyGuards(A.perm);
  const next = store.get(NEXT_KEY); store.set(NEXT_KEY, null);
  if (next && !location.hash) history.replaceState(null, '', location.pathname + next);
  $('#auth').hidden = true; $('#auth').textContent = ''; $('#app').hidden = false;
  if (!started) { started = true; window.AvantiBoot.start(); }
  renderMenu();
  if (window.AvantiPortal) window.AvantiPortal.route();
  const incomplete = p.avanti_id ? false : p.role === 'student' ? !(p.full_name && p.school && p.class && p.category && p.gender) : !p.full_name;
  if (incomplete && !/^#\/t\//.test(location.hash) && location.hash !== '#/profile') location.hash = '#/profile';
}
async function afterSignIn() {
  const { data } = await sb.auth.getSession();
  A.session = data.session;
  if (data.session) await start(); else loginPage();
}

(async function init() {
  const q = new URLSearchParams(location.search);
  const oauthErr = q.get('error_description');
  let session = null;
  try { const { data } = await sb.auth.getSession(); session = data.session; } catch (e) { session = null; }
  if (q.has('code') || q.has('error')) history.replaceState(null, '', location.pathname + location.hash);
  A.session = session;
  sb.auth.onAuthStateChange((evt, s) => { A.session = s; if (evt === 'SIGNED_OUT' && started) location.reload(); });
  if (session) await start();
  else loginPage(oauthErr ? 'Sign-in was not completed: ' + oauthErr : '');
})();
})();
