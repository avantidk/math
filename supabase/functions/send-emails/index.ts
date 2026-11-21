// Supabase Edge Function: send-emails
// Sends the emails that the database has queued (table email_queue) from unkganit@gmail.com:
//   welcome          after someone chooses a role and a school (asks for the school / teacher ID card while the school is pending)
//   school_changed   when a person's school is changed (by themselves after approval, or by the admin)
//   school_approved  when the admin verifies a school
//   membership       thank-you and receipt after a Premium payment
// The browser cannot write to the queue: the database does it. Anybody may start a run (the website does after a sign-up, the scheduled
// GitHub job does every 15 minutes); a run only sends mail that is already waiting, so it cannot be abused to send anything else.
//
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor → name it  send-emails → paste → Deploy.
//         Then open the function → Details → turn OFF "Verify JWT" (like the other two functions) → Save.
// Secrets (Supabase → Edge Functions → Secrets):
//   GMAIL_APP_PASSWORD   a Google "App password" of unkganit@gmail.com (Google account → Security → 2-Step Verification → App passwords)
//   GMAIL_USER           optional, default unkganit@gmail.com

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.14';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? 'unkganit@gmail.com';
const GMAIL_PASS = Deno.env.get('GMAIL_APP_PASSWORD') ?? '';
const SITE = 'https://unkganit.com';
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? SITE;
const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const first = (n: string | null) => (n || '').trim().split(/\s+/)[0] || 'there';
const rupees = (paise: number) => 'Rs. ' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const dateIn = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

