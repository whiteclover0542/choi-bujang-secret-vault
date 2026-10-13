# 11단계 진행 — 나만의 접속 앱을 완성합니다

## 해야 할 일

- 11단계 카드 제출

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README 마지막 절 10단계 ↔ 마지막 커밋 `c791ba5 10단계 저장점` 일치) |
| ✅ | 정할 것 ①~④ 결정 (모두 추천대로) |
| ✅ | 만들기 1 · manifest·승인 상태 표시·오프라인 안내 |
| ✅ | 만들기 2 · 기기 승인 요청·결과 화면, 승인 전 자료 차단 (운영 배포 실측 통과) |
| ✅ | 저장점 준비 · README 11단계 절, `step` 11, 자기 점검(비로그인 기기 상태), 제출 설명 |
| ✅ | `devices` SQL 실행(권한 0행) |
| ✅ | 제출 전 확인 · 11단계 저장점 커밋(`2987c1f`), push·배포 확인, 시험 기기 3개 승인, 실측, `npm run bundle` |
| ⬜ | 11단계 제출 |

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
- SQL(학생 실행): `devices` 표 생성, 브라우저용 역할 권한 0행. 시험 기기 3개(A `14c0233c7a9c`, B `8d894c9751f6`, 강사 `fb69f35052c4`) 승인 요청 → 학생이 SQL로 승인(3행 approved). 기기 ID 원문은 Git 제외 `.env.devices.local`에만.
- 저장점 `2987c1f` push, 운영 배포 반영 확인. 첫 기기 요청 때 B 로그인 응답 쿠키를 한 번 못 받았으나 배포 전환 중 일시 현상으로 보이며, 바로 다시 확인·재실행해 정상.
- 11단계 실측(운영 배포) 14항목 통과: manifest·sw.js·offline.html·icon 200, 비로그인 기기 상태 401, 로그인 본문에 토큰 없음, 세션 쿠키 HttpOnly·Secure·SameSite=Strict, 기기 없이 메모 403 `DEVICE_NOT_APPROVED`(0건)·상태 none, 새 기기 요청 201 pending → 그 기기로 메모 403, 승인 기기 approved → 메모 200(3건)·공지 200.
- 재점검: 8단계 교차 점검 8항목, 10단계 복원 실측 7항목 모두 통과(쿠키 방식).
- `npm run bundle`: 단계 11 · 바뀐 파일 28개 · 규칙 3개 · 허용 경로 11개 · 직접 점검 18개(비로그인 401 ×8, 로컬 판정기 6건, 탐지 6건 묶음, 정책 사본 `stage11-verified` 같음, 미실행 2건).
- 참고: 11단계 실측 스크립트는 실행할 때마다 시험용 pending 기기 행을 하나 남김(승인하지 않으면 권한 없음).
