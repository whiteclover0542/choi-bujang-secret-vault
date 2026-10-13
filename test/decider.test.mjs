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
