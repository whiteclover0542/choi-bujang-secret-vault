# 11단계 진행 — 나만의 접속 앱을 완성합니다

## 해야 할 일

- 학생이 직접(push 전에): Supabase SQL Editor에서 `supabase/stage11-devices.sql` ① 실행, ⑤ 0행 확인 — 표가 없으면 배포 뒤 학생 자료 요청이 실패함
- 커밋·push·배포 확인 → `scripts/device-enroll.mjs`로 시험 기기 3개 요청 → SQL ③으로 승인
- 실측: `stage11-live-check.mjs`, `stage8-live-check.mjs`, `stage10-live-check.mjs` → `npm run bundle` → 11단계 카드 제출

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README 마지막 절 10단계 ↔ 마지막 커밋 `c791ba5 10단계 저장점` 일치) |
| ✅ | 정할 것 ①~④ 결정 (모두 추천대로) |
| ✅ | 만들기 1 · manifest·승인 상태 표시·오프라인 안내 |
| 🔄 | 만들기 2 · 기기 승인 요청·결과 화면, 승인 전 자료 차단 (코드 완료, SQL·배포 실측 남음) |
| ✅ | 저장점 준비 · README 11단계 절, `step` 11, 자기 점검(비로그인 기기 상태), 제출 설명 |
| ⬜ | 제출 전 확인 · 11단계 저장점 커밋, `npm run bundle` |
| ⬜ | push·배포 확인, 11단계 제출 |

## 완료한 일

- 현재 화면: `public/index.html` 한 파일(로그인 폼·메모 편집·목록), 토큰은 탭의 `sessionStorage`. manifest·서비스 워커·아이콘 없음.
- CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; …` — 같은 출처의 manifest·서비스 워커는 추가 설정 없이 허용됨.
- 판정기 계약의 `deviceRegistered`는 반 엔진이 확인해 주는 값이고, 자료실 API는 판정기를 거치지 않음 → 자료실 자체의 기기 승인은 서버(API)에서 따로 확인해야 함.
- 결정: ① 토큰은 서버 HttpOnly 쿠키 ② 서버 발급 무작위 기기 ID(HttpOnly 쿠키, DB엔 해시) ③ 승인은 SQL Editor에서만 ④ 메모·공지·복원 API가 학생 요청의 승인 기기를 확인, 심판 토큰 제외.
- 만들기 1: `public/manifest.webmanifest`·`icon.svg`·`offline.html`·`sw.js`(오프라인 안내만 캐시, API·자료 미저장). 화면에 설치형 앱 표시("기기 승인은 서버가 따로 확인"), 오프라인 안내 문구, 기기 상태 배지.
- 만들기 2: `src/notes-api.mjs`에 세션·기기 쿠키 읽기와 승인 기기 확인(`403 DEVICE_NOT_APPROVED`), `api/auth/login.js`는 토큰을 본문 대신 HttpOnly 쿠키로, `api/auth/logout.js`는 쿠키 세션도 폐기. `api/devices/request.js`(pending만 생성), `api/devices/me.js`(상태·기기 번호). `supabase/stage11-devices.sql`(`devices` 표, 승인·취소 SQL). 화면은 `sessionStorage` 제거, 로그인 → 기기 상태 → `approved`일 때만 기존 자료실(그 전에는 메모 목록·편집 숨김, 목록 비움).
- 판정기 구역에 기기 경로 2개 추가(시험 6개 통과), `policy:diff`가 사본 대비 2개 차이를 잡은 뒤 정책 사본을 `stage11-verified-2026-10-13`으로 갱신, 감사 기록 `snapshot_update` 한 줄.
- 점검 스크립트: 공통 쿠키 세션 `scripts/live-session.mjs`, 시험 기기 요청 `scripts/device-enroll.mjs`(기기 ID는 Git 제외 `.env.devices.local`), 실측 `scripts/stage11-live-check.mjs`, 8·10단계 스크립트를 쿠키 방식으로 변경.
- 시험(로컬): 20개 통과.
