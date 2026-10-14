# 보너스 XDR-05 진행 — 권한 가로채기 탐지 (`privilege`)

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (판정기 규칙 `src/decider.mjs`, XDR 차단 목록·알림은 판정기 밖 별도 파일) |
| ✅ | 만들기 1 · 경보 읽기 (`read-alerts.mjs`, decide.mjs가 불러오지 않는 확인용) |
| ✅ | 만들기 2 · 패턴 목록 (`patterns.json`) |
| ✅ | 만들기 3 · 판단 모듈 (`decide.mjs`, import·파일 접근·바깥 요청 없음) |
| ✅ | 만들기 4 · 알림과 차단 (`respond.mjs`, XDR-01 respond 재사용) |
| ✅ | 만들기 5 · 시험 경보로 돌려 보기 |
| ✅ | 제출 전 확인 · 「보너스 xdr-05 저장점」 커밋(`6e68694`), push·배포 확인 |
| ✅ | 제출 완료 |

## 완료한 일

- 경보 원본 `xdr/fixtures/privilege.json` 26건, 원본 수정 없음.
- 만들기 1: 시각·주소·계정·수준·설명만 출력, 비밀값 모양 가림. 26건 / 26줄.
- 만들기 2: 패턴 3개 — `T1078.admin_group_add`(그룹 값 administrators 등·"관리자 그룹에 추가" 설명), `T1068.unfamiliar_admin_command`(관리자 명령 실행·관리자 권한 전환·다른 계정 권한), `T1078.off_hours_privilege`(수업 시간 밖·처음 보는 주소 설명, 경보 시각 8~20시 밖). 근거 각 한 줄, 막지 않을 사례 3종.
- 만들기 3: `decide.mjs` — 수준 10↑ + 패턴 0.9(패턴 2개↑ 0.95) → block, 패턴만·수준 미달 0.7 → alert, 권한 태그 + 수준 5↑ 신호 없음 0.55 → alert, 그 외 0.2/0.1 → record. `test/xdr-privilege.test.mjs` 3개 통과(단독 실행·패턴 일치·변형 입력 7개).
- 만들기 4: `respond.mjs` — block 주소만 만료·근거 경보 번호 붙은 거부 규칙. 계정 단위로 막으면 user01의 정상 로그인까지 막혀서 출발 주소 단위로 세션 회수. 다시 흘려도 알림 중복 없음(두 번째 실행 85줄 그대로). XDR-01~04 replay도 통과. 판정기 운영 경로와는 연결하지 않음(모의 시험).
- 만들기 5: `npm run xdr:run -- privilege` → block 9 · alert 8 · record 9(26건), 정상 이벤트 block 0. XDR 시험 17개 통과. 로컬 결과이며 심판 판정 아님.
- 저장점 `6e68694`: `xdr:run` 재실행(block 9 · alert 8 · record 9), README xdr 표에 privilege 한 줄, 비밀값 검출 없음, push 후 운영 `/aleph.json` 커밋 확인.
- ALEPH 보너스 작전에 제출 완료.
