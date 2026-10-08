// decide 결과를 차단 목록(xdr/blocklist.json)과 알림 기록(xdr/alerts.log)으로 잇습니다.
// 판정기 계약에 출발 주소가 없어서 src/decider.mjs는 고치지 않습니다. 주소가 계약에 들어오면 isBlocked를 판정기 앞단에서 부르면 됩니다.
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { decide } from './decide.mjs';

const BLOCKLIST = new URL('../blocklist.json', import.meta.url);
const ALERTS_LOG = new URL('../alerts.log', import.meta.url);
// ponytail: 고정 1시간 만료, 반복 공격에 늘려 가는 만료가 필요하면 그때 바꿉니다.
const TTL_MS = 60 * 60 * 1000;

const readJson = (url, fallback) => readFile(url, 'utf8').then(JSON.parse, () => fallback);

export async function isBlocked(ip, now = Date.now()) {
  const { rules = [] } = await readJson(BLOCKLIST, {});
  return rules.find((r) => r.srcip === ip && Date.parse(r.expiresAt) > now) ?? null;
}

export async function respond(alerts, now = Date.now(), decideFn = decide) {
  const decided = [];
  for (const a of alerts) decided.push({ a, d: await decideFn(a) });

  // 같은 주소에서 정상(record) 이벤트가 나온 적 있으면 정상 사용자일 수 있어 막지 않고 알림으로 낮춥니다.
  const normalIps = new Set(decided.filter(({ d }) => d.action === 'record').map(({ a }) => a.data?.srcip));
  const { rules: old = [] } = await readJson(BLOCKLIST, {});
  const rules = new Map(old.filter((r) => Date.parse(r.expiresAt) > now).map((r) => [r.srcip, r]));
  const logged = new Set((await readFile(ALERTS_LOG, 'utf8').catch(() => '')).split('\n').map((l) => l.split('\t')[1]));
  const lines = [];

  for (const { a, d } of decided) {
    const ip = a.data?.srcip;
    let action = d.action;
    if (action === 'block' && (!ip || normalIps.has(ip) || d.confidence < 0.85)) action = 'alert';
    if (action === 'block') {
      const r = rules.get(ip) ?? { srcip: ip, action: 'deny', alertIds: [] };
      if (!r.alertIds.includes(a.id)) r.alertIds.push(a.id);
      r.expiresAt = new Date(now + TTL_MS).toISOString();
      r.reason = d.reason;
      rules.set(ip, r);
    }
    if (action !== 'record' && !logged.has(a.id)) {
      lines.push([new Date(now).toISOString(), a.id, action, ip, a.data?.srcuser ?? '', d.confidence, d.reason].join('\t'));
    }
  }

  await writeFile(BLOCKLIST, `${JSON.stringify({ schema: 'aleph.xdr.blocklist.v1', rules: [...rules.values()] }, null, 2)}\n`);
  if (lines.length) await appendFile(ALERTS_LOG, `${lines.join('\n')}\n`);
  return decided;
}

// 시험 경보를 다시 흘려 봅니다: block 주소만 막히고 나머지 주소는 통과해야 합니다.
export async function replay(fixture, decideFn = decide) {
  const { alerts } = JSON.parse(await readFile(fixture, 'utf8'));
  const decided = await respond(alerts, Date.now(), decideFn);
  let bad = 0;
  for (const { a, d } of decided) {
    const blocked = Boolean(await isBlocked(a.data?.srcip));
    const ok = blocked === (d.action === 'block');
    if (!ok) bad += 1;
    console.log(`${ok ? '맞음' : '틀림'}\t${a.id}\t${a.data?.srcip}\t${d.action}\t${blocked ? '차단' : '통과'}`);
  }
  console.log(bad ? `틀린 경보 ${bad}건` : '명확한 공격 주소만 막히고 나머지는 통과합니다.');
  if (bad) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await replay(new URL('../fixtures/brute-force.json', import.meta.url));
}
