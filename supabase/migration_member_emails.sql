-- =============================================
-- Class Manager — 수강생 이메일 조회 함수
-- 배경: PostgREST는 기본적으로 auth.users 임베드를 막음.
-- 해결: SECURITY DEFINER 함수로 강사가 자기 수업의 수강생 이메일을 조회.
-- 전제: migration.sql (v1.0)
-- =============================================

create or replace function get_class_member_emails(p_class_id uuid)
returns table (user_id uuid, email text)
language sql
security definer
set search_path = public, auth
as $$
  select e.user_id, u.email::text
  from enrollments e
  join auth.users u on u.id = e.user_id
  where e.class_id = p_class_id
    and exists (
      select 1 from classes c
      where c.id = p_class_id
        and c.instructor_id = auth.uid()
    );
$$;

revoke all on function get_class_member_emails(uuid) from public;
grant execute on function get_class_member_emails(uuid) to authenticated;
