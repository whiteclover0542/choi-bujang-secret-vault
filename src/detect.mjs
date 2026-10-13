// 9단계 탐지 함수입니다. 계약은 docs/DETECT_EVENTS.md를 따릅니다.
// 반 엔진이 검증한 사건만 전달해야 하며, 브라우저가 보낸 사용자 번호는 받지 않습니다.
// 회수를 직접 집행하지 않고 제안만 돌려줍니다. 판정기(decider.mjs)의 응답 형식과는 별개입니다.
const WINDOW_MS = 10 * 60 * 1000;
const BURST_LIMIT = 120; // 120건을 "넘을 때만" 회수 제안

// 만들기 1: 사건에서 시각·요청 종류·가명 사용자만 읽습니다. 형식이 틀린 사건은 건너뜁니다.
// 메모 내용·토큰·실명 같은 다른 값은 읽지도 저장하지도 출력하지도 않습니다.
export function readEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  const at = typeof event.at === 'string' ? Date.parse(event.at) : NaN;
  const sub = event.identity?.sub;
  if (!Number.isFinite(at) || typeof event.method !== 'string' || typeof sub !== 'string' || !sub) return null;
  return { at, method: event.method, sub };
}

export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');

  // 만들기 2: 사용자별로 GET 시각만 모읍니다. 다른 사용자의 사건은 합산하지 않습니다.
  const readsBySub = new Map();
  for (const event of events) {
    const e = readEvent(event);
    if (!e || e.method !== 'GET') continue;
    if (!readsBySub.has(e.sub)) readsBySub.set(e.sub, []);
    readsBySub.get(e.sub).push(e.at);
  }

  // 어느 10분 구간 [t, t+10분)에서든 120건을 넘는지 두 포인터로 찾습니다.
  for (const [sub, times] of readsBySub) {
    times.sort((a, b) => a - b);
    for (let start = 0, end = 0; end < times.length; end += 1) {
      while (times[end] - times[start] >= WINDOW_MS) start += 1;
      // 만들기 3: 대상은 확인된 가명 사용자 하나, 이유 코드와 함께 제안만 돌려줍니다.
      if (end - start + 1 > BURST_LIMIT) return { action: 'propose_revocation', reasonCode: 'burst_read', subject: sub };
    }
  }
  return { action: 'observe' };
}
