# 6단계 진행 — 등록한 기기만 자료실에

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README·마지막 커밋 대조, 어긋남 없음) |
| ✅ | 6단계 계획 정리 (계약·시험 스크립트·bundle 확인) |
| ✅ | 만들기 1 · 판정 요청 계약 설명 (코드 변경 없음) |
| ✅ | 만들기 2 · `device_registered` 규칙 추가 |
| ✅ | 만들기 3 · `npm run decider:test` 실행과 README 기록 |
| ✅ | 저장점 준비 · `starter.deny` 정리, `step` 6, 자기 점검 6단계 확장 |
| ✅ | 제출 전 확인 · 6단계 저장점 커밋(`401d269`), `npm run bundle` |
| ✅ | push·배포 확인 (`/aleph.json` 커밋 `401d269`, step 6, 메인 화면 200) |
| ✅ | 6단계 카드에 제출, 결과 확인 (학생이 포털에서 확인) |

## 완료한 일

- 계약 확인: 사용자는 `subjectId`(가명), 기기는 `deviceId`(16자리 16진수, 개인키 아님), 등록 여부는 최상위 `deviceRegistered`, 동작·경로는 `method`·`path`·`route`. `request.device`·`identity` 등은 계약에 없음.
- 결정: "읽기 허용"은 GET 제한 없이 등록 여부 하나로 판단 (허용 경로 검사는 엔진이 먼저 함).
- `src/decider.mjs`: `deviceRegistered === true`만 allow(`approved`), false·값 없음·다른 값은 deny(`device_not_registered`), 두 경우 모두 `ruleIds: ['device_registered']`. `RULE_IDS`에 `device_registered` 추가.
- `npm run decider:test`: `통과 · 등록 기기의 정상 요청`, `통과 · 미등록 기기의 가상 요청` (가상 요청 연습, 심판 판정 아님).
- 추가 확인: 값 없음·`"true"` 문자열·`null`·`1` 모두 deny.
- README에 6단계 절과 확인 순서 기록. 설치할 프로그램·키·인증서 없음.
- 저장점 준비: `RULE_IDS`를 실제 구현한 `device_registered` 하나로 정리, `aleph.config.json` `step` 6, `src/attack-check.mjs`가 6단계에서 기존 비로그인 점검 + 로컬 판정기 가상 요청 2건(등록 allow·미등록 deny)을 기록.
- 저장점 커밋 `401d269`. `npm run bundle`: 단계 6 · 바뀐 파일 13개 · 규칙 1개(`device_registered`) · 직접 점검 7개(비로그인 401 ×4, 로컬 판정기 가상 요청 2건 기대와 같음, anon 직접 조회는 키 환경변수 없어 미실행).
