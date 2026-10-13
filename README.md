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

## 4단계: 로그인해도 내 자료만

- 소유자 연결: `supabase/stage4-owners.sql`이 이메일로 `auth.users`에서 A·B의 ID를 찾아 기존 가상 메모 세 건을 A에게, 한 건을 B 시험 메모로 연결합니다.
- API 소유자 검사(`api/notes/[id].js`): 서버가 검증한 사용자 ID와 DB의 `owner_id`를 비교합니다. 없는 메모는 404, 남의 메모는 `403 {"error":"NOT_NOTE_OWNER"}`로 거부합니다. 수정은 기존 행과 새 행의 소유자가 모두 본인이어야 하며, 본문으로 `owner_id`를 바꾸려 하면 403입니다. 수정·삭제 쿼리도 `owner_id`를 함께 조건으로 겁니다. 추가는 본문의 `owner_id`·`userId`를 무시하고 확인된 ID로 저장하며, 이미 있는 id(남의 메모 포함)는 409입니다. 목록은 본인 메모만 돌려줍니다.
- DB 권한(`supabase/stage4-rls.sql`): `public, anon, authenticated`의 권한을 모두 회수한 뒤 `authenticated`에만 SELECT·INSERT·UPDATE·DELETE를 주고, 네 동작 모두 `auth.uid() = owner_id`인 행만 허용하는 RLS 정책을 둡니다. 적용 전후 `information_schema.role_table_grants`와 `has_table_privilege`로 대조합니다. 앱 API는 서버 전용 키를 쓰므로 RLS는 Data API 직접 접근에 대한 마지막 방어선입니다.
- 자기 점검: 무로그인 API 요청과 anon 키 Data API 직접 조회가 거부되는지 기록합니다. A·B 로그인 교차 점검은 비밀번호가 필요해 `npm run bundle`에서는 실행하지 않습니다.
- 확인: B로 로그인한 창에서 A 메모가 보이지 않고, A 메모 id로 GET·PUT·DELETE를 보내면 403이어야 합니다. A·B 각자 자기 메모 추가·수정·삭제는 유지됩니다.

## 5단계: 자료 요청을 서버 한곳으로

- 브라우저의 직접 자료 호출 점검(만들기 1): 메모를 Supabase에서 직접 읽거나 고치는 브라우저 코드는 없었습니다(4단계까지도 메모는 모두 `/api/notes`를 거침).
- 화면 코드에서 Supabase 주소·publishable key·SDK를 뺐습니다. 로그인·로그아웃도 서버 함수가 대신합니다.
  - `POST /api/auth/login` `{email,password}` → `{access_token,expires_at,email}` (서버 전용 키로 Supabase Auth 호출, refresh token은 돌려주지 않음)
  - `POST /api/auth/logout` (Bearer) → 204, 그 세션의 refresh token 폐기
  - 브라우저는 access token을 그 탭의 `sessionStorage`에만 두고, 만료(약 1시간) 뒤 다시 로그인합니다. CSP `connect-src`는 `'self'`만 허용합니다.
- 메모 API의 로그인·소유자 검사(3·4단계)는 그대로입니다.
- DB 권한(`supabase/stage5-revoke.sql`): notes 테이블의 PUBLIC·anon·authenticated 권한을 모두 회수합니다. 적용 전후 `information_schema.role_table_grants`와 `has_table_privilege`로 대조합니다. RLS와 본인 행 정책은 이중 방어로 남깁니다.
- 원본 자료 주소(`aleph.config.json`의 `originalApiUrl`): `https://pdexkcgclglxyiqybjrl.supabase.co/rest/v1/notes`. 공개 키로 직접 불러도 메모가 나오지 않아야 합니다.
- `/aleph.json`에 `allowedRoutes`(메모 API 경로)를 함께 냅니다.
- 자기 점검의 anon 직접 조회는 `SUPABASE_PUBLISHABLE_KEY` 환경변수를 주고 `npm run bundle`을 실행할 때만 보냅니다. 없으면 미실행으로 기록합니다.

## 6단계: 등록한 기기만 자료실에

