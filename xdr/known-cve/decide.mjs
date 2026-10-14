// 알려진 취약점(CVE-2021-44228, Log4Shell) 악용 경보 판단.
// 심판은 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기·쓰기·바깥 요청 없이 혼자 계산합니다.
// 패턴 값은 patterns.json과 같아야 합니다(test/xdr-known-cve.test.mjs가 확인).
export const PATTERNS = [
  {
    id: 'CVE-2021-44228.jndi_lookup',
    name: '요청 머리글·인자 속 원격 조회 구문',
    condition: { mitre: 'T1190', lookupRegex: '\\$\\{jndi:(ldaps?|rmi|dns|iiop|corba|nds|nis|https?)://', fields: ['url', 'useragent'], minLevel: 10 },
  },
  {
    id: 'T1190.scanner_trace',
    name: '알려진 취약점 점검 도구 흔적',
    condition: { mitre: 'T1190', textRegex: '취약점 점검 흔적', userAgentRegex: 'nuclei|zgrab|masscan|log4j-?scan|jndi-?scan|interactsh', minLevel: 10 },
  },
];
const [LOOKUP, SCANNER] = PATTERNS;

// 주소는 2000자까지, 최대 두 번 디코딩하고 소문자로 바꿉니다. 문자열로만 다루고 실행하지 않습니다.
function decode(raw) {
  let s = String(raw ?? '').slice(0, 2000);
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(s.replace(/\+/g, ' '));
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  return s.toLowerCase();
}

// ${lower:j}·${upper:n}·${::-d}·${env:X:-i} 같은 끼워 넣기를 풀어 숨긴 jndi 구문도 드러냅니다.
function unwrap(text) {
  let s = text;
  for (let i = 0; i < 6; i++) {
    const next = s.replace(/\$\{(?:lower|upper):([^{}]*)\}/g, '$1').replace(/\$\{[^{}]*?:-([^{}]*)\}/g, '$1');
    if (next === s) break;
    s = next;
  }
  return s;
}

const tagged = (alert) => (alert.rule?.mitre ?? []).includes('T1190');
const level = (alert) => Number(alert.rule?.level) || 0;

function hasLookup(alert) {
  const c = LOOKUP.condition;
  const re = new RegExp(c.lookupRegex);
  return c.fields.some((field) => re.test(unwrap(decode(alert.data?.[field]))));
}

function hasScannerTrace(alert) {
  const c = SCANNER.condition;
  return new RegExp(c.textRegex).test(String(alert.rule?.description ?? ''))
    || new RegExp(c.userAgentRegex, 'i').test(String(alert.data?.useragent ?? ''));
}

const actionFor = (confidence) => (confidence >= 0.85 ? 'block' : confidence >= 0.5 ? 'alert' : 'record');
const answer = (confidence, reason) => ({ action: actionFor(confidence), confidence, reason });

// 확신도는 경보가 패턴과 얼마나 뚜렷하게 맞는지입니다.
//   완전한 원격 조회 구문 + 수준 기준 → 0.95(점검 도구 흔적까지 있으면 0.97) → block
//   구문은 있으나 수준 미달, 또는 점검 도구 흔적만 → 0.7 → alert
//   T1190 경보지만 구문·흔적 없음(글자만, 잘린 형태 등) → 0.5 → alert
//   T1190 아님 → 0.1 → record
export function decide(alert) {
  const lookup = hasLookup(alert);
  const scanner = hasScannerTrace(alert);
  const enough = level(alert) >= LOOKUP.condition.minLevel;
  if (tagged(alert) && lookup && enough) {
    return scanner
      ? answer(0.97, `패턴: ${LOOKUP.id} ${LOOKUP.name}, ${SCANNER.id} ${SCANNER.name}`)
      : answer(0.95, `패턴: ${LOOKUP.id} ${LOOKUP.name}`);
  }
  if (tagged(alert) && lookup) return answer(0.7, `애매: ${LOOKUP.id} 구문은 있으나 경보 수준 미달`);
  if (tagged(alert) && scanner) return answer(0.7, `애매: ${SCANNER.id} ${SCANNER.name}만 있고 원격 조회 구문 없음`);
  if (tagged(alert)) return answer(0.5, '애매: T1190 경보지만 원격 조회 구문·점검 도구 흔적 없음');
  return answer(0.1, '패턴 없음: 알려진 취약점 악용 신호가 없는 정상 이벤트');
}
