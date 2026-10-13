// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계부터 규칙을 하나씩 추가합니다. 규칙에 맞지 않는 요청은 거부합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
export const RULE_IDS = Object.freeze(['device_registered', 'step_up_required']);

// 7단계 학습 기준입니다. 계약에 사용자별 평소 기준이 없어 고정값을 씁니다.
// ponytail: 고정 새벽 시간대·건수, 엔진이 사용자별 평소 시각·네트워크를 주면 그 값과 비교로 바꿉니다.
const OFF_HOURS = (hour) => hour < 6; // 0~5시
const BURST_WINDOW_SECONDS = 900;
const BURST_COUNT = 10;
const STEP_UP_MAX_AGE_SECONDS = 300;

const respond = (request, decision, reasonCode, ruleIds) => ({
  schema: 'aleph.decision.v1',
  requestId: request?.requestId,
  decision,
  reasonCode,
  ruleIds,
});

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// 만들기 1: 엔진이 넘긴 가상 접속 정보만 근거로 씁니다.
// source가 judge_fixture이고 형식이 맞을 때만 돌려주고, 그 밖(none·값 없음·다른 출처·틀린 형식)은 null입니다.
// 빠진 값을 정상값으로 채우지 않습니다. 브라우저 헤더·본문의 위치는 이 함수에 들어오지 않습니다.
export function trustedSignals(request) {
  const s = request?.signals;
  if (!isPlainObject(s) || s.source !== 'judge_fixture') return null;
  if (typeof s.region !== 'string' || typeof s.network !== 'string') return null;
  if (!Number.isInteger(s.hour) || s.hour < 0 || s.hour > 23) return null;
  return { region: s.region, network: s.network, hour: s.hour };
}

// 최근 사건은 계약 모양({kind, ageSeconds, count}, 최대 12건)인 항목만 셉니다.
export function recentEventCount(request, windowSeconds = BURST_WINDOW_SECONDS) {
  const events = request?.recentEvents;
  if (!Array.isArray(events) || events.length > 12) return 0;
  return events
    .filter((e) => isPlainObject(e) && typeof e.kind === 'string'
      && Number.isFinite(e.ageSeconds) && e.ageSeconds >= 0 && e.ageSeconds <= windowSeconds
      && Number.isInteger(e.count) && e.count >= 0)
    .reduce((sum, e) => sum + e.count, 0);
}

// 엔진이 검증한 재로그인: verified가 true이고 로그인한 지 5분 이내일 때만 인정합니다.
const freshStepUp = (request) => {
  const s = request?.stepUp;
  return isPlainObject(s) && s.verified === true && Number.isInteger(s.authAgeSeconds)
    && s.authAgeSeconds >= 0 && s.authAgeSeconds <= STEP_UP_MAX_AGE_SECONDS;
};

export async function decide(request) {
  // 6단계: 엔진이 확인한 기기 등록 여부(request.deviceRegistered)가 정확히 true일 때만 다음 규칙으로 갑니다.
  // false·값 없음·다른 값은 모두 미등록으로 보고 거부합니다.
  if (request?.deviceRegistered !== true) {
    return respond(request, 'deny', 'device_not_registered', ['device_registered']);
  }

  // 7단계: 평소와 다른 시각 + 처음 보는 네트워크 + 갑작스러운 대량 요청이 함께일 때만 추가 확인을 요구합니다.
  // 지역(region)은 단독 근거로 쓰지 않으며, 영구 차단(deny)이 아니라 재로그인(step_up)으로 보냅니다.
  const signals = trustedSignals(request);
  const unusual = signals !== null
    && OFF_HOURS(signals.hour)
    && signals.network === 'unusual'
    && recentEventCount(request) >= BURST_COUNT;
  if (unusual) {
    if (freshStepUp(request)) return respond(request, 'allow', 'approved', ['device_registered', 'step_up_required']);
    return respond(request, 'step_up', 'step_up_required', ['step_up_required']);
  }

  return respond(request, 'allow', 'approved', ['device_registered']);
}