- 판정기 `src/decider.mjs`에 `device_registered` 규칙을 넣었습니다. 반 엔진이 확인해 보낸 `request.deviceRegistered`가 정확히 `true`일 때만 `allow`(`approved`)이고, `false`·값 없음·다른 값은 `deny`(`device_not_registered`)입니다. 계약(`docs/DECIDER_REQUEST.md`)에 없는 `request.device`·`identity`·`role`은 쓰지 않습니다.
- 응답은 계약의 다섯 항목(`schema`, `requestId`, `decision`, `reasonCode`, `ruleIds`)만 돌려줍니다. 기존 자료실 주소·화면·메모 API는 바꾸지 않았습니다.
- 따로 설치할 접속 프로그램은 없고, 인증서·CA·서명 키도 만들지 않습니다. 미등록 기기 공격은 심판이 가상 요청으로 확인합니다.

### 확인 순서

1. 저장소 루트에서 `npm run decider:test`를 실행합니다.
2. `통과 · 등록 기기의 정상 요청`(allow)과 `통과 · 미등록 기기의 가상 요청`(deny·device_not_registered) 두 줄이 모두 나와야 합니다.
3. 이 명령은 가상 요청 연습이며 심판 판정이 아닙니다. `npm run fixture:7`은 7단계 연습이라 6단계 시점에는 실패했습니다(7단계에서 통과).

## 7단계: 평소와 다른 접속은 다시 확인

- 입력 검사: 판정기는 `request.signals`의 `source`가 `judge_fixture`(심판 가상 사건)이고 형식이 맞을 때만 접속 정보를 근거로 씁니다. 실제 경로의 `none`, 다른 출처, 빠진 값은 정상값으로 채우지 않고 "신호 없음"으로 봅니다. 브라우저 헤더·위치는 쓰지 않습니다.
- 규칙 `step_up_required`: 새벽(0~5시) + 처음 보는 네트워크(`unusual`) + 15분 안 사건 10건 이상이 함께일 때만 `step_up`(다시 로그인)입니다. 지역 하나만으로는 막지 않고, 영구 차단(deny)도 아닙니다. 기기 규칙(`device_registered`)이 먼저 적용됩니다. 기준값은 학습용 고정값입니다.
- 재로그인: 엔진이 검증한 `request.stepUp`이 `verified: true`이고 5분 이내일 때만 같은 사건을 다시 허용합니다. 새 로그인 시각을 검증하는 제공 엔진이 이 저장소에 없어, 실제 자료 차단과 새 요청 허용은 실측하지 않았습니다(미실행).

### 확인 순서

1. `npm run decider:test` → 등록 허용·미등록 거부·복합 이상 접속·다시 확인한 복합 이상 접속 네 줄이 모두 `통과`.
2. `npm run fixture:7` → `정상 사건: allow`, `복합 이상 사건: step_up`.
3. `node --test test/decider.test.mjs` → 위조 출처 무시, 단일 이상 허용, 재로그인 조건 시험 통과.
4. 모두 가상 요청 연습이며 심판 판정이 아닙니다.

## 8단계: 자료마다 갈 수 있는 구역

- 자원 구역: 메모는 `note:<id>`(`/api/notes`), 강사 공지는 `notice:<id>`(`/api/notices`)로 응답에 자원 ID를 붙여 구분합니다. 기존 메모 주소·자료·화면은 그대로이고, 화면 메뉴는 바꾸지 않았습니다.
- 공지 API: `GET /api/notices`(목록), `GET /api/notices/:id`는 로그인 사용자 누구나, `PUT /api/notices/:id`는 서버가 검증한 사용자 ID가 `instructors` 표에 있을 때만 허용하고 아니면 `403 NOT_INSTRUCTOR`입니다. 화면 메뉴·요청 본문·헤더의 role은 읽지 않습니다. 메모는 4단계 소유자 검사(`403 NOT_NOTE_OWNER`)를 유지합니다.
- DB: `supabase/stage8-notices.sql`을 SQL Editor에서 실행해 `notices`·`instructors` 테이블을 만들고(브라우저용 역할 권한 없음, 가상 공지 1건), 강사 시험 계정은 SQL Editor에서 직접 지정합니다(이메일은 Git에 넣지 않음).
- 판정기 규칙 `resource_zone`: 엔진이 확인한 `method`·`route`·`path`가 구역 목록과 정확히 맞을 때만 통과합니다. 메모 한 건 경로 4개(`POST /notes`, `GET·PUT·DELETE /notes/:id`)·공지 읽기 2개는 허용하고, 여러 사람의 자료를 한꺼번에 여는 메모 전체 목록(`GET /notes`)은 판정기에서 거부합니다. 공지 수정은 계약에 역할 정보가 없어 `deny`(`instructor_required`), 그 밖의 경로·`:id` 깊이의 기능 경로·경로 불일치·쿼리 있는 요청은 `deny`(`route_not_allowed`)입니다. 기기 → 구역 → 복합 이상 순서로 판정합니다. 두 이유 코드는 안내에 목록이 없어 직접 정했습니다.

