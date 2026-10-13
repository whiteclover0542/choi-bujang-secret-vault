// 11단계: 점검 스크립트용 시험 기기를 A·B·강사(T) 계정마다 하나씩 승인 요청합니다.
// 실행: node --env-file=.env.local scripts/device-enroll.mjs
// 서버가 발급한 기기 ID는 Git에서 제외되는 .env.devices.local에만 저장하고 화면에는 기기 번호(해시 앞 12자리)만 출력합니다.
// 이 요청은 pending만 만듭니다. 승인은 학생이 Supabase SQL Editor에서 supabase/stage11-devices.sql ③으로 직접 합니다.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { DEVICE_COOKIE, api, cookieValue, login, logout } from './live-session.mjs';

const FILE = new URL('../.env.devices.local', import.meta.url);
const saved = existsSync(FILE) ? readFileSync(FILE, 'utf8') : '';
for (const who of ['A', 'B', 'T']) {
  const session = await login(who, { useDevice: false });
  try {
    const known = new RegExp(`^${who}_DEVICE=`, 'm').test(saved);
    if (known) session.did = process.env[`${who}_DEVICE`] ?? saved.match(new RegExp(`^${who}_DEVICE=(.+)$`, 'm'))?.[1]?.trim();
    const res = await api('/api/devices/request', session, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    const issued = cookieValue(res, DEVICE_COOKIE);
    if (issued && !known) appendFileSync(FILE, `${who}_DEVICE=${issued}\n`);
    console.log(`${who} · HTTP ${res.status} · 상태 ${body.status ?? body.error} · 기기 번호 ${body.deviceRef ?? '-'}${issued && !known ? ' (새로 저장)' : ''}`);
  } finally { await logout(session); }
}
console.log('pending 기기는 Supabase SQL Editor에서 supabase/stage11-devices.sql ③으로 승인한 뒤 점검 스크립트를 실행하세요.');
console.log('점검 실행: node --env-file=.env.local --env-file=.env.devices.local scripts/stage11-live-check.mjs');
