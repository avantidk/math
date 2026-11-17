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
  function ready(fn) { if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () {
    if (user) {
      var meta = user.user_metadata || {};
      var name = String(meta.full_name || meta.name || user.email || '').trim();
      var parts = name.split(/[\s@._-]+/).filter(Boolean);
      var ini = ((parts[0] || '?').charAt(0) + (parts.length > 1 ? parts[1].charAt(0) : '')).toUpperCase();
      Array.prototype.forEach.call(d.querySelectorAll('[data-av]'), function (el) { el.textContent = ini; el.setAttribute('title', name || 'Your profile'); });
    }
    /* Signed-in account menu (the same items as the dashboard's name icon). The dashboard saves them in this browser each time it opens. */
    var canHover0 = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); };
    if (user) {
      var cache = null; try { cache = JSON.parse(window.localStorage.getItem('avanti-md-menu') || 'null'); } catch (e) { cache = null; }
      var cm = cache || {}, mm = user.user_metadata || {};
      var items = cm.items && cm.items.length ? cm.items : [['#/profile', 'Edit profile'], ['#/help', 'Help & Support']];
      Array.prototype.forEach.call(d.querySelectorAll('.sh-pf'), function (pf) {
        var av = pf.querySelector('.sh-av'), menu = pf.querySelector('.pfm');
        av.classList.add(cm.g ? 'av-gold' : (cm.t === 't' ? 'av-t' : 'av-s')); if (cm.g) av.classList.add(cm.t === 't' ? 'ring-t' : 'ring-s');
        var pill = cm.pl ? '<span class="pfm-plan ' + (cm.g ? 'pf-gold' : (cm.t === 't' ? 'pf-free-t' : 'pf-free-s')) + '">' + esc(cm.pl) + '</span>' : '';
        menu.innerHTML = '<div class="pfm-who"><strong>' + esc(cm.n || mm.full_name || mm.name || user.email || 'Your account') + '</strong><span class="pfm-mail">' + esc(cm.e || user.email || '') + '</span>' + pill + '</div>'
          + (cm.up ? '<a class="pfm-up" href="' + ROOT + '#/membership"><b>' + esc(cm.up.t) + '</b><small>' + esc(cm.up.s) + '</small></a>' : '')
          + items.map(function (it) { return '<a class="pfm-i" role="menuitem" href="' + ROOT + esc(it[0]) + '">' + esc(it[1]) + '</a>'; }).join('')
          + '<button type="button" class="pfm-i pfm-out" role="menuitem">Logout</button>';
        menu.querySelector('.pfm-out').addEventListener('click', function () {
          if (window.AvantiAuth && window.AvantiAuth.signOut) window.AvantiAuth.signOut(); else if (window.AvantiLogin && window.AvantiLogin.signOut) window.AvantiLogin.signOut(); else window.location.href = ROOT;
        });
        if (!canHover0) av.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); pf.classList.toggle('open'); av.setAttribute('aria-expanded', String(pf.classList.contains('open'))); });
        d.addEventListener('click', function (e) { if (pf.classList.contains('open') && !pf.contains(e.target)) { pf.classList.remove('open'); av.setAttribute('aria-expanded', 'false'); } });
        d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { pf.classList.remove('open'); av.blur(); } });
      });
    }
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
    /* carousel of dashboard screens: arrows, tabs, dots, swipe and a slow auto-advance that stops when you point at it */
    Array.prototype.forEach.call(d.querySelectorAll('[data-car]'), function (car) {
      var track = car.querySelector('.car-track'), slides = Array.prototype.slice.call(track.children);
      var tabs = car.querySelector('.car-tabs'), dots = car.querySelector('.car-dots'), prev = car.querySelector('.car-prev'), next = car.querySelector('.car-next');
      var cur = 0, paused = false, visible = false, tBtns = [], dBtns = [];
      [tabs, dots, prev, next].forEach(function (el) { el.hidden = false; });
      function mark(i) { cur = i; tBtns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); }); dBtns.forEach(function (b, k) { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); }
      function go(i) { i = (i + slides.length) % slides.length; track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); mark(i); }
      slides.forEach(function (s, i) {
        var t = d.createElement('button'); t.type = 'button'; t.setAttribute('role', 'tab'); t.textContent = s.getAttribute('data-title'); t.addEventListener('click', function () { go(i); }); tabs.appendChild(t); tBtns.push(t);
        var x = d.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Show screen ' + (i + 1) + ': ' + s.getAttribute('data-title')); x.addEventListener('click', function () { go(i); }); dots.appendChild(x); dBtns.push(x);
      });
      prev.addEventListener('click', function () { go(cur - 1); }); next.addEventListener('click', function () { go(cur + 1); });
      var st = null; track.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(function () { mark(Math.round(track.scrollLeft / track.clientWidth)); }, 80); }, { passive: true });
      track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); } });
      ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) { car.addEventListener(ev, function () { paused = true; }, { passive: true }); });
      ['mouseleave', 'focusout'].forEach(function (ev) { car.addEventListener(ev, function () { paused = false; }); });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.4 }).observe(car); else visible = true;
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!still) setInterval(function () { if (!paused && visible && !d.hidden) go(cur + 1); }, 6500);
      mark(0);
    });
    /* mobile menu: close it after a link is chosen */
    Array.prototype.forEach.call(d.querySelectorAll('.sh-menu a'), function (a) {
      a.addEventListener('click', function () { var m = d.querySelector('.sh-menu'); if (m) m.removeAttribute('open'); });
    });
  });
})();
