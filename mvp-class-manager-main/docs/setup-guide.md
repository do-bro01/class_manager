# Class Manager 초기 셋팅 가이드

> 작성일: 2026-04-29
> 기반 문서: docs/tech-stack-class-manager.md

## 전제 조건

- Node.js 20+ 설치 확인 (`node -v`)
- Git 설치 확인
- [Supabase](https://supabase.com) 계정
- [Vercel](https://vercel.com) 계정 (GitHub 연동)

---

## 1단계 — Next.js 프로젝트 초기화

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*"
```

> 이미 폴더가 존재하면 `.` 대신 프로젝트 폴더명을 입력하세요.

설치 완료 후 실행 확인:

```bash
npm run dev
# http://localhost:3000 접속 확인
```

---

## 2단계 — shadcn/ui 설치

```bash
npx shadcn@latest init
```

설치 중 질문 응답:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `Yes`

자주 쓸 컴포넌트 미리 추가:

```bash
npx shadcn@latest add button input label card table badge dialog form
```

---

## 3단계 — 추가 패키지 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form zod @hookform/resolvers
```

---

## 4단계 — Supabase 프로젝트 생성

1. [supabase.com/dashboard](https://supabase.com/dashboard) 접속
2. **New Project** 클릭
3. 프로젝트 이름: `class-manager`, 리전: `Northeast Asia (Seoul)` 선택
4. DB 비밀번호 저장해두기 (나중에 필요)
5. 생성 완료까지 약 1~2분 대기

### API 키 확인

프로젝트 대시보드 → **Settings → API**에서:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (절대 클라이언트에 노출 금지)

---

## 5단계 — 환경변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

`.gitignore`에 `.env.local`이 포함되어 있는지 확인 (create-next-app이 자동으로 추가함).

---

## 6단계 — Supabase 클라이언트 설정

### 브라우저용 클라이언트

`src/lib/supabase/client.ts` 생성:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 서버용 클라이언트

`src/lib/supabase/server.ts` 생성:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### 미들웨어 (세션 유지)

`src/middleware.ts` 생성:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 로그인 안 된 사용자가 보호된 페이지 접근 시 리디렉트
  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/classes/:path*'],
}
```

---

## 7단계 — Supabase DB 스키마 생성

Supabase 대시보드 → **SQL Editor** → **New query**에 아래 SQL 붙여넣기 후 실행:

```sql
-- 수업 테이블
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  institution text not null,
  description text,
  instructor_id uuid references auth.users(id) on delete cascade not null,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- 수강 등록 테이블
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  unique(class_id, user_id)
);

-- 게시물(공지/자료) 테이블
create table posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text,
  type text default 'notice' check (type in ('notice', 'material')),
  created_at timestamptz default now()
);

-- 사용자 프로필 테이블 (Auth users 확장)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role text default 'student' check (role in ('instructor', 'student')),
  created_at timestamptz default now()
);

-- 신규 가입 시 프로필 자동 생성 트리거
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### Row Level Security (RLS) 설정

```sql
-- RLS 활성화
alter table classes enable row level security;
alter table enrollments enable row level security;
alter table posts enable row level security;
alter table profiles enable row level security;

-- classes: 강사는 본인 수업만 관리, 수강생은 등록된 수업만 조회
create policy "강사 수업 관리" on classes
  for all using (instructor_id = auth.uid());

create policy "수강생 수업 조회" on classes
  for select using (
    exists (select 1 from enrollments where class_id = id and user_id = auth.uid())
  );

-- enrollments: 강사는 본인 수업의 등록 관리, 수강생은 본인 등록 조회
create policy "강사 수강생 관리" on enrollments
  for all using (
    exists (select 1 from classes where id = class_id and instructor_id = auth.uid())
  );

create policy "수강생 본인 등록 조회" on enrollments
  for select using (user_id = auth.uid());

-- posts: 강사 작성/수정, 수강생 조회
create policy "강사 게시물 관리" on posts
  for all using (author_id = auth.uid());

create policy "수강생 게시물 조회" on posts
  for select using (
    exists (select 1 from enrollments where class_id = posts.class_id and user_id = auth.uid())
  );

-- profiles: 본인만 조회/수정
create policy "본인 프로필 관리" on profiles
  for all using (id = auth.uid());
```

