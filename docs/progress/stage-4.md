# 4단계 진행 — 로그인해도 내 자료만

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 기존 가상 메모를 A·B 계정에 연결 (`supabase/stage4-owners.sql`) |
| ✅ | API 소유자 검사 (`api/notes/[id].js`, 남의 메모 403) |
| ✅ | DB 권한 회수와 본인 행 RLS 정책 (`supabase/stage4-rls.sql`) |
| ✅ | 자기 점검에 무로그인·anon 직접 조회 추가 |
| ✅ | 저장점 커밋 |

## 완료한 일

- 남의 메모 GET·PUT·DELETE와 `owner_id` 변경은 `403 NOT_NOTE_OWNER`, 이미 있는 id 추가는 409, 목록은 본인 메모만.
- RLS: `authenticated`에만 네 동작, 모두 `auth.uid() = owner_id` 행만.
- A·B 로그인 교차 점검은 비밀번호가 필요해 `npm run bundle`에서는 실행하지 않음.
- 커밋: `7c22e18` 4단계 저장점.
