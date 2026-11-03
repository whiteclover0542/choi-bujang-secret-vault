# 20단계 — 사용 라이브러리와 취약점 정보 대조

## 공식 통과 기록

- 사용자가 20단계 공식 통과를 전달했습니다. 포털을 직접 조회한 결과는 아닙니다.
- 커밋·푸시한 구현은 `9d24aefd4525dfca485b6acad6e332d5b1f94bb4`입니다. 공식 판정 대상 커밋은 포털과 직접 대조하지 않았습니다.
- 실제 설치 패키지·OSV 응답 대조는 여전히 미확인입니다. not_configured 화면 확인과 모의 검사를 실제 OSV 조회 성공으로 확대하지 않습니다. 아래 미실행·미확인 기록은 각 작업 시점의 이력입니다.

## 목표와 현재 상태

- 19단계 공식 통과를 사용자 전달로 확인했습니다. 이 문서는 첨부한 20단계 안내를 다음 작업용으로 정리한 것이며 구현 완료나 공식 통과 기록이 아닙니다.
- 목표: 실제 설치된 정확한 패키지 버전의 OSV 조회 결과를 미조회·실패·일부 실패와 구분합니다.
- 수정 대상은 `on-client/student/extension.mjs`의 `renderVulnerabilities`입니다. 구현 전에는 대기 문자열을 반환했으며, 아래 구현·모의 검사까지 진행했습니다.
- 앞 단계 기능·학생 코드·Git 기록·기존 문서 변경을 보존합니다. 제공 서버·public/app.js·판정·인증·대상 프로젝트·허용 패키지 설정은 변경하지 않습니다.

## 공식 입력 계약

`renderVulnerabilities({ status, mode, data?, error? })`

- status: idle / loading / error / ok.
- data.status: complete(모두 조회), partial(일부 조회 실패), not_checked(아직 조회 안 함), not_configured(조회 대상 프로젝트 설정 필요), unverifiable(lock 파일 확인 불가).
- data: lockfileVersion, lockfileHash, checkedAt, packages. 설정·확인 불가 때 packages는 빈 배열입니다. 메타데이터는 전달된 경우에만 표시합니다.
- packages: `{ name, version, status, vulnerabilities, source, checkedAt }` 배열.
- 패키지 status: known_vulnerabilities(알려진 항목 있음), none_found(조회 범위에서 알려진 항목 없음), unverifiable(조회 확인 불가).
- 취약점 항목은 id와 modified를 표시합니다. 각 패키지 행에 data-student-package-name, data-student-package-version 속성을 붙입니다.

## 구현 순서

1. idle·loading·error·ok를 구분하고 새 입력마다 새 DOM을 반환해 이전 표를 남기지 않습니다. 오류는 실패 메시지를 표시합니다.
2. 전체 조회 상태의 원래 값과 한국어 의미, 전달된 lockfileVersion·lockfileHash·checkedAt을 표시합니다.
3. 패키지 이름·정확한 설치 버전·상태·출처·조회 시각, 취약점 ID·수정 시각을 표시합니다. 버전 범위를 설치 버전으로 바꾸거나 추정하지 않습니다.
4. unverifiable 패키지에 받은 취약점이 있으면 「일부 확인·전체 조회 확인 불가」와 받은 ID를 모두 보존합니다.
5. none_found는 안전 보장이 아님을 안내하고 미조회·조회 실패를 취약점 없음으로 표시하지 않습니다. DOM은 createElement·textContent로 작성합니다.

## 검증 계획

- 문법 확인: 저장소 루트에서 `npm --prefix on-client run check`.
- 모의 입력: 네 요청 상태, 다섯 전체 상태, 세 패키지 상태, 정확한 버전과 행 속성, 일부 취약점 보존, 새 hash 반영, 오류·loading의 이전 표 제거, 앞 단계 보존.
- 실제 화면 첫 확인: 앱에서 Ctrl+F5 → 보호 현황 → 설치 패키지 영역의 조회 전 상태를 확인합니다. 실제 조회는 별도 진행합니다.
- 이후 전달된 값과 package-lock.json의 버전을 대조하고 취소·늦은 응답·오류 후 수동 복구를 확인합니다. 실제로 하지 않은 검사는 미확인으로 남깁니다.
- 정상: 전달된 상태와 정확한 버전·출처·시각 표시. 거절되어야 할 결과: 실패를 취약점 없음으로 표시, 이전 결과 재사용, 범위를 설치 버전으로 표시, 조회 결과만으로 앱 전체 안전 보장.

