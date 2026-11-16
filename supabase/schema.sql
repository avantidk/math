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
-- Help & Support contact shown on the website (Edit profile menu → Help & Support, and the login page)
-- -------------------------------------------------------------------------------------
create table if not exists public.app_settings (key text primary key, value text);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
insert into public.app_settings (key, value) values ('support_email', 'ankitkamboj@avantifellows.org'), ('support_phone', '')
  on conflict (key) do nothing;
do $$
declare
  my_mobile text := '';   -- ✏️ TYPE YOUR MOBILE NUMBER BETWEEN THE QUOTES, e.g. '+91 98765 43210' (leave empty to keep the saved one)
begin
  if trim(my_mobile) <> '' then update public.app_settings set value = trim(my_mobile) where key = 'support_phone'; end if;
end $$;

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
  category      text check (char_length(category) <= 30),
  gender        text check (char_length(gender) <= 30),
  avanti_id     text unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Added after the first release (safe to run again)
alter table public.profiles add column if not exists category text check (char_length(category) <= 30);
alter table public.profiles add column if not exists gender text check (char_length(gender) <= 30);
alter table public.profiles add column if not exists batch text check (char_length(batch) <= 60);
alter table public.profiles add column if not exists is_avanti boolean not null default false;  -- on the Avanti list: Premium included
-- A teacher's school must be approved by an Avanti admin before the teacher can edit student details
alter table public.profiles add column if not exists school_approved boolean not null default false;
alter table public.profiles add column if not exists school_approved_at timestamptz;
alter table public.profiles add column if not exists school_approved_by text;
alter table public.profiles add column if not exists school_note text;
alter table public.profiles add column if not exists school_request text;      -- school the user asked to move to (admin approves)
alter table public.profiles add column if not exists school_request_at timestamptz;   -- why a school was not approved (shown to the teacher)

alter table public.profiles add column if not exists session text check (char_length(session) <= 20);

-- Admins approve teachers' schools. Only verified @avantifellows.org Google accounts listed here count as admins.
create table if not exists public.app_admins (email text primary key);
insert into public.app_admins (email) values ('ankitkamboj@avantifellows.org') on conflict do nothing;
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;


-- The plan that applies right now: Staff (Avanti teachers), Premium (Avanti students, or a paid year), otherwise Free.
-- Years of Premium the admin gives a new student: 2 for Class 11, 1 for Class 12 and Dropper.
create or replace function public.premium_years(p_class text) returns integer
language plpgsql immutable as $$ begin return case when public.norm_class(p_class) = '11' then 2 else 1 end; end $$;

create or replace function public.plan_of(p public.profiles) returns text
language sql stable set search_path = public as $$
  select case when p.is_staff then 'staff'
              when p.is_avanti then 'premium'
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

-- The admin (a verified @avantifellows.org account listed in app_admins) has full access: every school's students,
-- tests and reports, and teacher approvals. Other Avanti teachers have every feature but see only their own school.
create or replace function public.admin_of(p public.profiles) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p.is_staff, false) and exists (select 1 from public.app_admins a where lower(a.email) = lower(coalesce(p.email, '')))
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.admin_of(p) from public.profiles p where p.id = auth.uid()), false)
$$;

-- Classes: 11, 12, Dropper. Streams: JEE, NEET, KCET (PCM), KCET (PCB). Common spellings are understood (11th, XII, PCM, ...).
create or replace function public.norm_class(p text) returns text
language sql immutable as $$
  select case
    when p is null or trim(p) = '' then null
    when lower(regexp_replace(p, '[^A-Za-z0-9]', '', 'g')) in ('11', '11th', 'xi', 'class11', 'class11th', 'classxi', 'eleven', 'eleventh') then '11'
    when lower(regexp_replace(p, '[^A-Za-z0-9]', '', 'g')) in ('12', '12th', 'xii', 'class12', 'class12th', 'classxii', 'twelve', 'twelfth') then '12'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('dropper', 'drop', 'droppers', 'repeater', 'repeaters') then 'Dropper'
    else trim(p) end
$$;
create or replace function public.norm_stream(p text) returns text
language sql immutable as $$
  select case
    when p is null or trim(p) = '' then null
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('jee', 'pcm', 'pcmb', 'jeemain', 'jeemains', 'jeeadvanced', 'engineering', 'iit', 'iitjee') then 'JEE'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('neet', 'pcb', 'medical', 'neetug') then 'NEET'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('kcetpcm', 'kcet', 'cetpcm', 'kcetengineering') then 'KCET (PCM)'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('kcetpcb', 'cetpcb', 'kcetmedical') then 'KCET (PCB)'
    else trim(p) end
$$;
-- Category (General, Gen-EWS, OBC-NCL, SC, ST) and gender (Male, Female, Other): understands short forms (GEN, UR, EWS, OBC, F, M ...).
create or replace function public.norm_category(p text) returns text
language sql immutable as $$
  select case
    when p is null or trim(p) = '' then null
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('general', 'gen', 'gn', 'ur', 'open', 'oc', 'unreserved') then 'General'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('ews', 'genews', 'generalews', 'gnews', 'urews', 'economicallyweakersection') then 'Gen-EWS'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('obc', 'obcncl', 'obcnoncreamylayer', 'bc', 'obcn') then 'OBC-NCL'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('sc', 'scheduledcaste') then 'SC'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('st', 'scheduledtribe') then 'ST'
    else trim(p) end
$$;
create or replace function public.norm_gender(p text) returns text
language sql immutable as $$
  select case
    when p is null or trim(p) = '' then null
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('female', 'f', 'girl', 'woman') then 'Female'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('male', 'm', 'boy', 'man') then 'Male'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('other', 'o', 'transgender', 'thirdgender') then 'Other'
    when lower(regexp_replace(p, '[^A-Za-z]', '', 'g')) in ('prefernottosay', 'notsay', 'na', 'notspecified') then 'Other'
    else trim(p) end
$$;

-- Academic session from the class, for the year starting in April: Class 11 → 2026-28, Class 12 and Dropper → 2026-27.
create or replace function public.session_for(p_class text, p_at timestamptz default now()) returns text
language sql stable as $$
  select case
    when p_class = '11' then y::text || '-' || lpad(((y + 2) % 100)::text, 2, '0')
    when p_class in ('12', 'Dropper') then y::text || '-' || lpad(((y + 1) % 100)::text, 2, '0')
    end
  from (select extract(year from (p_at - interval '3 months'))::int as y) z
$$;

-- The school a person may act for. Every school (teachers, students, Avanti staff) must be approved by the admin
-- before it counts; until then this is null and nothing that belongs to a school is shown or allowed.
create or replace function public.approved_school(p public.profiles) returns text
language sql stable set search_path = public as $$
  select case when p.school_approved and nullif(trim(p.school), '') is not null then p.school end
$$;

-- Teachers and Staff whose school the admin approved (and the admin) can create tests and add students.
create or replace function public.can_create_tests() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.admin_of(p) or ((p.is_staff or p.role = 'teacher') and public.approved_school(p) is not null)
                     from public.profiles p where p.id = auth.uid()), false)
$$;

-- Premium teachers and Staff: saved worksheets, the student list with performance, bulk upload and editing students.
create or replace function public.is_premium_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_staff or (p.role = 'teacher' and public.plan_of(p) = 'premium')
                   from public.profiles p where p.id = auth.uid()), false)
$$;

-- Teachers' chat: the admin, and Premium teachers / Staff whose school is approved.
create or replace function public.chat_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.admin_of(p) or (public.approved_school(p) is not null
                     and (p.is_staff or (p.role = 'teacher' and public.plan_of(p) = 'premium')))
                     from public.profiles p where p.id = auth.uid()), false)
$$;

-- True while the signed-in person is writing a test (the question bank is closed to them until they submit).
create or replace function public.in_test() returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return exists (select 1 from public.attempts a join public.tests t on t.id = a.test_id
                  where a.user_id = auth.uid() and a.status = 'in_progress'
                    and now() <= a.started_at + make_interval(mins => t.duration_min) + interval '2 minutes');
end $$;

-- Yearly price in paise: students Rs. 299, teachers Rs. 599 (the razorpay Edge Function uses the same numbers).
create or replace function public.price_paise(p_role text) returns integer
language sql immutable as $$ select case when p_role = 'teacher' then 59900 else 29900 end $$;

-- -------------------------------------------------------------------------------------
-- 2. Student list (student_allowlist): students added by the admin (Avanti list) or by a school teacher.
--    ONLY students marked as Avanti students (source = 'avanti', the "Avanti student" tick) may sign in with
--    Student ID + date of birth. Everyone else signs in with Google: a teacher-added student is linked to their
--    Google account by the email the teacher typed (column email).
--    The date of birth is a readable date (column dob). For Avanti students it is the sign-in secret, so only the admin
--    can see it. It is checked only inside avanti_verify(), which only the server (Edge Function) can call, and the
--    table itself is closed to everyone but the server (row level security, no grants).
-- -------------------------------------------------------------------------------------
create table if not exists public.student_allowlist (
  avanti_id       text primary key,
  dob_hash        text,   -- old hashed date of birth: only rows that never signed in since still have it (checked once, then replaced)
  full_name       text,
  school          text,
  class           text,
  stream          text,
  category        text,
  gender          text,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);

-- Paste or import your Avanti list here (Table Editor → student_allowlist_import → Insert → Import data from CSV),
-- then run:  select public.allowlist_load_import();   It adds every row as an Avanti student and empties this table.
create table if not exists public.student_allowlist_import (
  avanti_id text, dob text, full_name text, school text, class text, stream text, category text, gender text
);
alter table public.student_allowlist add column if not exists category text;
alter table public.student_allowlist add column if not exists gender text;
alter table public.student_allowlist_import add column if not exists category text;
alter table public.student_allowlist_import add column if not exists gender text;
alter table public.student_allowlist_import add column if not exists batch text;
-- 'avanti' = from the Avanti list (Premium included); 'teacher' = added by a school teacher (Free unless they pay)
alter table public.student_allowlist add column if not exists source text not null default 'avanti' check (source in ('avanti', 'teacher'));
alter table public.student_allowlist add column if not exists added_by uuid references public.profiles(id) on delete set null;
alter table public.student_allowlist add column if not exists batch text;
alter table public.student_allowlist add column if not exists updated_at timestamptz not null default now();
alter table public.student_allowlist add column if not exists session text;
-- Readable date of birth (the owner wants to retrieve it). Sign-in compares it directly. Older rows keep only dob_hash
-- until the student signs in once.
alter table public.student_allowlist add column if not exists dob date;
alter table public.student_allowlist alter column dob_hash drop not null;
-- Google email of a student who is not an Avanti student: when that Google account signs in it is linked to this row.
alter table public.student_allowlist add column if not exists email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
create unique index if not exists student_allowlist_email on public.student_allowlist (lower(email)) where email is not null;
create index if not exists student_allowlist_school on public.student_allowlist (lower(school));
create index if not exists profiles_school on public.profiles (lower(school));
-- Premium given by the admin when a student is added: until this date (2 years for Class 11, 1 year for Class 12 / Dropper).
-- It is copied to the student's account (profiles.premium_until) whenever the account follows the list.
alter table public.student_allowlist add column if not exists premium_until timestamptz;
update public.student_allowlist set dob_hash = null where dob is not null and dob_hash is not null;
alter table public.student_allowlist_import add column if not exists session text;

