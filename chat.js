/* अंक-IT · Mathematics Dashboard · teachers' chat (bottom-right).
   For the admin, and Premium teachers / Avanti teachers whose school the admin approved (function chat_member).
   A message is saved by the database function chat_send, which writes the sender's real name, school and role (nobody can
   pose as someone else), limits how fast one person can send, and deletes messages after 24 hours. New messages arrive
   live through Supabase Realtime; the "online" list sends only account ids and the names come from the database. */
(function () {
'use strict';
const h = window.AvantiUtil.h;
const AU = () => window.AvantiAuth;
const TOPIC = 'teachers-room';
const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>';
const SEND = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>';
const time = t => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0].toUpperCase()).join('') || '?';

let started = false, ch = null, msgCh = null, me = null, isOpen = false, unread = 0, status = 'connecting', people = [];
const seenMsg = new Set(), names = new Map();
let errText = '';
let fab, badge, retryBtn, dot, panel, list, peopleBox, peopleBtn, input, sendBtn, note;

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
  note.textContent = status === 'off' ? 'The chat could not connect' + (errText ? ' (' + errText + ')' : '') + '.' : 'Messages are deleted after 24 hours.';
  retryBtn.hidden = status !== 'off';
}
/* a saved message (row of chat_messages) → bubble */
function addRow(r) {
  if (!r || seenMsg.has(r.id)) return; seenMsg.add(r.id);
  addMessage({ from: r.user_id, name: r.name, school: r.school, text: r.body, at: new Date(r.created_at).getTime() });
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
  const keep = input.value; input.value = ''; input.style.height = ''; render();
  AU().rpc('chat_send', { p_body: text }).catch(e => { input.value = keep; render(); note.textContent = 'Message not sent: ' + (e && e.message ? e.message : 'check your internet connection') + '.'; });
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
  retryBtn = h('button', { type: 'button', class: 'ch-retry', hidden: true, text: 'Try again', onclick: () => { status = 'connecting'; errText = ''; render(); connect(); } });
  panel = h('section', { class: 'ch-panel', hidden: true, role: 'dialog', 'aria-label': "Teachers' chat" },
    h('header', { class: 'ch-head' }, h('div', { class: 'ch-title' }, h('b', { text: "Teachers' chat" }), peopleBtn),
      h('button', { type: 'button', class: 'ch-x', 'aria-label': 'Close chat', html: '&times;', onclick: () => { toggle(false); fab.focus(); } })),
    peopleBox, list, h('div', { class: 'ch-compose' }, input, sendBtn), note, retryBtn);
  document.body.append(panel, fab);
}
async function connect() {
  const sb = AU().sb;
  if (ch) { try { await sb.removeChannel(ch); } catch (e) { /* already gone */ } ch = null; }
  if (msgCh) { try { await sb.removeChannel(msgCh); } catch (e) { /* already gone */ } msgCh = null; }
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) { status = 'off'; errText = 'you are not signed in'; render(); return; }
    await sb.realtime.setAuth(data.session.access_token);
  } catch (e) { /* the client sets it too */ }
  /* new saved messages, live (the database only sends them to chat members) */
  msgCh = sb.channel('chat-messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, ({ new: r }) => addRow(r))
    .subscribe(s => { if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { status = 'off'; errText = 'new messages could not be received'; render(); } });
  sb.from('chat_messages').select('id,user_id,name,school,body,created_at').gte('created_at', new Date(Date.now() - 864e5).toISOString())
    .order('id', { ascending: true }).limit(200).then(({ data }) => { (data || []).forEach(addRow); }, () => {});
  const mine = sb.channel(TOPIC, { config: { private: true, presence: { key: me.id } } });
  ch = mine;
  mine.on('presence', { event: 'sync' }, async () => {
    const ids = [...new Set(Object.values(mine.presenceState()).flat().map(p => p && p.id).filter(id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)))];
    const unknown = ids.filter(id => !names.has(id));
    if (unknown.length) { try { (await AU().rpc('chat_people', { p_ids: unknown }) || []).forEach(p => names.set(p.id, p)); } catch (e) { /* names stay unknown */ } }
    people = ids.map(id => names.get(id)).filter(Boolean).sort((a, b) => (a.id === me.id) - (b.id === me.id) || String(a.name).localeCompare(String(b.name)));
    render();
  });
  mine.subscribe(async (s, err) => {
    if (ch !== mine) return;
    if (s === 'SUBSCRIBED') { status = 'live'; errText = ''; render(); await mine.track({ id: me.id }); }
    else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
      status = 'off';
      const m = String((err && err.message) || s);
      errText = /permission|unauthori/i.test(m) ? 'the server did not allow this account to join: ' + m : s === 'TIMED_OUT' ? 'no answer from the server' : m;
      if (window.console) console.warn("Teachers' chat:", s, m);
      render();
    }
  });
}
function start() {
  const a = AU(); if (started || !a || !a.profile || !a.perm || !(a.perm.isAdmin || (a.perm.manageStudents && a.perm.schoolApproved))) return;
  started = true;
  const p = a.profile;
  me = { id: p.id, name: p.full_name || p.email || 'Teacher', school: p.school || '', role: a.perm.isAdmin ? 'Admin' : a.perm.staff ? 'Avanti teacher' : 'Premium teacher' };
  build(); render(); connect();
}
window.AvantiChat = { start };
})();
