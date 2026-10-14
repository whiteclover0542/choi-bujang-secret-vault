// 자료 빼돌리기(외부 전송) 경보 판단.
// 심판은 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기·쓰기·바깥 요청 없이 혼자 계산합니다.
// 패턴 값은 patterns.json과 같아야 합니다(test/xdr-exfiltration.test.mjs가 확인).
export const PATTERNS = [
  {
    id: 'T1048.large_to_new_destination',
    name: '처음 보는 목적지로 대용량 전송',
    condition: { mitre: ['T1048', 'T1041'], minBytes: 50000000, textRegex: '처음 보는|외부 주소|평소에 쓰지 않던', minLevel: 10 },
  },
  {
    id: 'T1041.c2_channel_repeat',
    name: '명령 통로로 반복·대량 반출',
    condition: { mitre: ['T1041', 'T1048'], minCount: 5, minFiles: 50, textRegex: '명령 통로|반복|연속|전체가', minLevel: 10 },
  },
  {
    id: 'T1048.off_hours_archive',
    name: '업무 시간 밖 압축 파일 반출',
    condition: { mitre: ['T1048', 'T1041'], textRegex: '(수업|업무) 시간 밖|압축 파일[^.]*(나갔|올라갔)', workHours: { start: 8, end: 20 }, minLevel: 10 },
  },
];
const [LARGE] = PATTERNS;
// 전송 태그가 있어도 이 수준 아래면서 신호가 없으면 평소 이벤트로 봅니다.
const ALERT_LEVEL = 5;

const num = (v) => Number(v) || 0;
const level = (alert) => num(alert.rule?.level);
const tags = (alert) => (Array.isArray(alert.rule?.mitre) ? alert.rule.mitre : []);
const bytes = (alert) => num(alert.data?.bytes);
// 경보에 적힌 현지 시각(…T09:15:00+09:00)의 시. 없으면 null.
const hour = (alert) => {
  const m = /T(\d{2}):/.exec(String(alert.timestamp ?? ''));
  return m ? Number(m[1]) : null;
};

function signal(p, alert) {
  const c = p.condition;
  if (new RegExp(c.textRegex).test(String(alert.rule?.description ?? ''))) return true;
  if (c.minBytes && bytes(alert) >= c.minBytes) return true;
  if (c.minCount && num(alert.data?.count) >= c.minCount) return true;
  if (c.minFiles && num(alert.data?.files) >= c.minFiles) return true;
  const h = hour(alert);
  return Boolean(c.workHours) && h !== null && (h < c.workHours.start || h >= c.workHours.end);
}

const matches = (alert) => PATTERNS.filter((p) => p.condition.mitre.some((m) => tags(alert).includes(m)) && signal(p, alert));

const actionFor = (confidence) => (confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record');
const answer = (confidence, reason) => ({ action: actionFor(confidence), confidence, reason });
const names = (ps) => ps.map((p) => `${p.id} ${p.name}`).join(', ');

// 확신도는 경보가 패턴과 얼마나 뚜렷하게 맞는지입니다.
//   대용량(50MB↑) + 수준 10↑ + 패턴 → 0.9(패턴 2개 이상이면 0.95) → block
//   패턴 신호는 있으나 대용량이 아니거나 수준 미달 → 0.7 → alert
//   전송 태그 + 수준 5↑, 신호 없음 → 0.55 → alert
//   전송 태그지만 수준 5 미만·신호 없음 → 0.2 → record, 태그 없음 → 0.1 → record
export function decide(alert) {
  const ps = matches(alert);
  const large = bytes(alert) >= LARGE.condition.minBytes;
  const enough = level(alert) >= LARGE.condition.minLevel;
  if (ps.length && large && enough) return answer(ps.length >= 2 ? 0.95 : 0.9, `패턴: ${names(ps)}`);
  if (ps.length) return answer(0.7, `애매: ${names(ps)} 신호는 있으나 대용량·경보 수준 기준 미달`);
  const tagged = tags(alert).some((m) => m === 'T1041' || m === 'T1048');
  if (tagged && level(alert) >= ALERT_LEVEL) return answer(0.55, '애매: 외부 전송이지만 대용량·처음 보는 목적지·시간 밖 신호 없음');
  if (tagged) return answer(0.2, '패턴 없음: 평소 목적지로 가는 작은 전송');
  return answer(0.1, '패턴 없음: 유출 신호가 없는 정상 이벤트');
}
