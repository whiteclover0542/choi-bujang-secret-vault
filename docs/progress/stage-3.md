# 3단계 진행 — 진짜 로그인

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | Supabase Auth 로그인·로그아웃 화면 |
| ✅ | 메모 API 토큰 검사 (`src/verify-login.mjs`, 무로그인 401) |
| ✅ | 메모 추가·조회·수정·삭제 API와 화면 |
| ✅ | 테이블 변경 SQL (`supabase/stage3-notes.sql`) |
| ✅ | 저장점 커밋 |
| ✅ | 수정 폼 초기화 버그 수정 |

## 완료한 일

- 허용 경로: `GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/:id` (`aleph.config.json`의 `allowedRoutes`).
- 토큰이 없거나 틀리면 `401 {"error":"LOGIN_REQUIRED"}`, 브라우저가 보낸 userId·role·owner_id는 무시.
- 남은 약점으로 기록: 소유자 검사 없음(4단계에서 해결).
- 커밋: `f2f36a7` 3단계 저장점, `868ac39` 수정 폼 문제 수정.
