// 웹 주입 decide 결과를 XDR-01과 같은 차단 목록(xdr/blocklist.json)·알림 기록(xdr/alerts.log)으로 잇습니다.
// 다른 모듈의 유효한 규칙은 보존하고, 같은 경보는 알림에 다시 쓰지 않습니다. src/decider.mjs는 고치지 않습니다.
import { fileURLToPath } from 'node:url';
import { replay, respond } from '../brute-force/respond.mjs';
import { decide } from './decide.mjs';

export const respondWebInjection = (alerts, now = Date.now()) => respond(alerts, now, decide);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await replay(new URL('../fixtures/web-injection.json', import.meta.url), decide);
}
