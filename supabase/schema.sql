-- =====================================================================================
-- Mathematics Dashboard (Avanti Fellows) · Supabase database
-- Login and plans, the Avanti ID allow-list, payments, tests, attempts and results.
--
-- HOW TO RUN: Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- It is safe to run again later (it only adds what is missing and replaces functions).
-- =====================================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- -------------------------------------------------------------------------------------
-- 0. Remove the old design
--    * tests and test_results (old Tests / Results) are dropped.
--    * teacher_login() and student_login() (old Teacher Login / AF-ID login) are dropped.
--    * teachers, students and saved_worksheets are MOVED to a private "legacy" schema,
--      not deleted, so nothing you typed in is lost. The website cannot read them.
--      When you are sure you do not need them: drop schema legacy cascade;
-- -------------------------------------------------------------------------------------
create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;

do $$
declare r record;
begin
  -- old test tables (only the old shape: the new tests table has a "code" column)
  if to_regclass('public.test_results') is not null then execute 'drop table public.test_results cascade'; end if;
  if to_regclass('public.tests') is not null
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tests' and column_name = 'code') then
    execute 'drop table public.tests cascade';
  end if;
  -- old login tables and worksheets: keep the data, hide it from the website
  if to_regclass('public.teachers') is not null and to_regclass('legacy.teachers') is null then execute 'alter table public.teachers set schema legacy'; end if;
  if to_regclass('public.students') is not null and to_regclass('legacy.students') is null then execute 'alter table public.students set schema legacy'; end if;
  if to_regclass('public.saved_worksheets') is not null and to_regclass('legacy.saved_worksheets') is null then execute 'alter table public.saved_worksheets set schema legacy'; end if;
  -- old login functions, every version of them
  for r in select p.oid::regprocedure as f from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('teacher_login', 'student_login') loop
    execute 'drop function ' || r.f || ' cascade';
  end loop;
end $$;

-- -------------------------------------------------------------------------------------
-- 1. Profiles: one row per signed-in user. Plan and role are changed only by the
--    functions and triggers below, never by the browser.
-- -------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  role          text check (role in ('teacher', 'student')),
  plan          text not null default 'free' check (plan in ('free', 'premium', 'staff')),
  premium_until timestamptz,
  is_staff      boolean not null default false,
  full_name     text check (char_length(full_name) <= 120),
  school        text check (char_length(school) <= 160),
  class         text check (char_length(class) <= 20),
  stream        text check (char_length(stream) <= 40),
  avanti_id     text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- The plan that applies right now: Staff, or Premium while the paid year lasts, otherwise Free.
create or replace function public.plan_of(p public.profiles) returns text
language sql stable set search_path = public as $$
  select case when p.is_staff then 'staff'
              when p.premium_until is not null and p.premium_until > now() then 'premium'
              else 'free' end
$$;

create or replace function public.my_plan() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select public.plan_of(p) from public.profiles p where p.id = auth.uid()), 'free')
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_staff from public.profiles p where p.id = auth.uid()), false)
$$;

-- Premium or Staff teachers (and all Staff) can create tests and save worksheets.
create or replace function public.can_create_tests() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_staff or (p.role = 'teacher' and public.plan_of(p) = 'premium')
                   from public.profiles p where p.id = auth.uid()), false)
$$;

-- -------------------------------------------------------------------------------------
-- 2. Avanti ID allow-list (students who may sign in with Avanti ID + date of birth)
--    The date of birth is stored only as a bcrypt hash and is checked only inside
--    avanti_verify(), which only the server (Edge Function) can call.
-- -------------------------------------------------------------------------------------
create table if not exists public.student_allowlist (
  avanti_id       text primary key,
  dob_hash        text not null,
  full_name       text,
  school          text,
  class           text,
  stream          text,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);

-- Paste or import your list here (Table Editor → student_allowlist_import → Insert → Import data from CSV),
-- then run:  select public.allowlist_load_import();   It hashes the dates and empties this table.
create table if not exists public.student_allowlist_import (
  avanti_id text, dob text, full_name text, school text, class text, stream text
);

create table if not exists public.login_attempts (
  id        bigserial primary key,
  ip        text,
  avanti_id text,
  ok        boolean not null,
  at        timestamptz not null default now()
);
create index if not exists login_attempts_ip_at on public.login_attempts (ip, at);

-- Avanti ID sign-ins waiting for their account to be created (filled by avanti_verify, read by the sign-up trigger)
create table if not exists public.pending_avanti (
  email      text primary key,
  avanti_id  text not null,
  created_at timestamptz not null default now()
);

-- Accepts 2008-05-14, 14-05-2008, 14/05/2008 or 14.05.2008. Returns null when it is not a real date.
create or replace function public.norm_dob(p text) returns date
language plpgsql immutable set search_path = public as $$
declare s text := trim(coalesce(p, ''));
begin
  if s ~ '^\d{4}-\d{1,2}-\d{1,2}$' then return to_date(s, 'YYYY-MM-DD'); end if;
  if s ~ '^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$' then return to_date(regexp_replace(s, '[/.]', '-', 'g'), 'DD-MM-YYYY'); end if;
  return null;
