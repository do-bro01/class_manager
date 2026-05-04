# MVP Class Manager

복수 기관에서 강의하는 강사를 위한 통합 수업 관리 플랫폼입니다. 대학교, 기업 등 여러 곳에서 강의하는 강사가 흩어진 수강생 정보를 하나의 플랫폼에서 통합 관리하고, 공지사항, 자료, 출석 등을 단순하고 빠르게 운영할 수 있습니다.

## 🎯 핵심 기능

- **수업 관리** - 기관명, 과목명, 기간으로 수업 단위를 생성·수정·삭제
- **수강생 등록** - 초대 코드 기반의 간단한 수강생 등록 및 관리
- **공지사항 & QnA** - 수업별 공지사항 게시 및 질의응답 기능
- **출석 관리** - 수업 회차별 출석 여부 기록 및 조회
- **통합 대시보드** - 강사는 모든 수업 현황을, 수강생은 내 수업 정보를 한눈에 확인

## 🏗️ 기술 스택

| 영역             | 기술                                          |
| ---------------- | --------------------------------------------- |
| **프론트엔드**   | Next.js 15 (App Router), TypeScript, React 19 |
| **스타일링**     | Tailwind CSS v4, shadcn/ui                    |
| **폼 처리**      | React Hook Form, Zod                          |
| **백엔드**       | Next.js Server Actions, Route Handlers        |
| **데이터베이스** | Supabase (PostgreSQL)                         |
| **인증**         | Supabase Auth (이메일+비밀번호)               |
| **배포**         | Vercel                                        |

## 🚀 빠른 시작

### 필수 사항

- Node.js 18+ 및 npm/yarn
- Supabase 계정
- Vercel 계정 (배포용)

### 환경 설정

1. **저장소 복제 및 의존성 설치**

   ```bash
   git clone <repository-url>
   cd mvp-class-manager
   npm install
   ```

2. **환경 변수 설정**

   `.env.local` 파일 생성:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # 강사 계정 (선택사항)
   INSTRUCTOR_EMAIL=your-email@example.com
   ```

3. **Supabase 데이터베이스 마이그레이션**

   ```bash
   # Supabase 대시보시에서 supabase/migrations 폴더의 SQL 파일 실행
   # 또는 Supabase CLI 사용
   ```

4. **개발 서버 실행**

   ```bash
   npm run dev
   ```

   [http://localhost:3000](http://localhost:3000) 에서 확인 가능합니다.

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 홈 페이지
│   ├── login/                   # 로그인 페이지
│   ├── signup/                  # 회원가입 페이지
│   ├── dashboard/               # 대시보드
│   └── classes/                 # 수업 페이지
│       ├── new/                 # 수업 생성
│       ├── [id]/                # 수업 상세
│       │   ├── edit/            # 수업 수정
│       │   └── attendance/      # 출석 관리
│       └── ...
├── components/
│   ├── features/                # 비즈니스 로직 컴포넌트
│   │   ├── ClassForm.tsx
│   │   ├── AttendanceRoster.tsx
│   │   ├── NoticeList.tsx
│   │   └── ...
│   ├── layout/                  # 레이아웃 컴포넌트
│   │   └── Header.tsx
│   └── ui/                      # shadcn/ui 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ...
├── lib/
│   ├── utils.ts                 # 유틸리티 함수
│   ├── actions/                 # Server Actions
│   │   ├── auth.ts
│   │   ├── class.ts
│   │   ├── enrollment.ts
│   │   ├── attendance.ts
│   │   └── post.ts
│   └── supabase/                # Supabase 클라이언트
│       ├── client.ts            # 브라우저 클라이언트
│       └── server.ts            # 서버 클라이언트
├── types/
│   └── index.ts                 # TypeScript 타입 정의
└── proxy.ts                     # API 프록시 설정

supabase/
├── migration.sql                # 초기 스키마
└── migration_attendance.sql     # 출석 관련 스키마
```

## 🔧 개발 가이드

### 주요 개발 패턴

#### Server Actions로 데이터 변경

```typescript
// src/lib/actions/class.ts
"use server";

export async function createClass(formData: ClassFormInput) {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("classes").insert(formData);

  if (error) throw error;
  revalidatePath("/dashboard");
  return data;
}
```

#### 클라이언트에서 Server Action 호출

```typescript
// src/app/classes/new/page.tsx
'use client'

import { createClass } from '@/lib/actions/class'

export default function NewClassPage() {
  return (
    <ClassForm onSubmit={createClass} />
  )
}
```

### 폼 검증

React Hook Form과 Zod를 사용한 타입 안전한 폼 검증:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, '수업명 필수'),
  institution: z.string().min(1, '기관명 필수'),
})

type FormData = z.infer<typeof schema>

export function ClassForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  )
}
```

### 데이터베이스 스키마

**주요 테이블**

- `users` - Supabase Auth에서 관리
- `classes` - 수업 정보 (기관명, 과목명, 기간, 강사)
- `enrollments` - 수강 등록 (수업-수강생 관계)
- `posts` - 공지사항 및 QnA (type: 'notice' | 'qna')
- `attendance_sessions` - 출석 세션 (회차)
- `attendance_records` - 개별 출석 기록

## 🧪 테스트

```bash
# 린트 체크
npm run lint

# 빌드 테스트
npm run build
```

## 📦 배포

### Vercel 배포

1. **GitHub에 푸시**

   ```bash
   git push origin main
   ```

2. **Vercel에서 자동 배포**
   - [Vercel Dashboard](https://vercel.com)에서 저장소 연결
   - 환경 변수 설정 (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 등)
   - 자동 배포 활성화

### 프로덕션 체크리스트

- [ ] Supabase Row Level Security (RLS) 활성화
- [ ] 환경 변수 보안 설정 확인
- [ ] CORS 설정 확인
- [ ] 백업 전략 수립

## 📚 문서

자세한 정보는 다음 문서를 참고하세요:

- [기획서](docs/plan-class-manager.md) - 프로젝트 개요 및 목표
- [스펙 문서](docs/spec-class-manager.md) - 상세 기능 명세
- [기술 스택 결정서](docs/tech-stack-class-manager.md) - 기술 선택 근거
- [설정 가이드](docs/setup-guide.md) - 개발 환경 설정
- [테스트 체크리스트](docs/test-checklist.md) - 테스트 항목
- [설정 가이드](docs/setup-guide.md) - 배포 및 운영 가이드

## 🤝 기여

이 프로젝트는 개인 포트폴리오 프로젝트입니다. 이슈나 제안사항은 GitHub Issues를 통해 제출해 주세요.

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 📧 문의

프로젝트에 대한 질문이나 피드백은 GitHub Issues를 통해 연락 주세요.
