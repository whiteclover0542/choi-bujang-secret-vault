// 알려진 취약점 악용 decide 결과를 XDR-01·02와 같은 차단 목록(xdr/blocklist.json)·알림 기록(xdr/alerts.log)으로 잇습니다.
// block만 만료 시각·근거 경보 번호가 붙은 거부 규칙이 되고, 같은 주소에 정상(record) 이벤트가 있으면 막지 않고 알림으로 낮춥니다.
// 다른 모듈 규칙은 보존하고 같은 경보는 알림에 다시 쓰지 않습니다. decide.mjs와 src/decider.mjs는 고치지 않습니다.
import { fileURLToPath } from 'node:url';
import { replay, respond } from '../brute-force/respond.mjs';
import { decide } from './decide.mjs';

export const respondKnownCve = (alerts, now = Date.now()) => respond(alerts, now, decide);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await replay(new URL('../fixtures/known-cve.json', import.meta.url), decide);
}
