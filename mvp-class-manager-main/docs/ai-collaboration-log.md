# AI 협업 로그

> 작성일: 2026-04-30
> 도구: Claude Code (Claude Opus 4.7)
> 대상 기능: 출결 기능 (Attendance) — 기존 MVP에 추가

이 문서는 출결 기능을 AI 코딩 에이전트와 함께 추가하는 과정에서 어떤 의사결정을 거쳤고, AI에게 어떻게 일을 시켰으며, AI가 만든 결과물을 어떻게 검증했는지를 시간 순으로 기록한다. 모든 프롬프트와 답변을 그대로 옮긴 것은 아니고, 의사결정에 영향을 준 핵심 대화만 추렸다.

---

## 0. 협업 원칙

작업을 시작하기 전, AI에게 다음 원칙을 미리 합의했다.

- **단계 단위로 끊어서 시킨다**: "기능 전체를 한 번에 만들어줘"가 아니라 "스펙 → 스키마 → 액션 → UI" 순서로 끊는다. 큰 덩어리를 한 번에 받으면 검증이 어렵다.
- **AI가 모르는 건 되묻게 한다**: 요구사항이 모호한 부분에서 내 답을 받지 않고 코드부터 짜기 시작하면 중단시킨다.
- **검증되기 전엔 신뢰하지 않는다**: AI가 짠 SQL/RLS는 특히 위험하므로, 정책 하나하나의 의미를 내가 설명할 수 있을 때까지 다시 묻는다.
- **회고는 진솔하게**: AI가 잘한 것뿐 아니라 틀린 것, 내가 거절한 제안까지 기록한다.

---

## 1. 단계 1 — 요구사항 정리 (AI가 먼저 질문하게 만들기)

### 내가 처음 던진 프롬프트

> "스펙 문서(`docs/spec-class-manager.md`)에 출결 기능이 우선순위 낮음으로 빠져 있어. 이걸 확장형으로 추가하려고 해. 강사가 회차를 만들고, 수강생이 직접 '오늘 출석' 버튼을 누르고, 출석률 통계까지 나오는 형태. **코드 짜기 전에 확정해야 할 결정들을 나한테 먼저 물어봐.**"

### AI가 되물은 질문 (그리고 내 답)

| AI 질문 | 내 결정 | 이유 |
|---|---|---|
| 출결 상태 종류는 몇 가지로? (출석/결석만? 지각/공결까지?) | **4종**: present, late, absent, excused | 실제 강의에서 자주 쓰는 분류. 단순 ✓/✗ 보다 변별력 있음 |
| 출석률 공식은? | **(present + late) / (present + late + absent)**, excused는 분모에서 제외 | 공결을 분모에 포함하면 학생이 손해 봄 |
| 자가 체크인이 항상 가능해야 하나? | **회차별 토글**. 강사가 "체크인 열기"를 누른 회차에서만 학생이 본인을 출석 처리 가능 | 시간 지난 회차에 무단 출석 방지 |
| 체크인 시 학생이 status를 고를 수 있나? | **아니오**. 체크인은 무조건 'present' 고정. 지각/공결 등은 강사만 변경 가능 | 권한 명확화. 학생이 'late'를 고르도록 두면 모호 |
| 한 회차에 한 학생당 한 레코드만? | **그렇다**. UNIQUE(session_id, user_id) | 중복 출결은 의미 없음. 이미 표시된 학생의 자가 체크인은 거부 |
| 강사가 출석부에서 '미입력' 상태로 되돌릴 수 있나? | **그렇다**. 라디오를 한 번 더 누르면 선택 해제 → DELETE | 잘못 입력했을 때 되돌리기 가능해야 함 |
| 회차 삭제하면 출결 레코드는? | **함께 삭제(CASCADE)** | 의미 없는 고아 레코드 남기지 않음 |
| 수강생이 비활성화 상태인데 과거 출결 기록은? | **남긴다 (status='inactive'여도 record는 유지)**. 단, 자가 체크인은 거부 | 통계 보존. 다시 활성화될 수 있음 |

### 회고

이 단계가 가장 중요했다. 만약 "그냥 출결 기능 만들어줘"라고 던졌으면 AI가 임의로 결정했을 것들 — 특히 **체크인 시 status 고정 여부**, **출석률 분모 정의**, **'미입력 → 입력' 의 양방향성** — 은 결국 내가 직접 결정해야 할 사양이다. AI에게 "묻기 먼저"를 강제했더니 8개 결정이 한 번에 정리됐다.

---

## 2. 단계 2 — 데이터 모델 합의

### 내가 던진 프롬프트

> "위 결정 기반으로 테이블 2개 (`attendance_sessions`, `attendance_records`) 스키마와 RLS 정책을 제안해줘. 단, **RLS 정책마다 한 줄 주석으로 '왜 이 정책이 필요한가'를 적어줘**. 내가 정책 한 개씩 검토하고 싶다."

### AI 초안 vs 내 수정

AI 초안에서 한 가지 잡아낸 것:

```sql
-- AI 초안 (수정 전)
create policy "수강생 자가 체크인" on attendance_records
  for insert
  with check (
    user_id = auth.uid()
    and status = 'present'  -- ← 이 부분
  );
```

**내가 잡은 문제**: RLS의 `with check`에 `status = 'present'`를 박으면, 강사가 'late'/'absent'로 INSERT 하는 게 차단된다. 강사용 정책이 따로 있긴 하지만, **정책은 OR로 결합**되니 강사도 이 'present' 제약을 통과할 수 있긴 하다. 그러나 정책 의도가 헷갈린다 — "RLS는 권한만 검증, status 검증은 server action에서"가 더 명확하다.

**수정**: `with check`에서 `status` 검사를 빼고, `selfCheckIn` server action에서 하드코딩으로 `status: 'present'` 강제. 이유는 [supabase/migration_attendance.sql](../supabase/migration_attendance.sql) 정책 주석에 적었다.

또 하나 — AI 초안은 `attendance_records.user_id`가 `enrollments.user_id`를 직접 참조하게 만들려고 했다. **내가 거절**: 등록은 enrollment.id로 식별하지만, **출결은 user 단위**가 의미상 맞다 (수강생이 비활성화돼도 과거 기록은 user_id로 남아야 함). FK는 `auth.users(id)`로 직접.

### RLS 정책 한 줄 검증

각 정책을 내가 한국어로 다시 써보면서 의미를 확인했다:

- `강사 출결회차 관리` = "이 회차의 class를 owning한 강사면 모든 작업 OK"
- `수강생 출결회차 조회` = "이 회차의 class에 active enrollment가 있는 학생이면 SELECT만 OK"
- `강사 출결 관리` = "이 record가 속한 session의 class를 owning한 강사면 모든 작업 OK"
- `수강생 본인 출결 조회` = "내 user_id인 레코드는 내가 본다"
- `수강생 자가 체크인` = "내가 active enrollment고, 회차의 check_in_open=true면 INSERT 가능"

각 정책의 의도와 SQL이 일치하는지 한 줄씩 대조했다.

---

## 3. 단계 3 — Server Action 작성과 검증

### 내가 던진 프롬프트 (요약)

> "[기존 enrollment.ts와 class.ts 패턴](../src/lib/actions/) 그대로 따라서 attendance.ts 작성. requireInstructor 헬퍼는 class.ts에 있는 거 보고 비슷하게 만들어. revalidatePath 패턴, ActionResult 타입도 동일하게."

### AI가 만든 후 내가 발견한 이슈

#### 이슈 A: `bulkMarkAttendance`의 race condition 가능성

AI 초안은 강사가 출석부에서 한 번에 저장할 때 모든 row에 대해 `INSERT ... ON CONFLICT UPDATE`를 보냈다. 그런데 "라디오 선택 해제 → DELETE" 케이스를 빠뜨렸다.

**내 수정 지시**: "선택 해제는 DELETE, 선택은 UPSERT — 두 종류를 분리해서 처리해줘."

결과: [src/lib/actions/attendance.ts](../src/lib/actions/attendance.ts) `markAttendance` 함수에서 `upserts`와 `deletions`로 갈라 처리.

#### 이슈 B: `selfCheckIn`의 이중 검증

RLS에서 이미 `check_in_open=true && active enrollment`를 검증하고 있다. AI는 이걸 server action에서도 다시 검증하는 코드를 넣었다.

**내 판단**: 그대로 둔다. RLS만 믿기에는 — 정책 한 줄 잘못 건드리면 보안 구멍이 생긴다. **이중 검증이 비용이 작고 가독성이 좋으면 유지** 한다는 원칙을 적용. 또한 RLS가 INSERT를 거부하면 DB 에러 메시지가 그대로 사용자에게 노출되는데, server action에서 먼저 잡으면 한국어 에러 메시지를 줄 수 있다.

#### 이슈 C: 타입 추론 함정

`Promise.all` 안에 conditional ternary로 `Promise<X[]> | Promise<null>` 을 섞으면 타입이 union이 된다. AI가 처음엔 `studentAttendance!`로 non-null assertion을 박았는데, **거절**. 그 자리에서 `studentAttendance && <View summary={studentAttendance} />` 패턴으로 narrowing 하도록 수정.

> 거절 이유: `!`는 "내가 더 잘 안다"는 선언인데, 이 경우엔 타입이 정직하게 `Summary | null`이고, 런타임 분기로 자연스럽게 좁혀지는 게 맞다.

---

## 4. 단계 4 — UI 작성

### 내가 던진 프롬프트

> "강사용 회차 리스트는 [NoticeList](../src/components/features/NoticeList.tsx) 패턴 그대로 따라줘 — 인라인 폼, 카드 리스트, 작성 버튼. 학생용 출결 뷰는 새로 디자인해도 됨. shadcn 컴포넌트만 사용 (이미 설치된 것: button, input, card, table, badge, tabs, separator)."