## 경계와 필수 확인 항목

- OSV는 알려진 취약점 데이터베이스입니다. 결과가 없다고 패키지나 앱 전체의 안전을 보장할 수 없습니다.
- 서버는 package-lock.json·설치 메타데이터와 운영자가 허용한 공개 패키지를 기준으로 조회합니다. 비공개 이름을 외부 조회하지 않습니다.
- 허용 대상이 없어 not_configured·not_checked가 나오는 것은 정상일 수 있습니다. 학생이 설정을 바꾸거나 취약점을 만들려고 의존성을 낮추지 않습니다. 패키지를 바꾸기 전에는 커밋합니다.
- 필수 항목: student-source-changed, exact_lock_version, osv_match, lookup_unavailable, no_results_distinction, partial_preservation, refresh_replaces, request_recovery, stale_response_blocked.
- 이번 작업은 문서 정리만 수행했습니다. 20단계 코드 구현·모의 검사·실제 조회·패키지 변경·커밋·푸시·제출·공식 판정은 미실행/미확인입니다.

## 구현 및 실행 결과

- 이후 `renderVulnerabilities`만 구현했습니다. 네 요청 상태·다섯 전체 상태·세 패키지 상태를 원래 값과 한국어로 표시합니다. 설정 없음과 승인 대상 없음은 미조회로 설명합니다.
- 전달된 메타데이터만 표시하고 각 패키지 행에 이름·버전 속성을 붙였습니다. 제공 UI가 normalizeScan으로 검증한 정확한 버전을 그대로 표시하며 버전 범위를 추정·변환하지 않습니다.
- 일부 실패한 패키지도 받은 취약점 ID·수정 시각을 모두 보존합니다. none_found는 조회 범위 기준이며 앱 안전 보장이 아닙니다. loading·error·idle에서 받은 옛 data는 표시하지 않습니다.
- 저장소 밖 임시 모의 DOM 10건을 실행했습니다. 구현 전 10건 실패, 구현 후 10건 모두 통과했습니다. 상태·메타데이터·행 속성·부분 결과·새 해시·옛 표 제거·오류 메시지 표시를 확인했습니다.
- `npm --prefix on-client run check` 통과. 앞 단계 전체 코드가 변경되지 않았음을 HEAD와 비교했습니다. 18·19단계 모의 회귀 23건도 통과했습니다. 실제 브라우저·네트워크 결과나 공식 통과를 뜻하지 않습니다.
- 요청 취소·세대 검사는 제공 UI에서 담당함을 코드로 확인했습니다. 실제 취소 뒤 늦은 응답, 오류 후 재조회 요청, 실제 lock 버전 대조·OSV 조회·공식 판정은 미확인입니다.
- 패키지·잠금 파일·운영 설정·제공 코드는 변경하지 않았습니다. 커밋·푸시·제출은 실행하지 않았습니다.

## 사용자 화면 확인

- 사용자가 전달한 초기 화면에서 「패키지 조회 전(idle)」과 이전 결과 없는 상태를 확인했습니다.
- 사용자가 「설치 패키지 조회」를 누른 뒤 제공 영역은 PROJECT_NOT_CONFIGURED, 학생 영역은 「조회 준비 미완료(not_configured)」와 같은 조회 시각을 표시했습니다.
- 학생 영역은 조회 대상 프로젝트 설정 필요와 패키지 결과 없음, OSV 결과만으로 안전을 보장하지 않는다는 안내를 표시했습니다. 실제 패키지 취약점 조회 성공으로 처리하지 않습니다.
- 실제 패키지·lock 버전 대조, OSV 응답, 실제 취소·늦은 응답·오류 후 복구는 미확인입니다. 이 기록은 사용자 화면 확인이며 공식 판정은 아닙니다.
