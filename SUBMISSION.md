# 과제 제출 — Class Manager

> 제출일: (배포 완료 후 채움)
> 강의: 클라우드 AI 응용 9주차 과제
> 도구: Claude Code (Claude Opus 4.7)

---

## 0. 제출 항목 한눈에 보기

| 평가 항목 | 비중 | 산출물 위치 |
|---|---|---|
| 문제 정의 및 기획 | 20% | [docs/plan-class-manager.md](docs/plan-class-manager.md) |
| AI 활용 능력 | **25%** | [docs/ai-collaboration-log.md](docs/ai-collaboration-log.md) |
| 구현 완성도 | 20% | [src/](src/) — 베이스 코드 + 출결 확장 |
| 배포 여부 | 15% | (본인 Vercel URL — 배포 후 여기에 기록) |
| 테스트 및 검증 | 10% | [docs/test-checklist.md](docs/test-checklist.md) |
| 회고 | 10% | [docs/retrospective.md](docs/retrospective.md) |

---

## 1. 서비스 URL

**(본인 명의로 배포 완료 후 여기에 URL 기입)**

데모(수업 시간에 받은 베이스): https://mvp-class-manager.vercel.app/
본인 배포: `https://_____________.vercel.app/`

테스트 계정 (제출 시 동봉 권장):
- 강사: `___________` / `___________`
- 학생: `___________` / `___________`

---

## 2. 핵심 기능

1. **수업(클래스) CRUD** — 강사가 기관별 수업을 만들고 관리
2. **초대 코드 등록** — 6자리 코드로 학생이 수업 참여
3. **공지 / QnA 게시** — 강사 공지, 학생 질문, 강사 답변
4. **수강생 활성/비활성 관리**
5. **출결 (확장 기능, 본인이 추가)** — 회차 생성, 강사 일괄 입력, 학생 자가 체크인, 출석률 통계

---

## 3. 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Next.js Server Actions |
| DB / Auth | Supabase (PostgreSQL + Auth) |
| 권한 | Supabase RLS + Server Action 이중 방어 |
| 배포 | Vercel |

자세한 결정 근거는 [docs/tech-stack-class-manager.md](docs/tech-stack-class-manager.md) 참조.

---

## 4. 본인이 추가한 기능 — 출결 (Attendance)

### 왜 추가했나

기존 스펙([docs/spec-class-manager.md](docs/spec-class-manager.md))에서 출결은 우선순위 "낮음"으로 빠져 있었다. AI 협업의 흔적을 남기고 평가 기준의 "AI 활용 능력"을 보여주기 가장 적합한 사이즈의 기능으로 판단해 직접 추가했다.

### 구현 범위

- 강사가 출결 회차(session) 생성/수정/삭제
- 회차별 "체크인 열기/닫기" 토글
- 강사 출석부에서 4종 status (출석/지각/결석/공결) 일괄 입력
- 학생 자가 체크인 ("지금 출석" 버튼)
- 학생용 본인 출석률 카드
- 회차별 통계 카드 (출석/지각/결석/공결/미입력 카운트)

### 추가된 파일

| 파일 | 역할 |
|---|---|
| [supabase/migration_attendance.sql](supabase/migration_attendance.sql) | DB 테이블 2개 + RLS 5개 정책 |
| [src/types/index.ts](src/types/index.ts) | AttendanceStatus, AttendanceSession 등 타입 추가 |
| [src/lib/actions/attendance.ts](src/lib/actions/attendance.ts) | 8개 server action |
| [src/components/features/AttendanceSessionList.tsx](src/components/features/AttendanceSessionList.tsx) | 강사 회차 리스트 |
| [src/components/features/AttendanceRoster.tsx](src/components/features/AttendanceRoster.tsx) | 강사 출석부 (일괄 입력 UI) |
| [src/components/features/StudentAttendanceView.tsx](src/components/features/StudentAttendanceView.tsx) | 학생 본인 출결 뷰 |
| [src/app/classes/[id]/attendance/[sessionId]/page.tsx](src/app/classes/%5Bid%5D/attendance/%5BsessionId%5D/page.tsx) | 출석부 페이지 라우트 |

[src/app/classes/[id]/page.tsx](src/app/classes/%5Bid%5D/page.tsx)에 "출결" 탭 추가하여 통합.

