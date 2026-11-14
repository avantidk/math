// Supabase Edge Function: razorpay
// Premium membership payments. The browser is never trusted: Premium is given only after this
// function has checked Razorpay's signature (and asked Razorpay for the payment), or after a
// signed Razorpay webhook arrives. Both paths are safe to run twice.
//
//   POST { action: "create-order" }                 (signed-in user)  -> a Razorpay order for 1 year of Premium
//   POST { action: "verify", razorpay_order_id, razorpay_payment_id, razorpay_signature }  (signed-in user)
//   POST from Razorpay with header X-Razorpay-Signature  -> webhook (payment.captured, order.paid, payment.failed)
//
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor → name it  razorpay → paste → Deploy.
//         Then open the function → Details → turn OFF "Verify JWT" (Razorpay cannot send a Supabase login) → Save.
// Secrets (Supabase → Edge Functions → Secrets):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
//   PREMIUM_PRICE_PAISE   optional, default 100 (= Rs. 1)

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';
const PRICE = Number(Deno.env.get('PREMIUM_PRICE_PAISE') ?? '100') || 100;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameText(a: string, b: string): boolean {   // constant-time compare
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function razorpay(path: string, init: RequestInit = {}) {
  const r = await fetch('https://api.razorpay.com/v1' + path, {
    ...init,
    headers: { Authorization: 'Basic ' + btoa(KEY_ID + ':' + KEY_SECRET), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body && body.error && body.error.description) || 'Razorpay error ' + r.status);
  return body;
}

// Premium is granted only for a captured payment of the right order and amount.
async function settle(orderId: string, paymentId: string): Promise<'paid' | 'failed' | 'pending'> {
  let p = await razorpay('/payments/' + encodeURIComponent(paymentId));
  if (p.order_id !== orderId) throw new Error('Payment does not belong to this order');
  if (p.status === 'authorized') p = await razorpay('/payments/' + encodeURIComponent(paymentId) + '/capture', { method: 'POST', body: JSON.stringify({ amount: p.amount, currency: p.currency }) });
  if (p.status === 'captured') {
    const { error } = await admin.rpc('grant_premium', { p_order_id: orderId, p_payment_id: paymentId, p_amount_paise: p.amount });
    if (error) throw new Error(error.message);
    return 'paid';
  }
  if (p.status === 'failed') {
    await admin.rpc('mark_payment_failed', { p_order_id: orderId, p_payment_id: paymentId, p_error: p.error_description ?? 'failed' });
    return 'failed';
  }
  return 'pending';
}

async function webhook(raw: string, signature: string) {
  if (!WEBHOOK_SECRET) return json({ error: 'Webhook secret is not set' }, 500);
  if (!sameText(await hmacHex(WEBHOOK_SECRET, raw), signature)) return json({ error: 'Bad signature' }, 401);
  const evt = JSON.parse(raw);
  const pay = evt?.payload?.payment?.entity;
  if (!pay || !pay.order_id) return json({ ok: true, ignored: true });
  const { data: row } = await admin.from('payments').select('order_id').eq('order_id', pay.order_id).maybeSingle();
  if (!row) return json({ ok: true, ignored: true });   // a payment that is not a membership
  try {
    if (evt.event === 'payment.failed') {
      await admin.rpc('mark_payment_failed', { p_order_id: pay.order_id, p_payment_id: pay.id, p_error: pay.error_description ?? 'failed' });
    } else if (evt.event === 'payment.captured' || evt.event === 'order.paid' || evt.event === 'payment.authorized') {
      await settle(pay.order_id, pay.id);
    }
  } catch (e) {
    console.error('webhook', (e as Error).message);
    return json({ error: 'Could not process' }, 500);   // Razorpay retries later
  }
  return json({ ok: true });
}

async function signedInUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  const raw = await req.text();
  const sig = req.headers.get('x-razorpay-signature');
  if (sig) return webhook(raw, sig);

  if (!KEY_ID || !KEY_SECRET) return json({ error: 'Payments are not set up yet.' }, 503);
  const user = await signedInUser(req);
  if (!user) return json({ error: 'Please sign in again.' }, 401);
  let body: Record<string, string>;
  try { body = JSON.parse(raw || '{}'); } catch { return json({ error: 'Bad request' }, 400); }

  try {
    if (body.action === 'create-order') {
      const { data: prof } = await admin.from('profiles').select('id, email, full_name, is_staff').eq('id', user.id).single();
      if (!prof) return json({ error: 'Profile not found.' }, 404);
      if (prof.is_staff) return json({ error: 'Staff accounts already have full access.' }, 400);
      const order = await razorpay('/orders', { method: 'POST', body: JSON.stringify({
        amount: PRICE, currency: 'INR', receipt: 'md-' + Date.now(), notes: { user_id: user.id, product: 'Premium 1 year' } }) });
      const { error } = await admin.from('payments').insert({ user_id: user.id, order_id: order.id, amount_paise: order.amount, currency: order.currency });
      if (error) throw new Error(error.message);
      return json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: KEY_ID, name: prof.full_name ?? '', email: prof.email ?? '' });
    }
    if (body.action === 'verify') {
      const orderId = String(body.razorpay_order_id ?? ''), paymentId = String(body.razorpay_payment_id ?? ''), signature = String(body.razorpay_signature ?? '');
      const { data: row } = await admin.from('payments').select('user_id, status').eq('order_id', orderId).maybeSingle();
      if (!row || row.user_id !== user.id) return json({ error: 'Order not found.' }, 404);
      if (row.status === 'paid') return json({ status: 'paid' });
      if (!sameText(await hmacHex(KEY_SECRET, orderId + '|' + paymentId), signature)) return json({ error: 'Payment could not be verified.' }, 400);
      return json({ status: await settle(orderId, paymentId) });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('razorpay', (e as Error).message);
    return json({ error: 'Payment service error: ' + (e as Error).message }, 502);
  }
});
