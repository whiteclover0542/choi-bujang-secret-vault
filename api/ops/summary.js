import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { RULE_IDS, ZONES } from '../../src/decider.mjs';
import { DEVICE_COOKIE, DEVICE_ID, dbFailed, deviceHash, requireUser } from '../../src/notes-api.mjs';

// GET /api/ops/summary : 탈환 작전실 요약(12단계). 로그인·승인된 기기에서만, 본인 범위의 건수·상태만 돌려줍니다.
// 메모·공지 본문, 토큰, 기기 ID, 다른 사용자의 기록은 넣지 않습니다.
// 각 항목의 source: server_db(DB를 이 요청에서 직접 읽음) · server_file(배포된 파일을 직접 읽음) · not_run(이 앱에 근거 자료가 없음).
const sha256 = text => createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');
// Vercel이 배포에 포함하도록 파일 경로는 그대로 적습니다(변수 경로는 추적되지 않을 수 있음).

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response);
  if (!auth) return;
  const { user, db, cookies } = auth;
  const count = async (table, column, value) => {
    const { count: n, error } = await db.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
    if (error) throw error;
    return n ?? 0;
  };

  try {
    // 판정기 규칙: 배포된 src/decider.mjs를 그대로 읽습니다.
    const zones = {};
    for (const zone of Object.values(ZONES)) zones[zone] = (zones[zone] ?? 0) + 1;

    // 복구 버전: 검증한 정책 사본의 해시를 다시 계산하고 현재 판정기와 비교합니다.
    let policy;
    try {
      const manifest = JSON.parse(readFileSync(new URL('../../backup/policy/manifest.json', import.meta.url), 'utf8'));
      const backupOk = sha256(readFileSync(new URL('../../backup/policy/decider.mjs', import.meta.url), 'utf8')) === manifest.sha256;
      const sameAsCurrent = sha256(readFileSync(new URL('../../src/decider.mjs', import.meta.url), 'utf8')) === manifest.sha256;
      policy = { source: 'server_file', version: manifest.version, backupHashVerified: backupOk, currentMatchesBackup: sameAsCurrent };
    } catch {
      policy = { source: 'server_file', error: 'POLICY_BACKUP_UNREADABLE' };
    }

    const { count: notices, error: noticeError } = await db.from('notices').select('*', { count: 'exact', head: true });
    if (noticeError) throw noticeError;
    const { data: lastRestore, error: restoreError } = await db.from('restore_audit')
      .select('result, at').eq('actor', user.userId).order('at', { ascending: false }).limit(1).maybeSingle();
    if (restoreError) throw restoreError;
    const { data: devices, error: deviceError } = await db.from('devices').select('status').eq('user_id', user.userId);
    if (deviceError) throw deviceError;
    const deviceCounts = {};
    for (const d of devices) deviceCounts[d.status] = (deviceCounts[d.status] ?? 0) + 1;
    const id = cookies[DEVICE_COOKIE];
    const thisDevice = user.kind !== 'student' ? 'engine_checked'
      : id && DEVICE_ID.test(id) ? (await db.from('devices').select('status').eq('user_id', user.userId).eq('device_hash', deviceHash(id)).maybeSingle()).data?.status ?? 'none' : 'none';

    return response.status(200).json({
      schema: 'aleph.ops.summary.v1',
      checkedAt: new Date().toISOString(),
      requestId: request.headers['x-vercel-id'] ?? null,
      decider: { source: 'server_file', ruleIds: [...RULE_IDS], routeCount: Object.keys(ZONES).length, zones },
      data: { source: 'server_db', myNotes: await count('notes', 'owner_id', user.userId), notices: notices ?? 0 },
      devices: { source: 'server_db', thisDevice, mine: deviceCounts },
      recovery: { source: 'server_db', ...policy, myRestores: await count('restore_audit', 'actor', user.userId), lastRestore: lastRestore ?? null },
      detection: { source: 'not_run', rule: '같은 가명 사용자 GET 10분 120건 초과 → propose_revocation(burst_read)', reason: '사건은 ALEPH SDP 엔진이 전달하며 이 앱에는 사건 기록이 없음' },
      revocation: { source: 'not_run', reason: '회수 집행은 ALEPH SDP 엔진·심판이 하며 이 앱은 제안만 함' },
    });
  } catch (error) {
    return dbFailed(response, '작전실 요약', error);
  }
}
