/* अंक-IT · Mathematics Dashboard · sign-in, plans and the profile menu.
   Supabase Auth (Google) for everyone, plus "Login with Avanti ID" for students the admin marked as Avanti students.
   The plan (Free / Premium / Staff) and the role (Teacher / Student) are read from the database
   (function my_profile); the page never decides them. Only the public "publishable" key is here. */
(function () {
'use strict';
const h = window.AvantiUtil.h;
const SUPABASE_URL = 'https://usehxhvzhdbcmnmqaxoo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QQ_N_B6kl416kbGMF0DQtw_9Jg58PoN';
const ROLE_KEY = 'avanti-md-role', NEXT_KEY = 'avanti-md-next';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = (s, r) => (r || document).querySelector(s);
const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } } };

/* ---------- theme (same setting as the dashboard) ---------- */
(function () { const m = store.get('avanti-teacher-theme'); if (m === 'dark' || m === 'light') document.documentElement.setAttribute('data-theme', m); })();

/* ---------- permissions from the plan ---------- */
/* What each plan may do. The server checks the same things (the Word / PowerPoint code and the handout PDFs are sent only to
   the accounts allowed to have them), so changing these values in the browser unlocks nothing real. */
function permsFor(p) {
  const plan = p.plan === 'staff' ? 'staff' : p.plan === 'premium' ? 'premium' : 'free';
  const staff = plan === 'staff', paid = staff || plan === 'premium', admin = !!p.is_admin;
  return Object.freeze({
    plan, staff, premium: paid, role: p.role || null,
    pdf: paid, print: paid,                                // Premium (and Avanti teachers): PDF download and print
    share: admin, copy: admin, docx: admin, pptx: admin,   // sharing, copying and editable Word / PowerPoint: the admin only
    attention: staff,                                      // Attention flags: Staff only
    createTests: !!p.can_create_tests,                     // every teacher and Staff (decided by the database)
    worksheets: !!p.can_manage_students,                   // Premium teachers and Staff
    manageStudents: !!p.can_manage_students,               // Premium teachers and Staff: student list, bulk upload, edit
    fullReports: paid,                                     // Premium students: comparison with all students
    schoolApproved: !!p.school_approved,                   // teachers: editing students needs an approved school
    isAdmin: !!p.is_admin                                  // approves teachers' schools
  });
}

