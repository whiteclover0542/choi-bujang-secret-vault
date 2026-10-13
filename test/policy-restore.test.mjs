import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { diffPolicy, restorePolicy } from '../scripts/policy-restore.mjs';

// 실제 src/decider.mjs와 backup/policy/audit.log는 건드리지 않고 임시 폴더에서 시험합니다.
async function sandbox() {
  const dir = await mkdtemp(join(tmpdir(), 'policy-'));
  await cp(new URL('../backup/policy', import.meta.url), join(dir, 'backup'), { recursive: true });
  const target = join(dir, 'decider.mjs');
  const source = await readFile(new URL('../src/decider.mjs', import.meta.url), 'utf8');
  return { dir, backupDir: join(dir, 'backup'), target, source };
}

test('침해된 시험 정책은 바뀐 항목을 보여 주고, 복원하면 사본과 같아집니다', async () => {
  const { dir, backupDir, target, source } = await sandbox();
  try {
    // 침해 흉내: 구역 규칙을 빼고 메모 전체 목록·공지 수정을 열어 둠
    const tampered = source
      .replace("['device_registered', 'resource_zone', 'step_up_required']", "['device_registered', 'step_up_required']")
      .replace("'PUT /notices/:id': 'instructor_only',", "'PUT /notices/:id': 'class_notices',\n  'GET /notes': 'own_notes',");
    await writeFile(target, tampered);
    const diff = await diffPolicy({ backupDir, target });
    assert.equal(diff.fileSame, false);
    assert.deepEqual(diff.changes.sort(), ['구역 변경 되돌림: PUT /notices/:id class_notices → instructor_only', '구역 제거: GET /notes', '규칙 복원: resource_zone'].sort());
    assert.equal(await readFile(target, 'utf8'), tampered, '차이 보기는 파일을 바꾸지 않음');

    const before = await readFile(join(backupDir, 'audit.log'), 'utf8');
    const result = await restorePolicy({ backupDir, target });
    assert.equal(result.restored, true);
    assert.equal((await diffPolicy({ backupDir, target })).fileSame, true);
    const after = await readFile(join(backupDir, 'audit.log'), 'utf8');
    assert.ok(after.startsWith(before) && after.split('\n').length === before.split('\n').length + 1, '감사 기록은 한 줄 추가만');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('사본이 없거나 해시가 맞지 않으면 중단합니다', async () => {
  const { dir, backupDir, target, source } = await sandbox();
  try {
    await writeFile(target, source);
    await writeFile(join(backupDir, 'decider.mjs'), `${source}\n// 위조`);
    await assert.rejects(restorePolicy({ backupDir, target }), /해시가 목록과 다릅니다/);
    await rm(join(backupDir, 'manifest.json'));
    await assert.rejects(diffPolicy({ backupDir, target }), /사본이 없습니다/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
