import { DEVICE_COOKIE, DEVICE_ID, dbFailed, deviceHash, requireUser } from '../../src/notes-api.mjs';

// GET /api/devices/me : 이 기기의 승인 상태(none·pending·approved·revoked)와 기기 번호(해시 앞 12자리)를 돌려줍니다.
// 화면은 이 응답이 approved일 때만 자료실을 엽니다. 최종 확인은 자료 API가 다시 합니다.
export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response, { device: false });
  if (!auth) return;
  const { user, db, cookies } = auth;
  if (user.kind !== 'student') return response.status(200).json({ status: 'engine_checked' });
  const id = cookies[DEVICE_COOKIE];
  if (!id || !DEVICE_ID.test(id)) return response.status(200).json({ status: 'none' });
  const hash = deviceHash(id);
  const { data, error } = await db.from('devices').select('status')
    .eq('user_id', user.userId).eq('device_hash', hash).maybeSingle();
  if (error) return dbFailed(response, '기기 상태 조회', error);
  return response.status(200).json({ status: data?.status ?? 'none', deviceRef: hash.slice(0, 12) });
}