exception when others then return null;
end $$;

create or replace function public.norm_avanti_id(p text) returns text
language sql immutable set search_path = public as $$
  select nullif(upper(regexp_replace(coalesce(p, ''), '\s+', '', 'g')), '')
$$;

create or replace function public.allowlist_add(p_avanti_id text, p_dob text, p_full_name text default null,
  p_school text default null, p_class text default null, p_stream text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := public.norm_avanti_id(p_avanti_id); v_dob date := public.norm_dob(p_dob);
begin
  if v_id is null then raise exception 'Avanti ID is empty'; end if;
  if v_dob is null then raise exception 'Date of birth "%" for % is not a date. Use YYYY-MM-DD or DD-MM-YYYY.', p_dob, v_id; end if;
  insert into public.student_allowlist (avanti_id, dob_hash, full_name, school, class, stream)
  values (v_id, extensions.crypt(to_char(v_dob, 'YYYY-MM-DD'), extensions.gen_salt('bf', 8)),
          nullif(trim(p_full_name), ''), nullif(trim(p_school), ''), nullif(trim(p_class), ''), nullif(trim(p_stream), ''))
  on conflict (avanti_id) do update set dob_hash = excluded.dob_hash, full_name = excluded.full_name, school = excluded.school,
    class = excluded.class, stream = excluded.stream, failed_attempts = 0, locked_until = null;
end $$;

create or replace function public.allowlist_load_import() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select * from public.student_allowlist_import loop
    perform public.allowlist_add(r.avanti_id, r.dob, r.full_name, r.school, r.class, r.stream);
    n := n + 1;
  end loop;
  delete from public.student_allowlist_import;
  return n;
end $$;

-- Called ONLY by the avanti-login Edge Function (service role). Never returns the stored date of birth.
-- Limits: 5 wrong dates for one Avanti ID locks it for 15 minutes; 20 failures from one network in 15 minutes blocks it.
create or replace function public.avanti_verify(p_avanti_id text, p_dob text, p_ip text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id text := public.norm_avanti_id(p_avanti_id);
  v_dob date := public.norm_dob(p_dob);
  a public.student_allowlist;
  v_email text;
begin
  if (select count(*) from public.login_attempts where ip = p_ip and not ok and at > now() - interval '15 minutes') >= 20 then
    return json_build_object('ok', false, 'reason', 'too_many');
  end if;
  select * into a from public.student_allowlist where avanti_id = v_id for update;
  if a.avanti_id is null then
    insert into public.login_attempts (ip, avanti_id, ok) values (p_ip, v_id, false);
    return json_build_object('ok', false, 'reason', 'wrong');
  end if;
  if a.locked_until is not null and a.locked_until > now() then
    insert into public.login_attempts (ip, avanti_id, ok) values (p_ip, v_id, false);
    return json_build_object('ok', false, 'reason', 'too_many');
  end if;
  if v_dob is null or extensions.crypt(to_char(v_dob, 'YYYY-MM-DD'), a.dob_hash) <> a.dob_hash then
    update public.student_allowlist
       set failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
           locked_until    = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
     where avanti_id = v_id;
    insert into public.login_attempts (ip, avanti_id, ok) values (p_ip, v_id, false);
    return json_build_object('ok', false, 'reason', 'wrong');
  end if;
  update public.student_allowlist set failed_attempts = 0, locked_until = null where avanti_id = v_id;
  insert into public.login_attempts (ip, avanti_id, ok) values (p_ip, v_id, true);
  delete from public.login_attempts where at < now() - interval '30 days';
  v_email := 'avanti-' || lower(regexp_replace(v_id, '[^A-Za-z0-9]', '', 'g')) || '@students.avanti-id.local';
  insert into public.pending_avanti (email, avanti_id) values (v_email, v_id)
    on conflict (email) do update set avanti_id = excluded.avanti_id, created_at = now();
  return json_build_object('ok', true, 'avanti_id', v_id, 'email', v_email, 'full_name', a.full_name);
end $$;

-- -------------------------------------------------------------------------------------
-- 3. Sign-up triggers
--    * Every new account gets a profile.
--    * Only Google accounts and server-made Avanti ID accounts may be created
--      (email/password and other sign-ups are refused).
--    * Staff: a Google identity whose verified email ends with @avantifellows.org.
-- -------------------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_provider text := coalesce(new.raw_app_meta_data->>'provider', '');
  v_av text;
  a public.student_allowlist;
begin
  select avanti_id into v_av from public.pending_avanti where email = lower(new.email) and created_at > now() - interval '5 minutes';
  if v_av is null and v_provider <> 'google' then
    raise exception 'Only Google sign-in is allowed on this site';
  end if;
  if v_av is not null then
    select * into a from public.student_allowlist where avanti_id = v_av;
    insert into public.profiles (id, email, role, full_name, school, class, stream, avanti_id)
    values (new.id, null, 'student', a.full_name, a.school, a.class, a.stream, v_av)
    on conflict (id) do nothing;
    delete from public.pending_avanti where email = lower(new.email);
  else
    insert into public.profiles (id, email, full_name)
    values (new.id, lower(new.email), left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), 120))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_identity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_mail text := lower(coalesce(new.identity_data->>'email', ''));
