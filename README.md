# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 2단계: 자료를 코드 밖으로

- 가상 메모는 학습용 Supabase `notes` 테이블(RLS 켜짐, anon·authenticated 권한 없음)에 있습니다. 테이블을 만드는 SQL(`supabase/*.local.sql`)은 메모 문장을 담고 있어 Git에 올리지 않습니다.
- 화면은 Vercel 서버 함수 `api/notes.js`(`/api/notes`)로 메모를 읽습니다. 함수는 Vercel 환경변수 `SUPABASE_URL`과 서버 전용 `SUPABASE_SECRET_KEY`를 씁니다. 키는 코드·브라우저 파일·응답·로그에 넣지 않습니다.
- 공개 `/data.json`은 지웠습니다(404). 1단계 확인 표시도 정적 응답에 남기지 않습니다.
- **남은 약점:** `/api/notes`는 아직 로그인 확인이 없는 공개 주소라, 주소를 아는 누구나 메모를 읽을 수 있습니다. 그래서 3단계 전까지는 가상 메모만 둡니다.

### 메모 문장 노출 확인 절차

배포 주소는 `https://choi-bujang-secret-vault-chi.vercel.app`입니다. 네 메모 문장을 정규식 `실습용 ?가상 (과제|포트폴리오|리추얼|행정) 기록`으로 검색하고(이 README 자체는 걸리지 않음), 결과를 각각 기록합니다.

1. GitHub 최신 파일: `git grep -nE "실습용 ?가상 (과제|포트폴리오|리추얼|행정) 기록" origin/main` → 결과가 없어야 합니다.
2. 현재 배포 정적 파일: `curl -si https://choi-bujang-secret-vault-chi.vercel.app/data.json` → 404여야 합니다. `curl -s https://choi-bujang-secret-vault-chi.vercel.app/`의 결과를 같은 정규식으로 검색 → 메모 문장이 없어야 합니다.
3. 공개 API(남은 약점): `curl -s https://choi-bujang-secret-vault-chi.vercel.app/api/notes` → 지금은 로그인 없이 메모가 응답됩니다. 3단계에서 막아야 할 약점으로 기록합니다.

**과거 노출은 해소되지 않았습니다.** 1단계 커밋(`8a09274` 등)과 그 커밋으로 만든 옛 Vercel 배포에는 메모가 그대로 남아 있습니다. 최신 파일에서 지웠다고 이력에서 사라지지 않으므로, 실제 자료였다면 노출된 것으로 보고 대응해야 합니다. 그래서 이 저장소에는 가상 메모만 둡니다.

### 다시 실행하기

- 테이블 준비: `supabase/*.local.sql`을 Supabase SQL Editor에서 실행합니다(Git에 없음, 로컬 보관).
- 환경변수: Vercel Settings → Environment Variables에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 넣습니다.
- 배포: `main`에 푸시하면 Vercel이 `npm run build`로 다시 배포합니다.
- 자기 점검과 제출 묶음: `npm run bundle`.

## 3단계: 진짜 로그인

- 화면: Supabase Auth 이메일·비밀번호 로그인·로그아웃(공식 SDK `signInWithPassword`·`signOut`). 실패 이유를 화면에 보여 줍니다. 화면 코드에는 공개용 Project URL과 publishable key만 있고, SDK 파일은 빌드 때 `public/vendor/`로 복사합니다(CSP `script-src 'self'`).
- 서버: 모든 메모 API가 시작 틀의 `src/verify-login.mjs`로 `Authorization: Bearer` 토큰을 검사합니다(`src/notes-api.mjs`). 토큰이 없거나 검사에 실패하면 `401 {"error":"LOGIN_REQUIRED"}`로 자료 없이 거부합니다. 브라우저가 보낸 userId·role·owner_id는 쓰지 않습니다.
- 메모 API(`aleph.config.json`의 `allowedRoutes`):
  - `GET /api/notes` 로그인 사용자의 메모 배열 `{notes:[{id,title,body}]}`
  - `POST /api/notes` `{id?,title,body}` → `201 {id}` (id가 없으면 서버가 UUID 생성, owner_id는 서버가 확인한 사용자 ID)
  - `GET /api/notes/:id` → `{id,title,body}`, 없거나 지운 뒤에는 404
  - `PUT /api/notes/:id` `{title,body}` → 수정된 `{id,title,body}`
  - `DELETE /api/notes/:id` → 204
- 테이블 변경: `supabase/stage3-notes.sql`을 SQL Editor에서 한 번 실행합니다(id를 UUID로, content를 body로).
- **남은 약점(4단계에서 고침):** `/api/notes/:id`는 로그인만 확인하고 소유자는 확인하지 않습니다. B가 A 메모의 id를 알면 읽고 고치고 지울 수 있습니다. 로그인은 신원 확인일 뿐입니다.
- 확인: 시크릿 창에서 로그인 없이 메모가 보이지 않고, A 로그인 뒤 추가·수정·삭제가 되어야 합니다. `curl -si https://choi-bujang-secret-vault-chi.vercel.app/api/notes` → 401 JSON.