### AI 결과물에서 직접 고친 것들

- **Date 표시 방식**: AI는 `new Date(s.session_date).toLocaleDateString('ko-KR')` 을 썼는데, `'YYYY-MM-DD'` 문자열이 UTC로 파싱되어 한국 시간대에서 하루 밀릴 가능성을 검토했다. 결론적으로 자정(00:00 UTC) → 09:00 KST 같은 날이라 안전 — 그대로 둠. 다만 시간까지 들어가는 `marked_at`은 `toLocaleString` 사용.
- **상태 토글 UX**: AI는 라디오 버튼 형태를 제안했는데, "한 번 더 누르면 해제"가 라디오로 표현 안 된다. 직접 `<button>` 4개로 바꿔서 active/inactive를 명시적으로 그렸다 ([AttendanceRoster.tsx](../src/components/features/AttendanceRoster.tsx)).
- **dirty 표시**: AI 초안엔 dirty 여부와 무관하게 항상 저장 버튼이 활성화돼 있었다. 변경 사항 없을 때 비활성화로 수정.

---

## 5. 단계 5 — 통합 / 회귀 테스트

페이지에 탭을 추가한 뒤 다음 시나리오를 머릿속으로 돌려봤다 (실제 결과는 [test-checklist.md](test-checklist.md)에 기록).

- 강사로 로그인 → 출결 탭 보이는지 ✓
- 학생으로 로그인 → 출결 탭 보이는지 ✓ (단, 수강생 탭은 안 보여야)
- 학생이 체크인 닫힌 회차의 "지금 출석" 버튼이 안 보여야 ✓
- 출석률 분모 0일 때 (회차 0개) → 0% 표시 (NaN 방지) ✓ — 코드의 `denom === 0 ? 0 : ...` 분기

---

## 6. 의도적으로 채택하지 않은 AI 제안

문서로 남길 가치가 있는 거절 사례:

1. **AI 제안**: "체크인 시 GeoLocation으로 위치 검증을 넣자."
   **거절**: 스펙 범위 외. 강의실에 와있는지 검증하는 건 별개 보안 문제고, 본인 폰만 빌려주면 우회 가능. MVP에 안 맞는다.

2. **AI 제안**: "`marked_at`이 변경될 때마다 트리거로 audit 테이블에 기록."
   **거절**: 1인 강사 도구다. 감사 기능은 과대 설계.

3. **AI 제안**: "서비스 시작 시 cron으로 어제 회차의 체크인을 자동으로 닫자."
   **거절**: 서버리스(Vercel)에서 cron은 별도 설정 필요. 강사가 수동 토글로 충분.

4. **AI 제안**: "Realtime subscribe로 학생 체크인이 강사 화면에 즉시 반영되게."
   **보류**: 매력적이지만 디버깅 복잡도가 올라가고, MVP에선 새로고침이면 충분.

---

## 7. 협업 효율 회고

| 잘됐던 것 | 해결 시간 | 메모 |
|---|---|---|
| 요구사항 8개 결정 (단계 1) | 약 10분 | "AI에게 먼저 질문하게 시키기"가 결정적 |
| 스키마 + RLS 초안 | 약 15분 | 패턴이 [기존 migration.sql](../supabase/migration.sql)과 동일해서 빨랐음 |
| Server Action + UI 컴포넌트 4개 | 약 40분 | 기존 [NoticeList](../src/components/features/NoticeList.tsx), [StudentList](../src/components/features/StudentList.tsx) 참조하라고 지시한 게 컸음 |

| 어려웠던 것 | 메모 |
|---|---|
| RLS 정책 검증 | "AI가 만든 SQL은 일단 의심"하고 한 줄씩 한국어로 옮겨보는 작업이 필요 |
| 타입 추론 함정 | conditional Promise.all은 매번 헷갈림. AI도 `!` 박으려는 경향 |
| 무엇을 안 만들지 결정 | 기능 추가는 쉬운데 거절은 매번 명시해야 함 |

---

## 8. 정리 — 어떤 프롬프트가 좋은 결과를 냈나

이번 작업에서 효과가 컸던 프롬프트 패턴:

1. **"코드 짜기 전에 결정해야 할 것을 나한테 먼저 물어봐"** — AI의 짐작을 차단
2. **"기존 [파일 경로] 패턴 그대로 따라"** — 불필요한 재발명 방지
3. **"각 정책/함수에 한 줄 주석으로 의도를 적어줘. 내가 한 줄씩 검토할 거야"** — 검증 가능한 결과물
4. **"이 제안 거절. 이유: ..."** — 거절을 명시해야 다음 제안에서 같은 실수 안 함

효과가 적었던 패턴:

- "그냥 좋게 만들어줘" → 늘 over-engineering 가까이 감
- "오류 처리 다 넣어줘" → 일어날 수 없는 케이스에 대한 방어 코드를 잔뜩 만듦
- 프롬프트 안에 결정과 모호함을 섞어 보내기 → AI가 모호한 것도 결정으로 처리