---

## 5. AI 협업 핵심 (25% 비중)

전체 기록은 [docs/ai-collaboration-log.md](docs/ai-collaboration-log.md). 여기서는 평가자가 한눈에 볼 핵심만 추렸다.

### 협업 원칙 4가지
1. **단계 단위로 끊어서 시킨다** — 스펙 → 스키마 → 액션 → UI
2. **AI가 모르는 건 되묻게 한다** — "코드 짜기 전에 나한테 먼저 물어봐"
3. **검증되기 전엔 신뢰하지 않는다** — RLS 정책은 한 줄씩 한국어로 풀어 검증
4. **회고는 진솔하게** — 거절한 제안 4개도 기록

### AI에게 8개 결정을 하게 한 결정적 프롬프트
> "스펙 문서에 출결이 우선순위 낮음으로 빠져 있어. 이걸 확장형으로 추가하려고 해. **코드 짜기 전에 확정해야 할 결정들을 나한테 먼저 물어봐.**"

→ AI가 출결 상태 종류, 출석률 공식, 자가 체크인 정책 등 8개 결정을 일괄로 물어왔고, 한 번에 정리됨.

### 거절한 AI 제안
- GeoLocation 기반 위치 검증 (스펙 외)
- 출결 변경 audit 로그 (1인 도구 과대설계)
- Cron으로 어제 회차 자동 닫기 (수동 토글로 충분)
- Realtime 구독 (디버깅 비용 > 가치)

### AI가 만든 코드에서 직접 잡은 이슈
1. RLS의 `with check`에 `status = 'present'`를 박아 강사 INSERT까지 영향 줄 뻔함 → server action에서 강제로 옮김
2. `bulkMarkAttendance`에서 "선택 해제 = DELETE" 케이스 누락 → upsert/delete 분리
3. 타입 추론 `!` non-null assertion 거절 → narrowing으로 대체

---

## 6. 검증 / 테스트

[docs/test-checklist.md](docs/test-checklist.md)에 9개 영역 50+ 시나리오 정리:

- 인증 / 회원가입
- 수업 CRUD
- 초대 코드 등록
- 수강생 관리
- 공지 / QnA
- 출결 — 강사 (9 시나리오)
- 출결 — 수강생 (8 시나리오)
- RLS 직접 검증 (Supabase SQL 쿼리)
- 빈 상태 / 첫 사용 경험

---

## 7. 회고 요약

상세는 [docs/retrospective.md](docs/retrospective.md). 4축으로 정리:

- **기능적 회고**: 스펙 v1.0 항목 빠짐 없이 구현 + 출결 확장으로 v1.1
- **기술적 회고**: Server Action + RLS 이중 방어 모델, Next.js 16 변경점, 출석률 공식의 분모 정의
- **사용성 회고**: 본인이 1주 운영해보고 채울 영역
- **AI 협업 회고**: AI가 잘하는 것 / 사람이 결정해야 할 것의 경계

### 한 줄 결론
> AI는 일을 빠르게 만들 수 있지만, **무엇을 만들지 결정하는 것**과 **만든 것의 의미를 검증하는 것**은 여전히 사람의 몫이다.

---

## 8. 폴더 구조

```
mvp-class-manager-main/
├── docs/
│   ├── plan-class-manager.md           # 기획서
│   ├── tech-stack-class-manager.md     # 기술 스택 결정
│   ├── spec-class-manager.md           # PRD (스펙)
│   ├── setup-guide.md                  # 셋업 가이드
│   ├── ai-collaboration-log.md         # ★ AI 협업 기록 (출결 기능)
│   ├── test-checklist.md               # ★ 테스트 체크리스트
│   └── retrospective.md                # ★ 회고
├── supabase/
│   ├── migration.sql                   # 베이스 스키마
│   └── migration_attendance.sql        # ★ 출결 스키마 (본인 추가)
├── src/
│   ├── app/                            # Next.js App Router 페이지
│   ├── components/features/            # 도메인 컴포넌트
│   ├── lib/actions/                    # Server Actions
│   └── types/                          # TypeScript 타입
└── SUBMISSION.md                       # ★ 본 문서 (제출용 요약)
```

★ = 본인이 직접 작성/추가한 산출물
