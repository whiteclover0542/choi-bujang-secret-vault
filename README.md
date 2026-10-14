# BYTE BACK 방어전 시작 틀 R5

1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 1단계: 배포

1. GitHub 계정을 만듭니다.
2. 1단계 카드의 **Deploy** 버튼 → Vercel에 GitHub로 로그인 → 새 저장소가 **본인 계정의 Public 저장소**인지 확인 후 Deploy.
3. 나온 `https://…vercel.app` 주소를 1단계 카드에 붙여넣고 제출합니다.

`vercel.json`은 `public`을 배포하고, `npm run build`는 Vercel이 주는 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증해 `public/aleph.json`을 만듭니다(값이 없으면 빌드 실패). `aleph.json`만으로 소유권이나 방어 성공을 인정하지 않습니다. 로컬 화면 확인은 `npm run build -- --local`이며 배포·심판 접수를 증명하지 않습니다.

## 코딩 도구 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. `src/decider.mjs`·`src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 제출 묶음 계약은 `aleph.defense.submission.v2`(`scripts/bundle.mjs`)입니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록은 코드, Git, 제출 묶음에 넣지 않습니다.

배포 주소: `https://choi-bujang-secret-vault-chi.vercel.app`

## 2단계: 자료를 코드 밖으로

- 가상 메모는 Supabase `notes` 테이블(RLS 켜짐, anon·authenticated 권한 없음)에 있고, 화면은 서버 함수 `api/notes.js`로 읽습니다. `SUPABASE_URL`·`SUPABASE_SECRET_KEY`는 Vercel 환경변수에만 둡니다.
- 메모 문장이 든 SQL(`supabase/*.local.sql`)은 Git에 올리지 않습니다. 공개 `/data.json`은 404입니다.
- **과거 노출은 해소되지 않았습니다.** 1단계 커밋과 옛 배포에는 메모가 남아 있어, 실제 자료였다면 노출된 것으로 봐야 합니다.
- 확인: `git grep -nE "실습용 ?가상 (과제|포트폴리오|리추얼|행정) 기록" origin/main` → 결과 없음, `/data.json` → 404.

## 3단계: 진짜 로그인

- Supabase Auth 이메일·비밀번호 로그인. 모든 메모 API가 `src/verify-login.mjs`로 Bearer 토큰을 검사하고, 없으면 `401 LOGIN_REQUIRED`로 자료 없이 거부합니다. 브라우저가 보낸 userId·role·owner_id는 쓰지 않습니다.
- 메모 API(`allowedRoutes`): `GET·POST /api/notes`, `GET·PUT·DELETE /api/notes/:id`.
- 테이블 변경: `supabase/stage3-notes.sql`을 한 번 실행합니다.

## 4단계: 로그인해도 내 자료만

- `api/notes/[id].js`가 검증된 사용자 ID와 DB `owner_id`를 비교합니다. 없는 메모 404, 남의 메모 `403 NOT_NOTE_OWNER`, 본문으로 `owner_id`를 바꾸려 하면 403, 이미 있는 id로 추가하면 409입니다.
- `supabase/stage4-owners.sql`로 소유자를 연결하고, `stage4-rls.sql`로 `auth.uid() = owner_id`인 행만 허용하는 RLS를 둡니다.
- 확인: B 로그인에서 A 메모 id로 GET·PUT·DELETE → 403.

## 5단계: 자료 요청을 서버 한곳으로

- 화면 코드에서 Supabase 주소·키·SDK를 뺐습니다. 로그인·로그아웃은 `POST /api/auth/login`·`/api/auth/logout`이 대신합니다. CSP `connect-src`는 `'self'`만 허용합니다.
- `supabase/stage5-revoke.sql`로 notes의 PUBLIC·anon·authenticated 권한을 모두 회수합니다. 원본 주소(`originalApiUrl`)를 공개 키로 직접 불러도 메모가 나오지 않아야 합니다.
- 자기 점검의 anon 직접 조회는 `SUPABASE_PUBLISHABLE_KEY`를 주고 `npm run bundle`을 실행할 때만 보냅니다. 없으면 미실행입니다.

