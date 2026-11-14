/* Avanti Fellows · Mathematics Dashboard · teachers' chat (bottom-right).
   For Premium teachers, Avanti teachers and the admin. Messages go live to the teachers who are online
   through a private Supabase Realtime channel and are never stored: they are gone after a reload.
   The database only lets Premium teachers and Staff join the channel (policies on realtime.messages in schema.sql). */
(function () {
'use strict';
const AU = () => window.AvantiAuth;
const TOPIC = 'teachers-room';
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
const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';
const time = t => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0].toUpperCase()).join('') || '?';

let started = false, ch = null, me = null, isOpen = false, unread = 0, status = 'connecting', people = [];
let fab, badge, dot, panel, list, peopleBox, peopleBtn, input, sendBtn, note;

function render() {
  const n = people.filter(p => p.id !== me.id).length;
  dot.textContent = n ? String(n) : ''; dot.hidden = !n;
  badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = !unread || isOpen;
  peopleBtn.textContent = status === 'live' ? (n ? n + ' other teacher' + (n === 1 ? '' : 's') + ' online' : 'No other teacher online') : status === 'off' ? 'Chat not available' : 'Connecting…';
  peopleBox.textContent = '';
  people.forEach(p => peopleBox.append(h('div', { class: 'ch-person' }, h('span', { class: 'ch-av', text: initials(p.name) }),
    h('span', { class: 'ch-pn' }, h('b', { text: p.name + (p.id === me.id ? ' (you)' : '') }), h('small', { text: [p.role, p.school].filter(Boolean).join(' · ') })))));
  const can = status === 'live';
  input.disabled = !can; sendBtn.disabled = !can || !input.value.trim();
  note.textContent = status === 'off' ? 'The chat could not connect. Refresh the page to try again.' : 'Temporary chat: messages are not saved and disappear when you reload.';
}
function addMessage(m) {
  const mine = m.from === me.id;
  const last = list.lastElementChild;
  const sameAuthor = last && last.dataset.from === m.from && m.at - (+last.dataset.at) < 120000;
  const bubble = h('div', { class: 'ch-msg' + (mine ? ' mine' : '') + (sameAuthor ? ' cont' : ''), 'data-from': m.from, 'data-at': String(m.at) },
    sameAuthor || mine ? null : h('div', { class: 'ch-who' }, h('b', { text: m.name }), m.school ? h('span', { text: ' · ' + m.school }) : null),
    h('div', { class: 'ch-text', text: m.text }), h('div', { class: 'ch-time', text: time(m.at) }));
  const empty = list.querySelector('.ch-empty'); if (empty) empty.remove();
  list.append(bubble); list.scrollTop = list.scrollHeight;
  if (!mine && !isOpen) { unread++; render(); }
}
function send() {
  const text = input.value.trim().slice(0, 1000);
  if (!text || status !== 'live') return;
  const m = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)), from: me.id, name: me.name, school: me.school, text, at: Date.now() };
  ch.send({ type: 'broadcast', event: 'msg', payload: m }).then(r => { if (r !== 'ok') { note.textContent = 'Message not sent. Check your internet connection.'; } });
  input.value = ''; input.style.height = ''; render();
}
function toggle(force) {
  isOpen = force == null ? !isOpen : force;
  panel.hidden = !isOpen; fab.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) { unread = 0; setTimeout(() => input.focus(), 0); list.scrollTop = list.scrollHeight; }
  render();
}
function build() {
  badge = h('span', { class: 'ch-badge', hidden: true });
  dot = h('span', { class: 'ch-online', hidden: true, title: 'Teachers online' });
  fab = h('button', { type: 'button', class: 'ch-fab', 'aria-label': "Teachers' chat", title: "Teachers' chat", 'aria-expanded': 'false', html: ICON, onclick: () => toggle() });
  fab.append(badge, dot);
  list = h('div', { class: 'ch-list', role: 'log', 'aria-live': 'polite' }, h('div', { class: 'ch-empty' }, h('b', { text: 'Chat with teachers who are online' }), h('span', { text: 'Ask a question, share a test idea or a link. Only Premium and Avanti teachers can see this chat.' })));
  peopleBox = h('div', { class: 'ch-people', hidden: true });
  peopleBtn = h('button', { type: 'button', class: 'ch-pbtn', 'aria-expanded': 'false', onclick: () => { peopleBox.hidden = !peopleBox.hidden; peopleBtn.setAttribute('aria-expanded', String(!peopleBox.hidden)); } });
  input = h('textarea', { class: 'ch-input', rows: 1, maxlength: 1000, placeholder: 'Message online teachers…', 'aria-label': 'Message',
    oninput: () => { input.style.height = ''; input.style.height = Math.min(120, input.scrollHeight) + 'px'; sendBtn.disabled = status !== 'live' || !input.value.trim(); },
    onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'Escape') { toggle(false); fab.focus(); } } });
  sendBtn = h('button', { type: 'button', class: 'ch-send', 'aria-label': 'Send', title: 'Send (Enter)', html: SEND, onclick: send });
  note = h('p', { class: 'ch-note' });
  panel = h('section', { class: 'ch-panel', hidden: true, role: 'dialog', 'aria-label': "Teachers' chat" },
    h('header', { class: 'ch-head' }, h('div', { class: 'ch-title' }, h('b', { text: "Teachers' chat" }), peopleBtn),
      h('button', { type: 'button', class: 'ch-x', 'aria-label': 'Close chat', html: '&times;', onclick: () => { toggle(false); fab.focus(); } })),
    peopleBox, list, h('div', { class: 'ch-compose' }, input, sendBtn), note);
  document.body.append(panel, fab);
}
async function connect() {
  const sb = AU().sb;
  try { const { data } = await sb.auth.getSession(); if (data.session) sb.realtime.setAuth(data.session.access_token); } catch (e) { /* the client sets it too */ }
  ch = sb.channel(TOPIC, { config: { private: true, broadcast: { self: true }, presence: { key: me.id } } });
  ch.on('presence', { event: 'sync' }, () => {
    const st = ch.presenceState(), seen = new Map();
    Object.values(st).flat().forEach(p => { if (p && p.id && !seen.has(p.id)) seen.set(p.id, p); });
    people = [...seen.values()].sort((a, b) => (a.id === me.id) - (b.id === me.id) || String(a.name).localeCompare(String(b.name)));
    render();
  });
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => { if (payload && payload.text && payload.from) addMessage(payload); });
  ch.subscribe(async s => {
    if (s === 'SUBSCRIBED') { status = 'live'; render(); await ch.track({ id: me.id, name: me.name, school: me.school, role: me.role }); }
    else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') { status = 'off'; render(); }
  });
}
function start() {
  const a = AU(); if (started || !a || !a.profile || !a.perm || !a.perm.manageStudents) return;
  started = true;
  const p = a.profile;
  me = { id: p.id, name: p.full_name || p.email || 'Teacher', school: p.school || '', role: a.perm.isAdmin ? 'Admin' : a.perm.staff ? 'Avanti teacher' : 'Premium teacher' };
  build(); render(); connect();
}
window.AvantiChat = { start };
})();