create table if not exists public.login_attempts (
  id        bigserial primary key,
  ip        text,
  avanti_id text,
  ok        boolean not null,
  at        timestamptz not null default now()
);
create index if not exists login_attempts_ip_at on public.login_attempts (ip, at);
create index if not exists login_attempts_id_at on public.login_attempts (avanti_id, at);
create index if not exists login_attempts_at on public.login_attempts (at);

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
  select nullif(regexp_replace(upper(regexp_replace(coalesce(p, ''), '\s+', '', 'g')), '^ST(\d{10,})$', 'St\1'), '')
$$;

-- Student ID for a student who is not an Avanti student, made by the site: St + DDMMYY + HHSS (India time), e.g. St1611260845.
-- If that ID is taken (several students added in the same second), 01, 02, ... is added at the end.
create or replace function public.new_student_id() returns text
language plpgsql volatile security definer set search_path = public as $$
declare base text := 'St' || to_char(clock_timestamp() at time zone 'Asia/Kolkata', 'DDMMYYHH24SS'); v text := base; n integer := 0;
begin
  while exists (select 1 from public.student_allowlist where lower(regexp_replace(avanti_id, '[^A-Za-z0-9]', '', 'g')) = lower(v)) loop
    n := n + 1; v := base || lpad(n::text, 2, '0');
  end loop;
  return v;
end $$;

-- A student's account always follows their row in the student list (name, school, class, ...). One place for it.
-- p_id null = every linked student (used when this file is run).
create or replace function public.sync_student_profile(p_id text default null) returns void
language sql security definer set search_path = public as $$
  update public.profiles p set full_name = coalesce(al.full_name, p.full_name), school = coalesce(al.school, p.school),
         school_approved = case when al.school is not null then true else p.school_approved end,
         class = coalesce(al.class, p.class), stream = coalesce(al.stream, p.stream),
         category = coalesce(al.category, p.category), gender = coalesce(al.gender, p.gender),
         batch = coalesce(al.batch, p.batch), session = coalesce(al.session, p.session), is_avanti = (al.source = 'avanti'),
         premium_until = greatest(p.premium_until, al.premium_until), updated_at = now()
    from public.student_allowlist al
   where p.avanti_id = al.avanti_id and (p_id is null or al.avanti_id = p_id);
$$;

