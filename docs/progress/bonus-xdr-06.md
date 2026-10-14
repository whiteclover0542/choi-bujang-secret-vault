# 보너스 XDR-06 진행 — 자료 빼돌리기 탐지 (`exfiltration`)

## 해야 할 일

- 제출 전 확인: `xdr:run` 다시 실행 후 「보너스 xdr-06 저장점」 커밋
- ALEPH 보너스 작전에서 제출

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (판정기 규칙 `src/decider.mjs`, XDR 차단 목록·알림은 판정기 밖 별도 파일) |
| ✅ | 만들기 1 · 경보 읽기 (`read-alerts.mjs`, decide.mjs가 불러오지 않는 확인용) |
| ✅ | 만들기 2 · 패턴 목록 (`patterns.json`) |
| ✅ | 만들기 3 · 판단 모듈 (`decide.mjs`, import·파일 접근·바깥 요청 없음) |
| ✅ | 만들기 4 · 알림과 차단 (`respond.mjs`, 목적지 단위 차단) |
| ✅ | 만들기 5 · 시험 경보로 돌려 보기 |
| ⬜ | 제출 전 확인 · 「보너스 xdr-06 저장점」 커밋 |
| ⬜ | 제출 |

## 완료한 일

- 경보 원본 `xdr/fixtures/exfiltration.json` 30건, 원본 수정 없음.
- 만들기 1: 시각·주소·계정·수준·설명만 출력, 비밀값 모양 가림. 30건 / 30줄.
- 만들기 2: 패턴 3개 — `T1048.large_to_new_destination`(50MB↑ 또는 처음 보는·외부 목적지), `T1041.c2_channel_repeat`(반복 5회↑·파일 50개↑·명령 통로), `T1048.off_hours_archive`(시간 밖·압축 파일 반출, 경보 시각 8~20시 밖). 근거 각 한 줄, 막지 않을 사례 3종.
- 만들기 3: `decide.mjs` — 대용량 + 수준 10↑ + 패턴 0.9(패턴 2개↑ 0.95) → block, 패턴만·작은 전송·수준 미달 0.7 → alert, 전송 태그 + 수준 5↑ 0.55 → alert, 그 외 0.2/0.1 → record. `test/xdr-exfiltration.test.mjs` 3개 통과(변형 입력 8개).
- 만들기 4: `respond.mjs` — 목적지(dstip)만 막는 거부 규칙(만료·근거 경보 번호), 같은 목적지에 정상 전송이 있으면 알림으로 낮춤. 공용 respond에 기준 필드 인자 추가. 다시 흘리기에서 목적지 없는 ex-13이 출발 주소 규칙에 걸려 "차단"으로 보이던 문제를 `isBlocked`에서 빈 기준 값은 null로 고침. XDR-01~05 replay도 통과. 판정기 운영 경로와는 연결하지 않음(모의 시험).
- 만들기 5: `npm run xdr:run -- exfiltration` → block 10 · alert 10 · record 10(30건), 정상 이벤트 block 0. XDR 시험 20개 통과. 로컬 결과이며 심판 판정 아님.