begin
  if new.provider = 'google'
     and v_mail like '%@avantifellows.org'
     and lower(coalesce(new.identity_data->>'email_verified', '')) in ('true', 't', '1')
     and exists (select 1 from auth.users u where u.id = new.user_id and lower(u.email) = v_mail) then
    update public.profiles set is_staff = true, plan = 'staff', updated_at = now()
     where id = new.user_id and (not is_staff or plan <> 'staff');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_identity_saved on auth.identities;
create trigger on_auth_identity_saved after insert or update on auth.identities
  for each row execute function public.handle_identity();

-- -------------------------------------------------------------------------------------
-- 4. Profile functions used by the website
-- -------------------------------------------------------------------------------------
create or replace function public.my_profile() returns json
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null then return null; end if;
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then return null; end if;
  if p.plan <> public.plan_of(p) then   -- a paid year ended: drop to Free
    update public.profiles set plan = public.plan_of(p), updated_at = now() where id = p.id returning * into p;
  end if;
  return json_build_object('id', p.id, 'email', p.email, 'role', p.role, 'plan', public.plan_of(p),
    'premium_until', p.premium_until, 'is_staff', p.is_staff, 'full_name', p.full_name, 'school', p.school,
    'class', p.class, 'stream', p.stream, 'avanti_id', p.avanti_id,
    'can_create_tests', p.is_staff or (p.role = 'teacher' and public.plan_of(p) = 'premium'));
end $$;