## 6~8단계: 판정기 `src/decider.mjs`

계약(`docs/DECIDER_REQUEST.md`)에 있는 값만 쓰고, 응답은 다섯 항목(`schema`, `requestId`, `decision`, `reasonCode`, `ruleIds`)만 돌려줍니다.

- **6단계 `device_registered`**: `request.deviceRegistered`가 정확히 `true`일 때만 허용, 아니면 `deny`(`device_not_registered`).
- **7단계 `step_up_required`**: `signals.source`가 `judge_fixture`일 때만 근거로 씁니다. 새벽(0~5시)+낯선 네트워크+15분 안 10건 이상이 **함께**일 때만 `step_up`이고, `request.stepUp`이 검증됨·5분 이내면 다시 허용합니다. 실제 재로그인 차단은 제공 엔진이 없어 미실행입니다.
- **8단계 `resource_zone`**: 엔진이 확인한 `method`·`route`·`path`가 구역 목록과 정확히 맞을 때만 통과합니다. 메모 한 건 경로와 공지 읽기는 허용하고, 메모 전체 목록은 거부, 공지 수정은 `instructor_required`, 그 밖은 `route_not_allowed`입니다(두 이유 코드는 직접 정함). 판정 순서는 기기 → 구역 → 복합 이상입니다.
- 공지 API: `GET /api/notices`·`/:id`는 로그인 사용자 누구나, `PUT`은 서버가 확인한 사용자가 `instructors` 표에 있을 때만(아니면 `403 NOT_INSTRUCTOR`). `supabase/stage8-notices.sql`로 만듭니다.

확인: `npm run decider:test`, `npm run fixture:7`, `node --test test/decider.test.mjs`. 모두 가상 요청 연습이며 심판 판정이 아닙니다.

## 9단계: 도플갱어 탐지

`src/detect.mjs`의 `detect(events)`(계약 `docs/DETECT_EVENTS.md`)는 같은 가명 사용자의 `GET`이 어느 10분 구간에서든 120건을 **넘을 때만** `propose_revocation`(`burst_read`)을 제안하고, 그 밖은 `observe`입니다. 제안만 하며 회수 API는 없습니다. `npm run detect:test` 통과는 운영 엔진의 사건 전달·접속 회수가 연결됐다는 뜻이 아닙니다.

## 10단계: 백업에서 복원

- 정책 사본(`backup/policy`: `decider.mjs`, `manifest.json` 해시, `audit.log`): `npm run policy:diff`로 확인, `npm run policy:restore`로 시험 정책 `src/decider.mjs`만 되돌립니다.
- 메모 사본(DB, Git 제외): `supabase/stage10-backup.sql`의 `notes_backup`·`restore_audit`.
- `POST /api/notes/:id/restore`: 본인만, 내용 해시 불일치 409, 지정한 한 건만 복원 후 `matches`로 대조하고 감사 기록을 남깁니다.
- 복구 뒤 재시험: `policy:diff` → `scripts/stage10-live-check.mjs` → `stage8-live-check.mjs` → `decider:test`·`fixture:7`·`detect:test`. 실행하지 않은 항목은 미실행으로 둡니다.

## 11단계: 나만의 접속 앱

- 설치형 웹앱(`manifest.webmanifest`, `offline.html`, `sw.js`). 서비스 워커는 오프라인 안내 화면만 저장하며, 설치를 기기 확인으로 취급하지 않습니다.
- 토큰은 서버가 HttpOnly·Secure·SameSite=Strict 쿠키(`__Host-vault-sid`)로만 둡니다. 심판·점검용 `Authorization: Bearer`도 받습니다.
- 기기 승인: 서버가 만든 무작위 기기 ID를 HttpOnly 쿠키로 발급하고 DB `devices`에는 해시만 둡니다(`stage11-devices.sql`). `POST /api/devices/request`는 `pending`만 만들고, 승인은 SQL Editor ③으로만 합니다.
- 승인 전에는 메모·공지·복원 API가 `403 DEVICE_NOT_APPROVED`로 자료 없이 거부합니다(심판 토큰 포함).
- 확인: `scripts/device-enroll.mjs` → SQL 승인 → `scripts/stage11-live-check.mjs`(env: `.env.local`, `.env.devices.local`).

