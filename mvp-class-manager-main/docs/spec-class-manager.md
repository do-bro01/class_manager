# Class Manager 스펙 문서 (PRD)

> 작성일: 2026-04-29
> 버전: v1.0
> 기반 문서: docs/plan-class-manager.md, docs/tech-stack-class-manager.md

---

## 1. 프로젝트 개요

### 목적
대학·기업 등 복수 기관에서 강의하는 1인 강사가 기관별로 흩어진 수강생 정보를 하나의 플랫폼에서 통합 관리할 수 있는 개인 수업 관리 도구. 수업 생성, 수강생 초대 코드 관리, 공지 및 Q&A 게시 기능을 통해 별도 LMS 없이 빠르고 단순하게 수업을 운영하는 것을 목표로 한다.

### 범위
이 문서는 MVP v1.0 범위를 다룬다. 출결 기능, 파일 첨부, 외부 API 노출은 이번 범위에서 제외한다.

### 용어 정의

| 용어 | 설명 |
|------|------|
| 수업(클래스) | 기관명·과목명·기간으로 구성된 강의 단위 |
| 초대 코드 | 강사가 수업별로 발급하는 고유 코드. 수강생이 입력해 해당 수업에 등록 |
| 등록(Enrollment) | 수강생이 초대 코드를 통해 수업에 참여한 상태 |
| 공지 | 강사가 수업 단위로 작성하는 안내 게시물 |
| QnA | 수강생이 질문을 올리고 강사가 답변하는 게시물 |

---

## 2. 사용자 및 권한

### 사용자 역할

| 역할 | 설명 | 주요 권한 |
|------|------|---------|
| 강사 | 서비스 소유자(본인 1명). 사전 지정된 계정 | 수업 CRUD, 초대 코드 발급, 수강생 관리, 공지·QnA 작성·수정·삭제 |
| 수강생 | 이메일로 가입 후 초대 코드로 수업에 참여한 사용자 | 본인이 등록된 수업 목록 조회, 공지·QnA 열람, QnA 질문 작성·수정·삭제 |

> 강사 계정은 단 1개로, 환경변수(`INSTRUCTOR_EMAIL`) 또는 Supabase Auth 커스텀 클레임으로 역할을 고정한다.

### 핵심 사용자 시나리오

#### 시나리오 1: 강사가 새 수업을 열고 수강생을 받는다
1. 강사가 대시보드에서 "새 수업 만들기"를 클릭한다.
2. 기관명, 과목명, 시작일·종료일을 입력하고 저장한다.
3. 시스템이 수업별 고유 초대 코드를 자동 생성한다.
4. 강사가 초대 코드를 복사해 수강생에게 전달한다.
5. 수강생이 서비스에 회원가입 후 초대 코드를 입력하면 해당 수업에 자동 등록된다.

#### 시나리오 2: 수강생이 수업 공지와 QnA를 확인하고 질문한다
1. 수강생이 로그인 후 내 수업 목록에서 해당 수업을 선택한다.
2. 공지 탭에서 강사가 올린 자료·안내 링크를 확인한다.
3. QnA 탭에서 질문을 작성한다.
4. 강사가 해당 질문에 답변을 작성하면, 수강생이 답변을 확인한다.

---

## 3. 기능 명세

### 3.1 인증

- **목적**: 강사·수강생 구분 로그인 및 세션 관리
- **접근 권한**: 비로그인 사용자 포함 (로그인 페이지)
- **입력**: 이메일, 비밀번호
- **출력/결과**: Supabase Auth 세션 발급, 역할에 따른 대시보드 리다이렉트
- **예외 처리**:
  - 이메일 미인증 계정은 로그인 차단 및 인증 메일 재발송 안내
  - 5회 연속 실패 시 Supabase Auth 기본 쿨다운 적용
- **UI/UX 메모**: 회원가입 시 이메일 인증 링크 발송. 강사 여부는 로그인 시 서버에서 판별.

### 3.2 수업 관리

- **목적**: 기관별 수업 단위를 생성·수정·삭제
- **접근 권한**: 강사 전용
- **입력**: 기관명, 과목명, 시작일, 종료일
- **출력/결과**: 수업 목록 갱신 (대시보드), 초대 코드 자동 생성
- **예외 처리**:
  - 시작일 > 종료일 입력 차단
  - 수강생이 존재하는 수업 삭제 시 확인 모달 표시
