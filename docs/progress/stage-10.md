# 10단계 진행 — 백업에서 자료실을 되살립니다

## 해야 할 일

- 배포 뒤 실측: `scripts/stage10-live-check.mjs`(B 메모 한 건 변조→복원), `scripts/stage8-live-check.mjs`, 그다음 `npm run bundle`, 10단계 카드 제출

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README 마지막 절 9단계 ↔ 마지막 커밋 `2bb98be 9단계 저장점` 일치) |
| ✅ | 정할 것 ①~④ 결정 (모두 추천대로) |
| ✅ | 현재 침해 상태 확인 — 운영 배포 교차 점검 8항목 통과, A 메모 3건(침해 흔적 없음) |
| ✅ | 만들기 1 · 정책 사본과 현재 정책 차이 보기 |
| ✅ | 만들기 2 · 검증한 정책 버전으로 되돌리기 |
| ✅ | 백업 SQL 실행 — 권한 0행, `notes 4 = backups 4`, `mismatched 0` |
| 🔄 | 만들기 3 · 메모 한 건 복원 POST 경로 (코드·SQL 완료, 배포 실측 남음) |
| ✅ | 만들기 4 · 복구 뒤 1~9단계 재시험 순서 (README) |
| ✅ | 저장점 준비 · README 10단계 절, `step` 10, 자기 점검 묶기·복원·정책 점검 추가 |
| 🔄 | 제출 전 확인 · 10단계 저장점 커밋, push, 실측, `npm run bundle` |
| ⬜ | 10단계 제출 |

## 완료한 일

- 저장소 확인: 복원 관련 설정은 `aleph.config.json`의 `restoreRoute: null`과 `scripts/bundle.mjs`가 제출 묶음에 그 값을 싣는 부분뿐. 복원 계약 문서·백업 사본·감사 기록은 없음.
- 활용할 기존 자료: 판정기 정책(`src/decider.mjs`의 `RULE_IDS`·구역), 메모 API 소유자 검사(`api/notes/[id].js`), 로그인 교차 점검 스크립트(`scripts/stage8-live-check.mjs`, `.env.local` 사용).
- 결정: ① 시험 정책 = 판정기 정책(`RULE_IDS`·`ZONES`) ② 메모 사본은 Supabase `notes_backup`(Git 제외), 정책 사본은 Git `backup/policy/` ③ `POST /api/notes/:id/restore` ④ 추가만 하는 감사 기록(정책 `backup/policy/audit.log`, 메모 `restore_audit`).
- 침해 전 확인: 운영 배포 교차 점검 8항목 통과 상태를 기준으로 사본을 만듦.
- 판정기: 구역에 `POST /notes/:id/restore` 추가, `ZONES` 내보냄. 시험 5개 통과.
- 만들기 1·2: `backup/policy/decider.mjs`(검증 사본)·`manifest.json`(버전 `stage10-verified-2026-10-13`, sha256, 규칙 목록)·`audit.log`. `scripts/policy-restore.mjs` — `npm run policy:diff`는 사본 해시 검증 후 버전·바뀐 항목만 출력, `npm run policy:restore`는 시험 정책 파일만 사본으로 되돌리고 감사 기록 한 줄 추가. 사본 없음·해시 불일치면 중단. 줄바꿈(CRLF/LF) 차이는 같은 내용으로 봄. `test/policy-restore.test.mjs` 2개 통과(임시 폴더에서 침해 흉내 → 바뀐 항목 3개 표시 → 복원 → 감사 기록 1줄 추가, 사본 위조·없음 → 중단).
- 만들기 3: `supabase/stage10-backup.sql`(`notes_backup`·`restore_audit`, 브라우저용 역할 권한 없음, 내용 해시 = SHA-256(제목+줄바꿈+본문)). `api/notes/[id].js` → `api/notes/[id]/index.js`로 이동(주소 그대로), `api/notes/[id]/restore.js` — 사본 재검증(소유자·해시) → 한 건만 upsert → 다시 읽어 ID·소유자·해시 대조 → 감사 기록 추가. `aleph.config.json`에 `restoreRoute`·`allowedRoutes` 등록. 실측 스크립트 `scripts/stage10-live-check.mjs`.
- 백업 SQL(학생 실행): 권한 확인 0행, 메모 4건 = 사본 4건, 사본 재검증 해시 불일치 0.
- 만들기 4: README에 복구 뒤 재시험 순서 8단계(정책 diff → B 메모 복원 실측 → data.json 404 → 비로그인 401 → 로그인 교차 점검 → 판정기 시험 → 탐지 시험 → 미실행 항목).
- 저장점 준비: 자기 점검에서 탐지 연습 6건을 한 줄로 묶고(상한 20개), 비로그인 복원 401과 정책 사본 검증을 추가. 시험 19개 통과.
