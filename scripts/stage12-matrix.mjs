// 12단계 실측표: 운영 배포에 1~12단계의 정상·금지 요청을 실제로 보내 결과를 한 표로 남깁니다.
// 실행: node --env-file=.env.local --env-file=.env.devices.local scripts/stage12-matrix.mjs
// 출력: docs/verification/matrix-<배포 커밋 7자리>.md (토큰·쿠키·기기 ID·이메일·메모 본문 없음)
// 요청 ID는 Vercel이 응답마다 붙이는 x-vercel-id, 확인 시각은 응답 받은 시각(UTC)입니다.
// 심판의 총공세 41종은 이 스크립트가 실행하지 않으므로 통과로 적지 않습니다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { checkDetection } from './detect-test.mjs';
import { fixtureRequests } from './fixture-7.mjs';
import { checkDecider } from './decider-test.mjs';
import { api, login, logout, publicAppUrl } from './live-session.mjs';
import { decide, RULE_IDS } from '../src/decider.mjs';
import { detect } from '../src/detect.mjs';

const rows = [];
const json = async (res) => { try { return await res.clone().json(); } catch { return {}; } };
const ZERO = '00000000-0000-4000-8000-000000000000';

// 실제 요청 한 건을 보내고 결과를 표에 남깁니다. expect는 기대 HTTP 상태, extra는 응답을 더 확인하는 함수입니다.
async function hit(stage, kind, name, expect, path, session, init = {}, extra) {
  const res = await api(path, session, init);
  const body = await json(res);
  const note = extra ? await extra(res, body) : '';
  const ok = res.status === expect && (!extra || note.ok !== false);
  rows.push({ stage, kind, name, expected: `${expect}`, actual: `${res.status}${body.error ? ` ${body.error}` : ''}${note.text ? ` · ${note.text}` : ''}`,
    requestId: res.headers.get('x-vercel-id') ?? '-', at: new Date().toISOString(), result: ok ? '통과' : '확인 필요' });
  return { res, body };
}
const local = (stage, kind, name, expected, actual, ok) =>
  rows.push({ stage, kind, name, expected, actual, requestId: '로컬', at: new Date().toISOString(), result: ok ? '통과(로컬)' : '확인 필요' });
const notRun = (stage, name, why) =>
  rows.push({ stage, kind: '-', name, expected: '-', actual: why, requestId: '-', at: '-', result: '미실행' });