- **UI/UX 메모**: 생성 즉시 초대 코드가 카드에 노출되어 복사 버튼으로 바로 공유 가능

### 3.3 초대 코드 등록

- **목적**: 수강생이 코드를 입력해 수업에 참여
- **접근 권한**: 로그인된 수강생
- **입력**: 초대 코드 (문자열)
- **출력/결과**: enrollments 레코드 생성, 내 수업 목록에 해당 수업 추가
- **예외 처리**:
  - 유효하지 않은 코드 → 에러 메시지
  - 이미 등록된 수업 코드 재입력 → "이미 등록된 수업입니다" 안내
- **UI/UX 메모**: 로그인 직후 대시보드에 코드 입력 필드를 상단에 노출

### 3.4 수강생 관리

- **목적**: 강사가 수업별 수강생 목록을 조회하고 상태를 관리
- **접근 권한**: 강사 전용
- **입력**: 수강생 비활성화/활성화 토글
- **출력/결과**: 수강생 목록 (이메일, 등록일, 상태)
- **예외 처리**: 비활성 수강생은 해당 수업의 게시물에 접근 불가
- **UI/UX 메모**: 수업 상세 페이지 내 "수강생" 탭으로 제공

### 3.5 공지 게시

- **목적**: 강사가 수업별 공지를 작성
- **접근 권한**: 작성·수정·삭제는 강사 전용 / 열람은 등록된 수강생 포함
- **입력**: 제목, 내용 (마크다운 또는 plain text), 외부 링크 (선택)
- **출력/결과**: 공지 목록에 게시물 추가
- **예외 처리**: 비어있는 제목 또는 내용 제출 차단
- **UI/UX 메모**: 링크 입력 시 URL 유효성 검사. 첨부파일은 MVP 제외.

### 3.6 QnA 게시

- **목적**: 수강생이 질문하고 강사가 답변
- **접근 권한**: 질문 작성·수정·삭제는 등록된 수강생 / 답변 작성·수정·삭제는 강사
- **입력**: 질문 제목, 내용 / 답변 내용
- **출력/결과**: QnA 목록에 게시물 및 답변 표시
- **예외 처리**: 비어있는 제출 차단. 답변은 질문 1개당 1개만 허용.
- **UI/UX 메모**: 답변 완료된 질문에는 "답변 완료" 배지 표시

### 3.7 대시보드

- **목적**: 한눈에 현황 파악
- **접근 권한**: 로그인 필수 (강사·수강생 각각 다른 뷰)
- **강사 뷰**: 전체 수업 목록 (수업명, 기관, 수강생 수, 미답변 QnA 수)
- **수강생 뷰**: 내가 등록된 수업 목록 (수업명, 기관, 최신 공지 요약)
- **예외 처리**: 등록된 수업이 없는 수강생에게 초대 코드 입력 유도 메시지 표시

---

## 4. 데이터 모델

### 핵심 엔티티

#### users
Supabase Auth 내장 테이블. 별도 커스텀 컬럼 최소화.

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | UUID | Y | Supabase Auth 기본 제공 |
| email | text | Y | 로그인 이메일 |
| created_at | timestamptz | Y | 가입 시각 |

#### classes

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | UUID | Y | 고유 식별자 |
| instructor_id | UUID | Y | users.id (강사) |
| name | text | Y | 과목명 |
| institution | text | Y | 기관명 |
| invite_code | text | Y | 고유 초대 코드 (random 6자) |
| start_date | date | N | 수업 시작일 |
| end_date | date | N | 수업 종료일 |
| created_at | timestamptz | Y | 생성 시각 |

#### enrollments

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | UUID | Y | 고유 식별자 |
| class_id | UUID | Y | classes.id |
| user_id | UUID | Y | users.id (수강생) |
| status | text | Y | active / inactive |
| enrolled_at | timestamptz | Y | 등록 시각 |

