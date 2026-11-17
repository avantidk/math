/* अंक-IT · Mathematics Dashboard · shared by every public page (home, chapters, About, Contact, Privacy, Terms).
   It only READS the sign-in that this browser already saved, to show the right buttons in the header (Login, or Dashboard and the
   name icon). It never sends it anywhere and never signs anyone in: that is done by auth.js on the home page. */
(function () {
  'use strict';
  var d = document, de = d.documentElement, user = null;
  var ROOT = '/'; try { ROOT = new URL('.', d.currentScript.src).href; } catch (e) { ROOT = '/'; }
  try {
    var raw = window.localStorage.getItem('sb-usehxhvzhdbcmnmqaxoo-auth-token');
    if (raw) { var o = JSON.parse(raw); if (o && o.access_token && o.user) user = o.user; }
  } catch (e) { user = null; }
  if (user) {
    de.classList.add('signed-in');
    /* the dashboard is about to open: keep the home page out of sight so it does not flash first (auth.js decides the final view) */
    if (de.getAttribute('data-page') === 'index' && window.location.hash !== '#/home') de.classList.add('to-app');
  }
  /* If the dashboard does not open within 8 seconds (for example the sign-in script was blocked), offer a way out instead of "Loading…" forever. */
  if (de.classList.contains('to-app')) {
    window.setTimeout(function () {
      var sp = d.getElementById('splash');
      if (!de.classList.contains('to-app') || !sp || sp.getAttribute('data-late')) return;
      sp.setAttribute('data-late', '1');
      sp.innerHTML = '<div class="splash-box"><p>This is taking longer than usual.</p><p class="splash-sub">Check your internet connection, then try again.</p><button type="button" class="sb sb-gold" id="spRetry">Try again</button> <button type="button" class="sb sb-white-line" id="spHome">Go to the home page</button></div>';
      d.getElementById('spRetry').addEventListener('click', function () { window.location.reload(); });
      d.getElementById('spHome').addEventListener('click', function () { de.classList.remove('to-app'); window.location.hash = '#/home'; });
    }, 8000);
  }
  function ready(fn) { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () {
    if (user) {
      var meta = user.user_metadata || {};
      var name = String(meta.full_name || meta.name || user.email || '').trim();
      var parts = name.split(/[\s@._-]+/).filter(Boolean);
      var ini = ((parts[0] || '?').charAt(0) + (parts.length > 1 ? parts[1].charAt(0) : '')).toUpperCase();
      Array.prototype.forEach.call(d.querySelectorAll('[data-av]'), function (el) { el.textContent = ini; el.setAttribute('title', name || 'Your profile'); });
    }
    /* Signed-in account menu (the same items as the dashboard's name icon). The dashboard saves them in this browser each time it opens
       and tells this script (event "avanti-menu") so the menu on the home page is never out of date. */
    var canHover0 = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); };
    function buildUserMenus() {
      if (!user) return;
      var cache = null; try { cache = JSON.parse(window.localStorage.getItem('avanti-md-menu') || 'null'); } catch (e) { cache = null; }
      var cm = cache || {}, mm = user.user_metadata || {};
      var items = cm.items && cm.items.length ? cm.items : [['#/profile', 'Edit profile'], ['#/help', 'Help & Support']];
      Array.prototype.forEach.call(d.querySelectorAll('.sh-pf'), function (pf) {
        var av = pf.querySelector('.sh-av'), menu = pf.querySelector('.pfm');
        ['av-gold', 'av-s', 'av-t', 'ring-s', 'ring-t'].forEach(function (k) { av.classList.remove(k); });
        av.classList.add(cm.g ? 'av-gold' : (cm.t === 't' ? 'av-t' : 'av-s')); if (cm.g) av.classList.add(cm.t === 't' ? 'ring-t' : 'ring-s');
        var pill = cm.pl ? '<span class="pfm-plan ' + (cm.g ? 'pf-gold' : (cm.t === 't' ? 'pf-free-t' : 'pf-free-s')) + '">' + esc(cm.pl) + '</span>' : '';
        menu.innerHTML = '<div class="pfm-who"><strong>' + esc(cm.n || mm.full_name || mm.name || user.email || 'Your account') + '</strong><span class="pfm-mail">' + esc(cm.e || user.email || '') + '</span>' + pill + '</div>'
          + (cm.up ? '<a class="pfm-up" href="' + ROOT + '#/membership"><b>' + esc(cm.up.t) + '</b><small>' + esc(cm.up.s) + '</small></a>' : '')
          + items.map(function (it) { return '<a class="pfm-i" role="menuitem" href="' + ROOT + esc(it[0]) + '">' + esc(it[1]) + '</a>'; }).join('')
          + '<button type="button" class="pfm-i pfm-out" role="menuitem">Logout</button>';
        menu.querySelector('.pfm-out').addEventListener('click', function () {
          if (window.AvantiAuth && window.AvantiAuth.signOut) window.AvantiAuth.signOut(); else if (window.AvantiLogin && window.AvantiLogin.signOut) window.AvantiLogin.signOut(); else window.location.href = ROOT;
        });
        if (!pf.getAttribute('data-bound')) {   /* listeners are added once, even when the menu is rebuilt */
          pf.setAttribute('data-bound', '1');
          if (!canHover0) av.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); pf.classList.toggle('open'); av.setAttribute('aria-expanded', String(pf.classList.contains('open'))); });
          d.addEventListener('click', function (e) { if (pf.classList.contains('open') && !pf.contains(e.target)) { pf.classList.remove('open'); av.setAttribute('aria-expanded', 'false'); } });
          d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { pf.classList.remove('open'); av.blur(); } });
        }
      });
    }
    buildUserMenus();
    window.addEventListener('avanti-menu', buildUserMenus);
    /* Exams menu: opens on hover or keyboard focus (CSS). On touch screens (no hover) a tap opens it, another tap closes it. */
    var dd = d.querySelector('.sh-dd');
    var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    if (dd) {
      var btn = dd.querySelector('.sh-ddb');
      var setOpen = function (v) { dd.classList.toggle('open', v); btn.setAttribute('aria-expanded', String(v)); if (!v) btn.blur(); };
      if (!canHover) btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setOpen(!dd.classList.contains('open')); });
      d.addEventListener('click', function (e) { if (dd.classList.contains('open') && !dd.contains(e.target)) setOpen(false); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    }
    /* phone menu: closes when you click anywhere else, press Escape, or choose a link */
    var menu = d.querySelector('.sh-menu');
    if (menu) {
      d.addEventListener('click', function (e) { if (menu.hasAttribute('open') && !menu.contains(e.target)) menu.removeAttribute('open'); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu.removeAttribute('open'); });
    }
    /* carousel of dashboard screens: arrows, tabs, dots, swipe, a pause button and a slow auto-advance that stops when you point at it.
       Screens after the first are fetched only when they are about to be shown (saves mobile data). */
    Array.prototype.forEach.call(d.querySelectorAll('[data-car]'), function (car) {
      var track = car.querySelector('.car-track'), slides = Array.prototype.slice.call(track.children);
      var tabs = car.querySelector('.car-tabs'), dots = car.querySelector('.car-dots'), prev = car.querySelector('.car-prev'), next = car.querySelector('.car-next');
      var cur = 0, paused = false, userPaused = false, visible = false, tBtns = [], dBtns = [];
      [tabs, dots, prev, next].forEach(function (el) { el.hidden = false; });
      tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Dashboard screens');
      function load(i) { var im = slides[(i + slides.length) % slides.length].querySelector('img[data-src]'); if (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); } }
      function mark(i) { cur = i; load(i); load(i + 1); tBtns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; }); dBtns.forEach(function (b, k) { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); }
      function go(i) { i = (i + slides.length) % slides.length; load(i); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); mark(i); }
      slides.forEach(function (s, i) {
        var t = d.createElement('button'); t.type = 'button'; t.id = 'car-t' + i; t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', s.id); t.textContent = s.getAttribute('data-title'); t.addEventListener('click', function () { go(i); }); tabs.appendChild(t); tBtns.push(t);
        s.setAttribute('aria-labelledby', t.id);
        var x = d.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Show screen ' + (i + 1) + ': ' + s.getAttribute('data-title')); x.addEventListener('click', function () { go(i); }); dots.appendChild(x); dBtns.push(x);
      });
      tabs.addEventListener('keydown', function (e) { var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (k) { e.preventDefault(); go(cur + k); tBtns[(cur + slides.length) % slides.length].focus(); } });
      var pause = d.createElement('button'); pause.type = 'button'; pause.className = 'car-pause';
      var ICON_PAUSE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>', ICON_PLAY = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';
      function paintPause() { pause.innerHTML = userPaused ? ICON_PLAY : ICON_PAUSE; pause.setAttribute('aria-label', userPaused ? 'Start automatic sliding' : 'Pause automatic sliding'); }
      pause.addEventListener('click', function () { userPaused = !userPaused; paintPause(); }); paintPause(); dots.insertBefore(pause, dots.firstChild);
      prev.addEventListener('click', function () { go(cur - 1); }); next.addEventListener('click', function () { go(cur + 1); });
      var st = null; track.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(function () { mark(Math.round(track.scrollLeft / track.clientWidth)); }, 80); }, { passive: true });
      track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); } });
      ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) { car.addEventListener(ev, function () { paused = true; }, { passive: true }); });
      ['mouseleave', 'focusout'].forEach(function (ev) { car.addEventListener(ev, function () { paused = false; }); });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) load(cur + 1); }, { threshold: 0.4 }).observe(car); else { visible = true; slides.forEach(function (s, i) { load(i); }); }
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still) { userPaused = true; paintPause(); }
      setInterval(function () { if (!paused && !userPaused && visible && !d.hidden) go(cur + 1); }, 6500);
      mark(0);
    });
    /* mobile menu: close it after a link is chosen */
    Array.prototype.forEach.call(d.querySelectorAll('.sh-menu a'), function (a) {
      a.addEventListener('click', function () { var m = d.querySelector('.sh-menu'); if (m) m.removeAttribute('open'); });
    });
  });
})();
