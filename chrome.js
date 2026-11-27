/* The top bar and the footer of the two apps (/dashboard and /qbank) come from here, so they are always the same.
   Menu: Dashboard, DPPs, PYPs, Tests, Handouts. Question Bank lives in the profile menu (the round icon on the right). */
(function () {
'use strict';
const { h } = window.AvantiUtil;
const ICON = {
  home: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>'
};
/* [key, label, link]. Every item opens a dashboard page, on /dashboard and on /qbank alike; /qbank itself is only the Question Bank (profile menu). */
const NAV = [['dash', 'Dashboard', 'dashboard#d/'], ['pyq', 'PYQs', 'dashboard#d/pyq'], ['lib', 'DPPs/Exercises', 'dashboard#d/dpp'], ['tests', 'Tests', 'dashboard#/modes'], ['ho', 'Handouts', 'dashboard#d/handouts']];
/* the Guide and Question Bank overview buttons, in the top bar of both apps */
const QB_ITEMS = [['heroov', 'Mathematics Bank: Question Counts'], ['overview', 'Chapter-wise Count'], ['syl', 'Syllabus Priority'], ['wchart', 'Chapter Weightage']];
const tools = () => [
  h('button', { type: 'button', class: 'tb-theme tb-guide', id: 'guideBtn', 'data-act': 'guide', title: 'Guide: what is in this site', 'aria-label': 'Guide: what is in this site', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/></svg>' }),
  h('button', { type: 'button', class: 'tb-theme tb-info', id: 'qbInfoBtn', 'data-act': 'qbinfo', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'Question counts and charts', 'aria-label': 'Question counts and charts', html: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' }),
  h('div', { class: 'tb-pop', id: 'qbPop', hidden: true, role: 'menu' }, QB_ITEMS.map(([k, t]) => k === 'syl' ? h('button', { type: 'button', class: 'tb-item', role: 'menuitemradio', 'aria-selected': 'false', 'aria-checked': 'false', 'data-act': 'tab', 'data-k': 'syl', text: t }) : h('button', { type: 'button', class: 'tb-item', role: 'menuitemradio', 'aria-selected': 'false', 'aria-checked': 'false', 'data-qbpanel': k, text: t })))];
const THEME_KEY = 'avanti-teacher-theme';
const head = () => h('div', { class: 'tb-head' }, h('img', { class: 'tb-logo', src: 'img/ankit-logo-dark-sm.png?v=922', alt: 'अंक-IT', width: 139, height: 52 }), h('h1', { class: 'tb-title', text: 'Mathematics Dashboard' }), h('span', { class: 'tb-sub', text: 'JEE, CET, NDA, IAT, PYPs, DPPs, Handouts' }));
const home = () => h('a', { class: 'tb-theme tb-home', id: 'homeBtn', href: '/', title: 'Home page', 'aria-label': 'Home page', html: ICON.home });
const themeBtn = () => h('button', { type: 'button', class: 'tb-theme', id: 'themeBtn', 'data-act': 'theme', 'aria-pressed': 'false' });
/* mode 'qbank': tab buttons handled by teacher.b870.js; mode 'dash': plain links. active = the key that is lit. */
function nav(mode, active) {
  return h('nav', { class: 'tb-menu' }, NAV.map(([k, t, to]) => {
    return h('a', { class: 'tb', href: to, 'data-k': k, 'aria-pressed': String(k === active), text: t });
  }), h('div', { class: 'tb-prof', id: 'tbProfile' }));
}
/* light / dark switch for the dashboard (on /qbank teacher.b870.js does the same job) */
function themeInit() {
  const now = () => { const a = document.documentElement.getAttribute('data-theme'); if (a === 'dark' || a === 'light') return a; try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; } };
  const apply = m => { document.documentElement.setAttribute('data-theme', m); const b = document.getElementById('themeBtn'); if (b) { b.setAttribute('aria-pressed', String(m === 'dark')); const to = m === 'dark' ? 'light' : 'dark'; b.title = 'Switch to ' + to + ' mode'; b.setAttribute('aria-label', 'Switch to ' + to + ' mode'); b.innerHTML = m === 'dark' ? ICON.sun : ICON.moon; } };
  apply(now());
  const b = document.getElementById('themeBtn'); if (b) b.addEventListener('click', () => { const m = now() === 'dark' ? 'light' : 'dark'; apply(m); try { localStorage.setItem(THEME_KEY, m); } catch (e) { /* optional */ } });
}
const FOOT_CSS = '.app-foot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 14px;margin:28px auto 0;padding:14px 16px 20px;border-top:1px solid var(--color-border-line,rgba(128,128,128,.28));font-size:12px;line-height:1.4;letter-spacing:.02em;color:var(--color-fg-muted,#6b7280)}.app-foot .af-brand{font-weight:600;order:3;flex-basis:100%;text-align:center;margin-top:8px}.app-foot .af-ver::before{display:none!important}.app-foot .af-ver:not(:empty)::before,.app-foot .af-link:not(:empty)::before{content:"|";margin-right:14px;opacity:.45}.app-foot .qb-sstat-link{font:inherit;color:inherit;text-decoration:none;cursor:pointer;border-bottom:1px dotted currentColor;padding:0}.app-foot .qb-sstat-link:hover{color:var(--color-fg,#111);border-bottom-style:solid}';
function footer() {
  if (!document.getElementById('app-foot-css')) { const st = document.createElement('style'); st.id = 'app-foot-css'; st.textContent = FOOT_CSS; document.head.append(st); }
  return h('footer', { class: 'app-foot', id: 'appFoot' },
    h('span', { class: 'af-brand' }, 'Made with ', h('span', { class: 'af-heart', style: 'color:#e11d48', 'aria-label': 'love', text: '♥' }), ' by Ankit'),
    h('span', { class: 'af-ver', id: 'appFootSite' }), h('span', { class: 'af-ver', id: 'appFootVer' }), h('span', { class: 'af-link', id: 'appFootLink' }));
}
/* "Website v979 · 21 Nov 2026": tap it to see what changed in each version */
function footerInit() {
  const f = document.getElementById('appFootSite'), b = window.AvantiBoot; if (!f || !b) return;
  f.textContent = 'Website v' + b.build + ' · ' + b.released; f.setAttribute('role', 'button'); f.tabIndex = 0; f.title = 'See what changed in each version'; f.classList.add('af-click');
  const open = () => { if (window.AvantiPortal) window.AvantiPortal.showChangelog(); };
  f.addEventListener('click', open); f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
}
window.AvantiChrome = Object.freeze({ ICON, NAV, QB_ITEMS, head, home, themeBtn, tools, nav, footer, footerInit, themeInit });
})();
