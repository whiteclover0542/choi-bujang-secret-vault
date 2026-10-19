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
| 6 | 등록한 기기만 자료실에 | ✅ (제출 완료) | `401d269` | [stage-6.md](stage-6.md) |
| 7 | 평소와 다른 접속은 다시 확인 | ✅ (제출 완료) | `d6f54b9` | [stage-7.md](stage-7.md) |
| 8 | 자료마다 갈 수 있는 구역 | ✅ (재제출 완료) | `547f1c8`, `c05eb7a` | [stage-8.md](stage-8.md) |
| 9 | 도플갱어를 찾고 권한을 거둠 | ✅ (제출 완료) | `2bb98be` | [stage-9.md](stage-9.md) |
| 10 | 백업에서 자료실을 되살림 | ✅ (제출 완료) | `c791ba5` | [stage-10.md](stage-10.md) |
| 11 | 나만의 접속 앱 완성 | ✅ (재제출 완료) | `2987c1f`, `5e9b39c` | [stage-11.md](stage-11.md) |
| 12 | 탈환 작전실 완성 | ✅ (제출 완료) | `afa2207`, `3b59a71` | [stage-12.md](stage-12.md) |
| 보너스 XDR-03 | 알려진 취약점 악용 탐지 | ✅ (제출 완료) | `eafc2f9` | [bonus-xdr-03.md](bonus-xdr-03.md) |
| 보너스 XDR-04 | 몰래 심어진 프로그램 탐지 | ✅ (제출 완료) | `0fdead3` | [bonus-xdr-04.md](bonus-xdr-04.md) |
| 보너스 XDR-05 | 권한 가로채기 탐지 | ✅ (제출 완료) | `6e68694` | [bonus-xdr-05.md](bonus-xdr-05.md) |
| 보너스 XDR-06 | 자료 빼돌리기 탐지 | 🔄 (저장점 대기) | — | [bonus-xdr-06.md](bonus-xdr-06.md) |
| 13 | 로그인 사용자·기기·세션 표시 | 🔄 (구현·모의 점검 완료, 화면 미확인) | 없음 | [stage-13.md](stage-13.md) |
| 14 | 업무 앱과 접속 판정·상태 | 🔄 (구현·모의 점검·데모 일부 확인) | 없음 | [stage-14.md](stage-14.md) |

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

## 6단계 — 등록한 기기만 자료실에

- 판정기에 `device_registered` 규칙(등록 기기만 allow, 그 외 deny·`device_not_registered`)을 넣고 `npm run decider:test` 두 항목 통과. 세부는 [stage-6.md](stage-6.md).

## 7단계 — 평소와 다른 접속은 다시 확인

- 판정기에 `step_up_required` 규칙(신뢰 신호의 새벽 + 처음 보는 네트워크 + 대량 요청 → step_up, 엔진 검증 재로그인 5분 이내면 allow)과 접속 정보 출처 검사를 넣음. `npm run decider:test` 4항목·`fixture:7` 통과. 실제 자료 차단 실측은 미실행. 세부는 [stage-7.md](stage-7.md).

## 8단계 — 자료마다 갈 수 있는 구역

- 강사 공지(`notices`)·강사 표(`instructors`)와 공지 API를 새로 만들고, 메모·공지에 서로 다른 자원 ID(`note:`/`notice:`)를 붙임. 판정기에 `resource_zone` 규칙(정확한 경로 모양별 구역, 알 수 없는 경로·공지 수정 거부), 공지 수정 API는 강사 표 대조. 세부는 [stage-8.md](stage-8.md).

## 9단계 — 도플갱어를 찾고 권한을 거둠

- `src/detect.mjs`에 계약대로 탐지 규칙(같은 가명 사용자의 GET이 10분 안 120건 초과 → `propose_revocation`·`burst_read`)을 넣음. `npm run detect:test` 6항목 통과. 세부는 [stage-9.md](stage-9.md).

## 10단계 — 백업에서 자료실을 되살림

- 판정기 정책 사본(`backup/policy`)과 차이 보기·되돌리기(`npm run policy:diff`/`policy:restore`), 비공개 메모 사본(`notes_backup`)에서 한 건만 복원하는 `POST /api/notes/:id/restore`(소유자·ID·해시 대조, `restore_audit`), README 재시험 순서. 세부는 [stage-10.md](stage-10.md).

## 11단계 — 나만의 접속 앱 완성

- 설치형 웹앱(manifest·아이콘·오프라인 안내)과 기기 승인 흐름(HttpOnly 쿠키 세션·서버 발급 기기 ID, pending→SQL 승인, 미승인 기기는 자료 API 403)을 만듦. 세부는 [stage-11.md](stage-11.md).

## 12단계 — 탈환 작전실 완성

- 탈환 작전실(`/ops.html`, `GET /api/ops/summary`, 실측/미실행 구분), 1~12단계 실측표 스크립트, README 운영 안내·출처. 세부는 [stage-12.md](stage-12.md).

