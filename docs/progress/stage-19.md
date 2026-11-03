# 19단계 — AI 조치 제안과 기존 서버 처리 결과

## 목표와 보존 범위

- 18단계 공식 통과는 사용자 전달로 확인했습니다. 실제 집행이나 운영 연결 성공을 뜻하지 않습니다.
- `on-client/student/extension.mjs`의 `renderAction`만 구현합니다. 앞 단계 함수·제공 서버·public/app.js·판정·인증 설정은 보존합니다.
- 이번 공식 안내는 SDP 연결이 학생의 일이 아니며 설정 파일이 없어도 제출·통과에 영향이 없다고 명시합니다. 학생에게 설정 발급이나 집행 서버 구축을 요구하지 않습니다.
- 현재 supportedActions가 빈 배열인 기록에는 조치 준비 버튼이 없는 것이 정상입니다. 실제 학생 조치 처리와 운영 효과 확인은 기다림(UNV)이며 전체 실제 연동 목표가 완료됐다는 뜻은 아닙니다.

## 입력 계약

`renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error })`

- target: `{ id, generation }` 또는 null.
- receipt: requestId, receiptId, eventId, actionId, status, version, replayed 등 제공 UI가 검증한 값.
- observation: `{ observedAt, effectApplied }` 또는 null.
- 확인 티켓은 제공 화면 메모리에만 존재하며 학생 함수에 전달되지 않습니다.
- 상태: idle, loading, prepared, executing, pending, succeeded, denied, failed, unknown, error, expired.

## 구현 계획

1. 모든 상태를 한국어 문구와 원래 상태값으로 구분합니다. loading은 준비 또는 결과 조회 중입니다.
2. prepared는 준비됨·미실행과 사람 확인·기한을 표시합니다. executing은 전송 중, pending은 접수·처리 중이며 ACK와 효과를 구분합니다.
3. succeeded와 observation.effectApplied===true가 함께일 때만 효과 확인을 표시합니다. 그렇지 않으면 결과 불명으로 표시합니다.
4. 현재 사건·근거·조치·대상·generation·요청·영수증·version을 받은 범위에서 표시합니다. 객체 전체나 확인 티켓을 출력하지 않습니다.
5. 제공 버튼으로 결과만 재조회하도록 안내하고 조치 화면 취소가 이미 전달된 효과를 되돌리지 않는다고 안내합니다. 자동 재요청·집행 버튼을 만들지 않습니다.
6. 새 DOM을 반환해 이전 입력의 대상·요청·결과를 남기지 않습니다. 사건 ID와 요청 ID 속성은 현재 입력에 값이 있을 때만 붙입니다.

## 확인 계획과 범위

- 문법: `npm --prefix on-client run check`.
- 모의 DOM: 전체 상태, ACK와 실제 관측 구분, true의 엄격 비교, 식별자·기한·오류 표시, 새 입력 초기화, 버튼·요청 없음, 앞 단계 보존.
- 필수 항목: student-source-changed, proposal_execution_separation, human_confirmation, current_intent_binding, observed_server_result, duplicate_prevention, unknown_not_success, action_refresh.
- 중복 방지·티켓·인증·비동기 세대 경계는 제공 UI가 담당합니다. 학생 함수는 값을 저장하거나 집행하지 않습니다. 모의 결과를 실제 집행 성공이나 공식 판정으로 기록하지 않습니다.
- 실제 유료 AI 요청·보안 조치·단계 제출·커밋은 이번 구현에서 실행하지 않습니다.

## 직접 확인 첫 단계

- 앱에서 Ctrl+F5 후 학생 조치 영역을 봅니다. 정상 예상: 「아직 미실행(idle)」, 조치 취소의 한계와 제공 버튼 안내.
- 거절되어야 할 표시: pending을 효과 확인으로 표시하거나 unknown을 효과 없음으로 단정하는 표시.
- 실제 처리 시스템이 준비되지 않은 경우 실제 실행·효과 확인은 미확인/UNV로 남깁니다. 확인을 위해 보안 조치를 실행하지 않습니다.

## 구현 및 검증 결과

- `renderAction`에 상태별 문구, 엄격한 효과 확인 조건, 현재 사건·근거·대상·요청·영수증·버전·기한, 안전한 오류 표시를 구현했습니다. 사건·요청 속성은 현재 입력의 해당 값이 있을 때만 붙입니다. 이 속성은 효과 성공 표식이 아닙니다.
- pending은 ACK·처리 중으로 표시하며 succeeded라도 effectApplied가 true가 아니면 unknown으로 표시합니다. true 문자열·숫자 1·false·누락도 효과 확인으로 표시하지 않습니다.
- 사람 확인·미실행, 중복 요청 재집행 금지와 결과만 재조회, 조치 화면 취소의 한계를 안내합니다. 입력은 읽기만 하고 저장·변경하지 않으며 버튼·POST·티켓을 추가하지 않았습니다.
- 저장소 밖 임시 모의 DOM 11건: 구현 전 10건 실패·1건 성공, 구현 후 11건 모두 통과. 18단계 회귀 모의 검사 12건도 통과했습니다. 문법 검사 통과. 이는 실제 집행·원천 효과 관측이나 공식 판정이 아닙니다.
- 실제 초기 화면, 실제 효과·거절·재조회·중복 억제·새로고침 경합은 미확인/UNV입니다. 보안 조치·유료 AI 요청·커밋·푸시·제출은 실행하지 않았습니다.

## 사용자 초기 화면 확인

- 사용자가 전달한 화면에서 「아직 미실행(idle)」, AI 제안과 집행 구분, 화면 취소의 한계 안내를 확인했습니다. 제공 화면의 집행·재조회 버튼은 비활성입니다.
- 초기 표시만 확인한 결과입니다. 실제 조치·재조회·효과 관측과 19단계 공식 판정은 미확인/UNV로 유지합니다.
