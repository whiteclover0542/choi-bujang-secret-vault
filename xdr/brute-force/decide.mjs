// 무차별 로그인 경보 판단: 패턴에 맞으면 block, T1110인데 기준 미달이면 Jev에게 확신도를 묻고, 그 외는 record.
import { readFileSync } from 'node:fs';
import { pick } from './read-alerts.mjs';

const { patterns } = JSON.parse(readFileSync(new URL('./patterns.json', import.meta.url), 'utf8'));

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
async function askJev(alert) {
  if (!process.env.JEV_URL) return null;
  try {
    const res = await fetch(process.env.JEV_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pick(alert)),
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
  const hit = patterns.filter((p) => matches(p, alert));
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