---

## 8단계 — 강사 계정 역할 설정

> 이 단계는 **Supabase Auth에 강사 계정을 먼저 가입한 뒤** 실행하세요.  
> 역할 판별 방식: `app_metadata`에 `role: instructor` 클레임을 심어두면 JWT 토큰에 포함되어 Server Action과 RLS 양쪽에서 사용할 수 있습니다.

### 1. 강사 계정 가입

앱에서 일반 회원가입과 동일하게 진행하면 됩니다 (이메일 + 비밀번호).  
또는 Supabase 대시보드 → **Authentication → Users → Invite user**로 직접 생성할 수도 있습니다.

### 2. 강사 역할 부여 SQL

Supabase 대시보드 → **SQL Editor → New query**에 아래 SQL을 붙여넣고 실행하세요.  
`'your-email@example.com'` 부분만 실제 강사 이메일로 교체하면 됩니다:

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "instructor"}'::jsonb
WHERE email = 'your-email@example.com';
```

실행 후 확인:

```sql
SELECT email, raw_app_meta_data
FROM auth.users
WHERE email = 'your-email@example.com';
-- raw_app_meta_data 컬럼에 {"role": "instructor", ...} 가 포함되어 있으면 성공
```

### 3. Server Action에서 역할 확인하는 방법

```ts
import { createClient } from '@/lib/supabase/server'

export async function someInstructorAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.app_metadata?.role !== 'instructor') {
    throw new Error('Unauthorized')
  }

  // 강사 전용 로직 ...
}
```

### 4. RLS 정책에서 역할 확인하는 방법

```sql
-- 예시: 강사만 수업을 생성할 수 있도록 RLS 정책 추가
CREATE POLICY "강사만 수업 생성 가능" ON classes
FOR INSERT
WITH CHECK (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'instructor'
);
```

> **주의**: `app_metadata`는 서버(Supabase Admin API)에서만 수정 가능합니다. 클라이언트 코드에서는 읽기만 가능하므로 임의 변경 위험이 없습니다.

---

## 10단계 — 폴더 구조 생성

```bash
mkdir -p src/lib/supabase
mkdir -p src/lib/actions
mkdir -p src/components/ui
mkdir -p src/components/features
mkdir -p src/types
```

`src/types/index.ts` 생성 (기본 타입 정의):

```ts
export type UserRole = 'instructor' | 'student'

export type Profile = {
  id: string
  name: string | null
  role: UserRole
  created_at: string
}

export type Class = {
  id: string
  name: string
  institution: string
  description: string | null
  instructor_id: string
  start_date: string | null
  end_date: string | null
  created_at: string
}

export type Enrollment = {
  id: string
  class_id: string
  user_id: string
  status: 'active' | 'inactive'
  created_at: string
}

export type Post = {
  id: string
  class_id: string
  author_id: string
  title: string
  content: string | null
  type: 'notice' | 'material'
  created_at: string
}
```

---

## 11단계 — Vercel 배포 연동

1. [vercel.com](https://vercel.com) 접속 → **Add New Project**
2. GitHub 저장소 연결
3. **Environment Variables** 섹션에 `.env.local`과 동일한 값 입력:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy** 클릭

이후 `main` 브랜치에 `git push`하면 자동으로 재배포됩니다.

---

## 셋팅 완료 체크리스트

- [ ] `npm run dev` 실행 후 localhost:3000 접속 가능
- [ ] `.env.local` 파일에 Supabase 키 3개 모두 입력
- [ ] Supabase SQL Editor에서 테이블 4개 생성 확인 (`classes`, `enrollments`, `posts`, `profiles`)
- [ ] RLS 정책 적용 확인 (Supabase → Authentication → Policies)
- [ ] Vercel 배포 성공 및 도메인 확인

---

## 다음 단계

셋팅 완료 후 아래 순서로 개발을 진행하세요:

1. **로그인/회원가입 페이지** — Supabase Auth 연동
2. **대시보드** — 강사: 수업 목록 / 수강생: 내 수업 목록
3. **수업 생성·수정** — 폼 + Server Action
4. **수강생 초대·목록** — 이메일 기반 초대
5. **공지·자료 게시** — 에디터 + 파일 업로드