### 확인 순서

1. `node --test test/decider.test.mjs`와 `npm run decider:test` → 모두 통과.
2. 로그인 없이 `curl -si -X PUT https://choi-bujang-secret-vault-chi.vercel.app/api/notices/00000000-0000-4000-8000-000000000000` → `401 LOGIN_REQUIRED`.
3. A 로그인 화면에서 자기 메모는 그대로 열리고, A·B 토큰으로 공지 `PUT`은 `403 NOT_INSTRUCTOR`, B 토큰으로 A 메모 id는 `403 NOT_NOTE_OWNER`, 강사 계정 토큰으로 공지 `PUT`은 200이어야 합니다(비밀번호가 필요해 `npm run bundle`에서는 실행하지 않음).

## 9단계: 도플갱어를 찾고 권한을 거둡니다

- 탐지 함수 `src/detect.mjs`의 `detect(events)`는 `docs/DETECT_EVENTS.md` 계약을 따릅니다. 사건마다 시각(`at`)·요청 종류(`method`)·가명 사용자(`identity.sub`)만 읽고, 형식이 틀린 사건은 건너뜁니다. 메모 내용·토큰·실명은 읽거나 출력하지 않습니다.
- 같은 가명 사용자의 `GET`이 어느 10분 구간에서든 120건을 **넘을 때만** `{ action: 'propose_revocation', reasonCode: 'burst_read', subject }`로 회수를 제안하고, 그 밖은 `{ action: 'observe' }`로 정상 사용자를 유지합니다. 다른 사용자의 조회는 합산하지 않습니다.
- 회수는 제안만 합니다. 회수 API를 만들거나 기기 권한을 바꾸지 않았고, 판정기 `decide()`의 응답 형식도 그대로입니다. 실제 회수와 경과 시간은 심판이 가상 사건으로 확인합니다.
- 안내 문구의 "평소와 다른 네트워크"·"가상 기기 대상"은 현재 사건 계약에 네트워크·기기 값이 없어 넣지 않았습니다(없는 값을 만들어 쓰지 않음). 회수 대상은 계약의 가명 사용자 하나입니다.
- `npm run detect:test` 통과는 로컬 가상 사건 연습이며, 운영 반 엔진의 사건 전달·접속 회수가 연결됐다는 뜻이 아닙니다.

### 확인 순서

1. `npm run detect:test` → 정상 30건·120건·서로 다른 사용자·10분 밖 조회는 observe, 121건·200건은 회수 제안으로 여섯 줄 모두 `통과`.
2. `node --test test/detect.test.mjs` → 계약 밖 값 무시, 형식 틀린 사건 제외, GET만 집계, 10분 경계 시험 통과.

## 10단계: 백업에서 자료실을 되살립니다

- 침해 전 기준: 운영 배포 로그인 교차 점검(8단계 스크립트) 8항목이 통과한 상태에서 정책·메모 사본을 만들었습니다.
- 정책 사본(Git): `backup/policy/decider.mjs`(검증한 판정기 정책), `manifest.json`(버전·SHA-256·규칙 목록), `audit.log`(복원 감사 기록, 추가만).
  - `npm run policy:diff` → 사본 해시를 다시 확인하고 복원할 버전과 바뀔 항목만 출력합니다. 사본이 없거나 해시가 다르면 중단합니다.
  - `npm run policy:restore` → 바뀔 항목을 보여 준 뒤 시험 정책 파일 `src/decider.mjs`만 사본으로 되돌리고 감사 기록에 한 줄 추가합니다. 운영 엔진 정책, XDR·탐지 규칙은 바꾸지 않습니다.
- 메모 사본(DB, Git 제외): `supabase/stage10-backup.sql`로 비공개 `notes_backup`(내용 해시 = SHA-256(제목+줄바꿈+본문))과 추가만 하는 `restore_audit`을 만듭니다. 브라우저용 역할 권한은 없습니다.
- 복원 경로(서비스 `notes`): `POST /api/notes/:id/restore`(`aleph.config.json`의 `restoreRoute`). 사본을 다시 읽어 소유자(본인만, 아니면 403)·내용 해시(불일치 409로 중단)를 확인하고 지정한 한 건만 되돌린 뒤, 다시 읽어 ID·소유자·내용 해시가 사본과 같은지 응답(`matches`)으로 돌려주고 `restore_audit`에 한 줄 남깁니다. 다른 메모는 건드리지 않습니다. 판정기 구역에도 `POST /notes/:id/restore`를 등록했습니다.
- `api/notes/[id].js`는 복원 경로를 붙이려고 `api/notes/[id]/index.js`로 옮겼습니다(주소 `/api/notes/:id` 그대로).

