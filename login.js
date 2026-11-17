/* अंक-IT · Mathematics Dashboard · the Login / register pop-up, shared by the home page and every public page.
   Any element with data-login opens it in place (no redirect). Google sign-in and Avanti ID sign-in work exactly as on the dashboard:
   the sign-in is saved in this browser and the dashboard (index.html) picks it up. On pages without auth.js the sign-in library is
   loaded only when the pop-up is opened, so public pages stay light. No secrets here: the key below is the public (publishable) key. */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://usehxhvzhdbcmnmqaxoo.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_QQ_N_B6kl416kbGMF0DQtw_9Jg58PoN';
  var ROLE_KEY = 'avanti-md-role', NEXT_KEY = 'avanti-md-next';   /* same keys as auth.js */
  var base = document.currentScript ? new URL('.', document.currentScript.src).href : location.origin + '/';
  var GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  function h(tag, props) {
    var e = document.createElement(tag); props = props || {};
    for (var k in props) {
      var v = props[k]; if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); }
    return e;
  }

  /* the sign-in library: already there on the dashboard page, loaded on first use elsewhere */
  var sbP = null;
  function getSb() {
    if (window.AvantiAuth && window.AvantiAuth.sb) return Promise.resolve(window.AvantiAuth.sb);
    if (sbP) return sbP;
    sbP = new Promise(function (res, rej) {
      function make() { res(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } })); }
      if (window.supabase) return make();
      var s = document.createElement('script'); s.src = base + 'vendor/supabase-js-2.45.4.min.js'; s.onload = make;
      s.onerror = function () { sbP = null; rej(new Error('Could not load sign-in. Check your internet connection.')); };
      document.head.append(s);
    });
    return sbP;
  }
  function rememberNext() { if (/^#\/t\//.test(location.hash)) store.set(NEXT_KEY, location.hash); }

  var root = null, api = { after: null }, lastFocus = null;
  function close() { if (root) root.hidden = true; document.body.classList.remove('lm-open'); if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* the page may have changed */ } } lastFocus = null; }
  /* keep Tab inside the pop-up while it is open */
  function trap(e) {
    if (e.key !== 'Tab' || !root || root.hidden) return;
    var f = Array.prototype.filter.call(root.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && !x.hidden && x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], act = document.activeElement;
    if (!root.contains(act)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && act === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
  }

  function open(opts) {
    opts = opts || {};
    if (!root) {
      root = h('div', { class: 'lm', id: 'loginModal', hidden: true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lmTitle' });
      root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root && !root.hidden) close(); else trap(e); });
      document.body.append(root);
    }
    var testLink = /^#\/t\//.test(location.hash) || /^#\/t\//.test(store.get(NEXT_KEY) || '');
    /* no role is pre-selected: it is saved once and cannot be changed later, so the person must choose it */
    var saved = store.get(ROLE_KEY), role = testLink ? 'student' : (saved === 'student' || saved === 'teacher' ? saved : '');
    if (!lastFocus && document.activeElement && document.activeElement !== document.body) lastFocus = document.activeElement;
    var msg = opts.msg || '';
    var err = h('p', { class: 'lm-err', role: 'alert', hidden: !msg, text: msg });
    var seg = h('div', { class: 'lm-seg', role: 'radiogroup', 'aria-label': 'I am a' });
    var avBox = h('section', { class: 'lm-av' });
    var hint = h('p', { class: 'lm-hint', role: 'status' });
    function paint() {
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-r') === role)); });
      avBox.hidden = role !== 'student';
      hint.textContent = role ? '' : 'Choose Teacher or Student to continue.';
      hint.hidden = !!role;
      if (gBtn) gBtn.classList.toggle('lm-need', !role);
    }
    [['teacher', 'Teacher'], ['student', 'Student']].forEach(function (p) {
      seg.append(h('button', { type: 'button', role: 'radio', 'data-r': p[0], text: p[1], onclick: function () { role = p[0]; paint(); } }));
    });
    var gBtn = null;
    gBtn = h('button', { type: 'button', class: 'lm-google', html: GOOGLE_G + '<span>Continue with Google</span>', onclick: async function () {
      if (!role) { err.textContent = 'Please choose Teacher or Student first. This choice is saved once and cannot be changed later.'; err.hidden = false; return; }
      err.hidden = true; gBtn.disabled = true; gBtn.lastChild.textContent = 'Opening Google…';
      try {
        store.set(ROLE_KEY, role); rememberNext();
        var sb = await getSb();
        var r = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: base,   /* the home page forwards ?code= to /dashboard (site.js); `/` is the address already allowed in Supabase */ queryParams: { prompt: 'select_account' } } });
        if (r.error) throw r.error;
      } catch (e) { gBtn.disabled = false; gBtn.lastChild.textContent = 'Continue with Google'; err.textContent = 'Google sign-in did not start: ' + (e.message || e); err.hidden = false; }
    } });
    var idIn = h('input', { type: 'text', id: 'lgId', autocomplete: 'username', placeholder: 'e.g. 2401234567', required: true, maxlength: 40 });
    var dobIn = h('input', { type: 'date', id: 'lgDob', autocomplete: 'bday', required: true, max: new Date().toISOString().slice(0, 10) });
    var avErr = h('p', { class: 'lm-err', role: 'alert', hidden: true });
    var avBtn = h('button', { type: 'submit', class: 'lm-btn', text: 'Login with Avanti ID' });
    avBox.append(h('h3', { text: 'Login with Avanti ID' }),
      h('p', { class: 'lm-sub', text: 'Only for Avanti students. Use your Avanti ID and date of birth. All other students: use Continue with Google above, with the email your teacher added.' }),
      h('form', { class: 'lm-form', onsubmit: async function (e) {
        e.preventDefault(); avErr.hidden = true;
        if (!idIn.value.trim() || !dobIn.value) { avErr.textContent = 'Enter your Avanti ID and date of birth.'; avErr.hidden = false; return; }
        avBtn.disabled = true; avBtn.textContent = 'Checking…';
        try {
          rememberNext();
          var r, body;
          try { r = await fetch(SUPABASE_URL + '/functions/v1/avanti-login', { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ avanti_id: idIn.value.trim(), dob: dobIn.value }) }); }
          catch (x) { throw new Error('Could not reach the server. Check your internet connection.'); }
          body = await r.json().catch(function () { return {}; });
          if (!r.ok || !body.token_hash) throw new Error(body.error || 'Sign-in failed. Please try again.');
          var sb = await getSb();
          var v = await sb.auth.verifyOtp({ token_hash: body.token_hash, type: 'magiclink' });
          if (v.error) throw new Error('Sign-in failed: ' + v.error.message);
          store.set(ROLE_KEY, 'student');
          close();
          if (opts.after || api.after) await (opts.after || api.after)(); else location.href = base + 'dashboard';
        } catch (x) { avErr.textContent = x.message || String(x); avErr.hidden = false; avBtn.disabled = false; avBtn.textContent = 'Login with Avanti ID'; }
      } },
        h('label', { 'for': 'lgId', text: 'Avanti ID' }), idIn, h('label', { 'for': 'lgDob', text: 'Date of birth' }), dobIn, avErr, avBtn));
    var helpBox = h('section', { class: 'lm-help' }, h('span', { text: 'Trouble signing in?' }),
      h('button', { type: 'button', class: 'lm-link', text: 'Help & Support', onclick: async function (ev) {
        if (helpBox.querySelector('.lm-helpbox')) return;
        var inner = h('div', { class: 'lm-helpbox' }, h('p', { class: 'lm-sub', text: 'Loading…' })); helpBox.append(inner);
        var c = null; try { var sb = await getSb(); var r = await sb.rpc('support_contact'); c = r.data; } catch (e) { c = null; }
        inner.textContent = '';
        if (!c || !c.email) { inner.append(h('p', { class: 'lm-sub', text: 'Contact details could not be loaded. Please try again.' })); return; }
        inner.append(h('a', { class: 'lm-btn lm-mail', href: 'mailto:' + c.email + '?subject=' + encodeURIComponent('Mathematics Dashboard: help with signing in'), text: '✉ Email ' + c.email }));
        if (c.phone) inner.append(h('a', { class: 'lm-btn lm-ghost', href: 'tel:' + c.phone.replace(/[^+\d]/g, ''), text: '☎ Call ' + c.phone }));
      } }));
    var dialog = h('div', { class: 'lm-dialog' },
      h('button', { type: 'button', class: 'lm-x', 'aria-label': 'Close', text: '×', onclick: close }),
      h('img', { class: 'lm-logo', src: base + 'img/ankit-logo-light.png?v=965', alt: 'अंक-IT Mathematics', width: 220, height: 81 }),
      h('h2', { id: 'lmTitle', text: 'Log in or register' }),
      h('p', { class: 'lm-sub', text: 'New here? Continue with Google and your account is created for you.' }),
      testLink ? h('p', { class: 'lm-note', text: 'Sign in to open your test.' }) : null,
      h('p', { class: 'lm-sub', text: 'I am a' }), seg, hint, gBtn, err, avBox,
      h('p', { class: 'lm-fine', text: 'Your choice of Teacher or Student is saved the first time you sign in and cannot be changed later, so please choose carefully.' }),
      helpBox);
    root.textContent = ''; root.append(dialog); root.hidden = false; document.body.classList.add('lm-open');
    paint();
    setTimeout(function () { try { (role ? gBtn : seg.querySelector('button')).focus(); } catch (e) { /* optional */ } }, 30);
  }

  /* sign out from a public page (the dashboard page uses AvantiAuth.signOut, which does the same) */
  api.signOut = async function () {
    try { var sb = await getSb(); await sb.auth.signOut(); } catch (e) { /* the page reloads anyway */ }
    try { if (window.caches) { var ks = await window.caches.keys(); await Promise.all(ks.filter(function (k) { return k.indexOf('avanti-c-') === 0 || k.indexOf('avanti-teacher-') === 0; }).map(function (k) { return window.caches.delete(k); })); } } catch (e) { /* nothing cached */ }
    store.set('avanti-md-menu', null);
    location.href = base;
  };
  api.open = open; api.close = close;
  window.AvantiLogin = api;
  /* /?login=1 (sent by the dashboard when nobody is signed in) and test links open the pop-up straight away */
  (function () {
    var qs = new URLSearchParams(location.search), m = qs.get('loginmsg') || '';
    if (!qs.has('login') && !qs.has('loginmsg')) return;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* optional */ }
    var go = function () { open({ msg: m }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('[data-login]');
    if (l) { e.preventDefault(); open(); }
  });
})();
