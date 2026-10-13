# 2단계 진행 — 자료를 코드 밖으로

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 가상 메모를 Supabase `notes` 테이블로 이전 (`supabase/*.local.sql`, Git 제외) |
| ✅ | 서버 함수 `/api/notes`로 화면이 메모를 읽게 변경 |
| ✅ | 공개 `/data.json` 제거(404), 보안 헤더 추가 |
| ✅ | 메모 문장 노출 확인 절차를 README에 기록 |
| ✅ | 저장점 커밋 |

## 완료한 일

- `api/notes.js`가 Vercel 환경변수 `SUPABASE_URL`·`SUPABASE_SECRET_KEY`로 메모를 읽습니다(키는 코드·응답·로그에 없음).
- `vercel.json`에 nosniff·CSP 헤더.
- 한계로 기록: `/api/notes`가 아직 로그인 없이 열려 있었음(3단계에서 해결), 1단계 커밋·옛 배포의 메모 노출은 이력에 남음.
- 커밋: `65ba682` 2단계 저장점, `2b5c0c2` 공개 data.json 제거와 보안 헤더.