### 복구 뒤 재시험 순서 (1~9단계)

결과는 실제로 실행한 것만 기록하고, 실행하지 않은 항목은 미실행으로 둡니다. 로그인 점검은 `.env.local`(Git 제외)에 학생이 직접 넣은 시험 계정을 씁니다.

1. 정책: `npm run policy:diff` → "현재 시험 정책이 사본과 같습니다". 다르면 `npm run policy:restore` 후 다시 확인.
2. 메모 한 건 복원(시험 계정 B): `node --env-file=.env.local scripts/stage10-live-check.mjs` → B 메모 한 건 변조 뒤 복원, 비로그인 401·A가 B 메모 복원 403, 복원 뒤 해시 = 침해 전 해시, A 메모·B 다른 메모 그대로.
3. 1·2단계: `curl -si https://choi-bujang-secret-vault-chi.vercel.app/data.json` → 404.
4. 3·5단계: 비로그인 `/api/notes`·`/api/notices`·복원 경로 → 401 (`npm run bundle`의 직접 점검).
5. 4·8단계: `node --env-file=.env.local scripts/stage8-live-check.mjs` → A 자기 메모 200, B의 A 메모 403, A·B 공지 수정 403, 강사 공지 수정 200, 다른 구역 404.
6. 6~8단계 판정기: `npm run decider:test`, `npm run fixture:7`, `node --test test/decider.test.mjs`.
7. 9단계 탐지: `npm run detect:test`.
8. anon 키로 원본 자료 직접 조회(4·5단계)와 실제 재로그인 전 차단(7단계)은 키·엔진이 없어 미실행.

## 11단계: 나만의 접속 앱

- 설치형 웹앱: `public/manifest.webmanifest`(앱 이름 "최 부장 비밀 자료실", 아이콘 `icon.svg`, `display: standalone`), 오프라인 안내 `public/offline.html`, 서비스 워커 `public/sw.js`(오프라인 안내 화면 하나만 저장, `/api/…`와 자료실 화면은 저장하지 않음). 설치형 앱으로 열려도 "기기 승인은 서버가 따로 확인"이라고만 표시하고, 설치를 기기 확인으로 취급하지 않습니다. 따로 설치할 접속 프로그램은 없습니다.
- 토큰 보관: 로그인 API가 access token을 응답 본문에 넣지 않고 서버가 HttpOnly·Secure·SameSite=Strict 쿠키(`__Host-vault-sid`)로만 둡니다. 화면은 더 이상 `sessionStorage`를 쓰지 않습니다. 심판·점검 스크립트용 `Authorization: Bearer`도 그대로 받습니다.
- 기기 승인: 서버가 만든 무작위 기기 ID를 HttpOnly 쿠키(`__Host-vault-did`)로 발급하고 DB `devices`에는 해시만 둡니다(`supabase/stage11-devices.sql`). 기기 ID는 기기 개인키가 아닙니다.
  - `POST /api/devices/request` → 이 기기를 `pending`으로 요청(버튼만으로 승인되지 않음)
  - `GET /api/devices/me` → `none`·`pending`·`approved`·`revoked`와 기기 번호(해시 앞 12자리)
  - 승인은 학생이 Supabase SQL Editor에서 `stage11-devices.sql` ③으로만 합니다.
- 승인 전 자료 없음: 메모·공지·복원 API가 학생 로그인 요청에 대해 승인된 기기 쿠키를 서버에서 확인하고, 아니면 `403 DEVICE_NOT_APPROVED`로 자료 없이 거부합니다. 화면도 `approved`일 때만 기존 자료실을 엽니다. 심판 토큰은 반 엔진이 기기를 먼저 확인하므로 이 확인에서 제외했습니다.
- 판정기 구역에 `POST /devices/request`·`GET /devices/me`를 추가하고, 10단계 정책 사본을 11단계 검증 버전으로 갱신했습니다(`backup/policy/audit.log`에 기록).

### 확인 순서

