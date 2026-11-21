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
  if (user) de.classList.add('signed-in');
  /* The question-bank app lives at /qbank. Old links and sign-in returns that still land on the home page are sent there:
     /#/t/<code> test links, /#/profile, ?code= (Google sign-in coming back) and ?login=1 when someone is already signed in. */
  var pg = de.getAttribute('data-page'), q = window.location.search, hs = window.location.hash;
  if (pg === 'index' && (/^#\/(?!home)/.test(hs) || /[?&](code|error_description)=/.test(q) || (user && /[?&]login=1/.test(q)))) {
    window.location.replace(ROOT + (/^#\/(?!home)/.test(hs) ? 'qbank' : 'dashboard') + q.replace(/([?&])login=1&?/, '$1').replace(/[?&]$/, '') + hs);
  }
  /* safety net: if the host shows the "page not found" page for /qbank, open the file directly */
  if (/^\/qbank\/?$/.test(window.location.pathname) && /not found/i.test(d.title)) window.location.replace(ROOT + 'qbank.html' + q + hs);
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
          + (cm.up ? '<a class="pfm-up" href="' + ROOT + 'qbank#/membership"><b>' + esc(cm.up.t) + '</b><small>' + esc(cm.up.s) + '</small></a>' : '')
          + items.map(function (it) { return '<a class="pfm-i" role="menuitem" href="' + ROOT + 'qbank' + esc(it[0]) + '">' + esc(it[1]) + '</a>'; }).join('')
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
    /* Header menus (Exams, Maths, Resources): open on hover or keyboard focus (CSS). On touch screens (no hover) a tap opens one, another tap closes it. */
    var canHover = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var dds = Array.prototype.slice.call(d.querySelectorAll('.sh-dd'));
    dds.forEach(function (dd) {
      var btn = dd.querySelector('.sh-ddb');
      var setOpen = function (v) { dd.classList.toggle('open', v); btn.setAttribute('aria-expanded', String(v)); if (!v) btn.blur(); };
      if (!canHover) btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var was = dd.classList.contains('open'); dds.forEach(function (o) { if (o !== dd) { o.classList.remove('open'); } }); setOpen(!was); });
      d.addEventListener('click', function (e) { if (dd.classList.contains('open') && !dd.contains(e.target)) setOpen(false); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    });
    /* the page you are on is underlined in the menu */
    (function () {
      var path = window.location.pathname.replace(/index\.html$/, ''), mark = function (a) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); };
      Array.prototype.forEach.call(d.querySelectorAll('.sh-nav > a, .sh-dd > .sh-ddb'), function (a) {
        var u; try { u = new URL(a.getAttribute('href'), window.location.href); } catch (e) { return; }
        if (u.hash || u.search) return;
        var base = u.pathname.replace(/index\.html$/, '');
        if (base === '/' ) return;
        if (path === base || path.indexOf(base) === 0 || (/\/exams\//.test(path) && /\/exams\/safe-scores\/$/.test(base) && /\/exams\/(safe-scores|important-exams)\//.test(path))) mark(a);
      });
    })();
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
      Array.prototype.forEach.call(car.querySelectorAll('.car-slide img'), function (im) {   /* a screen that fails to load is retried once */
        im.addEventListener('error', function () { if (im.getAttribute('data-retry') || im.src.indexOf('data:') === 0) return; im.setAttribute('data-retry', '1'); window.setTimeout(function () { im.src = im.src.split('?')[0] + '?r=' + Date.now(); }, 1200); });
      });
      function load(i) { var im = slides[(i + slides.length) % slides.length].querySelector('img[data-src]'); if (im) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); } }
      function mark(i) { cur = i; load(i - 1); load(i); load(i + 1); tBtns.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; }); dBtns.forEach(function (b, k) { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); }
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
      if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) slides.forEach(function (s, k) { load(k); }); }, { threshold: 0.4 }).observe(car); else { visible = true; slides.forEach(function (s, i) { load(i); }); }
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still) { userPaused = true; paintPause(); }
      setInterval(function () { if (!paused && !userPaused && visible && !d.hidden) go(cur + 1); }, 6500);
      mark(0);
    });
    /* Share icons: WhatsApp and Reddit (direct), Discord and Instagram (copy the link and open the app), Print, and one button that opens every other network. */
    Array.prototype.forEach.call(d.querySelectorAll('[data-share]'), function (box) {
      var canon = d.querySelector('link[rel="canonical"]'), url = canon ? canon.href : window.location.href.split('#')[0].split('?')[0];
      var title = (d.title || 'अंक-IT').replace(/\s*\|\s*अंक-IT\s*$/, ''), text = title + ' | अंक-IT';
      var e = encodeURIComponent, U = e(url), T = e(text);
      var LBL = { whatsapp: 'WhatsApp', reddit: 'Reddit', discord: 'Discord', instagram: 'Instagram', facebook: 'Facebook', x: 'X', linkedin: 'LinkedIn', pinterest: 'Pinterest', threads: 'Threads', snapchat: 'Snapchat' };
      var ic = function (n) { return '<img src="' + ROOT + 'img/share/' + n + '.webp" width="34" height="34" alt="' + (LBL[n] || n) + ' icon" loading="lazy">'; };
      var sv = function (p) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
      var ICO = { print: sv('<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="9" rx="2"/><path d="M7 14h10v7H7z"/>'), share: sv('<circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="m8.3 10.7 7.4-3.4M8.3 13.3l7.4 3.4"/>'),
        copy: sv('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'), mail: sv('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'), tg: sv('<path d="M21 4 3 11l5.5 2L10 19l3-4 5 3z"/>'), dev: sv('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>') };
      var links = { whatsapp: 'https://wa.me/?text=' + e(text + ' ' + url), reddit: 'https://www.reddit.com/submit?url=' + U + '&title=' + T,
        facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + U, x: 'https://twitter.com/intent/tweet?url=' + U + '&text=' + T, linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + U,
        pinterest: 'https://pinterest.com/pin/create/button/?url=' + U + '&description=' + T, threads: 'https://www.threads.net/intent/post?text=' + e(text + ' ' + url),
        snapchat: 'https://www.snapchat.com/scan?attachmentUrl=' + U, telegram: 'https://t.me/share/url?url=' + U + '&text=' + T, mail: 'mailto:?subject=' + T + '&body=' + e(text + '\n' + url) };
      var names = { whatsapp: 'WhatsApp', reddit: 'Reddit', facebook: 'Facebook', x: 'X', linkedin: 'LinkedIn', pinterest: 'Pinterest', threads: 'Threads', snapchat: 'Snapchat' };
      function toast(msg) { var t = d.querySelector('.toast'); if (!t) { t = d.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.hidden = true; d.body.appendChild(t); } t.textContent = msg; t.hidden = false; window.clearTimeout(toast.h); toast.h = window.setTimeout(function () { t.hidden = true; }, 3200); }
      function copy() { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(url); return new Promise(function (res) { var ta = d.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.className = 'sr'; d.body.appendChild(ta); ta.select(); try { d.execCommand('copy'); } catch (x) { /* optional */ } ta.remove(); res(); }); }
      function link(n) { return '<a class="shi" href="' + links[n] + '" target="_blank" rel="noopener noreferrer" aria-label="Share on ' + names[n] + '" title="' + names[n] + '">' + ic(n) + '</a>'; }
      var pop = ['facebook', 'x', 'linkedin', 'pinterest', 'threads', 'snapchat'].map(function (n) { return '<a class="sp-i" href="' + links[n] + '" target="_blank" rel="noopener noreferrer">' + ic(n) + names[n] + '</a>'; }).join('')
        + '<a class="sp-i" href="' + links.telegram + '" target="_blank" rel="noopener noreferrer"><span class="sp-ic">' + ICO.tg + '</span>Telegram</a><a class="sp-i" href="' + links.mail + '"><span class="sp-ic">' + ICO.mail + '</span>Email</a><button type="button" class="sp-i" data-act="copy"><span class="sp-ic">' + ICO.copy + '</span>Copy link</button>'
        + (navigator.share ? '<button type="button" class="sp-i" data-act="native"><span class="sp-ic">' + ICO.dev + '</span>More apps</button>' : '');
      box.innerHTML = link('whatsapp') + link('reddit')
        + '<button type="button" class="shi" data-act="discord" aria-label="Share on Discord (copies the link)" title="Discord">' + ic('discord') + '</button>'
        + '<button type="button" class="shi" data-act="instagram" aria-label="Share on Instagram (copies the link)" title="Instagram">' + ic('instagram') + '</button>'
        + '<button type="button" class="shi shi-svg" data-act="print" aria-label="Print this page" title="Print">' + ICO.print + '</button>'
        + '<button type="button" class="shi shi-svg shi-more" data-act="more" aria-haspopup="true" aria-expanded="false" aria-label="More ways to share" title="More">' + ICO.share + '</button>'
        + '<div class="share-pop" role="menu" hidden>' + pop + '</div>';
      var more = box.querySelector('[data-act="more"]'), pp = box.querySelector('.share-pop');
      if (box.getBoundingClientRect().left > window.innerWidth / 2) pp.classList.add('right');
      function close() { pp.hidden = true; more.setAttribute('aria-expanded', 'false'); }
      box.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act');
        if (a === 'more') { var o = pp.hidden; pp.hidden = !o; more.setAttribute('aria-expanded', String(o)); return; }
        if (a === 'print') { window.print(); return; }
        if (a === 'discord' || a === 'instagram') { window.open(a === 'discord' ? 'https://discord.com/channels/@me' : 'https://www.instagram.com/', '_blank', 'noopener'); copy().then(function () { toast('Link copied. Paste it in ' + (a === 'discord' ? 'Discord' : 'Instagram') + '.'); }); return; }
        if (a === 'copy') { copy().then(function () { toast('Link copied.'); close(); }); return; }
        if (a === 'native') { navigator.share({ title: title, text: text, url: url }).catch(function () { /* cancelled */ }); close(); }
      });
      d.addEventListener('click', function (ev) { if (!pp.hidden && !box.contains(ev.target)) close(); });
      d.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !pp.hidden) { close(); more.focus(); } });
    });
    /* phone menu: built from the main navigation above, so the page itself lists every link only once */
    (function () {
      var nav = d.querySelector('.sh-menu nav'), src = d.querySelector('.sh-nav'); if (!nav || !src) return;
      var mk = function (href, text, img, cls) { var a = d.createElement('a'); a.href = href; if (cls) a.className = cls; if (img) { var im = d.createElement('img'); im.className = 'exlogo'; im.src = img; im.alt = ''; im.width = 26; im.height = 26; a.appendChild(im); } a.appendChild(d.createTextNode(text)); return a; };
      Array.prototype.forEach.call(src.children, function (el) {
        if (el.tagName === 'A') {
          var a = mk(el.href, el.textContent.trim(), '', el.classList.contains('sh-dash') ? 'mm-dash' : '');
          if (el.classList.contains('sh-dash') && el.querySelector('svg')) a.insertAdjacentHTML('afterbegin', el.querySelector('svg').outerHTML);
          nav.appendChild(a); return;
        }
        var ddb = el.querySelector('.sh-ddb'); if (!ddb) return;
        var sub = d.createElement('details'); sub.className = 'sh-sub'; var sm = d.createElement('summary');
        sm.appendChild(d.createTextNode(ddb.textContent.trim() + ' ')); if (ddb.querySelector('svg')) sm.insertAdjacentHTML('beforeend', ddb.querySelector('svg').outerHTML); sub.appendChild(sm);
        var cards = el.querySelectorAll('.mega-card');
        if (cards.length) {
          Array.prototype.forEach.call(cards, function (cd) { var a = cd.querySelector('.stretch'), im = cd.querySelector('img'); if (a) sub.appendChild(mk(a.href, a.textContent, im ? im.src : '')); });
          sub.appendChild(mk(ddb.href, 'All exams', '', 'mm-more'));
          Array.prototype.forEach.call(el.querySelectorAll('.mega-foot a:not(.mega-all)'), function (a) { sub.appendChild(mk(a.href, a.textContent)); });
        } else {
          Array.prototype.forEach.call(el.querySelectorAll('.sh-panel a'), function (a) { sub.appendChild(mk(a.href, a.querySelector('b') ? a.querySelector('b').textContent : a.textContent)); });
        }
        nav.appendChild(sub);
      });
    })();
    /* countdown to an exam day (Indian time): <div class="cd" data-cd="2027-05-23"> with spans data-u="d|h|m|s" */
    (function () {
      var boxes = d.querySelectorAll('[data-cd]'); if (!boxes.length) return;
      var tick = function () {
        Array.prototype.forEach.call(boxes, function (b) {
          var t = new Date(b.getAttribute('data-cd') + 'T00:00:00+05:30').getTime(), left = Math.max(0, Math.floor((t - Date.now()) / 1000));
          var v = { d: Math.floor(left / 86400), h: Math.floor(left % 86400 / 3600), m: Math.floor(left % 3600 / 60), s: left % 60 };
          ['d', 'h', 'm', 's'].forEach(function (k) { var el = b.querySelector('[data-u="' + k + '"]'); if (el) el.textContent = String(v[k]).padStart(k === 'd' ? 1 : 2, '0'); });
          if (left === 0) b.classList.add('cd-done');
        });
      };
      tick(); setInterval(tick, 1000);
    })();
    /* mobile menu: close it after a link is chosen */
    Array.prototype.forEach.call(d.querySelectorAll('.sh-menu a'), function (a) {
      a.addEventListener('click', function () { var m = d.querySelector('.sh-menu'); if (m) m.removeAttribute('open'); });
    });
  });
})();
