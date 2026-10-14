// 권한 가로채기 decide 결과를 XDR-01~04와 같은 차단 목록(xdr/blocklist.json)·알림 기록(xdr/alerts.log)으로 잇습니다.
// block만 만료 시각·근거 경보 번호가 붙은 거부 규칙이 되고, 같은 주소에 정상(record) 이벤트가 있으면 막지 않고 알림으로 낮춥니다.
// 계정 단위로 막으면 같은 계정의 정상 로그인(예: user01)까지 막혀서, 공격이 들어온 출발 주소의 세션만 거둡니다. decide.mjs와 src/decider.mjs는 고치지 않습니다.
import { fileURLToPath } from 'node:url';
import { replay, respond } from '../brute-force/respond.mjs';
import { decide } from './decide.mjs';

export const respondPrivilege = (alerts, now = Date.now()) => respond(alerts, now, decide);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await replay(new URL('../fixtures/privilege.json', import.meta.url), decide);
}
