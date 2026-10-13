# 작업 기록

단계가 끝날 때마다 아래에 한 절씩 덧붙입니다. 단계별 세부 진행은 같은 폴더의 `stage-*.md`, `bonus-*.md`에 있습니다.
여기 적힌 시험 결과는 로컬에서 실제로 실행한 결과이며, 심판 판정은 포털에서 따로 확인합니다.

| 단계 | 주제 | 상태 | 저장점 커밋 | 진행 파일 |
| --- | --- | --- | --- | --- |
| 1 | 점령된 자료실 배포 | ✅ | `8a09274` (시작 틀) | [stage-1.md](stage-1.md) |
| 2 | 자료를 코드 밖으로 | ✅ | `65ba682`, `2b5c0c2` | [stage-2.md](stage-2.md) |
| 3 | 진짜 로그인 | ✅ | `f2f36a7`, `868ac39` | [stage-3.md](stage-3.md) |
| 4 | 로그인해도 내 자료만 | ✅ | `7c22e18` | [stage-4.md](stage-4.md) |
| 5 | 자료 요청을 서버 한곳으로 | ✅ | `f13b7ec`, `71e41d3` | [stage-5.md](stage-5.md) |
| 보너스 XDR-01 | 무차별 로그인 탐지 | ✅ (제출·결과 확인) | `06a6e2f`, `60cdc61` | [bonus-xdr-01.md](bonus-xdr-01.md) |
| 보너스 XDR-02 | 웹 주입 탐지 | ✅ (제출·결과 확인) | `67b0e00` | [bonus-xdr-02.md](bonus-xdr-02.md) |
| 6 | 등록한 기기만 자료실에 | 🔄 (저장점) | `401d269` | [stage-6.md](stage-6.md) |
| 7 | 평소와 다른 접속은 다시 확인 | 🔄 (저장점) | 7단계 저장점 | [stage-7.md](stage-7.md) |

표시: ✅ 완료 · 🔄 진행 중 · ⬜ 미완료

---

## 1단계 — 점령된 자료실 배포

- 시작 틀 저장소를 본인 GitHub Public 저장소로 만들고 Vercel에 배포했습니다.
- 배포 주소 `https://choi-bujang-secret-vault-chi.vercel.app`를 방어전 1단계 카드에 제출했습니다.
- `/`와 `/data.json`에서 가상 메모 네 건이 공개되는 "점령된" 상태가 출발점이었습니다.

## 2단계 — 자료를 코드 밖으로

- 가상 메모를 공개 `data.json`에서 학습용 Supabase `notes` 테이블(RLS 켜짐)로 옮겼습니다.
- 화면은 서버 함수 `/api/notes`로 메모를 읽습니다. 서버 전용 키는 Vercel 환경변수에만 둡니다.
- 공개 `/data.json`을 지워 404로 만들고, `vercel.json`에 nosniff·CSP 헤더를 넣었습니다.
- 한계 기록: `/api/notes`가 아직 공개였고(3단계에서 막음), 옛 커밋·배포에 남은 메모는 지워지지 않습니다.

## 3단계 — 진짜 로그인

- Supabase Auth 이메일·비밀번호 로그인·로그아웃 화면을 붙였습니다.
- 모든 메모 API가 `src/verify-login.mjs`로 토큰을 검사하고, 로그인 없으면 `401 LOGIN_REQUIRED`로 거부합니다.
- 메모 추가·수정·삭제 API(`GET/POST /api/notes`, `GET/PUT/DELETE /api/notes/:id`)와 화면을 만들었습니다.
- 수정 폼이 로그인 상태 이벤트로 초기화되던 문제를 고쳤습니다.

## 4단계 — 로그인해도 내 자료만

- 메모 API가 검증된 사용자 ID와 DB `owner_id`를 비교해 남의 메모 읽기·수정·삭제와 소유자 변경을 `403 NOT_NOTE_OWNER`로 거부합니다.
- `supabase/stage4-rls.sql`: 권한을 회수하고 `authenticated`에만 본인 행 RLS 정책을 두었습니다.
- `supabase/stage4-owners.sql`: 기존 가상 메모를 A·B 시험 계정에 연결했습니다.

## 5단계 — 자료 요청을 서버 한곳으로

- 로그인·로그아웃을 서버 함수(`/api/auth/login`, `/api/auth/logout`)로 옮겨, 화면 코드에서 Supabase 주소·공개 키·SDK를 뺐습니다.
- `supabase/stage5-revoke.sql`: notes 테이블의 PUBLIC·anon·authenticated 직접 권한을 모두 회수했습니다.
- `aleph.config.json`에 `originalApiUrl`, `/aleph.json`에 `allowedRoutes`·`originalApiUrl`을 냈습니다.

## 보너스 XDR-01 — 무차별 로그인 탐지

- `xdr/brute-force/`: 경보 읽기, MITRE T1110 패턴 2개, `decide`, 차단 목록·알림 연결(`respond.mjs`).
- 심판 격리 실행을 위해 `decide.mjs`를 import 없는 단일 파일로 바꿨습니다(`60cdc61`).
- 로컬 결과: block 10 · alert 9 · record 9 (28건), 정상 이벤트 block 0건.

## 보너스 XDR-02 — 웹 주입 탐지

- `xdr/web-injection/`: 경보 읽기, MITRE T1190 패턴 4개(SQL·스크립트·경로·명령), import 없는 `decide`, XDR-01 `respond` 재사용.
- 로컬 결과: block 8 · alert 9 · record 9 (26건), 정상 이벤트 block 0건.

## 6단계 — 등록한 기기만 자료실에 (진행 중)

- 판정기에 `device_registered` 규칙(등록 기기만 allow, 그 외 deny·`device_not_registered`)을 넣고 `npm run decider:test` 두 항목 통과. 세부는 [stage-6.md](stage-6.md).

## 7단계 — 평소와 다른 접속은 다시 확인 (진행 중)

- 판정기에 `step_up_required` 규칙(신뢰 신호의 새벽 + 처음 보는 네트워크 + 대량 요청 → step_up, 엔진 검증 재로그인 5분 이내면 allow)과 접속 정보 출처 검사를 넣음. `npm run decider:test` 4항목·`fixture:7` 통과. 실제 자료 차단 실측은 미실행. 세부는 [stage-7.md](stage-7.md).
