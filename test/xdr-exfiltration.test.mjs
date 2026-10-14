import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const dir = new URL('../xdr/exfiltration/', import.meta.url);
const source = await readFile(new URL('decide.mjs', dir), 'utf8');
const { decide, PATTERNS } = await import(new URL('decide.mjs', dir));

test('decide.mjs는 import·파일 접근·바깥 요청 없이 파일 하나로 실행됩니다', async () => {
  assert.doesNotMatch(source, /^\s*import\s|import\(|require\(|readFile|writeFile|fetch\(|process\./m);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { alerts } = JSON.parse(await readFile(new URL('../fixtures/exfiltration.json', dir), 'utf8'));
  for (const a of alerts) assert.deepEqual(await mod.decide(a), decide(a), a.id);
});

test('decide.mjs 패턴 값이 patterns.json과 같습니다', async () => {
  const { patterns } = JSON.parse(await readFile(new URL('patterns.json', dir), 'utf8'));
  assert.deepEqual(PATTERNS, patterns.map(({ id, name, condition }) => ({ id, name, condition })));
});

// 공식 경보에 없는 변형 입력.
const alert = (description, level, data = {}, mitre = ['T1048'], timestamp = '2026-09-27T11:00:00+09:00') => ({ timestamp, rule: { level, description, mitre }, data: { srcip: '192.0.2.1', dstip: '203.0.113.9', ...data } });

test('변형 입력도 대용량·신호·수준 기준으로 나뉩니다', () => {
  assert.equal(decide(alert('전송', 11, { bytes: '90000000' })).action, 'block'); // 대용량 값만
  assert.equal(decide(alert('전송', 11, { bytes: '60000000' }, ['T1041'], '2026-09-27T02:10:00+09:00')).action, 'block'); // 새벽 대용량
  assert.equal(decide(alert('처음 보는 주소로 작은 파일', 12, { bytes: '400000' })).action, 'alert'); // 수준 높아도 작은 파일
  assert.equal(decide(alert('전송', 8, { bytes: '90000000' })).action, 'alert'); // 수준 미달
  assert.equal(decide(alert('전송', 12, { bytes: '90000000' }, [])).action, 'record'); // 전송 태그 없음
  assert.equal(decide(alert('전송 1건', 6, { bytes: '1000' })).action, 'alert');
  assert.equal(decide(alert('작은 동기화', 3, { bytes: '20000' })).action, 'record');
  assert.equal(decide({}).action, 'record');
});
