-- Teachers' chat: who may join the private Realtime channel "teachers-room".
-- Run this once in Supabase → SQL Editor. Safe to run again. (The same rules are also in schema.sql.)
-- Without these two rules the chat shows: "Unauthorized: You do not have permissions to read from this Channel topic: teachers-room".

grant execute on function public.is_premium_teacher() to authenticated;

drop policy if exists teachers_chat_read on realtime.messages;
drop policy if exists teachers_chat_write on realtime.messages;

-- receive messages and see who is online: Premium teachers, Avanti teachers (Staff) and the admin
create policy teachers_chat_read on realtime.messages for select to authenticated
  using (realtime.topic() = 'teachers-room' and public.is_premium_teacher());

-- send messages and show yourself as online
create policy teachers_chat_write on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'teachers-room' and public.is_premium_teacher());

-- check: this should list teachers_chat_read and teachers_chat_write
select policyname, cmd from pg_policies where schemaname = 'realtime' and tablename = 'messages';