-- The Teacher / Student choice is saved once, on the first sign-in. After that only the database owner can change it.
create or replace function public.set_my_role(p_role text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('teacher', 'student') then raise exception 'Choose Teacher or Student'; end if;
  update public.profiles set role = p_role, updated_at = now() where id = auth.uid() and role is null;
  return public.my_profile();
end $$;

create or replace function public.update_my_profile(p_full_name text, p_school text, p_class text, p_stream text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in again'; end if;
  update public.profiles set
    full_name = left(nullif(trim(p_full_name), ''), 120),
    school    = left(nullif(trim(p_school), ''), 160),
    class     = left(nullif(trim(p_class), ''), 20),
    stream    = left(nullif(trim(p_stream), ''), 40),
    updated_at = now()
  where id = auth.uid();
  return public.my_profile();
end $$;

-- -------------------------------------------------------------------------------------
-- 5. Payments (Razorpay). Written only by the razorpay Edge Function (service role).
-- -------------------------------------------------------------------------------------
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  provider     text not null default 'razorpay',
  order_id     text not null unique,
  payment_id   text unique,
  amount_paise integer not null check (amount_paise > 0),
  currency     text not null default 'INR',
  status       text not null default 'created' check (status in ('created', 'paid', 'failed')),
  error        text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  updated_at   timestamptz not null default now()
);
create index if not exists payments_user on public.payments (user_id, created_at desc);

-- Marks the order paid and gives one year of Premium (added on top of any time left). Safe to call twice.
create or replace function public.grant_premium(p_order_id text, p_payment_id text, p_amount_paise integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_amt integer; v_status text;
begin
  select user_id, amount_paise, status into v_uid, v_amt, v_status from public.payments where order_id = p_order_id for update;
  if v_uid is null then raise exception 'Unknown order %', p_order_id; end if;
  if v_status = 'paid' then return false; end if;
  if p_amount_paise is distinct from v_amt then raise exception 'Amount does not match the order'; end if;
  update public.payments set status = 'paid', payment_id = p_payment_id, error = null, paid_at = now(), updated_at = now()
   where order_id = p_order_id;
  update public.profiles
     set premium_until = greatest(coalesce(premium_until, now()), now()) + interval '1 year',
         plan = case when is_staff then 'staff' else 'premium' end, updated_at = now()
   where id = v_uid;
  return true;
end $$;

create or replace function public.mark_payment_failed(p_order_id text, p_payment_id text, p_error text) returns void
language sql security definer set search_path = public as $$
  update public.payments set status = 'failed', payment_id = coalesce(payment_id, p_payment_id), error = left(p_error, 300), updated_at = now()
   where order_id = p_order_id and status = 'created';
$$;

-- -------------------------------------------------------------------------------------
-- 6. Saved worksheets (Premium and Staff teachers): a named list of question IDs
-- -------------------------------------------------------------------------------------
create table if not exists public.worksheets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  question_ids text[] not null default '{}' check (cardinality(question_ids) <= 300),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists worksheets_owner on public.worksheets (owner_id, updated_at desc);

-- -------------------------------------------------------------------------------------
-- 7. Tests. The questions are copied into the test when it is saved, so a test never
--    changes if the question bank changes later. Each test has a unique share code.
-- -------------------------------------------------------------------------------------
create or replace function public.new_test_code() returns text
language sql volatile security definer set search_path = public, extensions as $$
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', (get_byte(b, i) % 31) + 1, 1), '')
  from (select extensions.gen_random_bytes(10) as b) x, generate_series(0, 9) as i
$$;

create table if not exists public.tests (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique default public.new_test_code(),
  owner_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  duration_min  integer not null check (duration_min between 1 and 600),
  marks_correct numeric not null default 4 check (marks_correct > 0 and marks_correct <= 100),
  marks_wrong   numeric not null default 1 check (marks_wrong >= 0 and marks_wrong <= 100),
  target_class  text,
  target_stream text,
  school        text,
  -- [{ "id", "type": MCQ|MSQ|Numerical, "q", "o": [..], "a", "ch", "chn", "tp", "f": {svg} }]
  questions     jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 200),
  n_questions   integer generated always as (jsonb_array_length(questions)) stored,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tests_owner on public.tests (owner_id, created_at desc);

-- Once a student has submitted, the questions and marking of a test are frozen (title, dates and on/off can still change).
create or replace function public.tests_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if (new.questions is distinct from old.questions or new.marks_correct is distinct from old.marks_correct
      or new.marks_wrong is distinct from old.marks_wrong)
     and exists (select 1 from public.attempts a where a.test_id = old.id and a.status = 'submitted') then
    raise exception 'Students have already submitted this test, so its questions and marks cannot change. Make a copy instead.';
  end if;
  return new;
end $$;

-- -------------------------------------------------------------------------------------
-- 8. Attempts and per-question results (written only by the functions below)
-- -------------------------------------------------------------------------------------
create table if not exists public.attempts (
  id             uuid primary key default gen_random_uuid(),
  test_id        uuid not null references public.tests(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  status         text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at     timestamptz not null default now(),
  saved_at       timestamptz,
  submitted_at   timestamptz,
  answers        jsonb not null default '{}'::jsonb,  -- { "<question id>": { "r": "B" | ["A","C"] | "12.5", "t": seconds, "m": marked } }
  tab_switches   integer not null default 0,
  student_name   text,
  school         text,
  class          text,
  stream         text,
  score          numeric,
  max_score      numeric,
  correct        integer,
  wrong          integer,
  skipped        integer,
  time_taken_sec integer,
  unique (test_id, user_id)
);
create index if not exists attempts_test on public.attempts (test_id, status);
create index if not exists attempts_user on public.attempts (user_id, started_at desc);

create table if not exists public.attempt_items (
  attempt_id     uuid not null references public.attempts(id) on delete cascade,
  pos            integer not null,
  qid            text not null,
  qtype          text,
  response       text,
  correct_answer text,
  status         text not null check (status in ('correct', 'wrong', 'skipped')),
  marks          numeric not null,
  time_sec       integer not null default 0,
  chapter        text,
  topic          text,
  primary key (attempt_id, pos)
);

drop trigger if exists tests_guard on public.tests;
create trigger tests_guard before update on public.tests for each row execute function public.tests_guard();

-- -------------------------------------------------------------------------------------
-- 9. Row-level security: on for every table. Browsers can read only their own rows.
-- -------------------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.student_allowlist        enable row level security;
alter table public.student_allowlist_import enable row level security;
alter table public.login_attempts           enable row level security;
alter table public.pending_avanti           enable row level security;
alter table public.payments                 enable row level security;
alter table public.worksheets               enable row level security;
alter table public.tests                    enable row level security;
alter table public.attempts                 enable row level security;
alter table public.attempt_items            enable row level security;

-- Nothing in these tables is writable from a browser except worksheets and tests (own rows, checked below).
revoke all on public.student_allowlist, public.student_allowlist_import, public.login_attempts, public.pending_avanti from anon, authenticated;
revoke all on public.profiles, public.payments, public.attempts, public.attempt_items from anon, authenticated;
revoke all on public.worksheets, public.tests from anon, authenticated;
grant select on public.profiles, public.payments, public.attempts, public.attempt_items to authenticated;
grant select, delete on public.worksheets, public.tests to authenticated;
grant insert (title, question_ids), update (title, question_ids, updated_at) on public.worksheets to authenticated;
grant insert (title, duration_min, marks_correct, marks_wrong, target_class, target_stream, school, questions, is_active),
      update (title, duration_min, marks_correct, marks_wrong, target_class, target_stream, school, questions, is_active)
   on public.tests to authenticated;

drop policy if exists profiles_own on public.profiles;
create policy profiles_own on public.profiles for select to authenticated using (id = auth.uid());

drop policy if exists payments_own on public.payments;
create policy payments_own on public.payments for select to authenticated using (user_id = auth.uid());

drop policy if exists attempts_own on public.attempts;
create policy attempts_own on public.attempts for select to authenticated using (user_id = auth.uid());

drop policy if exists attempt_items_own on public.attempt_items;
create policy attempt_items_own on public.attempt_items for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

drop policy if exists worksheets_select on public.worksheets;
drop policy if exists worksheets_insert on public.worksheets;
drop policy if exists worksheets_update on public.worksheets;
drop policy if exists worksheets_delete on public.worksheets;
create policy worksheets_select on public.worksheets for select to authenticated using (owner_id = auth.uid());
create policy worksheets_insert on public.worksheets for insert to authenticated with check (owner_id = auth.uid() and public.can_create_tests());
create policy worksheets_update on public.worksheets for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.can_create_tests());
create policy worksheets_delete on public.worksheets for delete to authenticated using (owner_id = auth.uid());

drop policy if exists tests_select on public.tests;
drop policy if exists tests_insert on public.tests;
drop policy if exists tests_update on public.tests;
drop policy if exists tests_delete on public.tests;
create policy tests_select on public.tests for select to authenticated using (owner_id = auth.uid());
create policy tests_insert on public.tests for insert to authenticated with check (owner_id = auth.uid() and public.can_create_tests());
create policy tests_update on public.tests for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.can_create_tests());
create policy tests_delete on public.tests for delete to authenticated using (owner_id = auth.uid());

-- -------------------------------------------------------------------------------------
-- 10. Taking a test
-- -------------------------------------------------------------------------------------

-- Tests a student can see in "Available tests": active, and matching their class, stream and school when the teacher set them.
create or replace function public.list_available_tests() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]'::json) from (
    select t.code, t.title, t.duration_min, t.n_questions, t.marks_correct, t.marks_wrong, t.target_class, t.target_stream,
           t.school, t.created_at, coalesce(o.full_name, 'Teacher') as teacher,
           a.id as attempt_id, a.status as attempt_status, a.score, a.max_score
      from public.tests t
      join public.profiles me on me.id = auth.uid()
      left join public.profiles o on o.id = t.owner_id
      left join public.attempts a on a.test_id = t.id and a.user_id = me.id
     where t.is_active and t.owner_id <> me.id
       and (t.target_class is null or t.target_class = me.class)
       and (t.target_stream is null or t.target_stream = me.stream)
       and (t.school is null or lower(t.school) = lower(coalesce(me.school, '')))
     order by t.created_at desc limit 200) x