-- Links a Google account to a student-list row (the row's email). It never takes an account away from anyone: if the row
-- is already linked, nothing happens, except for an old Student-ID sign-in (no email) of a teacher-added row, whose tests
-- and Premium move to the Google account (those students now sign in with Google).
create or replace function public.link_student_account(p_user uuid, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare old public.profiles; a public.student_allowlist;
begin
  select * into a from public.student_allowlist where avanti_id = p_id;
  if a.avanti_id is null then return; end if;
  select * into old from public.profiles where avanti_id = p_id and id <> p_user;
  if old.id is not null and (a.source <> 'teacher' or old.email is not null) then return; end if;
  if old.id is not null then
    update public.attempts a set user_id = p_user where a.user_id = old.id
       and not exists (select 1 from public.attempts b where b.user_id = p_user and b.test_id = a.test_id);
    update public.profiles set avanti_id = null, is_avanti = false, updated_at = now() where id = old.id;
    update public.profiles set premium_until = greatest(premium_until, old.premium_until) where id = p_user;
  end if;
  update public.profiles set avanti_id = p_id, role = 'student', updated_at = now() where id = p_user;
  perform public.sync_student_profile(p_id);
end $$;

drop function if exists public.allowlist_add(text, text, text, text, text, text);
drop function if exists public.allowlist_add(text, text, text, text, text, text, text, text);
create or replace function public.allowlist_add(p_avanti_id text, p_dob text, p_full_name text default null,
  p_school text default null, p_class text default null, p_stream text default null,
  p_category text default null, p_gender text default null, p_batch text default null) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_id text := public.norm_avanti_id(p_avanti_id); v_dob date := public.norm_dob(p_dob);
begin
  if v_id is null then raise exception 'Avanti ID is empty'; end if;
  if v_dob is null then raise exception 'Date of birth "%" for % is not a date. Use YYYY-MM-DD or DD-MM-YYYY.', p_dob, v_id; end if;
  if exists (select 1 from public.student_allowlist x where x.avanti_id <> v_id
               and lower(regexp_replace(x.avanti_id, '[^A-Za-z0-9]', '', 'g')) = lower(regexp_replace(v_id, '[^A-Za-z0-9]', '', 'g'))) then
    raise exception 'Avanti ID % is too similar to an existing ID (they differ only in . _ / -)', v_id;
  end if;
  -- An ID a teacher added earlier becomes this Avanti student's ID: whoever was linked to it through the teacher's row
  -- (a Google account by email) is unlinked, so a teacher can never take over a real Avanti student's account.
  if exists (select 1 from public.student_allowlist where avanti_id = v_id and source = 'teacher') then
    update public.profiles set avanti_id = null, is_avanti = false, updated_at = now() where avanti_id = v_id;
    update public.student_allowlist set email = null where avanti_id = v_id;
  end if;
  insert into public.student_allowlist (avanti_id, dob, full_name, school, class, stream, category, gender, batch, source, session)
  values (v_id, v_dob,
          nullif(trim(p_full_name), ''), nullif(trim(p_school), ''), public.norm_class(p_class), public.norm_stream(p_stream),
          nullif(trim(p_category), ''), nullif(trim(p_gender), ''), nullif(trim(p_batch), ''), 'avanti', public.session_for(public.norm_class(p_class)))
  on conflict (avanti_id) do update set dob = excluded.dob, dob_hash = null, full_name = excluded.full_name, school = excluded.school,
    class = excluded.class, stream = excluded.stream, category = excluded.category, gender = excluded.gender,
    session = coalesce(student_allowlist.session, excluded.session),
    batch = coalesce(excluded.batch, student_allowlist.batch), source = 'avanti', updated_at = now(),
    failed_attempts = 0, locked_until = null;
  delete from public.login_attempts where avanti_id = v_id and not ok;
  perform public.sync_student_profile(v_id);
end $$;

-- Loads every row of student_allowlist_import. A row with a problem is skipped and listed; the others are still loaded.
drop function if exists public.allowlist_load_import();
create or replace function public.allowlist_load_import() returns json
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; bad jsonb := '[]'::jsonb;
begin
  for r in select * from public.student_allowlist_import loop
    begin
      perform public.allowlist_add(r.avanti_id, r.dob, r.full_name, r.school, r.class, r.stream, r.category, r.gender, r.batch);
      n := n + 1;
    exception when others then
      bad := bad || jsonb_build_array(jsonb_build_object('avanti_id', r.avanti_id, 'error', sqlerrm));
    end;
  end loop;
  delete from public.student_allowlist_import;
  return json_build_object('loaded', n, 'skipped', jsonb_array_length(bad), 'problems', bad);
end $$;

-- Called ONLY by the avanti-login Edge Function (service role). Never returns the stored date of birth.
-- Only Avanti students (source = 'avanti') can sign in this way; every other ID gets the same "do not match" answer.
-- Limits (counted for every ID typed, known or not, so the answers never reveal which IDs exist):
--   5 wrong tries for one ID in 15 minutes, or 10 in 24 hours, block that ID for a while;
--   10 wrong tries from one network in 15 minutes block that network.
-- The admin (or the student's teacher) clears the block by saving the student.
create or replace function public.avanti_verify(p_avanti_id text, p_dob text, p_ip text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id text := left(public.norm_avanti_id(p_avanti_id), 40);
  v_dob date := public.norm_dob(p_dob);
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
  a public.student_allowlist;
  v_email text;
begin
  if v_id is null then return json_build_object('ok', false, 'reason', 'wrong'); end if;
  -- a try that is refused because of a block is recorded without the ID, so blocked tries never extend or cause the
  -- block of an ID (one network cannot keep other students locked out)
  if (v_ip <> 'unknown' and (select count(*) from public.login_attempts where ip = v_ip and not ok and at > now() - interval '15 minutes') >= 10)
     or (select count(*) from public.login_attempts where avanti_id = v_id and not ok and at > now() - interval '15 minutes') >= 5
     or (select count(*) from public.login_attempts where avanti_id = v_id and not ok and at > now() - interval '24 hours') >= 10 then
    insert into public.login_attempts (ip, avanti_id, ok) values (v_ip, null, false);
    return json_build_object('ok', false, 'reason', 'too_many');
  end if;
  select * into a from public.student_allowlist where avanti_id = v_id and source = 'avanti' for update;
  if a.avanti_id is null or v_dob is null
     or not (case when a.dob is not null then a.dob = v_dob
                  else a.dob_hash is not null and extensions.crypt(to_char(v_dob, 'YYYY-MM-DD'), a.dob_hash) = a.dob_hash end) then
    insert into public.login_attempts (ip, avanti_id, ok) values (v_ip, v_id, false);
    return json_build_object('ok', false, 'reason', 'wrong');
  end if;
  v_email := coalesce((select lower(u.email) from auth.users u join public.profiles p on p.id = u.id where p.avanti_id = v_id),
                      'avanti-' || lower(regexp_replace(v_id, '[^A-Za-z0-9]', '', 'g')) || '@students.avanti-id.local');
  -- IDs like AV.001 and AV001 map to the same login: never give one student's account to another ID
  if exists (select 1 from auth.users u join public.profiles p on p.id = u.id
              where lower(u.email) = v_email and p.avanti_id is not null and p.avanti_id <> v_id) then
    insert into public.login_attempts (ip, avanti_id, ok) values (v_ip, v_id, false);
    return json_build_object('ok', false, 'reason', 'wrong');
  end if;
  update public.student_allowlist set failed_attempts = 0, locked_until = null, dob = coalesce(dob, v_dob), dob_hash = null where avanti_id = v_id;
  perform public.sync_student_profile(v_id);
  insert into public.login_attempts (ip, avanti_id, ok) values (v_ip, v_id, true);
  delete from public.login_attempts where at < now() - interval '30 days';
  insert into public.pending_avanti (email, avanti_id) values (v_email, v_id)
    on conflict (email) do update set avanti_id = excluded.avanti_id, created_at = now();
  return json_build_object('ok', true, 'avanti_id', v_id, 'email', v_email);
end $$;

-- -------------------------------------------------------------------------------------
-- 3. Sign-up triggers
--    * Every new account gets a profile.
--    * Only Google accounts and server-made Avanti ID accounts may be created
--      (email/password and other sign-ups are refused).
--    * Staff: a Google identity whose verified email ends with @avantifellows.org.
-- -------------------------------------------------------------------------------------
-- Teachers the admin added before they ever signed in (Teacher approvals -> Add a teacher). When that Google account
-- signs in for the first time it becomes a teacher with this school (approved) and plan.
create table if not exists public.teacher_invites (
  email         text primary key,
  full_name     text,
  school        text,
  plan          text not null default 'free' check (plan in ('free', 'premium', 'avanti')),
  premium_until timestamptz,
  invited_by    text,
  created_at    timestamptz not null default now()
);
alter table public.teacher_invites enable row level security;
revoke all on public.teacher_invites from anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_provider text := coalesce(new.raw_app_meta_data->>'provider', '');
  v_av text;
  a public.student_allowlist;
  inv public.teacher_invites;
begin
  select avanti_id into v_av from public.pending_avanti where email = lower(new.email) and created_at > now() - interval '5 minutes';
  if v_av is null and v_provider <> 'google' then
    raise exception 'Only Google sign-in is allowed on this site';
  end if;
  if v_av is not null then
    select * into a from public.student_allowlist where avanti_id = v_av and source = 'avanti';
    if a.avanti_id is null then raise exception 'Only Avanti students can sign in with a Student ID'; end if;
    insert into public.profiles (id, email, role, full_name, school, school_approved, school_approved_at, class, stream, category, gender, batch, session, avanti_id, is_avanti, premium_until)
    values (new.id, null, 'student', a.full_name, a.school, a.school is not null, now(), a.class, a.stream, a.category, a.gender, a.batch, a.session, v_av, true, a.premium_until)
    on conflict (id) do nothing;
    delete from public.pending_avanti where email = lower(new.email);
  else
    insert into public.profiles (id, email, full_name)
    values (new.id, lower(new.email), left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), 120))
    on conflict (id) do nothing;
    -- a student whose teacher (or the admin) added them with this Google email: linked to that row, school already approved
    select * into a from public.student_allowlist where email is not null and lower(email) = lower(new.email);
    if a.avanti_id is not null and not exists (select 1 from public.teacher_invites where email = lower(new.email)) then
      perform public.link_student_account(new.id, a.avanti_id);
      return new;
    end if;
    select * into inv from public.teacher_invites where email = lower(new.email);
    if inv.email is not null then   -- added by the admin beforehand: teacher with the chosen school and plan
      update public.profiles set role = 'teacher', full_name = coalesce(inv.full_name, full_name), school = inv.school,
             school_approved = inv.school is not null, school_approved_at = case when inv.school is not null then now() end,
             school_approved_by = case when inv.school is not null then inv.invited_by end,
             is_avanti = (inv.plan = 'avanti'),
             premium_until = case when inv.plan = 'premium' then coalesce(inv.premium_until, now() + interval '1 year') end,
             plan = case when inv.plan = 'free' then 'free' else 'premium' end, updated_at = now()
       where id = new.id;
      delete from public.teacher_invites where email = lower(new.email);
    end if;
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
    'class', p.class, 'stream', p.stream, 'category', p.category, 'gender', p.gender, 'batch', p.batch, 'session', p.session,
    'avanti_id', p.avanti_id, 'is_avanti', p.is_avanti,
    'can_create_tests', public.admin_of(p) or ((p.is_staff or p.role = 'teacher') and public.approved_school(p) is not null),
    'can_manage_students', p.is_staff or (p.role = 'teacher' and public.plan_of(p) = 'premium'),
    'price_paise', public.price_paise(p.role),
    'school_approved', public.admin_of(p) or public.approved_school(p) is not null, 'school_note', p.school_note,
    'school_request', p.school_request, 'school_request_at', p.school_request_at,
    'is_admin', public.is_admin(),
    'pending_approvals', case when public.is_admin() then (select count(*) from public.profiles t
        where t.role is not null and not t.school_approved and t.school is not null and not public.admin_of(t)) end);
end $$;

-- The Teacher / Student choice is saved once, on the first sign-in. After that only the database owner can change it.
create or replace function public.set_my_role(p_role text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('teacher', 'student') then raise exception 'Choose Teacher or Student'; end if;
  if p_role = 'teacher' and exists (select 1 from public.payments where user_id = auth.uid() and status = 'paid' and amount_paise < public.price_paise('teacher')) then
    raise exception 'This account bought the student plan, so it can only be a student account';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = auth.uid() and role is null;
  return public.my_profile();
end $$;

drop function if exists public.update_my_profile(text, text, text, text);
-- Saves the signed-in user's details. Every field is required (teachers: name and school).
-- The school is chosen once and waits for the admin's approval; after that it changes only through
-- request_school_change (approved by the admin). Only the admin sets their own school freely.
-- Students fill each detail once; after that only their (approved) teacher or the admin can correct it from My Students.
create or replace function public.update_my_profile(p_full_name text, p_school text, p_class text, p_stream text,
  p_category text default null, p_gender text default null) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; v_av boolean; v_admin boolean;
begin
  if auth.uid() is null then raise exception 'Please sign in again'; end if;
  select * into me from public.profiles where id = auth.uid();
  v_av := me.role = 'student';   -- students: a detail, once filled, stays
  v_admin := public.admin_of(me);
  update public.profiles set
    full_name = case when not v_admin and full_name is not null then full_name else left(nullif(trim(p_full_name), ''), 120) end,
    school    = case when school is not null and not v_admin then school else left(nullif(trim(p_school), ''), 160) end,
    school_approved = case when v_admin then nullif(trim(p_school), '') is not null
                           when school is null then (role is distinct from 'student' and public.is_not_working(p_school)) else school_approved end,
    school_approved_at = case when v_admin or (school is null and role is distinct from 'student' and public.is_not_working(p_school)) then now()
                              when school is null then null else school_approved_at end,
    school_note = case when school is null then null else school_note end,
    class     = case when v_av and class     is not null then class     else public.norm_class(left(p_class, 20)) end,
    stream    = case when v_av and stream    is not null then stream    else public.norm_stream(left(p_stream, 40)) end,
    category  = case when v_av and category  is not null then category  else public.norm_category(left(p_category, 30)) end,
    gender    = case when v_av and gender    is not null then gender    else public.norm_gender(left(p_gender, 30)) end,
    updated_at = now()
  where id = auth.uid() returning * into me;
  if me.role = 'student' and public.is_not_working(me.school) then
    raise exception '"Not Working" is only for teachers. Please choose your school.';
  end if;
  if me.role = 'student' and me.session is null and me.class is not null then
    update public.profiles set session = public.session_for(class) where id = me.id returning * into me;
  end if;
  if me.role = 'student' and ((me.class is not null and me.class not in ('11', '12', 'Dropper'))
     or (me.stream is not null and me.stream not in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)'))
     or (me.category is not null and me.category not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST'))
     or (me.gender is not null and me.gender not in ('Male', 'Female', 'Other'))) then
    raise exception 'Choose class, stream, category and gender from the lists.';
  end if;
  if me.full_name is null or me.school is null
     or (me.role = 'student' and (me.class is null or me.stream is null or me.category is null or me.gender is null)) then
    raise exception 'Please fill in every field. All details are required.';
  end if;
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
  target_class  text,     -- old single values (kept for older tests; new tests use the lists below)
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
alter table public.tests add column if not exists target_classes text[];
alter table public.tests add column if not exists target_streams text[];
-- tests of "Not Working" teachers: open to any (approved) student who has the link, not shown in Available tests
alter table public.tests add column if not exists link_only boolean not null default false;

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

-- A teacher's test is always for the teacher's own APPROVED school (only the admin can choose any school, or all schools),
-- and it is open only to the classes and streams the teacher chose.
create or replace function public.tests_school() returns trigger
language plpgsql security definer set search_path = public as $$
declare o public.profiles;
begin
  select * into o from public.profiles where id = new.owner_id;
  if not public.admin_of(o) then   -- only the admin can choose another school or all schools
    if public.approved_school(o) is null then
      raise exception 'Tests can be made after the admin approves your school (Edit profile shows the status).';
    end if;
    if public.is_not_working(o.school) then new.school := null; new.link_only := true;   -- any student with the link
    else new.school := o.school; new.link_only := false; end if;
  else
    new.link_only := false;
  end if;
  new.target_classes := (select array_agg(distinct public.norm_class(c)) from unnest(new.target_classes) c where nullif(trim(c), '') is not null);
  new.target_streams := (select array_agg(distinct public.norm_stream(c)) from unnest(new.target_streams) c where nullif(trim(c), '') is not null);
  if coalesce(cardinality(new.target_classes), 0) = 0 then raise exception 'Choose at least one class for the test.'; end if;
  if coalesce(cardinality(new.target_streams), 0) = 0 then raise exception 'Choose at least one stream for the test.'; end if;
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
  category       text,
  gender         text,
  score          numeric,
  max_score      numeric,
  correct        integer,
  wrong          integer,
  skipped        integer,
  time_taken_sec integer,
  unique (test_id, user_id)
);
alter table public.attempts add column if not exists category text;
alter table public.attempts add column if not exists gender text;
alter table public.attempts add column if not exists session text;
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
drop trigger if exists tests_school on public.tests;
create trigger tests_school before insert or update on public.tests for each row execute function public.tests_school();

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
-- profiles, attempts and attempt_items are read only through the functions below (attempt_items holds answer keys)
grant select on public.payments to authenticated;
grant select, delete on public.worksheets, public.tests to authenticated;
grant insert (title, question_ids), update (title, question_ids, updated_at) on public.worksheets to authenticated;
grant insert (title, duration_min, marks_correct, marks_wrong, target_classes, target_streams, school, questions, is_active),
      update (title, duration_min, marks_correct, marks_wrong, target_classes, target_streams, school, questions, is_active)
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
create policy worksheets_insert on public.worksheets for insert to authenticated with check (owner_id = auth.uid() and public.is_premium_teacher());
create policy worksheets_update on public.worksheets for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_premium_teacher());
create policy worksheets_delete on public.worksheets for delete to authenticated using (owner_id = auth.uid());

drop policy if exists tests_select on public.tests;
drop policy if exists tests_insert on public.tests;
drop policy if exists tests_update on public.tests;
drop policy if exists tests_delete on public.tests;
create policy tests_select on public.tests for select to authenticated using (owner_id = auth.uid() or (select public.is_admin()));
create policy tests_insert on public.tests for insert to authenticated with check (owner_id = auth.uid() and public.can_create_tests());
create policy tests_update on public.tests for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.can_create_tests());
create policy tests_delete on public.tests for delete to authenticated using (owner_id = auth.uid());

-- -------------------------------------------------------------------------------------
-- 10. Taking a test
-- -------------------------------------------------------------------------------------

-- Tests a student can see in "Available tests": active, matching their class and stream, and only once the admin has
-- approved the student's school (so a new account cannot claim a school and see its tests).
create or replace function public.list_available_tests() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]'::json) from (
    select t.code, t.title, t.duration_min, t.n_questions, t.marks_correct, t.marks_wrong, t.target_classes, t.target_streams,
           t.school, t.created_at, coalesce(o.full_name, 'Teacher') as teacher,
           a.id as attempt_id, a.status as attempt_status, a.score, a.max_score
      from public.tests t
      join public.profiles me on me.id = auth.uid()
      left join public.profiles o on o.id = t.owner_id
      left join public.attempts a on a.test_id = t.id and a.user_id = me.id
     where t.is_active and t.owner_id <> me.id
       and me.class = any(t.target_classes) and me.stream = any(t.target_streams)
       and public.approved_school(me) is not null and not t.link_only
       and (t.school is null or lower(t.school) = lower(me.school))
     order by t.created_at desc limit 200) x
$$;

-- What the start screen of a test link shows. No questions or answers.
create or replace function public.test_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('title', t.title, 'duration_min', t.duration_min, 'n_questions', t.n_questions,
           'marks_correct', t.marks_correct, 'marks_wrong', t.marks_wrong, 'is_active', t.is_active,
           'is_owner', t.owner_id = auth.uid(), 'teacher', coalesce(o.full_name, 'Teacher'),
           'attempt_id', a.id, 'attempt_status', a.status, 'school', t.school,
           'target_classes', t.target_classes, 'target_streams', t.target_streams,
           'for_me', public.admin_of(me) or (public.approved_school(me) is not null
                     and (t.school is null or lower(t.school) = lower(me.school))
                     and me.class = any(t.target_classes) and me.stream = any(t.target_streams)),
           'school_pending', public.approved_school(me) is null and not public.admin_of(me))
    from public.tests t
    join public.profiles me on me.id = auth.uid()
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
    -- answers are saved under p1, p2, ... (the position); older attempts used the question id
    r := coalesce(a.answers -> ('p' || i) -> 'r', a.answers -> (q->>'id') -> 'r');
    v_resp := coalesce(a.answers -> ('p' || i) ->> 't', a.answers -> (q->>'id') ->> 't');
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

