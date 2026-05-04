-- =============================================
-- Class Manager — 수강생 이메일 + 이름 조회 함수
-- migration_member_emails.sql 의 후속. 이름(user_metadata.name)도 반환.
-- 전제: migration.sql (v1.0)
-- =============================================

drop function if exists get_class_member_emails(uuid);

create or replace function get_class_members(p_class_id uuid)
returns table (user_id uuid, email text, name text)
language sql
security definer
set search_path = public, auth
as $$
  select
    e.user_id,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'name', '')::text as name
  from enrollments e
  join auth.users u on u.id = e.user_id
  where e.class_id = p_class_id
    and exists (
      select 1 from classes c
      where c.id = p_class_id
        and c.instructor_id = auth.uid()
    );
$$;

revoke all on function get_class_members(uuid) from public;
grant execute on function get_class_members(uuid) to authenticated;

notify pgrst, 'reload schema';
