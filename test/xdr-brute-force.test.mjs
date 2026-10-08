import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const dir = new URL('../xdr/brute-force/', import.meta.url);
const source = await readFile(new URL('decide.mjs', dir), 'utf8');

test('decide.mjs는 import 없이 파일 하나로 실행됩니다', async () => {
  assert.doesNotMatch(source, /^\s*import\s/m);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { alerts } = JSON.parse(await readFile(new URL('../fixtures/brute-force.json', dir), 'utf8'));
  const local = await import(new URL('decide.mjs', dir));
  for (const a of alerts) assert.deepEqual(await mod.decide(a), await local.decide(a), a.id);
});

test('decide.mjs 패턴 값이 patterns.json과 같습니다', async () => {
  const { patterns } = JSON.parse(await readFile(new URL('patterns.json', dir), 'utf8'));
  const { PATTERNS } = await import(new URL('decide.mjs', dir));
  assert.deepEqual(PATTERNS, patterns.map(({ id, name, condition }) => ({ id, name, condition })));
});
