// 자료 빼돌리기 decide 결과를 XDR-01~05와 같은 차단 목록(xdr/blocklist.json)·알림 기록(xdr/alerts.log)으로 잇습니다.
// 이 모듈은 출발 주소가 아니라 목적지(dstip)를 막습니다. block만 만료 시각·근거 경보 번호가 붙은 거부 규칙이 되고,
// 같은 목적지로 정상(record) 전송이 있으면 막지 않고 알림으로 낮춥니다. decide.mjs와 src/decider.mjs는 고치지 않습니다.
import { fileURLToPath } from 'node:url';
import { replay, respond } from '../brute-force/respond.mjs';
import { decide } from './decide.mjs';

export const respondExfiltration = (alerts, now = Date.now()) => respond(alerts, now, decide, 'dstip');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await replay(new URL('../fixtures/exfiltration.json', import.meta.url), decide, 'dstip');
}