## 보너스 XDR-03 — 알려진 취약점 악용 탐지

- `xdr/known-cve/`: 경보 읽기, CVE-2021-44228 원격 조회 구문·점검 도구 흔적 패턴 2개, import 없는 `decide`, XDR-01 `respond` 재사용.
- 로컬 결과: block 8 · alert 8 · record 8 (24건), 정상 이벤트 block 0건.

## 보너스 XDR-04 — 몰래 심어진 프로그램 탐지

- `xdr/persistence/`: 경보 읽기, T1543 서명 없는 서비스·T1053 처음 보는 예약 작업·T1547.001 시작 폴더 패턴 3개, import 없는 `decide`, XDR-01 `respond` 재사용(출발 주소 단위 격리).
- 로컬 결과: block 8 · alert 8 · record 8 (24건), 정상 이벤트 block 0건.

## 보너스 XDR-05 — 권한 가로채기 탐지

- `xdr/privilege/`: 경보 읽기, T1078 관리자 그룹 추가·T1068 처음 보는 관리자 명령·업무 시간 밖/처음 보는 주소 권한 사용 패턴 3개, import 없는 `decide`, XDR-01 `respond` 재사용(출발 주소 단위로 세션 회수).
- 로컬 결과: block 9 · alert 8 · record 9 (26건), 정상 이벤트 block 0건.

## 보너스 XDR-06 — 자료 빼돌리기 탐지 (진행 중)

- `xdr/exfiltration/`: 경보 읽기, T1048 처음 보는 목적지 대용량·T1041 명령 통로 반복·업무 시간 밖 압축 파일 패턴 3개, import 없는 `decide`(차단은 50MB↑ + 수준 10↑), 목적지(dstip) 단위 차단.
- 공용 `xdr/brute-force/respond.mjs`에 막는 기준 필드 인자(기본 `srcip`) 추가, 기준 값이 없는 경보가 다른 규칙에 걸리던 조회 수정.
- 로컬 결과: block 10 · alert 10 · record 10 (30건), 정상 이벤트 block 0건.

## 13단계 — 로그인 사용자·기기·세션 표시

- 공식 안내를 바탕으로 `stage-12.md` 형식의 [stage-13.md](stage-13.md)를 작성했습니다. Agent 이름은 「이지스」입니다.
- 파일 목록과 함수명 검색 결과 현재 저장소에 `student/extension.mjs`, `createStudentView`, `renderIdentity`가 없어 공식 계약과 실제 원문 대조는 확인 불가입니다. 임의의 UI 구조를 만들지 않았습니다.
- 문서에 me·devices·sessions 입력 계약, 상태·모드 문구, DOM 교체·오류 시 이전 사용자 값 제거, 세 메뉴와 다시 불러오기 확인 순서를 기록했습니다.
- UI 구현·모의 데이터 검사·실제 화면 검사·배포·커밋·제출은 미실행입니다. 필수 확인 항목과 AI 판정은 미확인으로 남겼습니다. 다음 작업은 공식 학생 작업 파일의 위치 확인입니다.

### 13단계 후속 — 공식 시작 틀과 학생 함수 구현

- `on-client/` 복사 상태와 공식 원문을 확인해 파일 부재 상태를 해소했습니다. `on-client/student/extension.mjs`의 `renderIdentity`만 구현하고 다른 렌더 함수와 제공 코드는 보존했습니다.
- 각 자료의 loading/ok/error, mode 안내, 이름·ID·기기·세션 상태 및 새 DOM 반환을 구현했습니다. 오류 분기에서 이전 data를 출력하지 않습니다.
- `on-client`에서 `npm run check` 성공. 별도 가상 입력·모의 DOM 검사도 UTF-8 파이프 수정 후 성공했습니다. 실제 브라우저·실제 계정·공식 판정 결과는 미확인이고 배포·커밋·제출은 실행하지 않았습니다.
- 다음 작업은 `npm start` 후 세 메뉴를 마우스와 Tab·Enter로 이동하는 직접 확인입니다. 상세 이력과 예상 결과는 [stage-13.md](stage-13.md)에 기록했습니다.
### 13단계 후속 — 전달받은 disconnected 화면 확인

- 사용자가 Edge 헤드리스(1400px) 렌더링 결과를 전달했습니다. 연결 없음 배지, 학생 영역 세 구역의 모드·실패 안내, 사용자 이름 미표시 및 세 메뉴 노출을 확인한 기록입니다. 이번 에이전트의 직접 실행 결과와 구분합니다.
- 정상 사용자 표시 후 오류 전환·이전 값 제거, 메뉴 클릭·Tab·Enter 이동, 다시 불러오기 클릭 후 교체는 실제 화면에서 미확인입니다. 정상(ok)은 모의 DOM에서만 점검했습니다. 공식 판정이나 통과로 처리하지 않습니다.
- 다음 확인은 메뉴의 마우스·키보드 이동입니다. 연결 어댑터와 저장소의 스크린샷 파일은 변경하지 않았습니다.

