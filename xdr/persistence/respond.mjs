// 몰래 심어진 프로그램 decide 결과를 XDR-01·02·03과 같은 차단 목록(xdr/blocklist.json)·알림 기록(xdr/alerts.log)으로 잇습니다.
// block만 만료 시각·근거 경보 번호가 붙은 거부 규칙이 되고, 같은 주소에 정상(record) 이벤트가 있으면 막지 않고 알림으로 낮춥니다.
// 경보가 모두 같은 PC(agent)에서 나오므로 PC 전체가 아니라 출발 주소 단위로 격리합니다. decide.mjs와 src/decider.mjs는 고치지 않습니다.
import { fileURLToPath } from 'node:url';
import { replay, respond } from '../brute-force/respond.mjs';
import { decide } from './decide.mjs';

export const respondPersistence = (alerts, now = Date.now()) => respond(alerts, now, decide);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await replay(new URL('../fixtures/persistence.json', import.meta.url), decide);
}
