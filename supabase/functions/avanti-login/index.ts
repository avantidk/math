// Supabase Edge Function: avanti-login
// "Login with Avanti ID": checks Avanti ID + date of birth against the student list (inside the database,
// function avanti_verify) and, when they match, returns a one-time sign-in token for that student.
// Only students the admin marked as Avanti students can sign in this way; everyone else uses Google.
// The date of birth is never returned. Wrong tries are limited by the database function (per ID and per network).
//
// Deploy: Supabase → Edge Functions → Deploy a new function → Via Editor → name it  avanti-login
//         → paste this file → Deploy. Then open the function → Details → turn OFF "Verify JWT" (Enforce JWT) → Save.
// Needs no secrets of your own: SUPABASE_URL and the service role key are provided to Edge Functions automatically.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// Only the website may call this from a browser. Set the secret ALLOWED_ORIGIN if the site moves.
const ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://avantidk.github.io';
const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  const origin = req.headers.get('origin');
  if (origin && origin !== ORIGIN) return json({ error: 'Not allowed' }, 403);

  let body: { avanti_id?: string; dob?: string };
  try {
    const raw = await req.text();
    if (raw.length > 2000) return json({ error: 'Bad request' }, 400);
    body = JSON.parse(raw);
  } catch { return json({ error: 'Bad request' }, 400); }
  const avantiId = String(body.avanti_id ?? '').trim().slice(0, 40);
  const dob = String(body.dob ?? '').trim().slice(0, 20);
  if (!avantiId || !dob) return json({ error: 'Enter your Avanti ID and date of birth.' }, 400);

  // The caller's network address as set by the proxy in front of Supabase. x-forwarded-for can be typed by the caller, so
  // it is never used. Without a trustworthy address the database skips the per-network limit (the per-ID limits stay).
  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown').trim().slice(0, 64);
  const { data, error } = await admin.rpc('avanti_verify', { p_avanti_id: avantiId, p_dob: dob, p_ip: ip });
  if (error) { console.error('avanti_verify', error.message); return json({ error: 'Sign-in is not available right now. Try again in a minute.' }, 500); }
  if (!data || !data.ok) {
    return json({ error: data && data.reason === 'too_many'
      ? 'Too many wrong tries. Please wait 15 minutes and try again.'
      : 'That ID and date of birth do not match. Check both and try again.' }, 401);
  }

  // Make sure the student's account exists (the sign-up trigger links it to the Avanti ID), then issue a one-time token.
  const { error: createErr } = await admin.auth.admin.createUser({ email: data.email, email_confirm: true });
  if (createErr && !/already|exists|registered/i.test(createErr.message)) {
    console.error('createUser', createErr.message);
    return json({ error: 'Could not open your account. Please try again.' }, 500);
  }
  await admin.from('pending_avanti').delete().eq('email', data.email);
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: data.email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    console.error('generateLink', linkErr?.message);
    return json({ error: 'Could not sign you in. Please try again.' }, 500);
  }
  return json({ token_hash: tokenHash });
});
