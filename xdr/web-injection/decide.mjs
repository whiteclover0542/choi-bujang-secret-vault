// 웹 주입 경보 판단: 주입 구조 + 반복 + 수준이 모두 맞으면 block, T1190인데 기준 미달이면 Jev에게 확신도를 묻고, 그 외는 record.
// 심판은 이 파일 하나만 격리 실행할 수 있어서 import 없이 씁니다. 패턴 값은 patterns.json과 같아야 합니다(test/xdr-web-injection.test.mjs가 확인).
export const PATTERNS = [
  {
    id: 'T1190.sql',
    name: 'SQL 구문 주입 반복',
    condition: {
      mitre: 'T1190',
      textRegex: 'SQL 구문|SQL 표식|데이터베이스 조회를 이어',
      urlRegex: "union\\s+(all\\s+)?select|'\\s*(or|and)\\s+['\\d]|;\\s*(drop|delete|insert|update)\\b",
      minCount: 5,
      minLevel: 10,
    },
  },
  {
    id: 'T1190.script',
    name: '스크립트 태그 주입 반복',
    condition: {
      mitre: 'T1190',
      textRegex: '스크립트 삽입|스크립트 표식',
      urlRegex: '<\\s*script\\b|javascript:|\\bon(error|load|mouseover)\\s*=',
      minCount: 5,
      minLevel: 10,
    },
  },
  {
    id: 'T1190.path',
    name: '경로 거슬러 올라가기 반복',
    condition: { mitre: 'T1190', textRegex: '거슬러 올라가|경로 이탈', urlRegex: '(\\.\\.[\\/\\\\]){2,}', minCount: 5, minLevel: 10 },
  },
  {
    id: 'T1190.cmd',
    name: '명령 구분자 주입 반복',
    condition: {
      mitre: 'T1190',
      textRegex: '명령 구분자',
      urlRegex: '[;|&`]\\s*(cat|ls|id|whoami|wget|curl|nc|sh|bash)\\b|\\$\\(',
      minCount: 5,
      minLevel: 10,
    },
  },
];

// 요청 주소는 2000자까지만, 최대 두 번 디코딩해 문자열로만 검사합니다. 실행하지 않습니다.
function decodeUrl(raw) {
  let s = String(raw ?? '').slice(0, 2000);
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(s.replace(/\+/g, ' '));
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  return s;
}

function matches(p, alert) {
  const c = p.condition;
  if (!(alert.rule?.mitre ?? []).includes(c.mitre)) return false;
  const structure =
    new RegExp(c.textRegex).test(String(alert.rule?.description ?? '')) || new RegExp(c.urlRegex, 'i').test(decodeUrl(alert.data?.url));
  return structure && (Number(alert.data?.count) || 0) >= c.minCount && (Number(alert.rule?.level) || 0) >= c.minLevel;
}

// Jev 주소는 JEV_URL 환경변수로만 받습니다. 없거나 3초 안에 확신도가 안 오면 null.
// 계정·주소·요청 주소 원문은 보내지 않고 수준과 건수만 보냅니다.
async function askJev(alert) {
  const url = globalThis.process?.env?.JEV_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleKey: 'web-injection', level: Number(alert.rule?.level) || 0, count: Number(alert.data?.count) || 0 }),
      signal: AbortSignal.timeout(3000),
    });
    const { confidence } = await res.json();
    return typeof confidence === 'number' && confidence >= 0 && confidence <= 1 ? confidence : null;
  } catch {
    return null;
  }
}

const actionFor = (c) => (c >= 0.85 ? 'block' : c >= 0.5 ? 'alert' : 'record');

export async function decide(alert) {
  const hit = PATTERNS.filter((p) => matches(p, alert));
  if (hit.length) {
    return { action: 'block', confidence: 0.95, reason: `패턴: ${hit.map((p) => `${p.id} ${p.name}`).join(', ')}` };
  }
  if (!(alert.rule?.mitre ?? []).includes('T1190')) {
    return { action: 'record', confidence: 0.1, reason: '패턴 없음: 웹 주입 신호가 없는 정상 이벤트' };
  }
  const jev = await askJev(alert);
  if (jev == null) {
    return { action: 'alert', confidence: 0.5, reason: '애매: T1190 경보지만 패턴 기준 미달, Jev 응답 없음' };
  }
  return { action: actionFor(jev), confidence: jev, reason: `애매: T1190 경보지만 패턴 기준 미달, Jev 확신도 ${jev}` };
}
