# 12단계 진행 — 탈환 작전실을 완성합니다

## 해야 할 일

- 커밋·push·배포 확인 → `scripts/stage12-matrix.mjs`로 실측표 생성·커밋 → `npm run bundle` → 12단계 카드 제출

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README 마지막 절 11단계 ↔ 마지막 커밋 `2987c1f 11단계 저장점` 일치) |
| ✅ | 정할 것 ①~④ 결정 (모두 추천대로) |
| ✅ | 만들기 1 · 탈환 작전실 요약 화면 (배포 실측 남음) |
| 🔄 | 만들기 2 · 1~11단계 실측표 (스크립트 완료, 배포 뒤 실행) |
| ✅ | 만들기 3 · 설치·실행·중지·복구 안내와 출처 (README) |
| ✅ | 저장점 준비 · 판정기 구역 `GET /ops/summary`·정책 사본 `stage12-verified`, `allowedRoutes`, `step` 12, 자기 점검(비로그인 작전실) |
| ⬜ | 제출 전 확인 · 12단계 저장점 커밋, 실측표, `npm run bundle` |
| ⬜ | push·배포 확인, 12단계 제출 |

## 완료한 일

- 저장소 확인: 41종 공격 목록·작전실 계약 문서는 없음. `package/`(README·DEMO·ARCHITECTURE·POLICIES·SELF-CHECK 양식)는 12단계 뒤 패키징 단계용 양식으로, 이번 범위 밖.
- 활용할 실측 자료: 8·10·11단계 운영 배포 점검 스크립트(`scripts/stage8/10/11-live-check.mjs`, 쿠키 세션 `scripts/live-session.mjs`), 비로그인 점검(`src/attack-check.mjs`), 로컬 판정기·탐지 연습, 정책 사본 검증(`npm run policy:diff`).
- 현재 서버 기록: `restore_audit`(복원), `devices`(기기 승인), `notes`·`notices`. 탐지 사건·회수 집행 기록은 없음.
- 결정: ① `/ops.html` + `GET /api/ops/summary`(로그인·승인 기기, 본인 범위) ② 판정기·정책 사본은 배포 파일 실측, 메모·공지·기기·복원은 DB 실측, 탐지 사건·회수 상태는 미실행 ③ 실측표 `docs/verification/matrix-<커밋>.md` 커밋 ④ 41종은 통과 처리하지 않음.
- 만들기 1: `api/ops/summary.js`(항목마다 `source`: server_file·server_db·not_run, 확인 시각·요청 ID, 본문·토큰·기기 ID 없음, Vercel 추적을 위해 파일 경로 직접 표기), `public/ops.html`(실측/미실행 꼬리표, 정책 불일치 시 경고), 자료실 화면에 작전실 링크.
- 만들기 2: `scripts/stage12-matrix.mjs` — 1~12단계 운영 배포 요청 + 로컬 판정기·탐지 가상 요청 + 미실행 항목을 한 표로, 작전실 수치를 메모·공지 목록 API와 대조, 41종 미실행 명시.
- 만들기 3: README 12단계 절에 작전실·실측표 설명, 제공(ALEPH SDP 엔진·운영 측)과 학생 작업 출처 구분, 검사 커밋 기준 설치·실행·접속 앱·중지·복구 순서(비밀값 없음).
- 저장점 준비: 판정기 시험 7개, 전체 시험 21개 통과, `policy:diff`가 새 경로 1개 차이를 잡은 뒤 사본 갱신·감사 기록 한 줄.