$$;

-- What the start screen of a test link shows. No questions or answers.
create or replace function public.test_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('title', t.title, 'duration_min', t.duration_min, 'n_questions', t.n_questions,
           'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong, 'is_active', t.is_active,
           'is_owner', t.owner_id = auth.uid(), 'teacher', coalesce(o.full_name, 'Teacher'),
           'attempt_id', a.id, 'attempt_status', a.status)
    from public.tests t
    left join public.profiles o on o.id = t.owner_id
    left join public.attempts a on a.test_id = t.id and a.user_id = auth.uid()
   where t.code = lower(trim(p_code)) and auth.uid() is not null
$$;

-- Grades one attempt from its saved answers, writes attempt_items and the totals. Internal: not callable from browsers.
create or replace function public.grade_attempt(p_attempt uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a public.attempts; t public.tests; q jsonb; i integer; r jsonb; v_resp text; v_key text; v_type text;
  v_status text; v_marks numeric; v_t integer; lo numeric; hi numeric; v numeric; m text[];
  s_score numeric := 0; s_c integer := 0; s_w integer := 0; s_s integer := 0;
begin
  select * into a from public.attempts where id = p_attempt for update;
  select * into t from public.tests where id = a.test_id;
  delete from public.attempt_items where attempt_id = a.id;
  for q, i in select e.value, e.ordinality from jsonb_array_elements(t.questions) with ordinality e loop
    r := a.answers -> (q->>'id') -> 'r';
    v_resp := a.answers -> (q->>'id') ->> 't';
    v_t := case when v_resp ~ '^\d{1,6}(\.\d+)?$' then least(v_resp::numeric, 86400)::integer else 0 end;
    v_type := coalesce(q->>'type', 'MCQ');
    v_key := upper(trim(coalesce(q->>'a', '')));
    v_resp := case jsonb_typeof(r)
                when 'array'  then (select string_agg(upper(trim(x)), ',' order by upper(trim(x))) from jsonb_array_elements_text(r) x where trim(x) <> '')
                when 'string' then nullif(upper(trim(r #>> '{}')), '')
                when 'number' then r::text
                else null end;
    v_marks := 0;
    if v_resp is null then
      v_status := 'skipped';
    elsif v_type = 'Numerical' then
      m := regexp_match(v_key, '^(-?\d+(?:\.\d+)?)\s*TO\s*(-?\d+(?:\.\d+)?)$');
      if m is not null then lo := least(m[1]::numeric, m[2]::numeric); hi := greatest(m[1]::numeric, m[2]::numeric);
      elsif v_key ~ '^-?\d+(\.\d+)?$' then lo := v_key::numeric; hi := lo;
      else lo := null; end if;
      if v_resp ~ '^-?\d+(\.\d+)?$' and lo is not null then
        v := v_resp::numeric;
        if (lo = hi and abs(v - lo) <= 0.01) or (lo <> hi and v >= lo - 0.005 and v <= hi + 0.005) then
          v_status := 'correct'; v_marks := t.marks_correct; else v_status := 'wrong'; end if;
      else v_status := 'wrong'; end if;
    elsif v_type = 'MSQ' then
      if v_resp = (select string_agg(x, ',' order by x) from unnest(string_to_array(replace(v_key, ' ', ''), ',')) x) then
        v_status := 'correct'; v_marks := t.marks_correct; else v_status := 'wrong'; end if;
    else  -- MCQ: negative marking applies to a wrong choice
      if v_resp = v_key then v_status := 'correct'; v_marks := t.marks_correct;
      else v_status := 'wrong'; v_marks := -t.marks_wrong; end if;
    end if;
    insert into public.attempt_items (attempt_id, pos, qid, qtype, response, correct_answer, status, marks, time_sec, chapter, topic)
    values (a.id, i, q->>'id', v_type, v_resp, q->>'a', v_status, v_marks, v_t, q->>'chn', q->>'tp');
    s_score := s_score + v_marks;
    if v_status = 'correct' then s_c := s_c + 1; elsif v_status = 'wrong' then s_w := s_w + 1; else s_s := s_s + 1; end if;
  end loop;
  update public.attempts set status = 'submitted', submitted_at = coalesce(submitted_at, now()),
    score = s_score, max_score = t.marks_correct * t.n_questions, correct = s_c, wrong = s_w, skipped = s_s,
    time_taken_sec = least(extract(epoch from (now() - started_at))::integer, t.duration_min * 60)
  where id = a.id;
end $$;

-- Starts (or resumes) the signed-in student's attempt. Returns the questions WITHOUT answers.
create or replace function public.start_attempt(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare t public.tests; me public.profiles; a public.attempts;
begin
  if auth.uid() is null then raise exception 'Please sign in to take this test'; end if;
  select * into t from public.tests where code = lower(trim(p_code));
  if t.id is null then raise exception 'This test link is not valid. Ask your teacher for the link again.'; end if;
  if t.owner_id = auth.uid() then raise exception 'This is your own test. Open it from My Tests to preview it.'; end if;
  select * into me from public.profiles where id = auth.uid();
  select * into a from public.attempts where test_id = t.id and user_id = me.id;
  if a.id is null then
    if not t.is_active then raise exception 'This test is not open right now.'; end if;
    insert into public.attempts (test_id, user_id, student_name, school, class, stream)
    values (t.id, me.id, me.full_name, me.school, me.class, me.stream)
    on conflict (test_id, user_id) do nothing;
    select * into a from public.attempts where test_id = t.id and user_id = me.id;
  end if;
  if a.status = 'in_progress' and now() > a.started_at + make_interval(mins => t.duration_min) + interval '2 minutes' then
    perform public.grade_attempt(a.id);   -- time ran out while away: submit what was saved
    select * into a from public.attempts where id = a.id;
  end if;
  if a.status = 'submitted' then
    return json_build_object('attempt_id', a.id, 'status', 'submitted');
  end if;
  return json_build_object(
    'attempt_id', a.id, 'status', a.status, 'title', t.title, 'duration_min', t.duration_min,
    'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong,
    'started_at', a.started_at, 'server_now', now(), 'answers', a.answers, 'tab_switches', a.tab_switches,
    'questions', (select json_agg(json_build_object('id', e->>'id', 'type', e->>'type', 'q', e->'q', 'o', e->'o', 'f', e->'f', 'tp', e->>'tp')
                                  order by o) from jsonb_array_elements(t.questions) with ordinality as x(e, o)));
end $$;

-- Autosave. Accepted until 2 minutes after the time is up.
create or replace function public.save_attempt(p_attempt uuid, p_answers jsonb, p_tab_switches integer) returns json
language plpgsql security definer set search_path = public as $$
declare a public.attempts; t public.tests;
begin
  select * into a from public.attempts where id = p_attempt and user_id = auth.uid() for update;
  if a.id is null then raise exception 'Attempt not found'; end if;
  if a.status <> 'in_progress' then return json_build_object('status', a.status); end if;
  select * into t from public.tests where id = a.test_id;
  if now() > a.started_at + make_interval(mins => t.duration_min) + interval '2 minutes' then
    return json_build_object('status', 'time_up');
  end if;
  if jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 200000 then raise exception 'Answers are not valid'; end if;
  update public.attempts set answers = p_answers, tab_switches = greatest(tab_switches, coalesce(p_tab_switches, 0)), saved_at = now()
   where id = a.id;
  return json_build_object('status', 'saved', 'server_now', now());
end $$;

create or replace function public.submit_attempt(p_attempt uuid, p_answers jsonb, p_tab_switches integer) returns json
language plpgsql security definer set search_path = public as $$
declare a public.attempts; t public.tests;
begin
  select * into a from public.attempts where id = p_attempt and user_id = auth.uid() for update;
  if a.id is null then raise exception 'Attempt not found'; end if;
  if a.status = 'submitted' then return json_build_object('attempt_id', a.id, 'status', 'submitted'); end if;
  select * into t from public.tests where id = a.test_id;
  -- answers sent after the time (plus 2 minutes) are ignored: the last autosave counts
  if p_answers is not null and jsonb_typeof(p_answers) = 'object' and length(p_answers::text) <= 200000
     and now() <= a.started_at + make_interval(mins => t.duration_min) + interval '2 minutes' then
    update public.attempts set answers = p_answers, saved_at = now() where id = a.id;
  end if;
  update public.attempts set tab_switches = greatest(tab_switches, coalesce(p_tab_switches, 0)) where id = a.id;
  perform public.grade_attempt(a.id);
  return json_build_object('attempt_id', a.id, 'status', 'submitted');
end $$;

-- -------------------------------------------------------------------------------------
-- 11. Reports and results. Ranks are worked out here, never in the browser.
-- -------------------------------------------------------------------------------------
create or replace function public.my_attempts() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.started_at desc), '[]'::json) from (
    select a.id, a.status, a.started_at, a.submitted_at, a.score, a.max_score, a.correct, a.wrong, a.skipped, a.time_taken_sec,
           t.title, t.code, t.n_questions, t.duration_min
      from public.attempts a join public.tests t on t.id = a.test_id
     where a.user_id = auth.uid()) x
$$;

create or replace function public.attempt_report(p_attempt uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare a public.attempts; t public.tests; res json;
begin
  select * into a from public.attempts where id = p_attempt;
  if a.id is null then raise exception 'Report not found'; end if;
  select * into t from public.tests where id = a.test_id;
  if not (a.user_id = auth.uid() or t.owner_id = auth.uid() or public.is_staff()) then raise exception 'Report not found'; end if;
  if a.status <> 'submitted' then raise exception 'This test has not been submitted yet'; end if;
  with ranked as (
    select x.id, x.score,
           rank() over (order by x.score desc, x.time_taken_sec asc) as r_all,
           count(*) over () as n_all,
           rank() over (partition by lower(coalesce(x.school, '')) order by x.score desc, x.time_taken_sec asc) as r_school,
           count(*) over (partition by lower(coalesce(x.school, ''))) as n_school
      from public.attempts x where x.test_id = t.id and x.status = 'submitted')
  select json_build_object(
    'attempt', json_build_object('id', a.id, 'score', a.score, 'max_score', a.max_score, 'correct', a.correct, 'wrong', a.wrong,
                 'skipped', a.skipped, 'time_taken_sec', a.time_taken_sec, 'submitted_at', a.submitted_at, 'started_at', a.started_at,
                 'tab_switches', a.tab_switches, 'student_name', a.student_name, 'school', a.school),
    'test', json_build_object('title', t.title, 'code', t.code, 'duration_min', t.duration_min, 'n_questions', t.n_questions,
                 'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong),
    'rank', (select json_build_object('overall', r.r_all, 'overall_of', r.n_all, 'school', r.r_school, 'school_of', r.n_school) from ranked r where r.id = a.id),
    'stats', (select json_build_object('average', round(avg(score), 2), 'top', max(score)) from public.attempts where test_id = t.id and status = 'submitted'),
    'items', (select json_agg(json_build_object('pos', it.pos, 'qid', it.qid, 'type', it.qtype, 'response', it.response,
                 'correct_answer', it.correct_answer, 'status', it.status, 'marks', it.marks, 'time_sec', it.time_sec,
                 'chapter', it.chapter, 'topic', it.topic, 'q', q.e->'q', 'o', q.e->'o', 'f', q.e->'f') order by it.pos)
                from public.attempt_items it
                left join lateral (select e from jsonb_array_elements(t.questions) with ordinality z(e, o) where z.o = it.pos) q on true
               where it.attempt_id = a.id),
    'topics', (select coalesce(json_agg(tt order by tt.accuracy nulls first, tt.topic), '[]'::json) from (
                 select coalesce(it.topic, 'Other') as topic, it.chapter, count(*) as total,
                        count(*) filter (where it.status = 'correct') as correct, count(*) filter (where it.status = 'wrong') as wrong,
                        count(*) filter (where it.status = 'skipped') as skipped, sum(it.marks) as marks,
                        round(100.0 * count(*) filter (where it.status = 'correct') / nullif(count(*) filter (where it.status <> 'skipped'), 0), 1) as accuracy
                   from public.attempt_items it where it.attempt_id = a.id group by 1, 2) tt)
  ) into res;
  return res;
end $$;

-- The teacher's own tests with how many students have submitted or are still writing.
create or replace function public.my_tests() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]'::json) from (
    select t.id, t.code, t.title, t.duration_min, t.n_questions, t.marks_correct, t.marks_wrong, t.target_class, t.target_stream,
           t.school, t.is_active, t.created_at, t.updated_at,
           (select count(*) from public.attempts a where a.test_id = t.id and a.status = 'submitted') as submitted,
           (select count(*) from public.attempts a where a.test_id = t.id and a.status = 'in_progress') as in_progress
      from public.tests t where t.owner_id = auth.uid()) x
$$;

-- Everything the teacher's results page shows, for one of their own tests.
create or replace function public.test_results(p_test uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare t public.tests; res json;
begin
  select * into t from public.tests where id = p_test;
  if t.id is null or not (t.owner_id = auth.uid() or public.is_staff()) then raise exception 'Test not found'; end if;
  with sub as (
    select a.*, p.avanti_id,
           rank() over (order by a.score desc, a.time_taken_sec asc) as r_all,
           rank() over (partition by lower(coalesce(a.school, '')) order by a.score desc, a.time_taken_sec asc) as r_school
      from public.attempts a join public.profiles p on p.id = a.user_id
     where a.test_id = t.id and a.status = 'submitted'),
  items as (select it.* from public.attempt_items it join sub on sub.id = it.attempt_id)
  select json_build_object(
    'test', json_build_object('id', t.id, 'title', t.title, 'code', t.code, 'duration_min', t.duration_min, 'n_questions', t.n_questions,
              'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong, 'max_score', t.marks_correct * t.n_questions,
              'is_active', t.is_active, 'created_at', t.created_at),
    'summary', (select json_build_object('submitted', count(*), 'average', round(avg(score), 2), 'top', max(score), 'lowest', min(score),
              'median', percentile_cont(0.5) within group (order by score),
              'accuracy', round(100.0 * sum(correct) / nullif(sum(correct + wrong), 0), 1),
              'avg_time_sec', round(avg(time_taken_sec)),
              'in_progress', (select count(*) from public.attempts where test_id = t.id and status = 'in_progress')) from sub),
    'distribution', (select json_agg(json_build_object('from', b * 10, 'to', b * 10 + 10, 'count',
              (select count(*) from sub where least(greatest(floor(100.0 * greatest(score, 0) / nullif(max_score, 0) / 10), 0), 9) = b)) order by b)
              from generate_series(0, 9) b),
    'students', (select coalesce(json_agg(json_build_object('rank', r_all, 'school_rank', r_school, 'attempt_id', id, 'name', student_name,
              'avanti_id', avanti_id, 'school', school, 'class', class, 'stream', stream, 'score', score, 'max_score', max_score,
              'correct', correct, 'wrong', wrong, 'skipped', skipped,
              'accuracy', round(100.0 * correct / nullif(correct + wrong, 0), 1), 'time_taken_sec', time_taken_sec,
              'tab_switches', tab_switches, 'submitted_at', submitted_at) order by r_all, student_name), '[]'::json) from sub),
    'questions', (select coalesce(json_agg(json_build_object('pos', pos, 'qid', qid, 'chapter', chapter, 'topic', topic, 'total', n,
              'correct', c, 'wrong', w, 'skipped', s, 'correct_pct', round(100.0 * c / nullif(n, 0), 1), 'avg_time_sec', round(at)) order by pos), '[]'::json)
              from (select pos, qid, max(chapter) chapter, max(topic) topic, count(*) n, count(*) filter (where status = 'correct') c,
                           count(*) filter (where status = 'wrong') w, count(*) filter (where status = 'skipped') s, avg(time_sec) at
                      from items group by pos, qid) q),
    'topics', (select coalesce(json_agg(json_build_object('chapter', chapter, 'topic', topic, 'answers', n, 'correct', c, 'wrong', w, 'skipped', s,
              'accuracy', round(100.0 * c / nullif(c + w, 0), 1), 'correct_pct', round(100.0 * c / nullif(n, 0), 1)) order by round(100.0 * c / nullif(n, 0), 1) nulls first, topic), '[]'::json)
              from (select chapter, coalesce(topic, 'Other') topic, count(*) n, count(*) filter (where status = 'correct') c,
                           count(*) filter (where status = 'wrong') w, count(*) filter (where status = 'skipped') s
                      from items group by 1, 2) tp),
    'schools', (select coalesce(json_agg(json_build_object('school', school, 'students', n, 'average', av, 'top', tp, 'accuracy', acc) order by av desc nulls last), '[]'::json)
              from (select coalesce(nullif(school, ''), 'No school given') school, count(*) n, round(avg(score), 2) av, max(score) tp,
                           round(100.0 * sum(correct) / nullif(sum(correct + wrong), 0), 1) acc from sub group by 1) sc)
  ) into res;
  return res;
end $$;

-- Used by the weekly GitHub Action that keeps the free Supabase project awake.
create or replace function public.ping() returns integer language sql stable as $$ select 1 $$;

-- -------------------------------------------------------------------------------------
-- 12. Who may call which function
-- -------------------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.ping() to anon, authenticated;
grant execute on function public.plan_of(public.profiles), public.my_plan(), public.is_staff(), public.can_create_tests(),
  public.my_profile(), public.set_my_role(text), public.update_my_profile(text, text, text, text),
  public.list_available_tests(), public.test_info(text), public.start_attempt(text),
  public.save_attempt(uuid, jsonb, integer), public.submit_attempt(uuid, jsonb, integer),
  public.my_attempts(), public.my_tests(), public.attempt_report(uuid), public.test_results(uuid), public.new_test_code()
  to authenticated;
-- server only (Edge Functions use the service role)
grant execute on function public.avanti_verify(text, text, text), public.grant_premium(text, text, integer),
  public.mark_payment_failed(text, text, text) to service_role;
-- allowlist_add / allowlist_load_import / grade_attempt: only from the SQL Editor or from other functions.
