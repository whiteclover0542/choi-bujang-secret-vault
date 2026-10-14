// 몰래 심어진 프로그램(서비스·예약 작업·시작 폴더) 경보 판단.
// 심판은 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기·쓰기·바깥 요청 없이 혼자 계산합니다.
// 패턴 값은 patterns.json과 같아야 합니다(test/xdr-persistence.test.mjs가 확인).
export const PATTERNS = [
  {
    id: 'T1543.unsigned_service',
    name: '서명 없는 새 서비스·평소 목록에 없는 서비스',
    condition: { mitre: ['T1543'], textRegex: '서명 없|서명이 없|평소 목록에 없', pathRegex: '\\\\AppData\\\\Local\\\\Temp\\\\', minLevel: 10 },
  },
  {
    id: 'T1053.unfamiliar_task',
    name: '처음 보는 예약 작업',
    condition: { mitre: ['T1053'], textRegex: '처음 보는|임의 문자열|평소 목록에 없', pathRegex: '\\\\AppData\\\\Local\\\\Temp\\\\', minLevel: 10 },
  },
  {
    id: 'T1547.001.startup_folder',
    name: '시작 폴더 변경',
    condition: { mitre: ['T1543', 'T1053'], textRegex: '시작 폴더에 평소 목록에 없|시작 프로그램과 예약 작업이 같은', pathRegex: '\\\\Start Menu\\\\Programs\\\\Startup\\\\', minLevel: 10 },
  },
];
const TAGS = ['T1543', 'T1053'];
// 지속 장치 태그가 있어도 이 수준 아래면서 신호가 없으면 평소 이벤트로 봅니다.
const ALERT_LEVEL = 5;

const level = (alert) => Number(alert.rule?.level) || 0;
const tags = (alert) => (Array.isArray(alert.rule?.mitre) ? alert.rule.mitre : []);

// 패턴마다 설명·경로 신호가 몇 개 맞는지 봅니다(태그가 맞는 패턴만).
function matches(alert) {
  const text = String(alert.rule?.description ?? '');
  const path = String(alert.data?.path ?? '');
  const t = tags(alert);
  return PATTERNS.map((p) => {
    if (!p.condition.mitre.some((m) => t.includes(m))) return { p, hits: 0 };
    const hits = Number(new RegExp(p.condition.textRegex).test(text)) + Number(new RegExp(p.condition.pathRegex, 'i').test(path));
    return { p, hits };
  }).filter((m) => m.hits > 0);
}

const actionFor = (confidence) => (confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record');
const answer = (confidence, reason) => ({ action: actionFor(confidence), confidence, reason });
const names = (ms) => ms.map(({ p }) => `${p.id} ${p.name}`).join(', ');

// 확신도는 경보가 패턴과 얼마나 뚜렷하게 맞는지입니다.
//   수준 10↑ + 패턴 신호 → 0.9(신호 2개 이상이면 0.95) → block
//   신호는 있으나 수준 미달 → 0.7 → alert
//   지속 장치 태그 + 수준 5↑, 신호 없음(서명 미확인·설명만 바뀜 등) → 0.55 → alert
//   지속 장치 태그지만 수준 5 미만·신호 없음 → 0.2 → record, 태그 없음 → 0.1 → record
export function decide(alert) {
  const ms = matches(alert);
  const hits = ms.reduce((n, m) => n + m.hits, 0);
  const enough = level(alert) >= PATTERNS[0].condition.minLevel;
  if (ms.length && enough) return answer(hits >= 2 ? 0.95 : 0.9, `패턴: ${names(ms)}`);
  if (ms.length) return answer(0.7, `애매: ${names(ms)} 신호는 있으나 경보 수준 미달`);
  const tagged = TAGS.some((m) => tags(alert).includes(m));
  if (tagged && level(alert) >= ALERT_LEVEL) return answer(0.55, '애매: 서비스·예약 작업 변경이지만 서명 없음·낯선 위치 신호 없음');
  if (tagged) return answer(0.2, '패턴 없음: 평소 목록의 서비스·예약 작업 이벤트');
  return answer(0.1, '패턴 없음: 지속 장치 신호가 없는 정상 이벤트');
}