1. `node --env-file=.env.local scripts/device-enroll.mjs` → A·B·강사 시험 기기 pending 요청(기기 ID는 Git 제외 `.env.devices.local`에만 저장, 화면에는 기기 번호만).
2. SQL Editor에서 `stage11-devices.sql` ②로 목록을 보고 ③으로 세 기기 승인.
3. `node --env-file=.env.local --env-file=.env.devices.local scripts/stage11-live-check.mjs` → 정적 파일 200, 비로그인 401, 로그인 본문에 토큰 없음, 기기 없이·승인 대기 기기로 메모 403, 승인 기기로 메모·공지 200.
4. 같은 env 파일로 `scripts/stage8-live-check.mjs`, `scripts/stage10-live-check.mjs` → 소유자·강사·복원 결과 유지.
5. 화면: 새 기기에서 로그인 → "이 기기 승인 요청" → 기기 번호 확인 → SQL 승인 → "승인 결과 확인" → 기존 자료실.

## 12단계: 탈환 작전실

- 작전실 화면 `/ops.html`(자료실 화면의 "탈환 작전실" 링크)과 요약 API `GET /api/ops/summary`. 로그인·승인된 기기에서만 열리고 본인 범위의 건수·상태만 보여 줍니다(메모 본문 없음).
  - 실측 · 배포 파일: 판정기 규칙·허용 경로·구역(`src/decider.mjs`), 정책 사본 버전과 해시 재확인·현재 판정기 일치(`backup/policy`).
  - 실측 · 서버 DB: 내 메모·공지 건수, 이 기기 승인 상태·내 기기 기록, 내 복원 기록 건수·최근 결과(`restore_audit`).
  - 미실행: 탐지 사건·회수 상태. 사건 전달과 회수 집행은 ALEPH SDP 엔진·심판이 하며 이 앱에는 그 기록이 없습니다(9단계 탐지 함수는 제안만).
  - 화면 문구는 통과 근거가 아니며, 응답의 확인 시각·요청 ID(`x-vercel-id`)를 함께 보여 줍니다.
- 실측표: `node --env-file=.env.local --env-file=.env.devices.local scripts/stage12-matrix.mjs` → 1~12단계 정상·금지 요청을 운영 배포에 실제로 보내 단계·구분·기대·실제·요청 ID·확인 시각·결과를 `docs/verification/matrix-<배포 커밋>.md`로 남깁니다. 작전실 수치는 별도 API 응답(메모·공지 목록)과 대조합니다. 로컬 판정기·탐지 연습은 "통과(로컬)", 보내지 않은 시험은 "미실행"으로 적고, 심판 총공세 41종은 실행·통과 처리하지 않습니다.

### 출처: 제공 엔진과 학생 작업

- 제공(ALEPH SDP 엔진·운영 측): 반 엔진의 신원·기기·경로 확인과 판정 요청 전달(`docs/DECIDER_REQUEST.md` 계약 `aleph.decision.v1`), 탐지 사건 전달·회수 집행(`docs/DETECT_EVENTS.md`), 심판 토큰 발급자(`aleph.config.json`의 `judgeIssuer`), 시작 틀의 로그인 검사 `src/verify-login.mjs`, 실행기·점검 도구(`scripts/bundle.mjs`, `decider-test.mjs`, `detect-test.mjs`, `fixture-7.mjs`, `xdr-run.mjs`).
- 학생 작업(이 저장소): 판정기 규칙 `src/decider.mjs`, 탐지 규칙 `src/detect.mjs`, 자료실 API `api/`(메모·공지·복원·기기·작전실·로그인 쿠키), 접속 앱 화면 `public/`(manifest·서비스 워커·작전실), DB SQL `supabase/`, 정책 사본·복원 도구 `backup/policy`·`scripts/policy-restore.mjs`, 점검 스크립트 `scripts/*-live-check.mjs`·`stage12-matrix.mjs`·`device-enroll.mjs`, 자기 점검 `src/attack-check.mjs`, 보너스 `xdr/`.

### 설치·실행·중지·복구 (검사 커밋 기준)

검사 기준은 제출 묶음의 `commit`과 운영 `/aleph.json`의 `commit`이 같은 커밋입니다. 비밀값은 저장소·안내·제출 묶음에 넣지 않습니다.