-- Starts (or resumes) the signed-in student's attempt. Returns the questions WITHOUT answers and WITHOUT their
-- question-bank ids (each question is called p1, p2, ...), so they cannot be looked up in the question bank.
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
    if not public.admin_of(me) then
      if public.approved_school(me) is null then
        raise exception 'Your school is waiting for approval by the admin. Tests open after it is approved.';
      end if;
      if t.school is not null and lower(t.school) <> lower(coalesce(me.school, '')) then
        raise exception 'This test is only for students of %.', t.school;
      end if;
      if not (me.class = any(t.target_classes) and me.stream = any(t.target_streams)) then
        raise exception 'This test is only for Class % · %.', array_to_string(t.target_classes, ', '), array_to_string(t.target_streams, ', ');
      end if;
    end if;
    insert into public.attempts (test_id, user_id, student_name, school, class, stream, category, gender, session)
    values (t.id, me.id, me.full_name, me.school, me.class, me.stream, me.category, me.gender, me.session)
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
    'questions', (select json_agg(json_build_object('id', 'p' || o, 'type', e->>'type', 'q', e->'q', 'o', e->'o', 'f', e->'f', 'tp', e->>'tp')
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
declare a public.attempts; t public.tests; me public.profiles; res json; v_full boolean; v_mine boolean; v_keys boolean;
begin
  select * into a from public.attempts where id = p_attempt;
  if a.id is null then raise exception 'Report not found'; end if;
  select * into t from public.tests where id = a.test_id;
  select * into me from public.profiles where id = auth.uid();
  if not (a.user_id = me.id or public.admin_of(me)
          or (public.approved_school(me) is not null and (t.owner_id = me.id
              or (public.is_premium_teacher() and lower(me.school) = lower(coalesce(a.school, '')))))) then
    raise exception 'Report not found';
  end if;
  -- the student sees the correct answers only 3 hours after starting the test (stops sharing answer keys during a test)
  v_mine := a.user_id = me.id;
  v_keys := not v_mine or now() >= a.started_at + interval '3 hours';
  -- Free students see their school only; Premium students, teachers and Staff also see the comparison with all students
  v_full := a.user_id <> me.id or public.plan_of(me) in ('premium', 'staff');
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
    'full', v_full,
    'answers_at', case when not v_keys then a.started_at + interval '3 hours' end,
    'rank', (select json_build_object('overall', case when v_full then r.r_all end, 'overall_of', case when v_full then r.n_all end,
                    'school', r.r_school, 'school_of', r.n_school) from ranked r where r.id = a.id),
    'stats', case when v_full then (select json_build_object('average', round(avg(score), 2), 'top', max(score)) from public.attempts where test_id = t.id and status = 'submitted') end,
    'school_stats', (select json_build_object('average', round(avg(score), 2), 'top', max(score)) from public.attempts
                      where test_id = t.id and status = 'submitted' and lower(coalesce(school, '')) = lower(coalesce(a.school, ''))),
    'items', (select json_agg(json_build_object('pos', it.pos, 'qid', case when not v_mine then it.qid end, 'type', it.qtype, 'response', it.response,
                 'correct_answer', case when v_keys then it.correct_answer end, 'status', case when v_keys then it.status end, 'marks', case when v_keys then it.marks end, 'time_sec', it.time_sec,
                 'chapter', it.chapter, 'topic', it.topic, 'q', q.e->'q', 'o', q.e->'o', 'f', q.e->'f') order by it.pos)
                from public.attempt_items it
                left join lateral (select e from jsonb_array_elements(t.questions) with ordinality z(e, o) where z.o = it.pos) q on true
               where it.attempt_id = a.id),
    'topics', case when not v_keys then '[]'::json else (select coalesce(json_agg(tt order by tt.accuracy nulls first, tt.topic), '[]'::json) from (
                 select coalesce(it.topic, 'Other') as topic, it.chapter, count(*) as total,
                        count(*) filter (where it.status = 'correct') as correct, count(*) filter (where it.status = 'wrong') as wrong,
                        count(*) filter (where it.status = 'skipped') as skipped, sum(it.marks) as marks,
                        round(100.0 * count(*) filter (where it.status = 'correct') / nullif(count(*) filter (where it.status <> 'skipped'), 0), 1) as accuracy
                   from public.attempt_items it where it.attempt_id = a.id group by 1, 2) tt) end
  ) into res;
  return res;
end $$;

-- The teacher's own tests (the admin: every test) with how many students have submitted or are still writing.
create or replace function public.my_tests() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.created_at desc), '[]'::json) from (
    select t.id, t.code, t.title, t.duration_min, t.n_questions, t.marks_correct, t.marks_wrong, t.target_classes, t.target_streams,
           t.school, t.is_active, t.created_at, t.updated_at,
           (select count(*) from public.attempts a where a.test_id = t.id and a.status = 'submitted') as submitted,
           (select count(*) from public.attempts a where a.test_id = t.id and a.status = 'in_progress') as in_progress,
           t.owner_id = auth.uid() as mine, o.full_name as owner_name
      from public.tests t left join public.profiles o on o.id = t.owner_id
     where t.owner_id = auth.uid() or public.is_admin()) x
$$;

-- Everything the teacher's results page shows, for one of their own tests.
create or replace function public.test_results(p_test uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare t public.tests; res json;
begin
  select * into t from public.tests where id = p_test;
  if t.id is null or not ((t.owner_id = auth.uid() and public.can_create_tests()) or public.is_admin()) then raise exception 'Test not found'; end if;
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
              'avanti_id', avanti_id, 'school', school, 'class', class, 'stream', stream, 'category', category, 'gender', gender, 'score', score, 'max_score', max_score,
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

-- School names for the dropdowns: every school on the Avanti list, plus schools teachers added with "Other".
create or replace function public.list_schools() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(s order by lower(s) = 'not working', s), '[]'::json)
    from (select trim(school) as s from public.student_allowlist where nullif(trim(school), '') is not null
          union
          select trim(school) from public.profiles where role = 'teacher' and nullif(trim(school), '') is not null
          union
          select 'Not Working') x
$$;

-- "Not Working": the built-in school for teachers who are at no school now. Students can never be in it.
create or replace function public.is_not_working(p text) returns boolean
language sql immutable as $$ select lower(trim(coalesce(p, ''))) = 'not working' $$;

-- Admin: every school with how many students, teachers and tests use it (Approvals → Schools).
create or replace function public.admin_schools() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can see this'; end if;
  return (select coalesce(json_agg(json_build_object('school', n,
            'list_students', (select count(*) from public.student_allowlist a where lower(trim(a.school)) = lower(n)),
            'google_students', (select count(*) from public.profiles p where p.role = 'student' and p.avanti_id is null and lower(trim(p.school)) = lower(n)),
            'teachers', (select count(*) from public.profiles p where p.role = 'teacher' and lower(trim(p.school)) = lower(n)),
            'tests', (select count(*) from public.tests t where lower(trim(t.school)) = lower(n))) order by n), '[]'::json)
     from (select distinct on (lower(trim(x))) trim(x) as n from (
             select school as x from public.student_allowlist union all select school from public.profiles
             union all select school from public.tests union all select school from public.teacher_invites) z
           where nullif(trim(x), '') is not null order by lower(trim(x)), trim(x)) s);
end $$;

-- Admin: rename a school everywhere (students, teachers, tests, results, invites, change requests). Renaming it to the name
-- of another school merges the two. Approvals stay as they are.
create or replace function public.admin_rename_school(p_old text, p_new text) returns json
language plpgsql security definer set search_path = public as $$
declare o text := trim(coalesce(p_old, '')); n text := left(trim(coalesce(p_new, '')), 160);
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can change schools'; end if;
  if o = '' or n = '' then raise exception 'Give the old and the new school name'; end if;
  if public.is_not_working(o) then raise exception '"Not Working" is built in and cannot be renamed'; end if;
  if public.is_not_working(n) and exists (select 1 from public.student_allowlist where lower(trim(school)) = lower(o))
     or public.is_not_working(n) and exists (select 1 from public.profiles where role = 'student' and lower(trim(school)) = lower(o)) then
    raise exception 'This school has students, so it cannot become "Not Working"';
  end if;
  update public.student_allowlist set school = n, updated_at = now() where lower(trim(school)) = lower(o);
  update public.profiles set school = n, updated_at = now() where lower(trim(school)) = lower(o);
  update public.profiles set school_request = n where lower(trim(school_request)) = lower(o);
  update public.tests set school = n where lower(trim(school)) = lower(o);
  update public.attempts set school = n where lower(trim(school)) = lower(o);
  update public.teacher_invites set school = n where lower(trim(school)) = lower(o);
  return json_build_object('ok', true);
end $$;

-- Admin: delete a school. Only when no student on the student list belongs to it (move or rename them first).
-- Teachers and Google students who chose it lose the school and its approval and choose again; its tests are switched off.
create or replace function public.admin_delete_school(p_school text) returns json
language plpgsql security definer set search_path = public as $$
declare o text := trim(coalesce(p_school, '')); k integer;
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can delete schools'; end if;
  if o = '' then raise exception 'Choose a school'; end if;
  if public.is_not_working(o) then raise exception '"Not Working" is built in and cannot be deleted'; end if;
  select count(*) into k from public.student_allowlist where lower(trim(school)) = lower(o);
  if k > 0 then raise exception '% students on the student list belong to this school. Move them (Edit the school → new name) before deleting it.', k; end if;
  update public.tests set is_active = false where lower(trim(school)) = lower(o);   -- first, while the teachers still have the school
  update public.profiles set school = null, school_approved = false, school_approved_at = null,
         school_note = 'Your school (' || o || ') was removed. Please choose your school again.', updated_at = now()
   where lower(trim(school)) = lower(o) and not public.admin_of(profiles);
  update public.profiles set school_request = null, school_request_at = null where lower(trim(school_request)) = lower(o);
  update public.teacher_invites set school = null where lower(trim(school)) = lower(o);
  return json_build_object('ok', true);
end $$;

-- Teachers in "Not Working" never wait for approval (runs every time this file is run).
update public.profiles set school = 'Not Working', school_approved = true, school_approved_at = coalesce(school_approved_at, now()),
       school_approved_by = coalesce(school_approved_by, 'Not Working (automatic)')
 where role is distinct from 'student' and public.is_not_working(school) and (not school_approved or school <> 'Not Working');

-- Students linked to the student list: copy their details from it (runs every time this file is run).
do $$ begin perform public.sync_student_profile(null); end $$;

