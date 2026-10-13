# 5단계 진행 — 자료 요청을 서버 한곳으로

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 브라우저의 Supabase 직접 호출 점검 (없었음) |
| ✅ | 로그인·로그아웃을 서버 함수 `/api/auth/*`로 이전, 화면에서 Supabase 주소·키·SDK 제거 |
| ✅ | notes 테이블 직접 권한 회수 (`supabase/stage5-revoke.sql`) |
| ✅ | `originalApiUrl`, `/aleph.json`의 `allowedRoutes` 공개 |
| ✅ | 저장점 커밋 |

## 완료한 일

- `POST /api/auth/login` → access token만 반환(refresh token 미반환), `POST /api/auth/logout` → 세션 폐기.
- 브라우저는 access token을 탭의 `sessionStorage`에만 보관, CSP `connect-src 'self'`.
- 원본 자료 주소: `https://pdexkcgclglxyiqybjrl.supabase.co/rest/v1/notes` (공개 키로 직접 불러도 메모가 나오지 않아야 함).
- 메모 API의 로그인·소유자 검사(3·4단계)는 유지.
- 커밋: `f13b7ec` 5단계 저장점, `71e41d3` `/aleph.json`에 originalApiUrl 공개.