## 12단계: 탈환 작전실

- `/ops.html`과 `GET /api/ops/summary`: 로그인·승인된 기기에서만 열리며 본인 범위의 건수·상태만 보여 줍니다(메모 본문 없음). 탐지 사건·회수 상태는 이 앱에 기록이 없어 **미실행**입니다.
- 실측표: `node --env-file=.env.local --env-file=.env.devices.local scripts/stage12-matrix.mjs` → `docs/verification/matrix-<커밋>.md`. 로컬 연습은 "통과(로컬)", 보내지 않은 시험은 "미실행"이며 심판 총공세 41종은 통과 처리하지 않습니다.
- **제공(운영 측)**: 반 엔진의 신원·기기·경로 확인과 판정 요청 전달, 탐지 사건 전달·회수 집행, `judgeIssuer`, `src/verify-login.mjs`, 실행기·점검 도구.
- **학생 작업**: `src/decider.mjs`, `src/detect.mjs`, `api/`, `public/`, `supabase/`, `backup/policy`, 점검 스크립트, `src/attack-check.mjs`, `xdr/`.

### 설치·실행·중지·복구

1. 설치: Node.js 22+, `npm ci`. SQL Editor에서 `supabase/stage3-notes.sql`부터 `stage4-*`, `stage5-revoke`, `stage8-notices`, `stage10-backup`, `stage11-devices`를 차례로 실행하고, Vercel 비밀 입력란에 `SUPABASE_URL`·`SUPABASE_SECRET_KEY`를 직접 넣습니다.
2. 실행: `main`에 push하면 Vercel이 배포합니다. 로컬 확인은 `npm run decider:test`, `fixture:7`, `detect:test`, `policy:diff`, `node --test test/*.test.mjs`.
3. 중지: 의심 기기는 `stage11-devices.sql` ④로 `revoked`, 의심 계정은 Supabase에서 세션 폐기·차단, 전체는 Vercel에서 이전 배포로 되돌립니다. 학습 DB 자료는 지우지 않습니다.
4. 복구: 정책은 `policy:diff` → `policy:restore`, 메모 한 건은 restore API, 코드는 `git revert`(`git reset --hard` 금지). 복구 뒤 `stage12-matrix.mjs`로 재시험합니다.

## 보너스 xdr (로컬 모의 시험, 심판 판정 아님)

다섯 모듈 모두 `read-alerts.mjs`(경보에서 필요한 필드만), `patterns.json`, `decide.mjs`(block·alert·record), `respond.mjs`(`xdr/blocklist.json` 1시간 만료, `xdr/alerts.log`)로 구성됩니다. 판정기 운영 경로와는 연결하지 않았고, Jev는 연결 정보가 없어 alert로 처리합니다.

| 모듈 | 탐지 대상 | 실행 |
|---|---|---|
| `brute-force` | T1110.001 같은 주소 실패 연속, T1110.003 여러 계정 같은 비밀번호 | `npm run xdr:run -- brute-force` |
| `web-injection` | T1190 SQL·스크립트 태그·경로 거슬러 올라가기·명령 구분자 (구조+5회 이상+수준 10 이상) | `npm run xdr:run -- web-injection` |
| `known-cve` | CVE-2021-44228 원격 조회 구문+수준 10 이상은 block, 그 외 alert·record | `npm run xdr:run -- known-cve` |
| `persistence` | T1543 서명 없는 서비스·T1053 처음 보는 예약 작업·시작 폴더+수준 10 이상은 block, 그 외 alert·record | `npm run xdr:run -- persistence` |
| `privilege` | T1078 관리자 그룹 추가·T1068 처음 보는 관리자 명령·업무 시간 밖 권한 사용+수준 10 이상은 block, 그 외 alert·record | `npm run xdr:run -- privilege` |

차단·알림은 `node xdr/<모듈>/respond.mjs`, 시험은 `node --test test/xdr-*.test.mjs`입니다.
