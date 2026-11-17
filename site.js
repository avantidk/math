/* अंक-IT · Mathematics Dashboard · shared by every public page (home, chapters, About, Contact, Privacy, Terms).
   It only READS the sign-in that this browser already saved, to show the right buttons in the header (Login, or Dashboard and the
   name icon). It never sends it anywhere and never signs anyone in: that is done by auth.js on the home page. */
(function () {
  'use strict';
  var d = document, de = d.documentElement, user = null;
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
    /* Exams drop-down: opens on hover or keyboard focus (CSS) and on click or tap (here); closes on Escape or a click elsewhere */
    var dd = d.querySelector('.sh-dd');
    if (dd) {
      var btn = dd.querySelector('.sh-ddb');
      var setOpen = function (v) { dd.classList.toggle('open', v); btn.setAttribute('aria-expanded', String(v)); if (!v) btn.blur(); };   /* blur: keyboard focus alone must not keep it open */
      btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!dd.classList.contains('open')); });
      d.addEventListener('click', function (e) { if (!dd.contains(e.target)) setOpen(false); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    }
    /* mobile menu: close it after a link is chosen */
    Array.prototype.forEach.call(d.querySelectorAll('.sh-menu a'), function (a) {
      a.addEventListener('click', function () { var m = d.querySelector('.sh-menu'); if (m) m.removeAttribute('open'); });
    });
  });
})();