-- -------------------------------------------------------------------------------------
-- 11b. Teachers and their students
--   Only after the admin approves a teacher's school can the teacher add students, see them or make tests, and only
--   for that one school. Premium teachers (and Staff) also see the list of students of their school with performance,
--   upload many at once and edit details. Students sign in with Google (the email the teacher typed); only students
--   the admin marks as Avanti students sign in with Student ID + date of birth.
-- -------------------------------------------------------------------------------------
create or replace function public.save_student(r jsonb, me public.profiles, p_update boolean) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_admin boolean := public.admin_of(me);
  v_id text := public.norm_avanti_id(r->>'student_id');
  v_dob date := public.norm_dob(r->>'dob');
  v_mail text := nullif(lower(trim(coalesce(r->>'email', ''))), '');
  v_plan text := lower(coalesce(r->>'plan', ''));
  v_school text := case when v_admin and nullif(trim(r->>'school'), '') is not null then left(trim(r->>'school'), 160) else public.approved_school(me) end;
  f jsonb := jsonb_build_object('full_name', left(nullif(trim(r->>'full_name'), ''), 120), 'class', public.norm_class(left(r->>'class', 20)),
               'stream', public.norm_stream(left(r->>'stream', 40)), 'category',
                 -- a file with the Category and Gender columns swapped is read the right way round
                 case when public.norm_category(r->>'category') not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST') and public.norm_gender(r->>'category') in ('Male', 'Female', 'Other')
                      then public.norm_category(left(r->>'gender', 30)) else public.norm_category(left(r->>'category', 30)) end,
               'session', case when coalesce(r->>'session', '') ~ '^\d{4}-\d{2}$' then r->>'session' end,
               'gender',
                 case when public.norm_category(r->>'category') not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST') and public.norm_gender(r->>'category') in ('Male', 'Female', 'Other')
                      then public.norm_gender(left(r->>'category', 30)) else public.norm_gender(left(r->>'gender', 30)) end, 'batch', left(nullif(trim(r->>'batch'), ''), 60));
  a public.student_allowlist; v_miss text; acct public.profiles; v_avanti boolean;
begin
  if v_plan in ('premium', 'avanti') and not v_admin then
    return json_build_object('ok', false, 'error', 'Only the admin can add Premium or Avanti students. Students you add are Free.');
  end if;
  if v_school is null then return json_build_object('ok', false, 'error', 'Students can be added after the admin approves your school.'); end if;
  if public.is_not_working(v_school) then return json_build_object('ok', false, 'error', 'Students cannot be added to "Not Working". Choose a real school.'); end if;
  -- only Avanti students bring their own ID (their Avanti ID); every other new student gets one made by the site
  if not p_update and not (v_admin and v_plan = 'avanti') then v_id := public.new_student_id(); end if;
  if v_id is null then return json_build_object('ok', false, 'error', 'Avanti ID is missing'); end if;
  if v_id !~ '^[A-Za-z0-9._/-]{3,40}$' then return json_build_object('ok', false, 'error', 'Student ID can use letters, numbers, . _ / - (3 to 40)'); end if;
  if nullif(trim(r->>'dob'), '') is not null and v_dob is null then return json_build_object('ok', false, 'error', 'Date of birth is not a date (use YYYY-MM-DD or DD-MM-YYYY)'); end if;
  if v_mail is not null and (v_mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_mail) > 200) then return json_build_object('ok', false, 'error', 'Email "' || v_mail || '" is not a valid email address'); end if;
  if f->>'class' is not null and f->>'class' not in ('11', '12', 'Dropper') then return json_build_object('ok', false, 'error', 'Class must be 11, 12 or Dropper (you wrote "' || (r->>'class') || '")'); end if;
  if f->>'stream' is not null and f->>'stream' not in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then return json_build_object('ok', false, 'error', 'Stream must be JEE, NEET, KCET (PCM) or KCET (PCB) (you wrote "' || (r->>'stream') || '")'); end if;
  if nullif(trim(r->>'session'), '') is not null and f->>'session' is null then return json_build_object('ok', false, 'error', 'Session must look like 2026-27'); end if;
  if f->>'category' is not null and f->>'category' not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST') then return json_build_object('ok', false, 'error', 'Category must be General, Gen-EWS, OBC-NCL, SC or ST'); end if;
  if f->>'gender' is not null and f->>'gender' not in ('Male', 'Female', 'Other') then return json_build_object('ok', false, 'error', 'Gender must be Male, Female or Other'); end if;
  select * into a from public.student_allowlist where avanti_id = v_id for update;
  if a.avanti_id is null and exists (select 1 from public.student_allowlist x
       where lower(regexp_replace(x.avanti_id, '[^A-Za-z0-9]', '', 'g')) = lower(regexp_replace(v_id, '[^A-Za-z0-9]', '', 'g'))) then
    return json_build_object('ok', false, 'error', 'Student ID ' || v_id || ' is too similar to an existing ID. IDs must differ in letters or numbers, not only in . _ / -');
  end if;
  if v_mail is not null and exists (select 1 from public.student_allowlist x where lower(x.email) = v_mail and x.avanti_id <> v_id) then
    return json_build_object('ok', false, 'error', 'The email ' || v_mail || ' is already used by another student');
  end if;
  if a.avanti_id is null then
    v_avanti := v_admin and v_plan = 'avanti';   -- the "Avanti student" tick: only these sign in with Student ID + date of birth
    select string_agg(k, ', ') into v_miss from unnest(array['full_name', 'class', 'stream', 'category', 'gender']) k where f->>k is null;
    if v_avanti and v_dob is null then v_miss := concat_ws(', ', 'dob', v_miss); end if;
    if not v_avanti and v_mail is null then v_miss := concat_ws(', ', 'email (the student signs in with this Google account)', v_miss); end if;
    if v_miss is not null then return json_build_object('ok', false, 'error', 'Missing: ' || v_miss); end if;
    insert into public.student_allowlist (avanti_id, dob, email, full_name, school, class, stream, category, gender, batch, source, added_by, session, premium_until)
    values (v_id, v_dob, v_mail, f->>'full_name', v_school,
            f->>'class', f->>'stream', f->>'category', f->>'gender', f->>'batch',
            case when v_avanti then 'avanti' else 'teacher' end, me.id,
            coalesce(f->>'session', public.session_for(f->>'class')),
            case when v_admin and v_plan = 'premium'
                 then now() + make_interval(years => public.premium_years(f->>'class')) end);   -- 2 years for Class 11, 1 year for Class 12 / Dropper
  else
    if not p_update then return json_build_object('ok', false, 'error', 'Student ID ' || v_id || ' is already registered'); end if;
    if not v_admin and lower(coalesce(a.school, '')) <> lower(v_school) then return json_build_object('ok', false, 'error', 'Student ID ' || v_id || ' belongs to another school'); end if;
    if not v_admin and a.source = 'avanti' and (v_dob is not null or v_mail is not null) then
      return json_build_object('ok', false, 'error', 'Only the admin can change an Avanti student''s date of birth or email');
    end if;
    if not v_admin and v_mail is not null and v_mail is distinct from lower(a.email)
       and exists (select 1 from public.profiles where avanti_id = v_id) then
      return json_build_object('ok', false, 'error', 'This student has already signed in, so only the admin can change their email');
    end if;
    update public.student_allowlist set
      dob = coalesce(v_dob, dob),
      dob_hash = case when v_dob is not null then null else dob_hash end,
      email = coalesce(v_mail, email),
      full_name = coalesce(f->>'full_name', full_name), class = coalesce(f->>'class', class), stream = coalesce(f->>'stream', stream),
      category = coalesce(f->>'category', category), gender = coalesce(f->>'gender', gender), batch = coalesce(f->>'batch', batch),
      school = case when v_admin then v_school else school end,
      session = coalesce(f->>'session', case when f->>'class' is not null and f->>'class' is distinct from class then public.session_for(f->>'class') end, session),
      failed_attempts = 0, locked_until = null, updated_at = now()
    where avanti_id = v_id;
    delete from public.login_attempts where avanti_id = v_id and not ok;
  end if;
  -- a Google account with this email that already exists is linked now (only a student account of no school or this school)
  if v_mail is not null and not exists (select 1 from public.profiles where avanti_id = v_id) then
    select * into acct from public.profiles where lower(email) = v_mail;
    if acct.id is not null then
      if acct.is_staff or acct.role = 'teacher' then
        return json_build_object('ok', false, 'error', 'The email ' || v_mail || ' belongs to a teacher account');
      end if;
      if acct.role = 'student' and acct.avanti_id is null and (acct.school is null or lower(acct.school) = lower(v_school)) then
        perform public.link_student_account(acct.id, v_id);
      end if;
    end if;
  end if;
  perform public.sync_student_profile(v_id);
  return json_build_object('ok', true, 'student_id', v_id, 'action', case when a.avanti_id is null then 'added' else 'updated' end);
end $$;

