// 10단계: 검증한 시험 정책 사본(backup/policy)과 현재 시험 정책(src/decider.mjs)을 비교·복원합니다.
//   npm run policy:diff     → 사본 검증 후 복원할 버전과 바뀐 항목만 출력(아무것도 바꾸지 않음)
//   npm run policy:restore  → 같은 출력 뒤 시험 정책 파일만 사본으로 되돌리고 감사 기록에 한 줄 추가
// 사본이 없거나 해시가 맞지 않으면 중단합니다. 운영 엔진 정책·다른 서비스 규칙(xdr, detect)·감사 기록은 바꾸지 않습니다.
import { createHash } from 'node:crypto';
import { appendFile, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
// Windows에서 Git이 줄바꿈을 CRLF로 바꿔 꺼내도 같은 내용으로 보도록 LF로 맞춘 뒤 해시합니다.
const sha256 = (buf) => createHash('sha256').update(String(buf).replace(/\r\n/g, '\n')).digest('hex');
// 같은 경로를 다시 불러와도 새로 읽도록 내용 해시로 모듈을 불러옵니다.
const load = async (path, text) => import(`${pathToFileURL(path).href}?h=${sha256(text)}`);

export async function diffPolicy({ backupDir = resolve(root, 'backup/policy'), target = resolve(root, 'src/decider.mjs') } = {}) {
  let manifest, backupText;
  try {
    manifest = JSON.parse(await readFile(resolve(backupDir, 'manifest.json'), 'utf8'));
    backupText = await readFile(resolve(backupDir, manifest.file));
  } catch {
    throw new Error('검증한 정책 사본이 없습니다. 복원을 중단합니다.');
  }
  if (sha256(backupText) !== manifest.sha256) throw new Error('정책 사본의 해시가 목록과 다릅니다. 복원을 중단합니다.');
  const backup = await load(resolve(backupDir, manifest.file), backupText);
  if (JSON.stringify([...backup.RULE_IDS]) !== JSON.stringify(manifest.ruleIds)) throw new Error('정책 사본의 규칙 목록이 목록 파일과 다릅니다. 복원을 중단합니다.');

  const currentText = await readFile(target);
  const changes = [];
  let current = { RULE_IDS: [], ZONES: {} };
  try { current = await load(target, currentText); } catch { changes.push('현재 정책 파일을 불러올 수 없음(파일 전체 복원 필요)'); }
  const before = new Set(current.RULE_IDS ?? []), after = new Set(backup.RULE_IDS);
  for (const id of after) if (!before.has(id)) changes.push(`규칙 복원: ${id}`);
  for (const id of before) if (!after.has(id)) changes.push(`규칙 제거: ${id}`);
  const zones = current.ZONES ?? {};
  for (const [route, zone] of Object.entries(backup.ZONES)) {
    if (!(route in zones)) changes.push(`구역 복원: ${route} → ${zone}`);
    else if (zones[route] !== zone) changes.push(`구역 변경 되돌림: ${route} ${zones[route]} → ${zone}`);
  }
  for (const route of Object.keys(zones)) if (!(route in backup.ZONES)) changes.push(`구역 제거: ${route}`);
  const fileSame = sha256(currentText) === manifest.sha256;
  if (!fileSame && !changes.length) changes.push('규칙·구역 목록은 같지만 판정 코드가 다름(파일 전체 복원)');
  return { version: manifest.version, sha256: manifest.sha256, fileSame, changes, backupPath: resolve(backupDir, manifest.file), auditPath: resolve(backupDir, 'audit.log') };
}

export async function restorePolicy(options = {}) {
  const diff = await diffPolicy(options);
  if (diff.fileSame) return { ...diff, restored: false };
  const target = options.target ?? resolve(root, 'src/decider.mjs');
  await copyFile(diff.backupPath, target);
  if (sha256(await readFile(target)) !== diff.sha256) throw new Error('복원 뒤 해시가 사본과 다릅니다.');
  // 감사 기록은 추가만 합니다. 기존 줄은 지우거나 고치지 않습니다.
  await appendFile(diff.auditPath, `${new Date().toISOString()}\tpolicy_restore\t${diff.version}\t${diff.sha256.slice(0, 12)}\t바뀐 항목 ${diff.changes.length}개\n`);
  return { ...diff, restored: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const apply = process.argv.includes('--apply');
    const result = apply ? await restorePolicy() : await diffPolicy();
    console.log(`검증한 정책 사본: ${result.version} (sha256 ${result.sha256.slice(0, 12)}…, 해시 확인 완료)`);
    console.log(result.fileSame ? '현재 시험 정책이 사본과 같습니다. 바꿀 항목이 없습니다.' : `바뀔 항목 ${result.changes.length}개:\n${result.changes.map((c) => `  - ${c}`).join('\n')}`);
    if (apply) console.log(result.restored ? '시험 정책(src/decider.mjs)을 사본으로 되돌리고 감사 기록에 한 줄 추가했습니다.' : '복원하지 않았습니다.');
    else if (!result.fileSame) console.log('되돌리려면 npm run policy:restore 를 실행합니다.');
  } catch (error) {
    console.error(`정책 복원 중단: ${error.message}`);
    process.exitCode = 1;
  }
}
