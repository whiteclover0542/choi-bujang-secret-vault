import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const dir = new URL('../xdr/persistence/', import.meta.url);
const source = await readFile(new URL('decide.mjs', dir), 'utf8');
const { decide, PATTERNS } = await import(new URL('decide.mjs', dir));

test('decide.mjs는 import·파일 접근·바깥 요청 없이 파일 하나로 실행됩니다', async () => {
  assert.doesNotMatch(source, /^\s*import\s|import\(|require\(|readFile|writeFile|fetch\(|process\./m);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { alerts } = JSON.parse(await readFile(new URL('../fixtures/persistence.json', dir), 'utf8'));
  for (const a of alerts) assert.deepEqual(await mod.decide(a), decide(a), a.id);
});

test('decide.mjs 패턴 값이 patterns.json과 같습니다', async () => {
  const { patterns } = JSON.parse(await readFile(new URL('patterns.json', dir), 'utf8'));
  assert.deepEqual(PATTERNS, patterns.map(({ id, name, condition }) => ({ id, name, condition })));
});

// 공식 경보에 없는 변형 입력.
const alert = (description, level, mitre = ['T1543'], path) => ({ rule: { level, description, mitre }, data: { srcip: '192.0.2.1', ...(path && { path }) } });

test('변형 입력도 신호·수준 기준으로 나뉩니다', () => {
  assert.equal(decide(alert('새 서비스', 12, ['T1543'], 'C:\\Users\\u\\AppData\\Local\\Temp\\x.exe')).action, 'block'); // 경로만
  assert.equal(decide(alert('서명 없는 서비스', 10)).action, 'block'); // 설명만
  assert.equal(decide(alert('항목 추가', 11, ['T1543'], 'C:\\Users\\u\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\a.exe')).action, 'block');
  assert.equal(decide(alert('서명 없는 서비스', 8)).action, 'alert'); // 수준 미달
  assert.equal(decide(alert('서명 없는 서비스', 12, [])).action, 'record'); // 지속 장치 태그 없음
  assert.equal(decide(alert('예약 작업 하나', 6, ['T1053'], 'C:\\lab\\a.cmd')).action, 'alert');
  assert.equal(decide(alert('서명된 서비스 실행 중', 3)).action, 'record');
  assert.equal(decide({}).action, 'record');
});
