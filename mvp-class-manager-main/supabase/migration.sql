-- =============================================
-- Class Manager 마이그레이션 v1.0
-- Supabase SQL Editor에서 전체 실행
-- =============================================

-- 1. 테이블 생성
-- =============================================

create table if not exists classes (
  id           uuid primary key default gen_random_uuid(),
  instructor_id uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  institution  text not null,
  invite_code  text not null unique,
  start_date   date,
  end_date     date,
  created_at   timestamptz default now() not null
);

create table if not exists enrollments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references classes(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  status      text default 'active' check (status in ('active', 'inactive')) not null,
  enrolled_at timestamptz default now() not null,
  unique(class_id, user_id)
);

create table if not exists posts (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid references classes(id) on delete cascade not null,
  author_id  uuid references auth.users(id) on delete cascade not null,
  type       text check (type in ('notice', 'qna')) not null,
  title      text not null,
  content    text not null,
  link_url   text,
  parent_id  uuid references posts(id) on delete cascade,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. RLS(Row Level Security) 활성화
-- =============================================

alter table classes    enable row level security;
alter table enrollments enable row level security;
alter table posts      enable row level security;

-- 3. RLS 정책
-- =============================================

-- classes: 강사는 본인 수업 전체 관리
create policy "강사 수업 관리" on classes
  for all
  using (instructor_id = auth.uid());

-- classes: 수강생은 본인이 등록된 수업만 조회
create policy "수강생 수업 조회" on classes
  for select
  using (
    exists (
      select 1 from enrollments
      where class_id = classes.id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

-- enrollments: 강사는 본인 수업의 수강생 전체 관리
create policy "강사 수강생 관리" on enrollments
  for all
  using (
    exists (
      select 1 from classes
      where id = enrollments.class_id
        and instructor_id = auth.uid()
    )
  );

-- enrollments: 수강생은 본인 등록 행만 조회 가능
create policy "수강생 본인 등록 조회" on enrollments
  for select
  using (user_id = auth.uid());

-- enrollments: 로그인한 모든 사용자가 등록 가능 (초대코드 검증은 Server Action에서)
create policy "수강생 등록" on enrollments
  for insert
  with check (user_id = auth.uid());

-- posts: 작성자는 본인 게시물 전체 관리
create policy "작성자 게시물 관리" on posts
  for all
  using (author_id = auth.uid());

-- posts: 해당 수업 활성 수강생 또는 강사가 조회
create policy "수업 참여자 게시물 조회" on posts
  for select
  using (
    exists (
      select 1 from classes
      where id = posts.class_id
        and instructor_id = auth.uid()
    )
    or
    exists (
      select 1 from enrollments
      where class_id = posts.class_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

-- 4. updated_at 자동 갱신 트리거
-- =============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger posts_updated_at
  before update on posts
  for each row execute function update_updated_at();