-- Any teacher: add one student.
create or replace function public.teacher_add_student(p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; r json;
begin
  select * into me from public.profiles where id = auth.uid();
  if not public.can_create_tests() then raise exception 'Students can be added by teachers after the admin approves their school'; end if;
  r := public.save_student(p, me, false);
  if not (r->>'ok')::boolean then raise exception '%', r->>'error'; end if;
  return r;
end $$;

-- Premium teachers: add many students at once (CSV / Excel upload). IDs already in the database are skipped. One result per row.
create or replace function public.teacher_add_students(p_rows jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; v_out jsonb := '[]'::jsonb; r jsonb; i integer := 0; v_set boolean; v_sid text;
begin
  select * into me from public.profiles where id = auth.uid();
  if not public.is_premium_teacher() then raise exception 'Bulk upload is for Premium teachers'; end if;
  if not public.admin_of(me) and public.approved_school(me) is null then raise exception 'Students can be added after the admin approves your school.'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'Upload up to 2000 students at a time'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      -- an Avanti student is found by the Avanti ID; any other student by their Google email
      v_sid := case when public.admin_of(me) and lower(coalesce(r->>'plan', '')) = 'avanti' then public.norm_avanti_id(r->>'student_id')
                    else (select x.avanti_id from public.student_allowlist x where x.email is not null and lower(x.email) = lower(trim(coalesce(r->>'email', '')))) end;
      if v_sid is not null and exists (select 1 from public.student_allowlist where avanti_id = v_sid) then
        -- a student already in the list: the file sets the readable date of birth (own school only; the admin: any school)
        v_set := false;
        -- (a teacher may set it only for their own school's students who are not Avanti students; the admin: anyone)
        if public.norm_dob(r->>'dob') is not null then
          update public.student_allowlist set dob = public.norm_dob(r->>'dob'), dob_hash = null, failed_attempts = 0, locked_until = null, updated_at = now()
           where avanti_id = v_sid
             and (public.admin_of(me) or (source = 'teacher' and lower(coalesce(school, '')) = lower(public.approved_school(me))));
          v_set := found;
        end if;
        v_out := v_out || jsonb_build_array(jsonb_build_object('row', i, 'ok', true, 'action', case when v_set then 'dob' else 'exists' end, 'student_id', v_sid));
      else
        v_out := v_out || jsonb_build_array(jsonb_build_object('row', i) || public.save_student(r, me, false)::jsonb);
      end if;
    exception when others then
      v_out := v_out || jsonb_build_array(jsonb_build_object('row', i, 'ok', false, 'error', sqlerrm));
    end;
  end loop;
  return v_out::json;
end $$;

-- Premium teachers: edit a student of their school (by Student ID, or a Google-sign-in student by account).
create or replace function public.teacher_update_student(p_user uuid, p_student_id text, p jsonb) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; r json;
begin
  select * into me from public.profiles where id = auth.uid();
  if not public.is_premium_teacher() then raise exception 'Editing students is for Premium teachers'; end if;
  if not public.admin_of(me) and public.approved_school(me) is null then raise exception 'Editing students is possible after the admin approves your school.'; end if;
  if coalesce(public.norm_class(p->>'class'), '11') not in ('11', '12', 'Dropper') then raise exception 'Class must be 11, 12 or Dropper'; end if;
  if coalesce(public.norm_stream(p->>'stream'), 'JEE') not in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then raise exception 'Stream must be JEE, NEET, KCET (PCM) or KCET (PCB)'; end if;
  if coalesce(public.norm_category(p->>'category'), 'General') not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST') then raise exception 'Category must be General, Gen-EWS, OBC-NCL, SC or ST'; end if;
  if coalesce(public.norm_gender(p->>'gender'), 'Male') not in ('Male', 'Female', 'Other') then raise exception 'Gender must be Male, Female or Other'; end if;
  if nullif(trim(p_student_id), '') is not null then
    r := public.save_student(p || jsonb_build_object('student_id', p_student_id), me, true);
    if not (r->>'ok')::boolean then raise exception '%', r->>'error'; end if;
    return r;
  end if;
  update public.profiles set
    full_name = coalesce(left(nullif(trim(p->>'full_name'), ''), 120), full_name), class = coalesce(public.norm_class(left(p->>'class', 20)), class),
    stream = coalesce(public.norm_stream(left(p->>'stream', 40)), stream), category = coalesce(public.norm_category(left(p->>'category', 30)), category),
    gender = coalesce(public.norm_gender(left(p->>'gender', 30)), gender),
    session = coalesce(case when coalesce(p->>'session', '') ~ '^\d{4}-\d{2}$' then p->>'session' end, session), updated_at = now()
  where id = p_user and role = 'student' and avanti_id is null and school_approved
    and (public.admin_of(me) or lower(school) = lower(public.approved_school(me)));
  if not found then raise exception 'Student not found in your school'; end if;
  return json_build_object('ok', true, 'action', 'updated');
end $$;

-- Premium teachers: every student of their school (the admin: any school) with test performance.
create or replace function public.school_students(p_school text default null) returns json
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles; v_school text; res json;
begin
  select * into me from public.profiles where id = auth.uid();
  if not public.is_premium_teacher() then raise exception 'The student list is for Premium teachers'; end if;
  v_school := case when public.admin_of(me) and nullif(trim(p_school), '') is not null then trim(p_school) else public.approved_school(me) end;
  if v_school is null then raise exception 'You can see your students after the admin approves your school.'; end if;
  with st as (
    select a.avanti_id as student_id, coalesce(p.full_name, a.full_name) as full_name, a.class, a.stream, a.category, a.gender, a.session,
           a.source, p.id as user_id, a.email,
           -- an Avanti student's date of birth is their password: only the admin sees it
           case when public.admin_of(me) or a.source = 'teacher' then a.dob end as dob,
           case when p.id is not null then public.plan_label(p) when a.source = 'avanti' then 'avanti' when a.premium_until > now() then 'premium' else 'free' end as plan_label, coalesce(p.premium_until, a.premium_until) as premium_until
      from public.student_allowlist a left join public.profiles p on p.avanti_id = a.avanti_id
     where lower(a.school) = lower(v_school)
    union all
    select null, p.full_name, p.class, p.stream, p.category, p.gender, p.session, 'google', p.id, p.email, null::date,
           public.plan_label(p), p.premium_until
      from public.profiles p where p.role = 'student' and p.avanti_id is null and p.school_approved and lower(p.school) = lower(v_school)),
  perf as (
    select user_id, count(*) as tests, round(avg(100.0 * score / nullif(max_score, 0)), 1) as avg_pct,
           round(max(100.0 * score / nullif(max_score, 0)), 1) as best_pct,
           round(100.0 * sum(correct) / nullif(sum(correct + wrong), 0), 1) as accuracy, max(submitted_at) as last_at
      from public.attempts where status = 'submitted' and user_id in (select user_id from st where user_id is not null) group by user_id)
  select json_build_object('school', v_school, 'dob_visible', true, 'students', coalesce(json_agg(json_build_object(
           'student_id', st.student_id, 'full_name', st.full_name, 'class', st.class, 'stream', st.stream, 'category', st.category,
           'gender', st.gender, 'session', st.session, 'source', st.source, 'avanti', st.source = 'avanti',
           'dob', st.dob, 'user_id', st.user_id, 'email', st.email,
           'plan_label', st.plan_label, 'premium_until', st.premium_until,
           'signed_in', st.user_id is not null, 'tests', coalesce(pf.tests, 0), 'avg_pct', pf.avg_pct, 'best_pct', pf.best_pct,
           'accuracy', pf.accuracy, 'last_at', pf.last_at) order by st.class, st.session, st.full_name), '[]'::json))
    into res from st left join perf pf on pf.user_id = st.user_id;
  return res;
end $$;

-- Premium teachers: the tests one student of their school has taken.
create or replace function public.student_attempts(p_user uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles; s public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  select * into s from public.profiles where id = p_user;
  if not public.is_premium_teacher() or s.id is null or not (public.admin_of(me)
     or (public.approved_school(me) is not null and s.school_approved and lower(coalesce(s.school, '')) = lower(me.school))) then
    raise exception 'Student not found in your school';
  end if;
  return (select coalesce(json_agg(json_build_object('id', a.id, 'title', t.title, 'submitted_at', a.submitted_at, 'score', a.score,
            'max_score', a.max_score, 'correct', a.correct, 'wrong', a.wrong, 'skipped', a.skipped, 'time_taken_sec', a.time_taken_sec)
            order by a.submitted_at desc), '[]'::json)
            from public.attempts a join public.tests t on t.id = a.test_id where a.user_id = p_user and a.status = 'submitted');
end $$;

-- One-time data fixes for older rows (classes, streams, sessions, category / gender, old tests). They run only the
-- first time this file is run after this version; new data is checked when it is saved.
do $datafix$
begin
  if exists (select 1 from public.app_settings where key = 'datafix_v1') then return; end if;
  -- Data fixes for classes, streams and sessions (safe to run again). Old streams: PCM, PCMB → JEE; PCB → NEET;
  -- anything else (Commerce, Arts, Other) is cleared so the student picks a stream again.
  update public.student_allowlist set class = public.norm_class(class) where class is distinct from public.norm_class(class);
  update public.student_allowlist set stream = case when public.norm_stream(stream) in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then public.norm_stream(stream) end
   where stream is distinct from case when public.norm_stream(stream) in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then public.norm_stream(stream) end;
  update public.student_allowlist set session = public.session_for(class, created_at) where session is null and class is not null;
  update public.profiles set class = public.norm_class(class) where class is distinct from public.norm_class(class);
  update public.profiles set stream = case when public.norm_stream(stream) in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then public.norm_stream(stream) end
   where stream is distinct from case when public.norm_stream(stream) in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then public.norm_stream(stream) end;
  update public.profiles p set session = coalesce((select a.session from public.student_allowlist a where a.avanti_id = p.avanti_id), public.session_for(p.class, p.created_at))
   where p.role = 'student' and p.session is null and p.class is not null;
  -- Category / gender: short forms, and rows where the two were swapped
  update public.student_allowlist set category = public.norm_category(gender), gender = public.norm_gender(category)
   where public.norm_gender(category) in ('Male', 'Female', 'Other') and public.norm_category(gender) in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST');
  update public.student_allowlist set category = public.norm_category(category), gender = public.norm_gender(gender)
   where category is distinct from public.norm_category(category) or gender is distinct from public.norm_gender(gender);
  update public.profiles set category = public.norm_category(gender), gender = public.norm_gender(category)
   where public.norm_gender(category) in ('Male', 'Female', 'Other') and public.norm_category(gender) in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST');
  update public.profiles set category = public.norm_category(category), gender = public.norm_gender(gender)
   where category is distinct from public.norm_category(category) or gender is distinct from public.norm_gender(gender);
  -- Student profiles with a value outside the lists: cleared, so the student chooses it again
  update public.profiles set
    class = case when class in ('11', '12', 'Dropper') then class end,
    category = case when category in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST') then category end,
    gender = case when gender in ('Male', 'Female', 'Other') then gender end
   where role = 'student' and ((class is not null and class not in ('11', '12', 'Dropper'))
     or (category is not null and category not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST')) or (gender is not null and gender not in ('Male', 'Female', 'Other')));
  update public.attempts set category = public.norm_category(category), gender = public.norm_gender(gender)
   where category is distinct from public.norm_category(category) or gender is distinct from public.norm_gender(gender);
  update public.attempts set class = public.norm_class(class), stream = public.norm_stream(stream) where class is distinct from public.norm_class(class) or stream is distinct from public.norm_stream(stream);
  -- Older tests: every class / stream when none was chosen
  update public.tests set
    target_classes = case when public.norm_class(target_class) in ('11', '12', 'Dropper') then array[public.norm_class(target_class)] else array['11', '12', 'Dropper'] end,
    target_streams = case when public.norm_stream(target_stream) in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then array[public.norm_stream(target_stream)] else array['JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)'] end
   where target_classes is null or target_streams is null;

  -- Older teacher tests: tie them to the teacher's school (runs every time this file is run).
  update public.tests t set school = p.school from public.profiles p
   where p.id = t.owner_id and not public.admin_of(p) and p.school is not null and t.school is distinct from p.school;
  insert into public.app_settings (key, value) values ('datafix_v1', now()::text);
end $datafix$;

-- -------------------------------------------------------------------------------------
-- 11c. Admin: approve teachers' schools
-- -------------------------------------------------------------------------------------
create or replace function public.admin_teachers() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can see this'; end if;
  return (select coalesce(json_agg(json_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email, 'school', p.school,
            'approved', public.admin_of(p) or p.school_approved, 'is_staff', p.is_staff, 'is_admin', public.admin_of(p), 'approved_at', p.school_approved_at, 'approved_by', p.school_approved_by, 'note', p.school_note,
            'plan', public.plan_of(p), 'plan_label', public.plan_label(p), 'premium_until', p.premium_until, 'created_at', p.created_at,
            'school_known', exists (select 1 from public.student_allowlist a where lower(a.school) = lower(p.school)),
            'students', (select count(*) from public.student_allowlist a where lower(a.school) = lower(p.school)),
            'tests', (select count(*) from public.tests t where t.owner_id = p.id))
          order by p.school_approved, p.created_at desc), '[]'::json)
     from public.profiles p where p.role = 'teacher' or (p.is_staff and p.role is distinct from 'student'));
end $$;

-- Admin: edit a teacher's name and school (Teacher approvals -> All teachers -> Edit). Approval status is kept;
-- clearing the school also removes the approval, because there is no school left to approve.
create or replace function public.admin_update_teacher(p_user uuid, p_full_name text, p_school text default null) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can edit teachers'; end if;
  if nullif(trim(p_full_name), '') is null then raise exception 'The name cannot be empty'; end if;
  update public.profiles set full_name = left(trim(p_full_name), 120), school = left(nullif(trim(p_school), ''), 160),
         school_approved = case when nullif(trim(p_school), '') is null then false else school_approved end, updated_at = now()
   where id = p_user and role = 'teacher';
  if not found then raise exception 'Teacher not found'; end if;
  return json_build_object('ok', true);
end $$;

-- The plan as the admin sees and edits it: 'staff' (Avanti @avantifellows.org account), 'avanti' (Avanti list, Premium included),
-- 'premium' (a paid year, or one given by the admin) or 'free'.
create or replace function public.plan_label(p public.profiles) returns text
language sql stable set search_path = public as $$
  select case when p.is_staff then 'staff'
              when p.is_avanti then 'avanti'
              when p.premium_until is not null and p.premium_until > now() then 'premium'
              else 'free' end
$$;

-- Admin only: change the plan of a teacher or a student (Teacher approvals -> Edit, My Students -> Edit plan).
--   p_plan 'free'    : no Premium (Premium date and Avanti flag removed)
--   p_plan 'premium' : Premium until p_until (default: one year from today); the Avanti flag is removed
--   p_plan 'avanti'  : on the Avanti list, Premium included (no end date)
-- Pass p_user (the account) or p_student_id (a student on the Avanti ID list who has not signed in yet; only Free and Avanti
-- can be set then, because Premium with a date needs the account). Avanti staff accounts always keep full access.
create or replace function public.admin_set_plan(p_user uuid, p_student_id text, p_plan text, p_until date default null) returns json
language plpgsql security definer set search_path = public as $$
declare t public.profiles; v_id text := public.norm_avanti_id(p_student_id); v_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can change plans'; end if;
  if p_plan not in ('free', 'premium', 'avanti') then raise exception 'Plan must be Free, Premium or Avanti'; end if;
  if p_user is not null then select * into t from public.profiles where id = p_user;
  elsif v_id is not null then select * into t from public.profiles where avanti_id = v_id;
  end if;
  if t.id is null then
    if v_id is null or not exists (select 1 from public.student_allowlist where avanti_id = v_id) then raise exception 'Person not found'; end if;
    if p_plan = 'premium' then
      v_until := coalesce(p_until::timestamptz, now() + make_interval(years => public.premium_years((select class from public.student_allowlist where avanti_id = v_id))));
      if v_until <= now() then raise exception 'The Premium end date must be in the future'; end if;
    end if;
    update public.student_allowlist set source = case when p_plan = 'avanti' then 'avanti' else 'teacher' end,
           premium_until = case when p_plan = 'premium' then v_until end, updated_at = now() where avanti_id = v_id;
    return json_build_object('ok', true, 'plan', p_plan);
  end if;
  if t.is_staff then raise exception 'Avanti staff always have full access. Their plan cannot be changed here.'; end if;
  if t.role is null then raise exception 'This person has not chosen Teacher or Student yet'; end if;
  if p_plan = 'premium' then
    v_until := coalesce(p_until::timestamptz, now() + make_interval(years => case when t.role = 'student' then public.premium_years(t.class) else 1 end));
    if v_until <= now() then raise exception 'The Premium end date must be in the future'; end if;
  end if;
  update public.profiles set
    is_avanti = (p_plan = 'avanti'),
    premium_until = case p_plan when 'premium' then v_until when 'free' then null else premium_until end,
    plan = case when p_plan = 'free' then 'free' else 'premium' end,
    updated_at = now()
   where id = t.id;
  if t.avanti_id is not null then   -- keep the Avanti ID list in step, so a later sync does not undo the change
    update public.student_allowlist set source = case when p_plan = 'avanti' then 'avanti' else 'teacher' end,
           premium_until = case when p_plan = 'premium' then v_until end, updated_at = now() where avanti_id = t.avanti_id;
  end if;
  return json_build_object('ok', true, 'plan', p_plan);
end $$;

-- Admin only: add a teacher with a school and plan. If the person already has an account (not a student) it is updated now;
-- otherwise they are saved as an invite and get the school and plan when they first sign in with that Google account.
create or replace function public.admin_add_teacher(p_email text, p_full_name text, p_school text, p_plan text, p_until date default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_mail text := lower(trim(coalesce(p_email, ''))); v_school text := left(nullif(trim(p_school), ''), 160); t public.profiles; me public.profiles;
        v_until timestamptz;
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can add teachers'; end if;
  if v_mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter the teacher''s Google email address'; end if;
  if nullif(trim(p_full_name), '') is null then raise exception 'Enter the teacher''s name'; end if;
  if p_plan not in ('free', 'premium', 'avanti') then raise exception 'Plan must be Free, Premium or Avanti'; end if;
  if p_plan = 'premium' then
    v_until := coalesce(p_until::timestamptz, now() + interval '1 year');
    if v_until <= now() then raise exception 'The Premium end date must be in the future'; end if;
  end if;
  select * into me from public.profiles where id = auth.uid();
  select * into t from public.profiles where lower(email) = v_mail;
  if t.id is not null then
    if t.role = 'student' then raise exception 'This email already has a student account'; end if;
    if t.is_staff then raise exception 'This is an Avanti staff account. It already has full access.'; end if;
    update public.profiles set role = 'teacher', full_name = left(trim(p_full_name), 120), school = v_school,
           school_approved = v_school is not null, school_approved_at = case when v_school is not null then now() end,
           school_approved_by = case when v_school is not null then me.email end,
           is_avanti = (p_plan = 'avanti'), premium_until = case when p_plan = 'premium' then v_until end,
           plan = case when p_plan = 'free' then 'free' else 'premium' end, updated_at = now()
     where id = t.id;
    return json_build_object('ok', true, 'status', 'updated');
  end if;
  insert into public.teacher_invites (email, full_name, school, plan, premium_until, invited_by)
  values (v_mail, left(trim(p_full_name), 120), v_school, p_plan, v_until, me.email)
  on conflict (email) do update set full_name = excluded.full_name, school = excluded.school, plan = excluded.plan,
    premium_until = excluded.premium_until, invited_by = excluded.invited_by, created_at = now();
  return json_build_object('ok', true, 'status', 'invited');
end $$;

create or replace function public.admin_teacher_invites() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can see this'; end if;
  return (select coalesce(json_agg(json_build_object('email', i.email, 'full_name', i.full_name, 'school', i.school, 'plan', i.plan,
            'premium_until', i.premium_until, 'created_at', i.created_at) order by i.created_at desc), '[]'::json) from public.teacher_invites i);
end $$;

create or replace function public.admin_cancel_teacher_invite(p_email text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can do this'; end if;
  delete from public.teacher_invites where email = lower(trim(p_email));
  return json_build_object('ok', true);
end $$;

-- Premium teachers: the teachers of their own school (the admin: any school). Shown at the top of My Students.
create or replace function public.school_teachers(p_school text default null) returns json
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles; v_school text;
begin
  select * into me from public.profiles where id = auth.uid();
  if not public.is_premium_teacher() then raise exception 'The teacher list is for Premium teachers'; end if;
  v_school := case when public.admin_of(me) and nullif(trim(p_school), '') is not null then trim(p_school) else public.approved_school(me) end;
  if v_school is null then raise exception 'You can see your school after the admin approves it.'; end if;
  return (select coalesce(json_agg(json_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email, 'plan', public.plan_of(p), 'plan_label', public.plan_label(p),
            'approved', p.school_approved, 'is_staff', p.is_staff, 'created_at', p.created_at,
            'tests', (select count(*) from public.tests t where t.owner_id = p.id))
          order by p.full_name nulls last), '[]'::json)
     from public.profiles p where p.role = 'teacher' and p.school_approved and lower(p.school) = lower(v_school));
end $$;

-- Approve the school of any account (teacher, student or Avanti staff).
-- p_action: 'approve' (optionally correcting the school name), 'reject' (the person chooses the school again), 'revoke'
create or replace function public.admin_set_teacher_school(p_user uuid, p_action text, p_school text default null, p_note text default null) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles;
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can approve schools'; end if;
  select * into me from public.profiles where id = auth.uid();
  if p_action = 'approve' then
    update public.profiles set school = coalesce(left(nullif(trim(p_school), ''), 160), school), school_approved = true,
           school_approved_at = now(), school_approved_by = me.email, school_note = null, updated_at = now()
     where id = p_user and avanti_id is null;
  elsif p_action = 'reject' then
    update public.profiles set school = null, school_approved = false, school_approved_at = null, school_approved_by = me.email,
           school_note = coalesce(nullif(trim(p_note), ''), 'Your school was not approved. Please choose your school again.'), updated_at = now()
     where id = p_user and avanti_id is null;
  elsif p_action = 'revoke' then
    update public.profiles set school_approved = false, school_approved_at = null, school_approved_by = me.email, updated_at = now()
     where id = p_user and avanti_id is null;
  else raise exception 'Unknown action'; end if;
  if not found then raise exception 'Person not found (students on the student list change school through their row)'; end if;
  return json_build_object('ok', true);
end $$;

-- Admin: students whose school (chosen by themselves when they signed up with Google) waits for approval.
create or replace function public.admin_pending_students() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can see this'; end if;
  return (select coalesce(json_agg(json_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email, 'school', p.school,
            'class', p.class, 'stream', p.stream, 'plan_label', public.plan_label(p), 'note', p.school_note, 'created_at', p.created_at,
            'school_known', exists (select 1 from public.student_allowlist a where lower(a.school) = lower(p.school)))
          order by p.created_at desc), '[]'::json)
     from public.profiles p where p.role = 'student' and not p.school_approved and p.school is not null and p.avanti_id is null);
end $$;

-- School changes. Everyone (teachers, students and Avanti staff) asks here; only the admin changes their own school
-- directly. The admin approves or rejects the request in Teacher approvals.
create or replace function public.request_school_change(p_school text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; v text := left(nullif(trim(p_school), ''), 160);
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'Please sign in again'; end if;
  if public.admin_of(me) then raise exception 'As the admin you can change your school in Edit profile'; end if;
  if me.school is null then raise exception 'Choose your school in Edit profile first'; end if;
  if v is not null and lower(v) = lower(me.school) then raise exception 'That is already your school'; end if;
  if me.role = 'student' and public.is_not_working(v) then raise exception '"Not Working" is only for teachers. Please choose your school.'; end if;
  if me.role is distinct from 'student' and public.is_not_working(v) then   -- moving to "Not Working" needs no approval
    update public.profiles set school = 'Not Working', school_approved = true, school_approved_at = now(), school_approved_by = 'Not Working (automatic)',
           school_request = null, school_request_at = null, school_note = null, updated_at = now() where id = me.id;
    return public.my_profile();
  end if;
  update public.profiles set school_request = v, school_request_at = case when v is null then null else now() end, updated_at = now() where id = me.id;
  return public.my_profile();
end $$;

create or replace function public.admin_school_requests() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can see this'; end if;
  return (select coalesce(json_agg(json_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email, 'avanti_id', p.avanti_id,
            'role', p.role, 'school', p.school, 'request', p.school_request, 'requested_at', p.school_request_at, 'plan', public.plan_of(p),
            'school_known', exists (select 1 from public.student_allowlist a where lower(a.school) = lower(p.school_request)))
          order by p.school_request_at), '[]'::json)
     from public.profiles p where p.school_request is not null);
end $$;

-- p_action: 'approve' (optionally correcting the new school name) or 'reject'
create or replace function public.admin_school_request(p_user uuid, p_action text, p_school text default null, p_note text default null) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; u public.profiles; v text;
begin
  if not public.is_admin() then raise exception 'Only Avanti admins can approve school changes'; end if;
  select * into me from public.profiles where id = auth.uid();
  select * into u from public.profiles where id = p_user for update;
  if u.id is null or u.school_request is null then raise exception 'Request not found'; end if;
  if p_action = 'approve' then
    v := coalesce(left(nullif(trim(p_school), ''), 160), u.school_request);
    update public.profiles set school = v, school_request = null, school_request_at = null, school_note = null,
           school_approved = true, school_approved_at = now(), school_approved_by = me.email, updated_at = now()
     where id = u.id;
    -- Avanti ID students: their school comes from the Avanti list, so change it there too
    if u.avanti_id is not null then update public.student_allowlist set school = v, updated_at = now() where avanti_id = u.avanti_id; end if;
  elsif p_action = 'reject' then
    update public.profiles set school_request = null, school_request_at = null,
           school_note = coalesce(nullif(trim(p_note), ''), 'Your request to change your school was not approved.'), updated_at = now()
     where id = u.id;
  else raise exception 'Unknown action'; end if;
  return json_build_object('ok', true);
end $$;

-- Numbers shown next to the profile-menu items.
create or replace function public.menu_counts() returns json
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then return '{}'::json; end if;
  return json_build_object(
    'tests', (select count(*) from public.tests t where t.owner_id = me.id or public.admin_of(me)),
    'worksheets', (select count(*) from public.worksheets w where w.owner_id = me.id),
    'students', case when public.admin_of(me) then (select count(*) from public.student_allowlist) + (select count(*) from public.profiles x where x.role = 'student' and x.avanti_id is null)
                     when me.role = 'teacher' and public.approved_school(me) is not null then
                       (select count(*) from public.student_allowlist a where lower(a.school) = lower(me.school))
                       + (select count(*) from public.profiles x where x.role = 'student' and x.avanti_id is null and x.school_approved and lower(x.school) = lower(me.school)) end,
    'available', case when me.role = 'student' and public.approved_school(me) is not null then (select count(*) from public.tests t
                       where t.is_active and t.owner_id <> me.id and me.class = any(t.target_classes) and me.stream = any(t.target_streams)
                         and (t.school is null or lower(t.school) = lower(me.school)) and not t.link_only
                         and not exists (select 1 from public.attempts a where a.test_id = t.id and a.user_id = me.id and a.status = 'submitted')) end,
    'reports', (select count(*) from public.attempts a where a.user_id = me.id and a.status = 'submitted'),
    'approvals', case when public.admin_of(me) then (select count(*) from public.profiles t
                       where (t.role is not null and not t.school_approved and t.school is not null and t.avanti_id is null and not public.admin_of(t))
                          or t.school_request is not null) end);
end $$;

-- Help & Support contact (also shown on the login page, so it is readable without signing in).
create or replace function public.support_contact() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('email', (select value from public.app_settings where key = 'support_email'),
                           'phone', nullif((select value from public.app_settings where key = 'support_phone'), ''))
$$;

-- Teachers' chat "who is online": a private Supabase Realtime channel that only chat members may join.
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists teachers_chat_read on realtime.messages';
    execute 'drop policy if exists teachers_chat_write on realtime.messages';
    execute $p$create policy teachers_chat_read on realtime.messages for select to authenticated
             using (realtime.topic() = 'teachers-room' and public.chat_member())$p$;
    execute $p$create policy teachers_chat_write on realtime.messages for insert to authenticated
             with check (realtime.topic() = 'teachers-room' and public.chat_member())$p$;
  end if;
end $$;

-- -------------------------------------------------------------------------------------
-- 11d. School approval for everyone (version 870). Students and Avanti staff now also need the admin's approval of their
--      school. People who already had a school before this version keep it approved; anything new waits for the admin.
-- -------------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.app_settings where key = 'school_approval_v870') then return; end if;
  update public.profiles set school_approved = true, school_approved_at = coalesce(school_approved_at, now()),
         school_approved_by = coalesce(school_approved_by, 'before v870')
   where school is not null and not school_approved and (role = 'student' or is_staff);
  insert into public.app_settings (key, value) values ('school_approval_v870', now()::text);
end $$;

-- -------------------------------------------------------------------------------------
-- 11e. Teachers' chat. Messages are saved by chat_send(), which writes the sender's real name, school and role from the
--      database (nobody can pose as someone else), limits how often one person can send, and deletes messages older
--      than 24 hours. Members receive new messages live (Supabase Realtime, filtered by the policy below).
-- -------------------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id         bigserial primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  school     text,
  role_label text,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_at on public.chat_messages (created_at);
create index if not exists chat_messages_user_at on public.chat_messages (user_id, created_at);
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
grant select on public.chat_messages to authenticated;
drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select to authenticated
  using ((select public.chat_member()) and created_at > now() - interval '24 hours');
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
end $$;

create or replace function public.chat_send(p_body text) returns json
language plpgsql security definer set search_path = public as $$
declare me public.profiles; v text := trim(coalesce(p_body, '')); m public.chat_messages;
begin
  if not public.chat_member() then raise exception 'The chat is for Premium teachers and Avanti teachers whose school is approved'; end if;
  if v = '' then raise exception 'Type a message'; end if;
  perform pg_advisory_xact_lock(hashtext('chat:' || auth.uid()::text));
  if char_length(v) > 1000 then raise exception 'A message can be up to 1000 characters'; end if;
  if (select count(*) from public.chat_messages where user_id = auth.uid() and created_at > now() - interval '15 seconds') >= 5
     or (select count(*) from public.chat_messages where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 120 then
    raise exception 'You are sending messages too fast. Please wait a moment.';
  end if;
  select * into me from public.profiles where id = auth.uid();
  delete from public.chat_messages where created_at < now() - interval '24 hours';
  insert into public.chat_messages (user_id, name, school, role_label, body)
  values (me.id, coalesce(me.full_name, me.email, 'Teacher'), me.school,
          case when public.admin_of(me) then 'Admin' when me.is_staff then 'Avanti teacher' else 'Premium teacher' end, v)
  returning * into m;
  return json_build_object('id', m.id, 'created_at', m.created_at);
end $$;

-- Names of the chat members who are online (the browser sends only account ids; names come from here).
create or replace function public.chat_people(p_ids uuid[]) returns json
language sql stable security definer set search_path = public as $$
  select case when public.chat_member() then (select coalesce(json_agg(json_build_object('id', p.id, 'name', coalesce(p.full_name, 'Teacher'),
           'school', p.school, 'role', case when public.admin_of(p) then 'Admin' when p.is_staff then 'Avanti teacher' else 'Premium teacher' end)), '[]'::json)
      from public.profiles p where p.id = any(p_ids[1:200]) and (public.admin_of(p) or (public.approved_school(p) is not null
           and (p.is_staff or (p.role = 'teacher' and public.plan_of(p) = 'premium'))))) else '[]'::json end
$$;

-- -------------------------------------------------------------------------------------
-- 11f. Question flags (Staff: "write what to correct in this question"), shared by every Staff account.
-- -------------------------------------------------------------------------------------
create table if not exists public.qb_flags (
  qid        text primary key check (char_length(qid) <= 80),
  note       text not null check (char_length(note) between 1 and 2000),
  status     text not null default 'open' check (status in ('open', 'done')),
  meta       jsonb not null default '{}'::jsonb check (length(meta::text) <= 4000),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.qb_flags enable row level security;
revoke all on public.qb_flags from anon, authenticated;

create or replace function public.qb_flags_list() returns json
language sql stable security definer set search_path = public as $$
  select case when public.is_staff() then (select coalesce(json_agg(json_build_object('id', f.qid, 'note', f.note, 'status', f.status,
           'at', (extract(epoch from f.updated_at) * 1000)::bigint)), '[]'::json) from public.qb_flags f where f.status = 'open')
         else '[]'::json end
$$;
create or replace function public.qb_flag_set(p_qid text, p_note text, p_meta jsonb default '{}'::jsonb) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Flags are for Avanti staff'; end if;
  if nullif(trim(p_note), '') is null then
    delete from public.qb_flags where qid = p_qid;
  else
    insert into public.qb_flags (qid, note, meta, updated_by) values (left(p_qid, 80), left(trim(p_note), 2000), coalesce(p_meta, '{}'::jsonb), auth.uid())
    on conflict (qid) do update set note = excluded.note, meta = excluded.meta, status = 'open', updated_by = auth.uid(), updated_at = now();
  end if;
  return json_build_object('ok', true);
end $$;

-- -------------------------------------------------------------------------------------
-- 11g. Paid content in Supabase Storage (private bucket "content"). Nothing is public; every file is checked here:
--   qb/..., sol/..., must.json, bank-meta.json  questions, answers, solutions: any signed-in account with a role,
--                                               but NOT while that person is writing a test
--   handouts/index.json                         the list of handouts (titles only): any signed-in account
--   handouts/...                                handout PDFs: Premium (and Avanti / Staff) only
--   admin/...                                   Word / PowerPoint export code: the admin only
-- Files are uploaded by the GitHub Action "Upload content to Supabase" (service role). Browsers can never write.
-- -------------------------------------------------------------------------------------
create or replace function public.content_allowed(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare me public.profiles; n text := coalesce(p_name, '');
begin
  if auth.uid() is null or n like '%..%' then return false; end if;
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role is null and not me.is_staff then return false; end if;
  if public.admin_of(me) then return true; end if;
  if n like 'admin/%' then return false; end if;
  if n = 'handouts/index.json' then return true; end if;
  if n like 'handouts/%' then return public.plan_of(me) in ('premium', 'staff'); end if;
  if n like 'qb/%' or n like 'sol/%' or n in ('must.json', 'bank-meta.json') then return not public.in_test(); end if;
  return false;
end $$;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('content', 'content', false)
      on conflict (id) do update set public = false;
    execute 'drop policy if exists content_read on storage.objects';
    execute $p$create policy content_read on storage.objects for select to authenticated
             using (bucket_id = 'content' and public.content_allowed(name))$p$;
  end if;
end $$;

-- Used by the weekly GitHub Action that keeps the free Supabase project awake.
create or replace function public.ping() returns integer language sql stable as $$ select 1 $$;

-- -------------------------------------------------------------------------------------
-- 12. Who may call which function
-- -------------------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.ping(), public.support_contact() to anon, authenticated;
grant execute on function public.plan_of(public.profiles), public.my_plan(), public.is_staff(), public.can_create_tests(),
  public.norm_class(text), public.norm_stream(text), public.norm_category(text), public.norm_gender(text), public.session_for(text, timestamptz),
  public.my_profile(), public.set_my_role(text), public.update_my_profile(text, text, text, text, text, text),
  public.list_available_tests(), public.test_info(text), public.start_attempt(text),
  public.save_attempt(uuid, jsonb, integer), public.submit_attempt(uuid, jsonb, integer),
  public.my_attempts(), public.my_tests(), public.list_schools(), public.is_premium_teacher(), public.price_paise(text),
  public.teacher_add_student(jsonb), public.teacher_add_students(jsonb), public.teacher_update_student(uuid, text, jsonb),
  public.school_students(text), public.student_attempts(uuid), public.is_admin(), public.admin_teachers(),
  public.request_school_change(text), public.admin_school_requests(), public.admin_school_request(uuid, text, text, text),
  public.admin_set_teacher_school(uuid, text, text, text), public.admin_update_teacher(uuid, text, text), public.admin_pending_students(),
  public.admin_schools(), public.admin_rename_school(text, text), public.admin_delete_school(text),
  public.chat_member(), public.chat_send(text), public.chat_people(uuid[]), public.qb_flags_list(), public.qb_flag_set(text, text, jsonb),
  public.content_allowed(text), public.in_test(), public.approved_school(public.profiles), public.admin_set_plan(uuid, text, text, date), public.premium_years(text), public.admin_add_teacher(text, text, text, text, date), public.admin_teacher_invites(), public.admin_cancel_teacher_invite(text), public.plan_label(public.profiles), public.school_teachers(text), public.menu_counts(), public.attempt_report(uuid), public.test_results(uuid), public.new_test_code()
  to authenticated;
-- server only (Edge Functions use the service role)
grant execute on function public.avanti_verify(text, text, text), public.grant_premium(text, text, integer),
  public.mark_payment_failed(text, text, text) to service_role;
-- allowlist_add / allowlist_load_import / grade_attempt / save_student / sync_student_profile / link_student_account:
-- only from the SQL Editor or from other functions.
