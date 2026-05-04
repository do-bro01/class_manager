-- =============================================
-- Class Manager — 출결(Attendance) 마이그레이션
-- v1.1 추가 기능. Supabase SQL Editor에서 전체 실행
-- 전제: migration.sql (v1.0) 이 먼저 적용되어 있어야 함
-- =============================================

-- 1. 테이블 생성
-- =============================================

-- 출결 회차 (강사가 수업당 여러 개 생성)
create table if not exists attendance_sessions (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid references classes(id) on delete cascade not null,
  title           text not null,
  session_date    date not null,
  check_in_open   boolean default false not null,
  created_at      timestamptz default now() not null
);

create index if not exists attendance_sessions_class_idx
  on attendance_sessions(class_id, session_date desc);

-- 개별 수강생 출결 레코드
create table if not exists attendance_records (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references attendance_sessions(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  status      text not null check (status in ('present', 'late', 'absent', 'excused')),
  marked_by   uuid references auth.users(id) on delete set null,
  marked_at   timestamptz default now() not null,
  unique(session_id, user_id)
);

create index if not exists attendance_records_session_idx
  on attendance_records(session_id);
create index if not exists attendance_records_user_idx
  on attendance_records(user_id);

-- 2. RLS 활성화
-- =============================================

alter table attendance_sessions enable row level security;
alter table attendance_records  enable row level security;

-- 3. RLS 정책 — attendance_sessions
-- =============================================

-- 강사: 본인 수업의 회차 전체 관리
create policy "강사 출결회차 관리" on attendance_sessions
  for all
  using (
    exists (
      select 1 from classes
      where id = attendance_sessions.class_id
        and instructor_id = auth.uid()
    )
  );

-- 수강생: 본인이 등록(active)된 수업의 회차만 조회
create policy "수강생 출결회차 조회" on attendance_sessions
  for select
  using (
    exists (
      select 1 from enrollments
      where class_id = attendance_sessions.class_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

-- 4. RLS 정책 — attendance_records
-- =============================================

-- 강사: 본인 수업의 모든 레코드 관리
create policy "강사 출결 관리" on attendance_records
  for all
  using (
    exists (
      select 1
      from attendance_sessions s
      join classes c on c.id = s.class_id
      where s.id = attendance_records.session_id
        and c.instructor_id = auth.uid()
    )
  );

-- 수강생: 본인 레코드 조회
create policy "수강생 본인 출결 조회" on attendance_records
  for select
  using (user_id = auth.uid());

-- 수강생: 자가 체크인 (본인 user_id, 체크인 열린 회차, active enrollment 일 때만)
-- status 값 자체는 server action에서 'present'로 강제. RLS는 권한만 검증.
create policy "수강생 자가 체크인" on attendance_records
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from attendance_sessions s
      join enrollments e on e.class_id = s.class_id
      where s.id = attendance_records.session_id
        and s.check_in_open = true
        and e.user_id = auth.uid()
        and e.status = 'active'
    )
  );
