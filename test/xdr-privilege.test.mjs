import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const dir = new URL('../xdr/privilege/', import.meta.url);
const source = await readFile(new URL('decide.mjs', dir), 'utf8');
const { decide, PATTERNS } = await import(new URL('decide.mjs', dir));

test('decide.mjs는 import·파일 접근·바깥 요청 없이 파일 하나로 실행됩니다', async () => {
  assert.doesNotMatch(source, /^\s*import\s|import\(|require\(|readFile|writeFile|fetch\(|process\./m);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { alerts } = JSON.parse(await readFile(new URL('../fixtures/privilege.json', dir), 'utf8'));
  for (const a of alerts) assert.deepEqual(await mod.decide(a), decide(a), a.id);
});

test('decide.mjs 패턴 값이 patterns.json과 같습니다', async () => {
  const { patterns } = JSON.parse(await readFile(new URL('patterns.json', dir), 'utf8'));
  assert.deepEqual(PATTERNS, patterns.map(({ id, name, condition }) => ({ id, name, condition })));
});

// 공식 경보에 없는 변형 입력.
const alert = (description, level, mitre = ['T1078'], data = {}, timestamp = '2026-09-27T11:00:00+09:00') => ({ timestamp, rule: { level, description, mitre }, data: { srcip: '192.0.2.1', ...data } });

test('변형 입력도 신호·수준 기준으로 나뉩니다', () => {
  assert.equal(decide(alert('그룹 변경', 12, ['T1078'], { group: 'Administrators' })).action, 'block'); // 그룹 값만
  assert.equal(decide(alert('세션 변경', 11, ['T1068'], {}, '2026-09-27T02:30:00+09:00')).action, 'block'); // 새벽
  assert.equal(decide(alert('관리자 그룹에 추가됐습니다.', 8)).action, 'alert'); // 수준 미달
  assert.equal(decide(alert('관리자 그룹에 추가됐습니다.', 12, [])).action, 'record'); // 권한 태그 없음
  assert.equal(decide(alert('과제 그룹 추가, 관리자 그룹은 아닙니다.', 7, ['T1078'], { group: 'project' })).action, 'alert');
  assert.equal(decide(alert('그룹 목록 읽기', 3)).action, 'record');
  assert.equal(decide({}).action, 'record');
});
