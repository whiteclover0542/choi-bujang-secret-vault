import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detect } from '../src/detect.mjs';

const START = Date.UTC(2026, 9, 1);
const reads = (count, { gapMs = 2000, sub = 'learner_fixture', method = 'GET', extra = {} } = {}) =>
  Array.from({ length: count }, (_, i) => ({ at: new Date(START + i * gapMs).toISOString(), method, identity: { sub }, ...extra }));
const burst = { action: 'propose_revocation', reasonCode: 'burst_read', subject: 'learner_fixture' };

test('계약 밖 값은 읽지 않고, 형식이 틀린 사건은 세지 않습니다', () => {
  // 메모 본문·토큰 같은 값이 붙어 있어도 결과에 나오지 않습니다.
  assert.deepEqual(detect(reads(121, { extra: { body: '메모 본문', token: 'x' } })), burst);
  assert.deepEqual(detect([...reads(120), { at: 'not-a-date', method: 'GET', identity: { sub: 'learner_fixture' } }, null, 7]), { action: 'observe' });
  assert.deepEqual(detect([...reads(120), { at: new Date(START).toISOString(), method: 'GET', identity: {} }]), { action: 'observe' });
  assert.throws(() => detect('events'), TypeError);
});

test('GET만 세고, 10분 경계와 순서에 흔들리지 않습니다', () => {
  assert.deepEqual(detect(reads(200, { method: 'POST' })), { action: 'observe' });
  assert.deepEqual(detect(reads(121).reverse()), burst); // 순서가 뒤섞여도 같음
  // 121건이 정확히 10분 간격 끝에 걸치면(600초) 같은 구간이 아님
  assert.deepEqual(detect(reads(121, { gapMs: 5000 })), { action: 'observe' });
  assert.deepEqual(detect(reads(121, { gapMs: 4990 })), burst);
});
