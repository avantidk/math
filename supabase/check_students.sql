-- =====================================================================================
-- Check student data (read only: this file changes nothing)
-- Run AFTER schema.sql: Supabase → SQL Editor → New query → paste → Run.
-- The editor shows the result of the LAST query. To see another one, select just that query with the mouse and press Run
-- (Supabase runs only the selected text). The last query lists the students that still need a correction.
-- =====================================================================================

-- 1. Students per school and class, with how many have every detail in the allowed lists
select school, class, count(*) as students,
       count(*) filter (where class in ('11', '12', 'Dropper')
                          and stream in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)')
                          and category in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST')
                          and gender in ('Male', 'Female', 'Other')
                          and session ~ '^\d{4}-\d{2}$') as complete,
       string_agg(distinct session, ', ') as sessions
  from public.student_allowlist
 group by school, class
 order by school, class;

-- 2. Every value now in use (should only show the allowed values)
select 'class' as field, class as value, count(*) from public.student_allowlist group by class
union all select 'stream', stream, count(*) from public.student_allowlist group by stream
union all select 'category', category, count(*) from public.student_allowlist group by category
union all select 'gender', gender, count(*) from public.student_allowlist group by gender
union all select 'session', session, count(*) from public.student_allowlist group by session
order by 1, 2;

-- 3. Students that still need a correction (fix them in My Students → Edit, or upload them again after correcting the file)
select avanti_id, full_name, school, class, stream, category, gender, session,
       concat_ws('; ',
         case when class is null or class not in ('11', '12', 'Dropper') then 'class "' || coalesce(class, 'empty') || '"' end,
         case when stream is null or stream not in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)') then 'stream "' || coalesce(stream, 'empty') || '"' end,
         case when category is null or category not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST') then 'category "' || coalesce(category, 'empty') || '"' end,
         case when gender is null or gender not in ('Male', 'Female', 'Other') then 'gender "' || coalesce(gender, 'empty') || '"' end,
         case when session is null then 'no session' end) as problem
  from public.student_allowlist
 where class is null or class not in ('11', '12', 'Dropper')
    or stream is null or stream not in ('JEE', 'NEET', 'KCET (PCM)', 'KCET (PCB)')
    or category is null or category not in ('General', 'Gen-EWS', 'OBC-NCL', 'SC', 'ST')
    or gender is null or gender not in ('Male', 'Female', 'Other')
    or session is null
 order by school, class, full_name;
