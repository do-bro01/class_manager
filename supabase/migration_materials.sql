-- =============================================
-- Class Manager — 자료실(Materials) 마이그레이션
-- v1.2 추가 기능. Supabase SQL Editor에서 전체 실행
-- 전제: migration.sql (v1.0)
-- =============================================

-- 1. 테이블 생성
-- =============================================

create table if not exists materials (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid references classes(id) on delete cascade not null,
  uploader_id  uuid references auth.users(id) on delete cascade not null,
  title        text not null,
  description  text,
  file_path    text not null unique,
  file_name    text not null,
  file_size    bigint not null,
  mime_type    text,
  created_at   timestamptz default now() not null
);

create index if not exists materials_class_idx
  on materials(class_id, created_at desc);

-- 2. RLS 활성화
-- =============================================

alter table materials enable row level security;

-- 3. RLS 정책 — materials
-- =============================================

-- 강사: 본인 수업 자료 전체 관리
create policy "강사 자료 관리" on materials
  for all
  using (
    exists (
      select 1 from classes
      where id = materials.class_id
        and instructor_id = auth.uid()
    )
  );

-- 수강생: 본인이 등록(active)된 수업 자료 조회
create policy "수강생 자료 조회" on materials
  for select
  using (
    exists (
      select 1 from enrollments
      where class_id = materials.class_id
        and user_id = auth.uid()
        and status = 'active'
    )
  );

-- 4. Storage 버킷 생성
-- =============================================
-- 비공개 버킷. 다운로드는 server action에서 createSignedUrl로 발급.

insert into storage.buckets (id, name, public)
  values ('class-materials', 'class-materials', false)
  on conflict (id) do nothing;

-- 5. Storage RLS — 경로 첫 폴더 = class_id 컨벤션
-- =============================================

-- 업로드: 해당 수업의 강사만
create policy "강사 자료 업로드" on storage.objects
  for insert
  with check (
    bucket_id = 'class-materials'
    and exists (
      select 1 from classes c
      where c.id::text = (storage.foldername(name))[1]
        and c.instructor_id = auth.uid()
    )
  );

-- 조회(서명 URL 발급용): 강사 또는 active 수강생
create policy "수업 참여자 자료 조회" on storage.objects
  for select
  using (
    bucket_id = 'class-materials'
    and (
      exists (
        select 1 from classes c
        where c.id::text = (storage.foldername(name))[1]
          and c.instructor_id = auth.uid()
      )
      or exists (
        select 1 from enrollments e
        where e.class_id::text = (storage.foldername(name))[1]
          and e.user_id = auth.uid()
          and e.status = 'active'
      )
    )
  );

-- 삭제: 해당 수업의 강사만
create policy "강사 자료 삭제" on storage.objects
  for delete
  using (
    bucket_id = 'class-materials'
    and exists (
      select 1 from classes c
      where c.id::text = (storage.foldername(name))[1]
        and c.instructor_id = auth.uid()
    )
  );