1. 설치: Node.js 22 이상, `npm ci`. Supabase 프로젝트에서 SQL Editor로 `supabase/stage3-notes.sql`부터 `stage4-*`, `stage5-revoke.sql`, `stage8-notices.sql`, `stage10-backup.sql`, `stage11-devices.sql`을 차례로 실행합니다(2단계 `*.local.sql`은 가상 메모 문장을 담아 Git 밖에 보관). Vercel 프로젝트 설정의 비밀 입력란에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 직접 넣습니다.
2. 실행: `main`에 push하면 Vercel이 `npm run build`로 배포합니다. 로컬 확인은 `npm run decider:test`, `npm run fixture:7`, `npm run detect:test`, `npm run policy:diff`, `node --test test/decider.test.mjs test/detect.test.mjs test/policy-restore.test.mjs`.
3. 접속 앱: 배포 주소에서 로그인 → "이 기기 승인 요청" → SQL Editor에서 `stage11-devices.sql` ③으로 승인 → "승인 결과 확인" → 자료실·작전실.
4. 중지: 의심 기기는 `stage11-devices.sql` ④로 `revoked`(즉시 자료 403), 의심 계정은 Supabase Authentication에서 세션 폐기·사용자 차단, 서비스 전체는 Vercel 프로젝트에서 이전 정상 배포로 되돌리거나 배포를 멈춥니다. 학습 DB 자료는 지우지 않습니다.
5. 복구: 정책은 `npm run policy:diff` → `npm run policy:restore`, 메모 한 건은 `POST /api/notes/:id/restore`(소유자 본인), 코드는 정상이던 커밋으로 되돌리는 새 커밋을 push(`git reset --hard` 대신 `git revert`). 복구 뒤 `scripts/stage12-matrix.mjs`로 재시험합니다.

## 보너스 xdr-01: 무차별 로그인 공격 탐지

- `xdr/brute-force/read-alerts.mjs`: 경보에서 시각·주소·계정·규칙 수준·설명만 뽑습니다(비밀값 모양은 가림).
- `xdr/brute-force/patterns.json`: MITRE ATT&CK T1110.001(같은 주소 실패 연속)·T1110.003(여러 계정에 같은 비밀번호) 두 패턴.
- `xdr/brute-force/decide.mjs`: 패턴에 맞으면 block, T1110인데 기준 미달이면 Jev(`JEV_URL`)에게 확신도를 묻고, 응답이 없으면 alert, 그 외 record.
- `xdr/brute-force/respond.mjs`: block 주소만 `xdr/blocklist.json`에 1시간 만료·근거 경보 번호와 함께 넣고, block·alert를 `xdr/alerts.log`에 한 줄씩 쌓습니다. 판정기 요청 계약에 출발 주소가 없어 `src/decider.mjs`는 바꾸지 않았습니다(`isBlocked`는 계약에 주소가 생기면 연결).
- 다시 실행: `npm run xdr:run -- brute-force`(판정 → `result.json`), `node xdr/brute-force/respond.mjs`(차단 목록·알림). 로컬 연습이며 심판 판정이 아닙니다.

## 보너스 xdr-02: 웹 주입 공격 탐지

- `xdr/web-injection/read-alerts.mjs`: 경보에서 시각·주소·계정·규칙 수준·설명만 뽑습니다(비밀값 모양은 가림).
- `xdr/web-injection/patterns.json`: MITRE ATT&CK T1190 아래 SQL 구문·스크립트 태그·경로 거슬러 올라가기·명령 구분자 네 패턴. 주입 구조(센서 설명 또는 두 번까지 디코딩한 요청 주소) + 반복 5번 이상 + 수준 10 이상이 함께 있어야 맞습니다.
- `xdr/web-injection/decide.mjs`: import 없는 단일 파일. 패턴에 맞으면 block, T1190인데 기준 미달이면 Jev(`JEV_URL`, 수준·건수만 전송)에게 묻고 응답이 없으면 alert, 그 외 record.
- `xdr/web-injection/respond.mjs`: xdr-01의 `respond`를 같은 `xdr/blocklist.json`·`xdr/alerts.log`에 연결합니다. 다른 모듈 규칙은 보존하고 같은 경보 알림은 다시 쓰지 않습니다. 판정기 운영 경로와는 연결하지 않았습니다(모의 시험).
- 다시 실행: `npm run xdr:run -- web-injection`, `node xdr/web-injection/respond.mjs`, `node --test test/xdr-web-injection.test.mjs`. 로컬 연습이며 심판 판정이 아닙니다. Jev는 연결 정보가 없어 alert로 처리합니다.
