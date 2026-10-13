// 10단계 복원 실측(운영 배포). 실행: node --env-file=.env.local --env-file=.env.devices.local scripts/stage10-live-check.mjs
// 시험 계정 B의 메모 한 건만 일부러 바꾼 뒤 POST /api/notes/:id/restore로 되살리고, ID·소유자·내용 해시를 대조합니다.
// A 메모·B의 다른 메모는 건드리지 않았는지 해시로 확인합니다. 토큰·비밀번호·이메일·메모 본문은 출력하지 않습니다.
import { createHash } from 'node:crypto';
import { api, login, logout } from './live-session.mjs';

const hash = (n) => createHash('sha256').update(`${n.title}\n${n.body}`, 'utf8').digest('hex');
const short = (h) => `${String(h).slice(0, 12)}…`;
const json = async (res) => { try { return await res.json(); } catch { return {}; } };
const snapshot = async (token) => Object.fromEntries(((await json(await api('/api/notes', token))).notes ?? []).map((n) => [n.id, hash(n)]));

const rows = [];
const check = (name, ok, detail) => rows.push(`${ok ? '통과' : '확인 필요'} · ${name} → ${detail}`);
const tokens = {};
try {
  tokens.A = await login('A');
  tokens.B = await login('B');
  const aBefore = await snapshot(tokens.A), bBefore = await snapshot(tokens.B);
  const [targetId, ...otherB] = Object.keys(bBefore);
  if (!targetId) throw new Error('B 메모가 없어 복원 시험을 할 수 없습니다.');
  rows.push(`정보 · 복원 대상 B 메모 1건(note:${targetId.slice(0, 8)}…), 원래 해시 ${short(bBefore[targetId])}, A 메모 ${Object.keys(aBefore).length}건·B 다른 메모 ${otherB.length}건`);

  // 침해 흉내: B 메모 한 건 내용을 바꿈
  const tamper = await api(`/api/notes/${targetId}`, tokens.B, { method: 'PUT', body: JSON.stringify({ title: '침해로 바뀐 제목', body: '침해로 바뀐 본문' }) });
  check('B 메모 한 건 변조(시험)', tamper.status === 200, `HTTP ${tamper.status}`);

  const anon = await api(`/api/notes/${targetId}/restore`, null, { method: 'POST' });
  check('로그인 없이 복원', anon.status === 401, `HTTP ${anon.status} ${(await json(anon)).error ?? ''}`);
  const cross = await api(`/api/notes/${targetId}/restore`, tokens.A, { method: 'POST' });
  check('A가 B 메모 복원', cross.status === 403, `HTTP ${cross.status} ${(await json(cross)).error ?? ''}`);

  const res = await api(`/api/notes/${targetId}/restore`, tokens.B, { method: 'POST' });
  const body = await json(res);
  check('B가 자기 메모 한 건 복원', res.status === 200 && body.restored === true, `HTTP ${res.status} ${body.error ?? ''} matches=${JSON.stringify(body.matches ?? {})}`);

  const bAfter = await snapshot(tokens.B), aAfter = await snapshot(tokens.A);
  check('복원 뒤 내용 해시 = 침해 전 해시', bAfter[targetId] === bBefore[targetId], `${short(bAfter[targetId])} / ${short(bBefore[targetId])}`);
  check('B의 다른 메모 그대로', otherB.every((id) => bAfter[id] === bBefore[id]), `${otherB.length}건`);
  check('A 메모 그대로', JSON.stringify(aAfter) === JSON.stringify(aBefore), `${Object.keys(aAfter).length}건`);
} catch (error) {
  rows.push(`첫 오류 · ${error.message}`);
  process.exitCode = 1;
} finally {
  for (const session of Object.values(tokens)) await logout(session);
  console.log(rows.join('\n'));
  if (rows.some((r) => r.startsWith('확인 필요'))) process.exitCode = 1;
}
