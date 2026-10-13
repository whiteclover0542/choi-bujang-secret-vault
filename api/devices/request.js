import { randomBytes } from 'node:crypto';
import { DEVICE_COOKIE, DEVICE_ID, dbFailed, deviceHash, requireUser, setCookie } from '../../src/notes-api.mjs';

// POST /api/devices/request : 이 기기의 승인을 요청합니다(학생·심판 로그인 모두 가능).
// 기기 ID가 없으면 서버가 무작위 값을 만들어 HttpOnly 쿠키로 둡니다. DB에는 해시만 pending으로 기록합니다.
// 이 요청만으로는 승인되지 않습니다. 승인은 관리자가 서버(DB)에서 따로 합니다.
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response, { device: false });
  if (!auth) return;
  const { user, db, cookies } = auth;

  let id = cookies[DEVICE_COOKIE];
  if (!id || !DEVICE_ID.test(id)) {
    id = randomBytes(32).toString('base64url');
    setCookie(response, DEVICE_COOKIE, id, 365 * 24 * 60 * 60);
  }
  const hash = deviceHash(id);
  const { data: existing, error: readError } = await db.from('devices').select('status')
    .eq('user_id', user.userId).eq('device_hash', hash).maybeSingle();
  if (readError) return dbFailed(response, '기기 조회', readError);
  if (!existing) {
    const { error } = await db.from('devices').insert({ user_id: user.userId, device_hash: hash, status: 'pending' });
    if (error) return dbFailed(response, '기기 승인 요청', error);
  }
  return response.status(existing ? 200 : 201).json({ status: existing?.status ?? 'pending', deviceRef: hash.slice(0, 12) });
}