- 13단계 사용자 후속 확인: Tab 포커스 이동과 Enter 메뉴 실행이 정상 동작한다고 확인받았습니다. 사용자 직접 확인으로 기록하며, 다시 불러오기 및 정상→오류 전환의 실제 화면 검사는 미확인으로 유지합니다.

- 13단계 사용자 후속 확인: 다시 불러오기 후 사용자 이름이 나타나지 않는다는 응답을 받았습니다. 이름 미표시만 확인 기록에 추가하며, 정상(ok) 값 교체와 정상→오류 전환의 실제 검사는 미확인으로 유지합니다.

- 13단계 커밋 전 검토: 공식 필수 5항목의 코드 근거를 확인했습니다(로컬 검토, 서버 공식 판정 아님). 학생 파일은 on-client/student/extension.mjs이며 다른 함수 기본 문구는 유지했습니다. 요청한 「이지스」 이름 변경을 포함합니다. 문법 검사 성공, on-client 56개 파일의 개인키·주요 토큰 패턴 발견 0건. 기존 보너스 수정과 비밀 설정·제출 산출물은 이번 커밋에서 제외합니다.

## 14단계 — 업무 앱과 접속 판정·상태

- 사용자에게 13단계 제출 완료를 확인받았습니다. 13단계 수정 커밋 b9e032d의 push는 앞 작업에서 완료했습니다. 공식 통과 결과는 별도 미확인입니다.
- [stage-14.md](stage-14.md)를 기존 단계 문서 형식으로 작성했습니다. 이지스의 renderDecision 입력 계약, 구현 순서, 한국어·원래 코드 병기, 이유·시각과 요청 실패 구분, 필수 5항목을 정리했습니다.
- 현재 학생 함수의 기본 문구와 제공 UI의 요청·입력 전달·DOM 교체 연결을 코드로 확인했습니다. renderIdentity와 제공 코드는 변경하지 않았습니다.
- 이번에는 문서만 준비했습니다. 14단계 구현·모의 점검·실제 화면 점검·커밋·제출은 미실행이며 다음 작업은 renderDecision 구현입니다. 기존 보너스 작업 변경은 보존했습니다.

### 14단계 후속 — renderDecision 구현

- on-client/student/extension.mjs의 renderDecision만 구현했습니다. renderIdentity와 다른 렌더 함수는 HEAD 원문 비교로 보존을 확인했습니다.
- idle/loading/ok/error, 판정의 한국어·원래 코드 병기, 알 수 없는 판정의 unknown 처리, 앱 ID·이유·시각, 요청 실패와 거부 판정 구분 및 mode 안내를 구현했습니다.
- 문법 검사와 diff 공백 검사 성공. 별도 모의 DOM의 판정·요청 상태·모드·새 DOM·다른 함수 보존 검사 성공. 실제 화면·접근 요청·공식 판정은 미확인이며 커밋·제출은 실행하지 않았습니다.
- 다음은 실제 앱의 업무 앱 메뉴에서 현재 계정에 표시되는 앱과 접근 요청 결과를 확인하는 것입니다. 연결 없음으로 목록이 없으면 정책을 변경하지 않고 실제 결과는 미확인으로 남깁니다.
### 13·14단계 후속 — 전달받은 데모 화면·키보드 확인

- 13단계: 데모 사용자·기기·세션 및 목록, 다시 불러오기 후 재표시, 방향키 메뉴 선택 변경을 확인했다고 전달받았습니다. 이번 검사에서 메뉴 Tab·Enter는 미확인입니다. 앞선 사용자 확인과 구분합니다. disconnected의 실패 안내·이름 미표시도 확인 기록이 있습니다. compliant/noncompliant는 이번 화면에서 미확인입니다.
- 14단계: 데모 초기 안내, allow와 이유·시각, deny·challenge 표시, 앱 버튼의 Tab·Enter 요청 및 결과 갱신, 다시 불러오기 후 초기 안내를 확인했다고 전달받았습니다. unknown·error 화면과 실제 연결 계정의 결과는 미확인이고 기존 모의 점검과 구분합니다.
- 데모 자료는 실제 연결·공식 판정이 아닙니다. 스크래치패드 스크린샷·스크립트는 추가하지 않았으며 이번 작업은 문서 기록뿐입니다. 14단계 커밋·제출은 하지 않았습니다. 다음은 제출 전 검토입니다.
- 14단계 사용자 재확인: 데모에서 앱별 판정이 다르게 표시되고 키보드도 동작함. 첨부 화면에서 학생 영역의 예제 자료·library·allow·이유·시각 표시를 확인했습니다. unknown/error 실제 화면·공식 판정은 미확인으로 유지합니다.
