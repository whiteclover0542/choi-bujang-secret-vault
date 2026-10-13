# 7단계 진행 — 평소와 다른 접속은 다시 확인합니다

## 해야 할 일

(없음)

## 작업 순서

| 상태 | 작업 |
| :---: | --- |
| ✅ | 이어받기 (README 마지막 절 6단계 ↔ 마지막 커밋 `401d269 6단계 저장점` 일치) |
| ✅ | 만들기 1 · 가상 접속 정보 출처 구분 (입력 검사만) |
| ✅ | 만들기 2 · 복합 이상 사건 → 추가 확인 규칙 |
| ✅ | 만들기 3 · 재로그인 계약 확인과 시험 (실제 자료 차단 실측은 미실행) |
| ✅ | 저장점 준비 · README 7단계 절, `step` 7, 자기 점검 7단계 확장, 제출 설명 갱신 |
| ✅ | 제출 전 확인 · 7단계 저장점 커밋(`d6f54b9`), `npm run bundle` |
| ✅ | push·배포 확인 (`/aleph.json` 커밋 `d6f54b9`, step 7, 메인 화면 200) |
| ✅ | 7단계 카드에 제출, 결과 확인 (학생이 포털에서 확인) |

## 완료한 일

- 계약 확인(`docs/DECIDER_REQUEST.md`): `signals {source, region, network, hour}` — 실제 경로는 `source: "none"`, `region/network: "unknown"`이고 `judge_fixture`는 실제 위치 증거가 아님. `recentEvents`는 최대 12건 `{kind, ageSeconds, count}`. `stepUp {verified, authAgeSeconds}` — false면 나이 `null`, true면 0~900초.
- 시험 조건 확인: `scripts/fixture-7.mjs`의 정상 요청은 `region local · network usual · hour 14 · 사건 없음`, 복합 이상 요청은 `region foreign · network unusual · hour 3 · risk_signal 20건`.
- 만들기 1: `trustedSignals()`가 `source: "judge_fixture"`이고 region·network 문자열, hour 0~23 정수일 때만 신호를 돌려줌. `none`·위조 출처·빠진 값·틀린 형식은 `null`(정상값으로 채우지 않음). `recentEventCount()`는 계약 모양 항목(최대 12건)만 셈. 계약 밖 `geo`·`headers`는 읽지 않음.
- 만들기 2: 규칙 `step_up_required` — 신뢰 신호에서 새벽(0~5시) + `network: "unusual"` + 15분 안 사건 10건 이상이 함께일 때 `step_up`·`step_up_required`. 지역은 단독 근거로 쓰지 않음, deny 아님. 기기 규칙이 먼저 적용. 기준값은 학습용 고정값(코드에 `ponytail:` 표시).
- 만들기 3: 재로그인 시각 계약은 요청의 `stepUp {verified, authAgeSeconds}`. `verified === true`이고 5분 이내일 때만 복합 이상 요청을 다시 allow. 엔진 코드(`sdp-core`)가 저장소에 없고 메모 API는 판정기를 거치지 않아, 실제 재로그인 전 자료 차단·새 요청 허용 실측은 **미실행**. 토큰은 다루지 않음.
- 시험(로컬 가상 요청, 심판 판정 아님): `node --test test/decider.test.mjs` 3개 통과, `npm run decider:test` 4항목 통과(등록 허용·미등록 거부·복합 이상 step_up·재확인 뒤 allow), `npm run fixture:7` 정상 allow·복합 이상 step_up.
- 저장점 준비: 자기 점검이 판정기 시험 4항목을 각각 다른 ID로 기록하고, 실제 재로그인 차단 점검은 `relogin_live_block` 미실행으로 기록. 기존 `test/package-starter.test.mjs`의 API 기준표 시험 1개는 3~5단계에서 `api/`를 바꾼 뒤부터 실패하던 것으로, 이번 변경과 무관(`api/` 변경 없음).
- 저장점 커밋 `d6f54b9`. `npm run bundle`: 단계 7 · 바뀐 파일 8개 · 규칙 2개(`device_registered`, `step_up_required`) · 직접 점검 10개(비로그인 401 ×4, 로컬 판정기 가상 요청 4건 기대와 같음, 실제 재로그인 차단·anon 직접 조회 미실행).