#### posts

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | UUID | Y | 고유 식별자 |
| class_id | UUID | Y | classes.id |
| author_id | UUID | Y | users.id |
| type | text | Y | notice / qna |
| title | text | Y | 제목 |
| content | text | Y | 본문 |
| link_url | text | N | 외부 링크 (공지에서 사용) |
| parent_id | UUID | N | QnA 답변인 경우 질문 게시물 id |
| created_at | timestamptz | Y | 생성 시각 |
| updated_at | timestamptz | Y | 수정 시각 |

### 관계도

```
users 1 ─── N classes          (강사가 여러 수업 생성)
users N ─── N classes          (수강생은 enrollments를 통해 여러 수업 참여)
classes 1 ─── N enrollments
classes 1 ─── N posts
posts 1 ─── 1 posts            (parent_id: QnA 답변은 질문 post를 참조)
```

---

## 5. API 명세

모든 데이터 변경은 **Next.js Server Actions**으로 처리한다. 외부 노출 REST API는 MVP에서 없음.

### Server Actions 목록

| Action | 경로 | 설명 |
|--------|------|------|
| createClass | lib/actions/class.ts | 수업 생성 + 초대 코드 자동 생성 |
| updateClass | lib/actions/class.ts | 수업 정보 수정 |
| deleteClass | lib/actions/class.ts | 수업 삭제 (수강생 존재 여부 확인 후) |
| joinClassByCode | lib/actions/enrollment.ts | 초대 코드로 수업 등록 |
| updateEnrollmentStatus | lib/actions/enrollment.ts | 수강생 활성화/비활성화 |
| createPost | lib/actions/post.ts | 공지 또는 QnA 작성 |
| updatePost | lib/actions/post.ts | 게시물 수정 |
| deletePost | lib/actions/post.ts | 게시물 삭제 |

### Supabase RLS 정책 요약

| 테이블 | 정책 |
|--------|------|
| classes | SELECT: 강사 본인 또는 enrollments에 등록된 수강생 / INSERT·UPDATE·DELETE: 강사 본인만 |
| enrollments | SELECT: 강사 본인 또는 본인 enrollment / INSERT: 로그인한 모든 사용자 (코드 검증 후) |
| posts | SELECT: 해당 수업 등록자 / INSERT: 강사(공지) 또는 등록 수강생(QnA 질문) / UPDATE·DELETE: 작성자 본인 |

---

## 6. 비기능 요구사항

### 성능
- 페이지 로딩 목표: 3초 이내 (Vercel Edge Network 활용)
- 동시 접속: 소규모 단일 강사 도구로 특별한 스케일 목표 없음

### 보안
- 인증 방식: Supabase Auth (이메일+비밀번호, JWT 세션)
- 역할 구분: Supabase `app_metadata`에 `role: instructor` 클레임 설정. Server Action과 RLS 정책 양쪽에서 `auth.jwt() -> 'app_metadata' ->> 'role'`으로 판별
- 데이터 접근 제어: Supabase RLS 정책으로 테이블 단위 접근 제어
- 개인정보: 수강생 이메일만 수집. 비밀번호는 Supabase Auth가 해시 처리.
- 환경변수: `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용, 클라이언트에 노출 금지

### 접근성 / 국제화
- 지원 언어: 한국어 단일
- 접근성: shadcn/ui 컴포넌트의 기본 ARIA 속성 활용

---

## 7. 기술 스택 요약

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 15 (App Router) + TypeScript |
| 스타일링 | Tailwind CSS + shadcn/ui |
| 백엔드 | Next.js Server Actions |
| DB | Supabase (PostgreSQL) |
| 인증 | Supabase Auth |
| 파일 스토리지 | MVP 제외 (Supabase Storage는 추후 도입) |
| 배포 | Vercel |

전체 상세 내용은 [docs/tech-stack-class-manager.md](tech-stack-class-manager.md) 참조.

---

## 8. 결정된 사항

| 항목 | 결정 |
|------|------|
| 초대 코드 만료 기간 | 만료 없음 (무기한) |
| QnA 답변 알림 이메일 | 발송 안 함 |
| 수업 종료일 이후 접근 | 계속 접근 가능 (종료일은 표시용) |
| 강사 역할 판별 방식 | Supabase `app_metadata` 커스텀 클레임 (`role: instructor`) |

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|---------|------|
| 2026-04-29 | v1.0 | 최초 작성 | |
