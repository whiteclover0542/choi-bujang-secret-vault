import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { decide, trustedSignals } from '../src/decider.mjs';

const { normal, suspicious } = fixtureRequests();
const run = async (req) => {
  const r = await decide(req);
  return `${r.decision}/${r.reasonCode}`;
};

test('만들기 1: judge_fixture가 아닌 접속 정보는 근거로 승격되지 않습니다', async () => {
  // 실제 경로(none), 위조 출처, 빠진 값, 틀린 형식은 모두 신호 없음입니다.
  for (const signals of [
    { source: 'none', region: 'unknown', network: 'unknown', hour: 3 },
    { source: 'client_header', region: 'foreign', network: 'unusual', hour: 3 },
    { source: 'judge_fixture', region: 'foreign', network: 'unusual' },
    { source: 'judge_fixture', region: 'foreign', network: 'unusual', hour: '3' },
    undefined,
  ]) {
    assert.equal(trustedSignals({ ...suspicious, signals }), null, JSON.stringify(signals));
    assert.equal(await run({ ...suspicious, signals }), 'allow/approved', JSON.stringify(signals));
  }
  // 위조 헤더처럼 계약 밖 필드를 덧붙여도 쓰지 않습니다.
  assert.equal(await run({ ...normal, geo: { region: 'foreign' }, headers: { 'x-forwarded-for': '203.0.113.9' } }), 'allow/approved');
});

test('만들기 2: 복합 이상은 추가 확인, 정상과 단일 이상은 허용입니다', async () => {
  assert.equal(await run(normal), 'allow/approved');
  assert.equal(await run(suspicious), 'step_up/step_up_required');
  // 하나씩만 이상하면 허용(지역만 다른 경우 포함)
  assert.equal(await run({ ...normal, signals: { ...normal.signals, region: 'foreign' } }), 'allow/approved');
  assert.equal(await run({ ...suspicious, signals: { ...suspicious.signals, hour: 14 } }), 'allow/approved');
  assert.equal(await run({ ...suspicious, signals: { ...suspicious.signals, network: 'usual' } }), 'allow/approved');
  assert.equal(await run({ ...suspicious, recentEvents: [{ kind: 'risk_signal', ageSeconds: 60, count: 3 }] }), 'allow/approved');
  assert.equal(await run({ ...suspicious, recentEvents: [{ kind: 'risk_signal', ageSeconds: 3600, count: 20 }] }), 'allow/approved');
  // 기기 규칙이 먼저입니다.
  assert.equal(await run({ ...suspicious, deviceRegistered: false }), 'deny/device_not_registered');
});

test('만들기 3: 엔진이 검증한 새 로그인 뒤에만 다시 허용합니다', async () => {
  assert.equal(await run({ ...suspicious, stepUp: { verified: true, authAgeSeconds: 60 } }), 'allow/approved');
  assert.equal(await run({ ...suspicious, stepUp: { verified: true, authAgeSeconds: 900 } }), 'step_up/step_up_required');
  assert.equal(await run({ ...suspicious, stepUp: { verified: false, authAgeSeconds: null } }), 'step_up/step_up_required');
  assert.equal(await run({ ...suspicious, stepUp: { verified: 'true', authAgeSeconds: 10 } }), 'step_up/step_up_required');
});

// 8단계: 엔진이 확인한 메서드·정확한 경로 모양별 구역
const at = (method, route, path, extra = {}) => ({ ...normal, method, route: `${method} ${route}`, path, ...extra });
const ID = '11111111-1111-4111-8111-111111111111';

test('8단계: 자기 메모 구역과 공지 읽기는 허용, 공지 수정·알 수 없는 경로는 거부합니다', async () => {
  assert.equal(await run(at('GET', '/notes/:id', `/notes/${ID}`)), 'allow/approved');
  assert.equal(await run(at('PUT', '/notes/:id', `/notes/${ID}`)), 'allow/approved');
  assert.equal(await run(at('GET', '/notes', '/notes')), 'deny/route_not_allowed'); // 메모 전체 목록
  assert.equal(await run(at('GET', '/notices/:id', `/notices/${ID}`)), 'allow/approved');
  assert.equal(await run(at('PUT', '/notices/:id', `/notices/${ID}`)), 'deny/instructor_required');
  // 알 수 없는 경로, :id 깊이의 기능 경로, 경로 모양과 실제 경로·메서드 불일치, 쿼리로 기능 고르기
  assert.equal(await run(at('GET', '/notes/export', '/notes/export')), 'deny/route_not_allowed');
  assert.equal(await run(at('GET', '/admin', '/admin')), 'deny/route_not_allowed');
  assert.equal(await run(at('DELETE', '/notices/:id', `/notices/${ID}`)), 'deny/route_not_allowed');
  assert.equal(await run({ ...at('GET', '/notes/:id', `/notes/${ID}`), path: `/notices/${ID}` }), 'deny/route_not_allowed');
  assert.equal(await run({ ...at('GET', '/notes/:id', `/notes/${ID}`), method: 'PUT' }), 'deny/route_not_allowed');
  assert.equal(await run(at('GET', '/notes/:id', `/notes/${ID}/export`)), 'deny/route_not_allowed');
  assert.equal(await run(at('POST', '/notes', '/notes', { queryLength: 12 })), 'deny/route_not_allowed');
  // 공지 쓰기는 메서드와 관계없이 모두 거부합니다.
  for (const [method, route, path] of [['POST', '/notices', '/notices'], ['PATCH', '/notices/:id', `/notices/${ID}`], ['DELETE', '/notices/:id', `/notices/${ID}`]]) {
    assert.equal((await decide(at(method, route, path))).decision, 'deny', `${method} ${route}`);
  }
  // 기기 규칙이 먼저입니다.
  assert.equal(await run(at('PUT', '/notices/:id', `/notices/${ID}`, { deviceRegistered: false })), 'deny/device_not_registered');
});

test('10단계: 자기 메모 한 건 복원 경로만 허용합니다', async () => {
  assert.equal(await run(at('POST', '/notes/:id/restore', `/notes/${ID}/restore`)), 'allow/approved');
  assert.equal(await run(at('GET', '/notes/:id/restore', `/notes/${ID}/restore`)), 'deny/route_not_allowed');
  assert.equal(await run(at('POST', '/notes/restore', '/notes/restore')), 'deny/route_not_allowed');
});

test('11단계: 자기 기기 승인 요청·상태 경로만 허용합니다', async () => {
  assert.equal(await run(at('POST', '/devices/request', '/devices/request')), 'allow/approved');
  assert.equal(await run(at('GET', '/devices/me', '/devices/me')), 'allow/approved');
  // 승인 자체·다른 기기 목록 같은 경로는 판정기에 없습니다.
  assert.equal(await run(at('POST', '/devices/approve', '/devices/approve')), 'deny/route_not_allowed');
  assert.equal(await run(at('GET', '/devices', '/devices')), 'deny/route_not_allowed');
  assert.equal(await run(at('GET', '/devices/me', '/devices/me', { deviceRegistered: false })), 'deny/device_not_registered');
});

test('12단계: 본인 작전실 요약 경로만 허용합니다', async () => {
  assert.equal(await run(at('GET', '/ops/summary', '/ops/summary')), 'allow/approved');
  assert.equal(await run(at('GET', '/ops', '/ops')), 'deny/route_not_allowed');
  assert.equal(await run(at('POST', '/ops/summary', '/ops/summary')), 'deny/route_not_allowed');
});
