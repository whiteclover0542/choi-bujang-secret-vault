# 보너스 XDR-04 진행 — 몰래 심어진 프로그램 탐지 (`persistence`)

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
| ✅ | 제출 전 확인 · 「보너스 xdr-04 저장점」 커밋(`0fdead3`), push |
| ✅ | 제출 완료 |

## 완료한 일

- 경보 원본 `xdr/fixtures/persistence.json` 24건, 원본 수정 없음. 모두 같은 PC(`choi-bujang-pc`) 경보라 PC 전체가 아니라 출발 주소 단위로 격리.
- 만들기 1: 시각·주소·계정·수준·설명만 출력(실행 파일 경로는 출력하지 않음), 비밀값 모양 가림. 24건 / 24줄.
- 만들기 2: 패턴 3개 — `T1543.unsigned_service`(서명 없음·평소 목록에 없는 서비스, 임시 폴더 실행 파일), `T1053.unfamiliar_task`(처음 보는·임의 이름 예약 작업, 임시 폴더), `T1547.001.startup_folder`(시작 폴더 경로·평소 목록에 없는 시작 항목). 근거 각 한 줄, 막지 않을 사례 3종.
- 만들기 3: `decide.mjs` — 확신도: 수준 10↑ + 신호 0.9(신호 2개↑ 0.95) → block, 신호만·수준 미달 0.7 → alert, 지속 장치 태그 + 수준 5↑ 신호 없음 0.55 → alert, 그 외 0.2/0.1 → record. `test/xdr-persistence.test.mjs` 3개 통과(단독 실행·패턴 일치·변형 입력 8개).
- 만들기 4: `respond.mjs` — block 주소만 만료·근거 경보 번호 붙은 거부 규칙, 같은 주소에 정상 이벤트가 있으면 알림으로 낮춤. 다시 흘려도 알림 중복 없음(두 번째 실행 68줄 그대로). XDR-01·02·03 replay도 통과. 판정기 운영 경로와는 연결하지 않음(요청 계약에 출발 주소 없음, 모의 시험).
- 만들기 5: `npm run xdr:run -- persistence` → block 8 · alert 8 · record 8(24건), 정상 이벤트 block 0. XDR 시험 14개 통과. 로컬 결과이며 심판 판정 아님.
- 저장점 `0fdead3`: `xdr:run` 재실행(block 8 · alert 8 · record 8), README xdr 표에 persistence 한 줄, 비밀값 검출 없음, push.
- ALEPH 보너스 작전에 제출 완료.
