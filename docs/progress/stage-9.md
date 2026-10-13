# 9단계 진행 — 도플갱어를 찾고 권한을 거둡니다

## 해야 할 일

- 9단계 카드 제출

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README 마지막 절 8단계 ↔ 마지막 커밋 `c05eb7a 8단계: 판정기에서 메모 전체 목록 경로 거부` 일치) |
| ✅ | 정할 것 결정 — 계약대로 구현(네트워크·기기 값은 계약에 없어 쓰지 않음) |
| ✅ | 만들기 1 · 탐지 입력 정리 |
| ✅ | 만들기 2 · 다량 조회 탐지 규칙 |
| ✅ | 만들기 3 · 회수 제안 결과 |
| ✅ | 저장점 준비 · README 9단계 절, `step` 9, 자기 점검에 탐지 연습 6건 추가 |
| 🔄 | 제출 전 확인 · 9단계 저장점 커밋, push, `npm run bundle` |
| ⬜ | 9단계 제출 |

## 완료한 일

- 계약 확인(`docs/DETECT_EVENTS.md`): `detect(events)`는 `{at, method, identity: {sub}}` 사건 배열을 받음. 같은 `sub`의 `GET`이 어느 10분 구간이든 120건 초과일 때만 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject: sub }`, 그 밖은 `{ action: 'observe' }`. 로컬 연습용이며 운영 반 엔진의 사건 전달·회수 집행은 별도.
- 시험 확인(`scripts/detect-test.mjs`): 결과를 `isDeepStrictEqual`로 비교 → 계약에 없는 필드(기기·네트워크 등)를 결과에 더하면 실패.
- 현재 `src/detect.mjs`는 항상 `observe`(구현 전), 판정기 `src/decider.mjs`와는 별개 파일.
- 안내 문구와 다른 점: 문구는 "평소와 다른 네트워크 + 다량 조회", "대상은 가상 기기 한 개"를 말하지만 계약 사건에는 네트워크·기기 값이 없음.
- 결정: 계약대로 구현. 회수 대상은 가명 사용자(`subject`) 하나, 네트워크·기기 조건은 계약 사건에 값이 없어 만들어 쓰지 않음.
- 만들기 1: `readEvent()`가 사건에서 `at`(유효한 시각)·`method`·`identity.sub`(빈 문자열 아님)만 읽고, 형식이 틀린 사건은 건너뜀. 메모 본문·토큰 등 다른 값은 읽지 않음.
- 만들기 2: 사용자별 GET 시각을 정렬해 두 포인터로 어느 10분 구간 `[t, t+10분)`이든 120건 초과인지 확인. 다른 사용자 합산 없음, GET 외 메서드 제외.
- 만들기 3: 초과 시 `{ action: 'propose_revocation', reasonCode: 'burst_read', subject }`, 그 밖은 `{ action: 'observe' }`. 판정기 응답 형식·회수 API·기기 권한은 그대로.
- 시험(가상 사건 연습, 실제 회수·심판 판정 아님): `npm run detect:test` 6항목 통과, `node --test test/detect.test.mjs` 2개 통과(계약 밖 값 무시, 형식 틀린 사건 제외, POST 제외, 순서 무관, 10분 경계).
