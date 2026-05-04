-- =============================================
-- Class Manager — 수업 담당 교수 프로필 조회 함수
-- 학생이 수업 카드/상세에서 담당 교수의 이름을 볼 수 있게 함.
-- 전제: migration.sql (v1.0)
-- =============================================

create or replace function get_class_instructor(p_class_id uuid)
returns table (user_id uuid, email text, name text)
language sql
security definer
set search_path = public, auth
as $$
  select
    c.instructor_id as user_id,
    u.email::text,
    coalesce(u.raw_user_meta_data ->> 'name', '')::text as name
  from classes c
  join auth.users u on u.id = c.instructor_id
  where c.id = p_class_id
    and (
      c.instructor_id = auth.uid()
      or exists (
        select 1 from enrollments e
        where e.class_id = p_class_id
          and e.user_id = auth.uid()
          and e.status = 'active'
      )
    );
$$;

revoke all on function get_class_instructor(uuid) from public;
grant execute on function get_class_instructor(uuid) to authenticated;

notify pgrst, 'reload schema';
