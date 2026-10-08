// 무차별 로그인 경보 판단: 패턴에 맞으면 block, T1110인데 기준 미달이면 Jev에게 확신도를 묻고, 그 외는 record.
// 심판은 이 파일 하나만 격리 실행할 수 있어서 import 없이 씁니다. 패턴 값은 patterns.json과 같아야 합니다(test/xdr-brute-force.test.mjs가 확인).
export const PATTERNS = [
  { id: 'T1110.001', name: '같은 주소 로그인 실패 연속', condition: { mitre: 'T1110', textRegex: '실패', minCount: 30 } },
  {
    id: 'T1110.003',
    name: '여러 계정에 같은 비밀번호 대입',
    condition: { mitre: 'T1110', textRegex: '여러 계정|계정 \\d+개|같은 비밀번호|계정 이름을 바꿔', minCount: 15, minAccounts: 5 },
  },
];

function matches(p, alert) {
  const c = p.condition;
  const text = String(alert.rule?.description ?? '');
  if (!(alert.rule?.mitre ?? []).includes(c.mitre) || !new RegExp(c.textRegex).test(text)) return false;
  const count = Number(alert.data?.count) || 0;
  const accounts = Math.max(
    String(alert.data?.accounts ?? '').split(',').filter(Boolean).length,
    Number(text.match(/계정 (\d+)개/)?.[1]) || 0,
  );
  return count >= c.minCount || (c.minAccounts != null && accounts >= c.minAccounts);
}

// Jev 주소는 JEV_URL 환경변수로만 받습니다. 없거나 3초 안에 확신도가 안 오면 null.
// 계정·주소·설명 원문은 보내지 않고 수준과 건수만 보냅니다.
async function askJev(alert) {
  const url = globalThis.process?.env?.JEV_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ moduleKey: 'brute-force', level: Number(alert.rule?.level) || 0, count: Number(alert.data?.count) || 0 }),
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
  if (!(alert.rule?.mitre ?? []).includes('T1110')) {
    return { action: 'record', confidence: 0.1, reason: '패턴 없음: 무차별 대입 신호가 없는 정상 이벤트' };
  }
  const jev = await askJev(alert);
  if (jev == null) {
    return { action: 'alert', confidence: 0.5, reason: '애매: T1110 경보지만 패턴 기준 미달, Jev 응답 없음' };
  }
  return { action: actionFor(jev), confidence: jev, reason: `애매: T1110 경보지만 패턴 기준 미달, Jev 확신도 ${jev}` };
}
