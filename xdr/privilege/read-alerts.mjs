// 권한 가로채기(관리자 그룹 추가·관리자 명령) 경보에서 시각·출발 주소·계정·규칙 수준·설명만 뽑습니다. 원본 파일은 읽기만 합니다.
// 확인용 모듈입니다. decide.mjs는 이 파일을 불러오지 않습니다(심판은 decide.mjs 한 파일만 실행).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FIXTURE = new URL('../fixtures/privilege.json', import.meta.url);
// 설명 안에 password=…, token: … 처럼 적힌 값은 가립니다.
const SECRET = /\b(pass(word)?|pwd|token|secret|api[_-]?key|key)\s*[:=]\s*\S+/gi;

export function pick(alert) {
  return {
    id: alert.id,
    time: alert.timestamp,
    srcip: alert.data?.srcip ?? '',
    user: alert.data?.srcuser ?? alert.data?.dstuser ?? '',
    level: alert.rule?.level ?? 0,
    description: String(alert.rule?.description ?? '').replace(SECRET, '$1=[가림]'),
  };
}

export async function readAlerts(path = FIXTURE) {
  const { alerts } = JSON.parse(await readFile(path, 'utf8'));
  return alerts.map(pick);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { alerts } = JSON.parse(await readFile(FIXTURE, 'utf8'));
  const rows = alerts.map(pick);
  for (const r of rows) console.log([r.id, r.time, r.srcip, r.user, r.level, r.description].join('\t'));
  console.log(`경보 ${alerts.length}건 / 뽑은 줄 ${rows.length}줄`);
  if (rows.length !== alerts.length) process.exit(1);
  console.assert(pick({ rule: { description: 'token=abc123' } }).description === 'token=[가림]', '비밀값 가림 실패');
}
