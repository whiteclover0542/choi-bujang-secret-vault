# 8단계 진행 — 자료마다 갈 수 있는 구역을 나눕니다

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README 마지막 절 7단계 ↔ 마지막 커밋 `d6f54b9 7단계 저장점` 일치) |
| ✅ | 정할 것 ①~③ 결정 (공지 새로 만듦 · 강사는 `instructors` 표 · 이유 코드는 안내에 없어 직접 정함) |
| ✅ | 만들기 1 · 메모·공지 자원 ID 구분 |
| ✅ | 만들기 2 · 판정기 구역 규칙 |
| ✅ | 만들기 3 · 자료 API 소유자·강사 권한 재확인 |
| ✅ | DB 준비 · `stage8-notices.sql` 실행(공지 1건), 강사 시험 계정 생성·지정(`instructors` 1) — Supabase 일시 정지 재개 포함 |
| ✅ | 저장점 준비 · `allowedRoutes` 공지 경로 3개, README 8단계 절, `step` 8, 자기 점검 8단계 확장 |
| ✅ | 제출 전 확인 · 8단계 저장점 커밋(`547f1c8`), push·배포 확인, `npm run bundle` |
| ✅ | 로그인 교차 점검 (운영 배포, `scripts/stage8-live-check.mjs`) 8항목 통과 |
| ✅ | 1차 제출 (`c57df0d`) — 48/100, 조건 5개 중 「구역 규칙」 실패 `S08_OTHER_ZONE_ALLOWED` |
| ✅ | 수정 · 판정기 구역에서 메모 전체 목록 `GET /notes` 제거 |
| ✅ | 다시 제출 (`c05eb7a`), 결과 확인 (학생이 포털에서 확인) |

## 완료한 일

- 현재 API: `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/:id`(로그인·소유자 검사), `/api/auth/login`, `/api/auth/logout`. 공지 자원·강사 역할 코드는 없음.
- 계약 확인: `request.role`·`identity`는 계약에 없음(강사 역할은 별도 계약 후 사용). `subjectId`는 가명이라 판정기에서 메모 소유자와 비교 불가 → "B의 A 메모 거부"는 자료 API의 소유자 검사가 담당.
- 판정기가 받는 `route`는 `GET /notes/:id` 모양(`/api` 없음)으로, `aleph.config.json`의 `allowedRoutes`(`/api/notes/:id`)와 표기가 다름 — 규칙 작성 시 계약 모양 기준.
- 결정: ① `notices` 테이블·API 새로 만듦 ② 강사 권한은 서버만 쓰는 `instructors(user_id)` 표 ③ 8단계 안내에 이유 코드 목록이 없어 `route_not_allowed`(알 수 없는 경로), `instructor_required`(공지 수정)로 정함 — 운영 등록부에 없으면 엔진이 응답을 거부할 수 있음(그래도 접근은 허용되지 않음).
- 만들기 1: 메모 응답에 `resource: "note:<id>"`, 공지 응답에 `resource: "notice:<id>"`. 기존 메모 주소·자료·화면은 그대로(화면은 id·title·body만 사용). `supabase/stage8-notices.sql`(공지·강사 표, 브라우저용 역할 권한 없음, 가상 공지 1건), `api/notices.js`(GET 목록), `api/notices/[id].js`(GET 한 건, PUT).
- 만들기 2: 판정기 `resource_zone` 규칙 — 엔진이 확인한 `method`·`route`·`path`가 구역 목록과 정확히 맞을 때만 통과. 메모 5개 경로·공지 읽기 2개 허용, 공지 수정은 역할 계약이 없어 `deny/instructor_required`, 그 밖·`:id` 깊이 기능 경로(`/notes/export`)·경로 불일치·쿼리 있는 요청은 `deny/route_not_allowed`. 순서: 기기 → 구역 → 복합 이상.
- 만들기 3: `PUT /api/notices/:id`가 수정 전에 검증된 사용자 ID를 `instructors` 표와 대조, 아니면 `403 NOT_INSTRUCTOR`(본문·헤더 role 무시). 메모는 4단계 소유자 검사(`403 NOT_NOTE_OWNER`) 유지.
- 시험(로컬, 심판 판정 아님): `node --test test/decider.test.mjs` 4개 통과(8단계 13개 확인 포함), `npm run decider:test` 4항목 통과, `npm run fixture:7` 정상 allow·복합 이상 step_up, 공지 API 문법·불러오기 확인. 공지 API의 실제 DB 동작은 SQL 적용·배포 전이라 미실행.
- DB: Supabase 프로젝트가 무료 요금제 비활성으로 일시 정지돼 있어 재개함(지역은 도쿄 유지). `notices` 1건, 강사 시험 계정을 새로 만들어 `instructors` 1건 지정(이메일은 Git에 넣지 않음).
- 저장점 준비: 자기 점검에 비로그인 공지 읽기·수정(본문에 `role: instructor`를 넣어도 거부되는지)과 로컬 판정기 구역 가상 요청 2건(공지 수정·알 수 없는 경로) 추가.
- 저장점 `547f1c8` push, 운영 `/aleph.json` 커밋 `547f1c8`·step 8·공지 경로 확인. 비로그인 `GET /api/notices`·`PUT /api/notices/:id`(본문 role 포함) 모두 401.
- `npm run bundle`: 단계 8 · 바뀐 파일 14개 · 규칙 3개(`device_registered`, `resource_zone`, `step_up_required`) · 직접 점검 14개(비로그인 401 ×6, 로컬 판정기 가상 요청 6건 기대와 같음, 실제 재로그인 차단·anon 직접 조회 미실행).
- 로그인 교차 점검(운영 배포, 실제 요청): A·B 비밀번호를 SQL Editor에서 재설정, 학생이 `.env.local`(Git 제외)에 직접 입력. `node --env-file=.env.local scripts/stage8-live-check.mjs` 8항목 통과 — A 자기 메모 200, B의 A 메모 읽기·수정 403 `NOT_NOTE_OWNER`, A 공지 읽기 200, A·B 공지 수정(본문 role 위조) 403 `NOT_INSTRUCTOR`, 강사 공지 수정(내용 그대로) 200, 공지 경로로 메모 id 404. 토큰·비밀번호·본문 미출력, 세션 로그아웃.
- 1차 심판(커밋 `c57df0d`): 48/100, `S08_OTHER_ZONE_ALLOWED` — 판정기가 메모 전체 목록 경로를 허용(공지 쓰기·여러 사람 자료 한꺼번에 여는 경로는 판정기에서 거부해야 함). 원인: 구역 목록의 `GET /notes`. 공지 쓰기는 이미 모두 거부 중이었음.
- 수정: 판정기 구역에서 `GET /notes` 제거(→ `deny/route_not_allowed`). 메모 한 건 경로 4개·공지 읽기 2개만 허용. 자료 API `/api/notes`와 화면은 그대로. 시험에 전체 목록 거부와 공지 POST·PATCH·DELETE 거부 확인 추가, `node --test test/decider.test.mjs` 4개·`decider:test` 4항목·`fixture:7` 통과.
