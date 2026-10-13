# 8단계 진행 — 자료마다 갈 수 있는 구역을 나눕니다

## 해야 할 일

- push·배포 확인 뒤 `npm run bundle`
- 학생이 직접: A 로그인 화면 정상, A·B 토큰 공지 PUT 403, B 토큰 A 메모 403, 강사 토큰 공지 PUT 200 확인
- 8단계 카드 제출

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
| 🔄 | 제출 전 확인 · 8단계 저장점 커밋, push, `npm run bundle` |
| ⬜ | 8단계 제출 |

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