/* No copying, printing, sharing or downloading beyond the plan anywhere on the page (buttons are hidden by CSS too). */
function applyGuards(perm) {
  const root = document.documentElement;
  ['plan-free', 'plan-premium', 'plan-staff'].forEach(c => root.classList.remove(c));
  root.classList.add('plan-' + perm.plan);
  root.classList.toggle('role-student', perm.role === 'student');
  root.classList.toggle('role-teacher', perm.role === 'teacher');
  root.classList.toggle('is-admin', !!perm.isAdmin);
  if (perm.copy && perm.print && perm.share) return;
  const stop = e => { if (e.target && e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return; e.preventDefault(); };
  if (!perm.copy) {
    ['copy', 'cut', 'dragstart'].forEach(t => document.addEventListener(t, stop, true));
    document.addEventListener('contextmenu', stop, true);
    try {
      if (navigator.clipboard) {
        const no = () => Promise.reject(new Error('Copying is not part of your plan'));
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
  if (!perm.share) { try { Object.defineProperty(navigator, 'share', { value: () => Promise.reject(new Error('Sharing is not part of your plan')), configurable: false }); } catch (e) { /* share buttons are hidden and gated */ } }
}

/* ---------- state ---------- */
/* profile and perm can only be changed by this file (read-only from outside) */
let PROFILE = null, PERM = permsFor({});
const A = { sb, url: SUPABASE_URL, key: SUPABASE_KEY, session: null };
Object.defineProperty(A, 'profile', { get: () => PROFILE, enumerable: true });
Object.defineProperty(A, 'perm', { get: () => PERM, enumerable: true });
Object.defineProperty(window, 'AvantiAuth', { value: A, writable: false, configurable: false });

async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args || {});
  if (error) throw new Error(error.message || 'The database returned an error');
  return data;
}
A.rpc = rpc;
A.refresh = async function () {
  const p = await rpc('my_profile');
  if (!p) throw new Error('Your profile was not found. Sign out and sign in again.');
  PROFILE = p; PERM = permsFor(p); applyGuards(PERM);
  renderMenu();
  return p;
};
A.signOut = async function () {
  store.set('avanti-md-menu', null);
  try { if (window.AvantiContent) await window.AvantiContent.clearCaches(); } catch (e) { /* nothing cached */ }
  try { await sb.auth.signOut(); } catch (e) { /* the page reloads anyway */ }
  location.hash = ''; location.reload();
};
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

/* ---------- login / register pop-up: built by login.js (shared with the public pages) ---------- */
window.AvantiLogin.after = () => afterSignIn();
function closeLogin() { window.AvantiLogin.close(); }
function openLogin(msg) { window.AvantiLogin.open({ msg }); }
function loginPage(msg) { showHome(); openLogin(msg); }   /* called when there is no sign-in */

/* ---------- which page is on screen: the public home page or the dashboard ---------- */
/* Signed out: always the home page. Signed in: the dashboard, except at #/home (and its own in-page links like #plans). */
const HOME_HASH = /^#(\/home|features|how|chapters|teachers|plans|faq)$/;
const isHomeHash = () => HOME_HASH.test(location.hash);
function showHome() {   /* signed out: the public page is the whole screen (also drops the early 'signed-in' guess from site.js) */
  document.documentElement.classList.remove('to-app', 'signed-in');
  $('#auth').hidden = true; $('#auth').textContent = ''; $('#app').hidden = true;
}
function applyView() {   /* signed in: switch between home and dashboard without losing the dashboard's state */
  if (!started) return;
  const home = isHomeHash();
  $('#app').hidden = home;
  if (home) document.documentElement.classList.remove('to-app');
  else { window.dispatchEvent(new Event('resize')); window.scrollTo(0, 0); }
}
window.addEventListener('hashchange', () => { if (A.session) applyView(); });
document.addEventListener('click', e => {
  const dsh = e.target.closest && e.target.closest('[data-dash]');
  if (dsh && A.session) {
    e.preventDefault();
    history.pushState(null, '', location.pathname + location.search);
    applyView(); if (window.AvantiPortal) window.AvantiPortal.route();
  }
});

/* Asked only when the role was never chosen (for example, the very first sign-in came from another tab). */
function rolePage() {
  const root = $('#auth'); root.hidden = false; root.textContent = ''; $('#app').hidden = true;
  const err = h('p', { class: 'lg-err', role: 'alert', hidden: true });
  const pick = r => async () => { try { await rpc('set_my_role', { p_role: r }); await start(); } catch (e) { err.textContent = e.message; err.hidden = false; } };
  root.append(h('div', { class: 'lg' }, h('header', { class: 'lg-head' }, h('img', { src: 'img/ankit-logo-dark-sm.png?v=920', alt: 'अंक-IT', width: 139, height: 52 }), h('h1', { text: 'Welcome' })),
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
const CROWN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7zm2 13h14v2H5v-2z"/></svg>';
const rupees = p => '₹' + Math.round((p || 0) / 100);
/* Avatar colour: Free student green, Free teacher blue, Premium (and Staff) golden with a green ring for students and a red ring for teachers. */
function avatarClass(p, perm) { return 'pf-btn ' + (perm.plan === 'free' ? (p.role === 'teacher' ? 'av-free-t' : 'av-free-s') : 'av-gold ' + (p.role === 'teacher' ? 'av-ring-t' : 'av-ring-s')); }
/* the number shown after each menu item, from menu_counts() */
const COUNT_KEY = { '#/tests': 'available', '#/reports': 'reports', '#/my-tests': 'tests', '#/students': 'students', '#/worksheets': 'worksheets', '#/approvals': 'approvals' };
function renderMenu() {
  const slot = $('#tbProfile'); const p = A.profile; if (!slot || !p) return;
  slot.textContent = '';
  const perm = A.perm, student = p.role === 'student', teacher = p.role === 'teacher';
  const items = [['#/profile', 'Edit profile']];
  if (perm.plan === 'premium' && !p.is_avanti) items.push(['#/membership', 'Membership']);
  if (student) items.push(['#/tests', 'Available tests'], ['#/reports', 'My Reports']);
  if (teacher || perm.staff) {
    if (perm.createTests) items.push(['#/my-tests', 'My Tests and Results']);
    if (perm.manageStudents) items.push(['#/students', 'My Students']);
    else if (perm.createTests) items.push(['#/add-student', 'Add a student']);
    if (perm.worksheets) items.push(['#/worksheets', 'Saved worksheets']);
  }
  if (perm.isAdmin) items.push(['#/approvals', 'Approvals']);
  items.push(['#/help', 'Help & Support']);
  const planLabel = perm.isAdmin ? 'Admin · Full access' : perm.plan === 'staff' ? 'Avanti teacher' : p.is_avanti ? 'Avanti · Premium' : perm.plan === 'premium' ? 'Premium' : 'Free';
  const upgrade = perm.plan === 'free' ? h('a', { class: 'pf-up', role: 'menuitem', href: '#/membership', onclick: close },
    h('span', { class: 'pf-up-ic', html: CROWN }),
    h('span', { class: 'pf-up-t' }, h('b', { text: 'Upgrade to Premium' }), h('small', { text: rupees(p.price_paise) + ' a year · ' + (teacher ? 'PDFs, student list & bulk upload' : 'PDFs & all-India comparison') })),
    h('span', { class: 'pf-up-go', 'aria-hidden': 'true', text: '›' })) : null;
  const drop = h('div', { class: 'tb-drop pf-drop', id: 'pfDrop', role: 'menu', hidden: true },
    h('div', { class: 'pf-who' }, h('strong', { text: p.full_name || p.avanti_id || 'Your account' }),
      h('span', { class: 'pf-mail', title: p.email || p.avanti_id || '', text: p.email || p.avanti_id || '' }),
      h('span', { class: 'pf-plan ' + (perm.plan === 'free' ? (teacher ? 'pf-free-t' : 'pf-free-s') : 'pf-gold'), text: perm.isAdmin || perm.plan === 'staff' ? planLabel : planLabel + ' · ' + (teacher ? 'Teacher' : 'Student') })),
    upgrade,
    items.map(([href, t]) => h('a', { class: 'tb-item pf-item', role: 'menuitem', href, 'data-count': COUNT_KEY[href] || null, onclick: close }, h('span', { text: t }), COUNT_KEY[href] ? h('span', { class: 'pf-count' }) : null)),
    h('button', { type: 'button', class: 'tb-item pf-out', role: 'menuitem', text: 'Logout', onclick: () => A.signOut() }));
  const canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  const btn = h('button', { type: 'button', class: avatarClass(p, perm), id: 'pfBtn', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-label': 'Profile menu (' + planLabel + ')', title: planLabel, text: initials(p),
    onclick: e => { e.stopPropagation(); const open = canHover ? true : drop.hidden; drop.hidden = !open; btn.setAttribute('aria-expanded', String(open)); } });
  function close() { drop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  slot.append(btn, drop);
  if (canHover) {   /* hover opens the menu; a short delay lets the pointer cross the gap to it */
    let hideT = null;
    slot.onmouseenter = () => { clearTimeout(hideT); drop.hidden = false; btn.setAttribute('aria-expanded', 'true'); };
    slot.onmouseleave = () => { hideT = setTimeout(close, 250); };
  }
  /* the public pages show the same account menu: keep a small copy (names and links only, no tokens) */
  store.set('avanti-md-menu', JSON.stringify({ n: p.full_name || p.avanti_id || 'Your account', e: p.email || p.avanti_id || '',
    pl: perm.isAdmin || perm.plan === 'staff' ? planLabel : planLabel + ' · ' + (teacher ? 'Teacher' : 'Student'), g: perm.plan !== 'free', t: teacher ? 't' : 's',
    up: perm.plan === 'free' ? { t: 'Upgrade to Premium', s: rupees(p.price_paise) + ' a year · ' + (teacher ? 'PDFs, student list & bulk upload' : 'PDFs & all-India comparison') } : null, items }));
  try { window.dispatchEvent(new Event('avanti-menu')); } catch (e) { /* optional */ }
  rpc('menu_counts').then(c => drop.querySelectorAll('[data-count]').forEach(a => { const n = c && c[a.dataset.count]; if (n != null) a.querySelector('.pf-count').textContent = '(' + n + ')'; })).catch(() => {});
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
  PROFILE = p; PERM = permsFor(p); applyGuards(PERM);
  /* right after sign-in: every required detail must be filled before the dashboard opens */
  if (window.AvantiPortal && window.AvantiPortal.profileMissing(p).length) {
    const root = $('#auth'); root.hidden = false; $('#app').hidden = true;
    window.AvantiPortal.onboard(root, () => start());
    return;
  }
  const next = store.get(NEXT_KEY); store.set(NEXT_KEY, null);
  if (next && !location.hash) history.replaceState(null, '', location.pathname + next);
  closeLogin(); $('#auth').hidden = true; $('#auth').textContent = '';
  $('#app').hidden = isHomeHash(); if (isHomeHash()) document.documentElement.classList.remove('to-app');
  document.querySelectorAll('[data-av]').forEach(el => { el.textContent = initials(p); el.title = p.full_name || p.email || p.avanti_id || 'Your profile'; });
  if (!started) { started = true; window.AvantiBoot.start(); }
  renderMenu();
  if (window.AvantiChat) window.AvantiChat.start();
  if (window.AvantiPortal) window.AvantiPortal.route();
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
  const wantLogin = q.has('login') || !!oauthErr || /^#\/t\//.test(location.hash);
  if (q.has('code') || q.has('error') || q.has('login')) history.replaceState(null, '', location.pathname + location.hash);
  A.session = session;
  sb.auth.onAuthStateChange((evt, s) => {
    A.session = s;
    if (evt === 'SIGNED_OUT') { const go = () => { if (started) location.reload(); }; if (window.AvantiContent) window.AvantiContent.clearCaches().then(go, go); else go(); }
  });
  if (session) await start();
  else { showHome(); if (wantLogin) openLogin(oauthErr ? 'Sign-in was not completed: ' + oauthErr : ''); }
})();
})();
