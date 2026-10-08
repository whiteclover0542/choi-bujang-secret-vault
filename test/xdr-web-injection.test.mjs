import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const dir = new URL('../xdr/web-injection/', import.meta.url);
const source = await readFile(new URL('decide.mjs', dir), 'utf8');
const { decide, PATTERNS } = await import(new URL('decide.mjs', dir));

test('decide.mjs는 import 없이 파일 하나로 실행됩니다', async () => {
  assert.doesNotMatch(source, /^\s*import\s/m);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { alerts } = JSON.parse(await readFile(new URL('../fixtures/web-injection.json', dir), 'utf8'));
  for (const a of alerts) assert.deepEqual(await mod.decide(a), await decide(a), a.id);
});

test('decide.mjs 패턴 값이 patterns.json과 같습니다', async () => {
  const { patterns } = JSON.parse(await readFile(new URL('patterns.json', dir), 'utf8'));
  assert.deepEqual(PATTERNS, patterns.map(({ id, name, condition }) => ({ id, name, condition })));
});

// 공식 경보에 없는 변형 입력: 구조·반복·수준이 함께 있어야 block입니다.
const alert = (url, count, level, mitre = ['T1190']) => ({ rule: { level, description: '', mitre }, data: { srcip: '192.0.2.1', url, count: String(count) } });

test('변형 입력도 구조·반복·수준 기준으로 나뉩니다', async () => {
  assert.equal((await decide(alert("/n?id=1%27%20OR%20%271%27%3D%271", 6, 11))).action, 'block');
  assert.equal((await decide(alert('/s?q=%253Cscript%253E', 7, 10))).action, 'block'); // 두 번 인코딩
  assert.equal((await decide(alert('/f?p=../../../etc/x', 9, 12))).action, 'block');
  assert.equal((await decide(alert("/n?id=1' OR '1'='1", 1, 11))).action, 'alert'); // 반복 없음
  assert.equal((await decide(alert('/f?p=../../x', 9, 8))).action, 'alert'); // 수준 미달
  assert.equal((await decide(alert('/search?q=select-script-sql', 30, 12))).action, 'alert'); // 단어만 있음
  assert.equal((await decide(alert('/api/notes', 0, 3, []))).action, 'record');
});