const sessions = {};
let commit = 'unknown';
try {
  commit = String((await (await api('/aleph.json', null)).json()).commit ?? 'unknown');
  for (const who of ['A', 'B', 'T']) sessions[who] = await login(who);
  const { A, B, T } = sessions;
  const aNotes = (await json(await api('/api/notes', A))).notes ?? [];
  const bNotes = (await json(await api('/api/notes', B))).notes ?? [];
  const notices = (await json(await api('/api/notices', A))).notices ?? [];
  if (!aNotes.length || !bNotes.length || !notices.length) throw new Error('A·B 메모나 공지가 없어 교차 요청을 만들 수 없습니다.');
  const aNote = aNotes[0], bNote = bNotes[0], notice = notices[0];

  await hit('1·2', '금지', '공개 /data.json', 404, '/data.json', null);
  await hit('3', '금지', '비로그인 메모 목록', 401, '/api/notes', null);
  await hit('3', '금지', '비로그인 메모 추가', 401, '/api/notes', null, { method: 'POST', body: JSON.stringify({ title: 'x', body: 'y' }) });
  await hit('3', '금지', '위조 사용자 헤더', 401, '/api/notes', null, { headers: { 'X-User-Id': ZERO, 'X-Role': 'admin' } });
  await hit('3·4', '정상', 'A 자기 메모 읽기', 200, `/api/notes/${aNote.id}`, A);
  await hit('4', '금지', 'B가 A 메모 읽기', 403, `/api/notes/${aNote.id}`, B);
  await hit('4', '금지', 'B가 A 메모 수정', 403, `/api/notes/${aNote.id}`, B, { method: 'PUT', body: JSON.stringify({ title: 'x', body: 'y' }) });
  if (process.env.SUPABASE_PUBLISHABLE_KEY) {
    const { originalApiUrl } = JSON.parse((await import('node:fs')).readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(new URL('?select=id&limit=1', originalApiUrl), { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const data = await res.json().catch(() => null);
    const n = Array.isArray(data) ? data.length : 0;
    rows.push({ stage: '5', kind: '금지', name: 'anon 키로 원본 자료 직접 조회', expected: '행 0', actual: `${res.status} · 행 ${n}`, requestId: '-', at: new Date().toISOString(), result: n === 0 ? '통과' : '확인 필요' });
  } else notRun('5', 'anon 키로 원본 자료 직접 조회', 'SUPABASE_PUBLISHABLE_KEY 환경변수 없음');

  // 6·7·8 판정기: 제공 엔진을 거친 실제 요청은 이 환경에서 보낼 수 없어 로컬 판정기에 가상 요청을 보냅니다.
  for (const c of await checkDecider({ decide, ruleIds: RULE_IDS })) local('6·7', c.name.includes('미등록') ? '금지' : '정상', `판정기: ${c.name}`, '계약 기대값', c.passed ? '기대와 같음' : '기대와 다름', c.passed);
  const { normal } = fixtureRequests();
  for (const [kind, method, route, path, want] of [
    ['정상', 'GET', '/notes/:id', '/notes/demo', 'allow'], ['금지', 'GET', '/notes', '/notes', 'deny'],
    ['금지', 'PUT', '/notices/:id', '/notices/demo', 'deny'], ['금지', 'GET', '/notes/export', '/notes/export', 'deny'],
  ]) {
    const out = await decide({ ...normal, method, route: `${method} ${route}`, path });
    local('8', kind, `판정기 구역: ${method} ${route}`, want, `${out.decision} ${out.reasonCode}`, out.decision === want);
  }
  notRun('7', '실제 재로그인 전 자료 차단', '새 로그인 시각을 검증하는 ALEPH SDP 엔진이 이 환경에 없음');

  await hit('8', '정상', 'A 공지 읽기', 200, `/api/notices/${notice.id}`, A);
  const same = JSON.stringify({ title: notice.title, body: notice.body, role: 'instructor' });
  await hit('8', '금지', 'A 공지 수정(본문 role 위조)', 403, `/api/notices/${notice.id}`, A, { method: 'PUT', body: same });
  await hit('8', '금지', 'B 공지 수정(본문 role 위조)', 403, `/api/notices/${notice.id}`, B, { method: 'PUT', body: same });
  await hit('8', '정상', '강사 공지 수정(내용 그대로)', 200, `/api/notices/${notice.id}`, T, { method: 'PUT', body: same });
  await hit('8', '금지', '공지 경로로 메모 id(다른 구역)', 404, `/api/notices/${aNote.id}`, A);

  const cases = await checkDetection(detect);
  for (const c of cases) local('9', c.name.includes('121') || c.name.includes('폭주') ? '금지' : '정상', `탐지: ${c.name}`, '계약 기대값', c.passed ? '기대와 같음' : '기대와 다름', c.passed);
  notRun('9', '실제 회수 집행·경과 시간', 'ALEPH SDP 엔진·심판이 가상 사건으로 확인');

  await hit('10', '금지', '비로그인 복원', 401, `/api/notes/${ZERO}/restore`, null, { method: 'POST' });
  await hit('10', '금지', 'A가 B 메모 복원', 403, `/api/notes/${bNote.id}/restore`, A, { method: 'POST' });
  await hit('10', '정상', 'B 자기 메모 복원(사본 대조)', 200, `/api/notes/${bNote.id}/restore`, B, { method: 'POST' },
    (_res, body) => ({ ok: body.restored === true, text: `matches ${JSON.stringify(body.matches ?? {})}` }));

  await hit('11', '정상', 'manifest', 200, '/manifest.webmanifest', null);
  await hit('11', '금지', '기기 없이 메모 목록', 403, '/api/notes', { sid: A.sid }, {},
    (_res, body) => ({ ok: !('notes' in body), text: '자료 없음' }));
  await hit('11', '정상', '승인 기기로 메모 목록', 200, '/api/notes', A, {}, (_res, body) => ({ ok: Array.isArray(body.notes), text: `메모 ${body.notes?.length ?? 0}건` }));

  await hit('12', '금지', '비로그인 작전실 요약', 401, '/api/ops/summary', null);
  await hit('12', '금지', '기기 없이 작전실 요약', 403, '/api/ops/summary', { sid: A.sid });
  // 작전실 수치가 서버 기록(별도 API 응답)과 같은지 대조합니다.
  const myNotes = ((await json(await api('/api/notes', A))).notes ?? []).length;
  const allNotices = ((await json(await api('/api/notices', A))).notices ?? []).length;
  await hit('12', '정상', '작전실 요약 = 서버 기록', 200, '/api/ops/summary', A, {}, (_res, s) => {
    const ok = s.data?.myNotes === myNotes && s.data?.notices === allNotices && s.devices?.thisDevice === 'approved'
      && s.recovery?.backupHashVerified === true && s.recovery?.currentMatchesBackup === true
      && s.detection?.source === 'not_run' && s.revocation?.source === 'not_run';
    return { ok, text: `메모 ${s.data?.myNotes}/${myNotes} · 공지 ${s.data?.notices}/${allNotices} · 기기 ${s.devices?.thisDevice} · 정책 ${s.recovery?.version} · 탐지·회수 ${s.detection?.source}` };
  });
  notRun('총공세', '심판 총공세 41종', '심판이 실행하는 시험으로 이 표에서 실행·통과 처리하지 않음');
} catch (error) {
  rows.push({ stage: '-', kind: '-', name: '첫 오류', expected: '-', actual: error.message, requestId: '-', at: new Date().toISOString(), result: '확인 필요' });
  process.exitCode = 1;
} finally {
  for (const s of Object.values(sessions)) await logout(s);
}

const counts = rows.reduce((m, r) => ({ ...m, [r.result]: (m[r.result] ?? 0) + 1 }), {});
const cell = (v) => String(v).replace(/\|/g, '\\|');
const md = [
  `# 실측표 — 배포 커밋 \`${commit.slice(0, 12)}\``,
  '',
  `- 대상: ${publicAppUrl} · 생성: ${new Date().toISOString()} · 생성 스크립트: \`scripts/stage12-matrix.mjs\``,
  `- 결과: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
  '- "통과"는 운영 배포에 실제로 보낸 요청, "통과(로컬)"는 로컬 판정기·탐지 함수에 보낸 가상 요청, "미실행"은 보내지 않은 시험입니다. 심판 판정이 아닙니다.',
  '- 토큰·쿠키·기기 ID·이메일·메모 본문은 기록하지 않습니다.',
  '',
  '| 단계 | 구분 | 요청 | 기대 | 실제 | 요청 ID | 확인 시각(UTC) | 결과 |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${[r.stage, r.kind, r.name, r.expected, r.actual, r.requestId, r.at, r.result].map(cell).join(' | ')} |`),
  '',
].join('\n');
mkdirSync(new URL('../docs/verification/', import.meta.url), { recursive: true });
const file = new URL(`../docs/verification/matrix-${commit.slice(0, 7)}.md`, import.meta.url);
writeFileSync(file, md);
console.log(`실측표 작성: docs/verification/matrix-${commit.slice(0, 7)}.md`);
console.log(Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '));
for (const r of rows.filter((r) => r.result === '확인 필요')) console.log(`확인 필요 · ${r.stage} ${r.name} → ${r.actual}`);
if (rows.some((r) => r.result === '확인 필요')) process.exitCode = 1;
