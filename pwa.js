/* Install as an app (iPhone and iPad: Safari → Share → Add to Home Screen; Android: Chrome → Install app) and the service worker. */
(function () {
  'use strict';
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () { /* not installable here */ }); });
  }
  var framed = false; try { framed = window.top !== window.self; } catch (e) { framed = true; }
  if (standalone || framed) return;   /* no install bar inside the dashboard's pop-ups */
  var KEY = 'avanti-pwa-dismissed', WAIT = 14 * 864e5;
  function dismissed() { try { var t = +localStorage.getItem(KEY); return t && Date.now() - t < WAIT; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* optional */ } }
  var bar = null;
  function show(text, action) {
    if (bar || dismissed() || document.body.classList.contains('ex-on')) return;
    bar = document.createElement('div'); bar.className = 'pwa-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Install the app');
    var t = document.createElement('span'); t.className = 'pwa-txt'; t.textContent = text; bar.appendChild(t);
    if (action) { var go = document.createElement('button'); go.type = 'button'; go.className = 'pwa-go'; go.textContent = 'Install'; go.addEventListener('click', function () { action(); }); bar.appendChild(go); }
    var x = document.createElement('button'); x.type = 'button'; x.className = 'pwa-x'; x.textContent = 'Not now'; x.addEventListener('click', function () { remember(); hide(); }); bar.appendChild(x);
    document.body.appendChild(bar);
  }
  function hide() { if (bar) { bar.remove(); bar = null; } }
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {   /* Android (Chrome, Edge, Samsung Internet) and desktop Chrome */
    e.preventDefault(); deferred = e;
    setTimeout(function () { show('Install अंक-IT as an app on this device.', function () { hide(); deferred.prompt(); deferred.userChoice.then(function () { deferred = null; }); }); }, 4000);
  });
  window.addEventListener('appinstalled', function () { hide(); remember(); });
  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  if (ios && safari) setTimeout(function () { show('To install: tap the Share button, then "Add to Home Screen".', null); }, 5000);   /* iOS has no install button for websites */
})();
