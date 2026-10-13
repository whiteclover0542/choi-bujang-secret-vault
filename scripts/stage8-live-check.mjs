// 8단계 로그인 교차 점검(운영 배포). 실행: node --env-file=.env.local scripts/stage8-live-check.mjs
// .env.local(Git 제외)에 A_EMAIL·A_PASSWORD·B_EMAIL·B_PASSWORD·T_EMAIL·T_PASSWORD를 학생이 직접 넣습니다.
// 상태 코드와 오류 코드만 출력합니다. 토큰·비밀번호·이메일·메모 본문은 출력하지 않고, 끝나면 세션을 폐기합니다.
// 공지 수정 점검은 기존 제목·본문을 그대로 다시 넣어 내용이 바뀌지 않게 합니다.
import { readFileSync } from 'node:fs';

const { publicAppUrl } = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const api = (path, token, init = {}) => fetch(new URL(path, publicAppUrl), {
  ...init, redirect: 'error', signal: AbortSignal.timeout(15000),
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
});
const code = async res => { try { return (await res.clone().json())?.error ?? ''; } catch { return ''; } };

async function login(who) {
  const email = process.env[`${who}_EMAIL`], password = process.env[`${who}_PASSWORD`];
  if (!email || !password) throw new Error(`.env.local에 ${who}_EMAIL·${who}_PASSWORD가 없습니다.`);
  const res = await api('/api/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!res.ok) {
    let message = '';
    try { message = String((await res.json())?.message ?? '').slice(0, 80); } catch { /* 비JSON */ }
    throw new Error(`${who} 로그인 실패: HTTP ${res.status} ${message}`);
  }
  return (await res.json()).access_token;
}

const rows = [];
const check = async (name, expected, res) => {
  const got = `${res.status}${(await code(res)) ? ` ${await code(res)}` : ''}`;
  rows.push(`${String(got).startsWith(String(expected)) ? '통과' : '확인 필요'} · ${name} → ${got} (기대 ${expected})`);
};

const tokens = {};
try {
  const failed = [];
  for (const who of ['A', 'B', 'T']) {
    try { tokens[who] = await login(who); rows.push(`정보 · ${who} 로그인 성공`); } catch (error) { failed.push(error.message); }
  }
  if (failed.length) throw new Error(failed.join(' / '));

  const aNotes = (await (await api('/api/notes', tokens.A)).json()).notes ?? [];
  const notices = (await (await api('/api/notices', tokens.A)).json()).notices ?? [];
  rows.push(`정보 · A 메모 ${aNotes.length}건, 공지 ${notices.length}건 (본문 미출력)`);
  if (!aNotes.length || !notices.length) throw new Error('A 메모나 공지가 없어 교차 점검을 할 수 없습니다.');
  const note = aNotes[0], notice = notices[0];
  const same = JSON.stringify({ title: notice.title, body: notice.body, role: 'instructor' });

  await check('A 자기 메모 읽기', 200, await api(`/api/notes/${note.id}`, tokens.A));
  await check('B가 A 메모 읽기', 403, await api(`/api/notes/${note.id}`, tokens.B));
  await check('B가 A 메모 수정', 403, await api(`/api/notes/${note.id}`, tokens.B, { method: 'PUT', body: JSON.stringify({ title: 'x', body: 'y' }) }));
  await check('A 공지 읽기', 200, await api(`/api/notices/${notice.id}`, tokens.A));
  await check('A 공지 수정(본문 role 위조)', 403, await api(`/api/notices/${notice.id}`, tokens.A, { method: 'PUT', body: same }));
  await check('B 공지 수정(본문 role 위조)', 403, await api(`/api/notices/${notice.id}`, tokens.B, { method: 'PUT', body: same }));
  await check('강사 공지 수정(내용 그대로)', 200, await api(`/api/notices/${notice.id}`, tokens.T, { method: 'PUT', body: same }));
  await check('공지 자원 경로로 메모 id 요청', 404, await api(`/api/notices/${note.id}`, tokens.A));
} catch (error) {
  rows.push(`첫 오류 · ${error.message}`);
  process.exitCode = 1;
} finally {
  for (const token of Object.values(tokens)) await api('/api/auth/logout', token, { method: 'POST' }).catch(() => {});
  console.log(rows.join('\n'));
  if (rows.some(r => r.startsWith('확인 필요'))) process.exitCode = 1;
}
