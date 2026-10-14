// 권한 가로채기(관리자 그룹 추가·관리자 명령·업무 시간 밖 권한 사용) 경보 판단.
// 심판은 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기·쓰기·바깥 요청 없이 혼자 계산합니다.
// 패턴 값은 patterns.json과 같아야 합니다(test/xdr-privilege.test.mjs가 확인).
export const PATTERNS = [
  {
    id: 'T1078.admin_group_add',
    name: '평범한 계정의 관리자 그룹 추가',
    condition: { mitre: ['T1078', 'T1068'], groupRegex: '^(administrators|domain admins|enterprise admins)$', textRegex: '관리자 그룹에 (추가|들어|다시)|관리자로 들어|관리자가 된', minLevel: 10 },
  },
  {
    id: 'T1068.unfamiliar_admin_command',
    name: '처음 보는 관리자 명령·권한 전환',
    condition: { mitre: ['T1068', 'T1078'], textRegex: '관리자 명령을 실행|권한 명령을 실행|명령 실행이 같이|관리자 권한으로 바뀌|다른 계정의 권한', minLevel: 10 },
  },
  {
    id: 'T1078.off_hours_privilege',
    name: '업무 시간 밖·처음 보는 주소의 권한 사용',
    condition: { mitre: ['T1068', 'T1078'], textRegex: '수업 시간 밖|업무처럼 보이지 않는 시각|처음 보는 주소|주소는 처음', workHours: { start: 8, end: 20 }, minLevel: 10 },
  },
];
// 권한 태그가 있어도 이 수준 아래면서 신호가 없으면 평소 이벤트로 봅니다.
const ALERT_LEVEL = 5;

const level = (alert) => Number(alert.rule?.level) || 0;
const tags = (alert) => (Array.isArray(alert.rule?.mitre) ? alert.rule.mitre : []);
// 경보에 적힌 현지 시각(…T09:15:00+09:00)의 시. 없으면 null.
const hour = (alert) => {
  const m = /T(\d{2}):/.exec(String(alert.timestamp ?? ''));
  return m ? Number(m[1]) : null;
};

function signal(p, alert) {
  const c = p.condition;
  if (new RegExp(c.textRegex).test(String(alert.rule?.description ?? ''))) return true;
  if (c.groupRegex && new RegExp(c.groupRegex, 'i').test(String(alert.data?.group ?? ''))) return true;
  const h = hour(alert);
  return Boolean(c.workHours) && h !== null && (h < c.workHours.start || h >= c.workHours.end);
}

const matches = (alert) => PATTERNS.filter((p) => p.condition.mitre.some((m) => tags(alert).includes(m)) && signal(p, alert));

const actionFor = (confidence) => (confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record');
const answer = (confidence, reason) => ({ action: actionFor(confidence), confidence, reason });
const names = (ps) => ps.map((p) => `${p.id} ${p.name}`).join(', ');

// 확신도는 경보가 패턴과 얼마나 뚜렷하게 맞는지입니다.
//   수준 10↑ + 패턴 신호 → 0.9(패턴 2개 이상이면 0.95) → block
//   신호는 있으나 수준 미달 → 0.7 → alert
//   권한 태그 + 수준 5↑, 신호 없음(관리자 아닌 그룹·조회만 등) → 0.55 → alert
//   권한 태그지만 수준 5 미만·신호 없음 → 0.2 → record, 태그 없음 → 0.1 → record
export function decide(alert) {
  const ps = matches(alert);
  const enough = level(alert) >= PATTERNS[0].condition.minLevel;
  if (ps.length && enough) return answer(ps.length >= 2 ? 0.95 : 0.9, `패턴: ${names(ps)}`);
  if (ps.length) return answer(0.7, `애매: ${names(ps)} 신호는 있으나 경보 수준 미달`);
  const tagged = tags(alert).some((m) => m === 'T1068' || m === 'T1078');
  if (tagged && level(alert) >= ALERT_LEVEL) return answer(0.55, '애매: 계정·권한 변경이지만 관리자 그룹·관리자 명령·평소와 다른 시간 신호 없음');
  if (tagged) return answer(0.2, '패턴 없음: 평소 범위의 계정·권한 이벤트');
  return answer(0.1, '패턴 없음: 권한 상승 신호가 없는 정상 이벤트');
}
