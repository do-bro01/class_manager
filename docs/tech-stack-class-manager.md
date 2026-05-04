# Class Manager 기술 스택 결정서

> 작성일: 2026-04-29
> 기반 문서: docs/plan-class-manager.md

## 1. 결정 요약

| 영역 | 선택 기술 | 대안 | 선택 이유 |
|------|---------|------|---------|
| 프론트엔드 | Next.js 15 (App Router) + TypeScript | Vite + React | Vercel 네이티브, 풀스택 통합, AI 생성 코드 품질 최고 |
| 스타일링 | Tailwind CSS + shadcn/ui | MUI, Chakra UI | 코드 복사 기반 컴포넌트, AI가 가장 잘 이해하는 UI 스택 |
| 백엔드 | Next.js Server Actions / API Routes | Express, FastAPI | 별도 서버 불필요, 풀스택 단일 프로젝트 |
| 데이터베이스 | Supabase (PostgreSQL) | PlanetScale, Firebase | 무료 티어, 인증·스토리지 내장, SQL 기반 |
| 인증 | Supabase Auth | NextAuth.js, Clerk | DB와 통합, 이메일+비밀번호 즉시 지원 |
| 파일 스토리지 | Supabase Storage | AWS S3, Cloudinary | Supabase와 통합, 무료 1GB |
| 인프라/배포 | Vercel | Railway, Render | Next.js 최적화, 무료 티어, 자동 CI/CD |

## 2. 상세 결정 내역

### 프론트엔드
- **선택**: Next.js 15 + TypeScript (App Router)
- **이유**: AI(Claude, GPT 등)가 가장 많이 학습한 스택이라 코드 생성 품질이 최고. Vercel이 만든 프레임워크라 배포 최적화. Server Components로 API 레이어 단순화.
- **주요 라이브러리**:
  - `tailwindcss` — 유틸리티 CSS
  - `shadcn/ui` — 복사 기반 UI 컴포넌트 (Button, Table, Dialog 등)
  - `react-hook-form` + `zod` — 폼 처리 및 유효성 검사
  - `@tanstack/react-query` — 서버 상태 관리 (선택)

### 백엔드
- **선택**: Next.js Server Actions + Route Handlers
- **이유**: 별도 백엔드 서버 없이 단일 프로젝트로 풀스택 구현. MVP 속도에 최적. Supabase 클라이언트를 서버에서 직접 호출.
- **패턴**:
  - 데이터 변경(생성·수정·삭제) → Server Actions
  - 외부 연동·웹훅 → Route Handlers (`/api/*`)

### 데이터베이스
- **선택**: Supabase (PostgreSQL)
- **이유**: 무료 500MB DB + 1GB 스토리지. Row Level Security(RLS)로 수강생별 데이터 접근 제어 내장. SQL 기반이라 관계형 데이터 모델에 적합.
- **핵심 테이블**:
  ```
  users (Supabase Auth 내장)
  classes (id, name, institution, instructor_id, start_date, end_date)
  enrollments (id, class_id, user_id, status)
  posts (id, class_id, author_id, title, content, type)
  attachments (id, post_id, file_url, file_name)
  ```
- **스키마 관리**: Supabase 대시보드 마이그레이션 또는 `supabase/migrations/` 폴더

### 인프라 / 배포
- **선택**: Vercel
- **이유**: `git push`만으로 자동 배포. 무료 티어로 MVP 운영 충분. Preview 배포로 브랜치별 테스트 가능.
- **CI/CD**: GitHub 연동 → Push 시 자동 빌드·배포 (별도 설정 불필요)
- **환경변수**: Vercel 대시보드에서 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 등 관리

### 외부 서비스
- **인증**: Supabase Auth (이메일+비밀번호, 이메일 인증 내장)
- **파일 업로드**: Supabase Storage (강의자료 PDF, 이미지 등)
- **이메일**: Supabase Auth 내장 이메일 (초대, 비밀번호 재설정)
- **결제**: 해당 없음 (무료 서비스)

## 3. 아키텍처 개요

```
[브라우저]
    │
    ▼
[Vercel — Next.js App]
    ├── app/ (React Server Components + Client Components)
    ├── Server Actions (DB 직접 호출)
    └── /api/* (웹훅, 외부 연동)
    │
    ▼
[Supabase]
    ├── Auth (사용자 인증, 세션 관리)
    ├── PostgreSQL (수업, 수강생, 게시물 데이터)
    └── Storage (강의자료 파일)
```

**데이터 흐름 예시 (수업 생성)**
1. 강사가 폼 제출 → Server Action 호출
2. Server Action에서 Supabase 클라이언트로 INSERT
3. RLS가 강사 본인 데이터만 접근 허용 확인
4. 성공 시 `revalidatePath('/dashboard')` → 화면 갱신

## 4. 개발 환경 셋업

### 초기화 명령어
```bash
# 프로젝트 생성 (이미 존재하면 스킵)
npx create-next-app@latest . --typescript --tailwind --app --src-dir

# shadcn/ui 초기화
npx shadcn@latest init

# Supabase 클라이언트 설치
npm install @supabase/supabase-js @supabase/ssr

# 폼 유효성 검사
npm install react-hook-form zod @hookform/resolvers
```

### 필수 환경변수 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 서버에서만 사용
```

### 권장 폴더 구조
```
src/
├── app/
│   ├── (auth)/login, signup
│   ├── (dashboard)/dashboard, classes/[id]
│   └── api/
├── components/
│   ├── ui/          (shadcn 컴포넌트)
│   └── features/    (도메인별 컴포넌트)
├── lib/
│   ├── supabase/    (클라이언트 초기화)
│   └── actions/     (Server Actions)
└── types/           (TypeScript 타입 정의)
```

## 5. 트레이드오프 및 리스크

| 리스크 | 내용 | 대응 방안 |
|--------|------|---------|
| Supabase 무료 티어 제한 | 비활성 프로젝트 1주일 후 일시정지 | 정기적으로 접속하거나 Pro 플랜 전환 ($25/월) |
| Next.js App Router 학습 곡선 | Pages Router와 패턴이 다름 | AI 도움 활용, 공식 docs의 예제 우선 참고 |
| Supabase RLS 복잡도 | 잘못 설정 시 데이터 유출 위험 | 초기에 RLS 정책 꼼꼼히 테스트, 최소 권한 원칙 적용 |
| Server Actions 디버깅 | 에러 메시지가 클라이언트에 노출 안 됨 | 개발 시 `console.error` 적극 활용, Vercel 로그 확인 |

## 6. 다음 단계

- [ ] 스펙 문서 작성 (`/spec-doc` 스킬 사용 권장)
- [ ] Supabase 프로젝트 생성 및 환경변수 설정
- [ ] Next.js 프로젝트 초기화 (`create-next-app`)
- [ ] shadcn/ui 설치 및 기본 레이아웃 구성
- [ ] Supabase Auth 연동 (로그인/회원가입 페이지)
- [ ] 핵심 테이블 스키마 생성 및 RLS 정책 설정