type Mail = { subject: string; text: string; html: string };
// one simple, readable layout for every email
function layout(title: string, paras: string[], footer = 'Reply to this email if you need help.'): Mail['html'] {
  const body = paras.map((p) => `<p style="margin:0 0 14px;line-height:1.55">${p}</p>`).join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1b2540;max-width:560px;margin:0 auto;padding:20px">
<div style="background:#0c1a3d;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0;font-size:18px;font-weight:700">अंक-IT Mathematics</div>
<div style="border:1px solid #e1e6ef;border-top:0;border-radius:0 0 10px 10px;padding:20px">
<h2 style="margin:0 0 14px;font-size:19px">${esc(title)}</h2>${body}
<p style="margin:18px 0 0;color:#66728b;font-size:13px">${esc(footer)}<br><a href="${SITE}">unkganit.com</a></p></div></div>`;
}
const plain = (paras: string[]) => paras.map((p) => p.replace(/<[^>]+>/g, '')).join('\n\n');

const ID_ASK = (role: string) =>
  role === 'teacher'
    ? 'Please <b>reply directly to this email with a clear photo or PDF of your School / Teacher ID card</b> and wait for the admin to verify it.'
    : 'Please <b>reply directly to this email with a clear photo or PDF of your School ID card</b> and wait for the admin to verify it.';
const WHAT_PENDING = (role: string) =>
  role === 'teacher'
    ? 'You can already use all the features of the platform right away. Verification is needed only to unlock viewing the performance and dates of birth of the students of your own school.'
    : 'You can already open the whole dashboard and all the practice tools without waiting. Verification is needed only to compete on your school\'s leaderboard.';

function build(kind: string, p: Record<string, any>, who: { full_name: string | null; role: string | null }): Mail {
  const name = esc(first(who.full_name));
  const role = String(p.role || who.role || 'student');
  if (kind === 'welcome') {
    const paras = [`Hi ${name},`, `Thank you for registering on <b>unkganit.com</b>. Your account is ready: ${role === 'teacher' ? 'Free Teacher' : 'Free Student'}.`];
    if (p.pending) {
      paras.push(`The school you chose, <b>${esc(p.school)}</b>, is currently <b>Pending</b> verification.`, ID_ASK(role), WHAT_PENDING(role));
    } else {
      paras.push(`Your school is saved as <b>${esc(p.school)}</b>. You can start practising now.`);
    }
    paras.push(`<a href="${SITE}/dashboard">Open your dashboard</a>`);
    return { subject: 'Welcome to अंक-IT Mathematics', text: plain(paras), html: layout('Welcome!', paras) };
  }
  if (kind === 'school_changed') {
    const paras = [`Hi ${name},`, `Your school on <b>unkganit.com</b> has been updated${p.old ? ' from <b>' + esc(p.old) + '</b>' : ''} to <b>${esc(p.new)}</b>.`];
    if (p.pending) paras.push('This school is <b>Pending</b> verification.', ID_ASK(role), WHAT_PENDING(role));
    else paras.push('Your school is verified or needs no verification, so nothing more is needed.');
    paras.push('If you did not expect this change, reply to this email and we will look into it.');
    return { subject: 'Your school was updated', text: plain(paras), html: layout('School updated', paras) };
  }
  if (kind === 'school_approved') {
    const paras = [`Hi ${name},`, `Good news: your school, <b>${esc(p.school)}</b>, has been <b>verified</b>.`,
      role === 'teacher' ? 'You can now see the performance of the students of your school.' : 'You can now compete on your school\'s leaderboard.'];
    return { subject: 'Your school is verified', text: plain(paras), html: layout('School verified', paras) };
  }
  if (kind === 'membership') {
    const rows = [['Plan', role === 'teacher' ? 'Premium Teacher (1 year)' : 'Premium Student (1 year)'], ['Amount paid', rupees(Number(p.amount_paise || 0))],
      ['Valid until', dateIn(p.until)], ['Payment ID', String(p.payment_id || '')], ['Order ID', String(p.order_id || '')]];
    const table = '<table style="border-collapse:collapse;width:100%;margin:6px 0 14px">' +
      rows.map(([k, v]) => `<tr><td style="padding:7px 10px;border:1px solid #e1e6ef;background:#f6f8fc;width:38%">${esc(k)}</td><td style="padding:7px 10px;border:1px solid #e1e6ef">${esc(v)}</td></tr>`).join('') + '</table>';
    const paras = [`Hi ${name},`, 'Thank you for upgrading to <b>Premium</b>. Your payment was received and your plan is active. This email is your receipt.', table, `<a href="${SITE}/dashboard">Open your dashboard</a>`];
    const txt = [`Hi ${first(who.full_name)},`, 'Thank you for upgrading to Premium. This email is your receipt.', rows.map(([k, v]) => `${k}: ${v}`).join('\n')].join('\n\n');
    return { subject: 'Thank you for going Premium: your receipt', text: txt, html: layout('Payment received', paras, 'Keep this email as your receipt. Reply if anything looks wrong.') };
  }
  throw new Error('Unknown email kind ' + kind);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!GMAIL_PASS) return json({ error: 'GMAIL_APP_PASSWORD is not set in the function secrets' }, 500);
  const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
  const { data: rows, error } = await admin.from('email_queue').select('*').is('sent_at', null).lt('attempts', 5).order('id').limit(20);
  if (error) return json({ error: error.message }, 500);
  let sent = 0, failed = 0;
  for (const r of rows ?? []) {
    // claim the row first so two runs at the same time never send it twice
    const { data: claimed } = await admin.from('email_queue').update({ attempts: r.attempts + 1 }).eq('id', r.id).eq('attempts', r.attempts).is('sent_at', null).select('id');
    if (!claimed || !claimed.length) continue;
    try {
      const { data: u } = await admin.from('profiles').select('full_name, email, role').eq('id', r.user_id).maybeSingle();
      if (!u || !u.email) { await admin.from('email_queue').update({ sent_at: new Date().toISOString(), error: 'no email address' }).eq('id', r.id); continue; }
      const m = build(r.kind, r.payload || {}, u);
      await transport.sendMail({ from: `"अंक-IT Mathematics" <${GMAIL_USER}>`, replyTo: GMAIL_USER, to: u.email, subject: m.subject, text: m.text, html: m.html });
      await admin.from('email_queue').update({ sent_at: new Date().toISOString(), error: null }).eq('id', r.id);
      sent++;
    } catch (e) {
      failed++;
      await admin.from('email_queue').update({ error: String((e as Error).message || e).slice(0, 300) }).eq('id', r.id);
    }
  }
  return json({ ok: true, sent, failed });
});
