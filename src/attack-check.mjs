// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
// 12단계: 심판 격리 실행기에서 불러오기가 실패하지 않도록 scripts/ 파일을 불러오지 않고 이 파일 안에서 가상 요청을 만듭니다.
// 쓰는 것은 같은 폴더의 판정기·탐지 함수와 허용된 node:fs(readFileSync)·node:crypto(randomUUID·sha256)뿐입니다.
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { detect } from './detect.mjs';
import { decide, RULE_IDS } from './decider.mjs';

const sha256 = text => createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');
// 판정 요청 계약(docs/DECIDER_REQUEST.md) 모양의 가상 요청. 값은 scripts/fixture-7.mjs와 같습니다.
const engineRequest = (overrides = {}) => ({
  schema: 'aleph.decision.v1', requestId: randomUUID(), classId: 'class_fixture', projectId: 'project_fixture',
  subjectId: 'learner_fixture', deviceId: 'a'.repeat(16), service: 'notes', method: 'GET', path: '/notes/demo',
  route: 'GET /notes/:id', queryLength: 0, querySha256: sha256(''), at: new Date().toISOString(), policyRevision: 1,
  deviceRegistered: true, stepUp: { verified: false, authAgeSeconds: null }, recentEvents: [],
  signals: { source: 'judge_fixture', region: 'local', network: 'usual', hour: 14 }, ...overrides,
});
const SUSPICIOUS = { signals: { source: 'judge_fixture', region: 'foreign', network: 'unusual', hour: 3 },
  recentEvents: [{ kind: 'risk_signal', ageSeconds: 60, count: 20 }] };
// 응답이 계약의 다섯 항목·요청 ID·규칙 이름을 지키는지까지 확인합니다.
const validDecision = (request, out) => out && typeof out === 'object'
  && Object.keys(out).sort().join(',') === 'decision,reasonCode,requestId,ruleIds,schema'
  && out.schema === 'aleph.decision.v1' && out.requestId === request.requestId
  && Array.isArray(out.ruleIds) && out.ruleIds.length > 0 && out.ruleIds.every(id => RULE_IDS.includes(id));
// 탐지 계약(docs/DETECT_EVENTS.md)의 가상 조회 사건. 값은 scripts/detect-test.mjs와 같습니다.
const reads = (count, intervalSeconds = 2, sub = 'learner_fixture') => Array.from({ length: count }, (_, i) => ({
  at: new Date(Date.UTC(2026, 9, 1) + i * intervalSeconds * 1000).toISOString(), method: 'GET', identity: { sub } }));
const OBSERVE = { action: 'observe' };
const BURST = { action: 'propose_revocation', reasonCode: 'burst_read', subject: 'learner_fixture' };
const DETECT_CASES = [
  ['정상 조회 30건', reads(30), OBSERVE], ['10분 안에 120건', reads(120), OBSERVE],
  ['10분 안에 121건', reads(121), BURST], ['폭주 조회 200건', reads(200), BURST],
  ['서로 다른 사용자 각 100건', [...reads(100), ...reads(100, 2, 'other_fixture')].sort((a, b) => a.at.localeCompare(b.at)), OBSERVE],
  ['10분 밖으로 흩어진 조회 200건', reads(200, 7), OBSERVE],
];
const sameFlat = (a, b) => Boolean(a) && typeof a === 'object' && Object.keys(a).length === Object.keys(b).length
  && Object.keys(b).every(key => a[key] === b[key]);
const get = (path, app) => fetch(new URL(path, app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
const noteCount = async response => {
  if (!response.ok) return 0;
  try {
    const data = await response.json();
    return Array.isArray(data?.notes) ? data.notes.length : 0;
  } catch {
    return 0; // A non-JSON response has no readable notes.
  }
};

export async function runAttackChecks(config) {
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (config.step === 1) {
    if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');
    const response = await get('/data.json', app);
    let visible = false;
    if (response.ok) {
      try {
        const data = await response.json();
        visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
          && data.notes.length > 0;
      } catch {
        // A non-JSON response is a failed check, not a successful deployment.
      }
    }
    return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인',
      observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})` }];
  }
  if (config.step >= 3 && config.step <= 12) {
    // 로그인 없이 보낸 요청만 직접 점검합니다. A·B 로그인 점검은 비밀번호가 필요해 여기서 실행하지 않습니다.
    const tries = [
      ['anonymous_list_read', 'GET', '/api/notes'],
      ['anonymous_note_create', 'POST', '/api/notes'],
      ['anonymous_note_read_by_id', 'GET', '/api/notes/00000000-0000-4000-8000-000000000000'],
      ['forged_user_header', 'GET', '/api/notes'],
      // 8단계: 강사 공지 구역도 로그인 없이는 읽거나 고칠 수 없어야 합니다.
      ...(config.step >= 8 ? [
        ['anonymous_notice_read', 'GET', '/api/notices'],
        ['anonymous_notice_update', 'PUT', '/api/notices/00000000-0000-4000-8000-000000000000'],
      ] : []),
      // 10단계: 메모 복원 경로도 로그인 없이는 거부되어야 합니다.
      ...(config.step >= 10 ? [['anonymous_note_restore', 'POST', '/api/notes/00000000-0000-4000-8000-000000000000/restore']] : []),
      // 11단계: 기기 승인 상태도 로그인 없이는 알려 주지 않아야 합니다.
      ...(config.step >= 11 ? [['anonymous_device_status', 'GET', '/api/devices/me']] : []),
      // 12단계: 작전실 요약도 로그인 없이는 거부되어야 합니다.
      ...(config.step >= 12 ? [['anonymous_ops_summary', 'GET', '/api/ops/summary']] : []),
    ];
    const results = [];
    for (const [attackId, method, path] of tries) {
      // 심판 격리 환경은 공개 HTTPS 주소에 GET·HEAD만 보낼 수 있습니다. 쓰기 요청 점검은 보내지 않고 not_run으로 남깁니다.
      if (!['GET', 'HEAD'].includes(method)) {
        results.push({ attackId, expected: `로그인 없는 ${method} ${path.replace(/[0-9a-f-]{36}/u, ':id')}는 401·403 JSON으로 거부`,
          observed: 'not_run: 쓰기 요청은 제출 묶음 점검에서 보내지 않음(운영 배포 실측은 docs/verification 실측표)' });
        continue;
      }
      // 12단계: 심판 실행기가 요청을 점검과 맞춰 볼 수 있게 attackId를 헤더에 표시합니다(서버는 이 값을 읽지 않음).
      const headers = { 'Content-Type': 'application/json', 'X-Aleph-Attack-Id': attackId };
      if (attackId === 'forged_user_header') Object.assign(headers, { 'X-User-Id': '00000000-0000-4000-8000-000000000000', 'X-Role': 'admin' });
      // 심판 실행기는 fetch 옵션의 alephEvidence(caseId = attackId, 요청마다 새 requestKey)로 요청과 점검을 맞춰 봅니다.
      // 일반 Node fetch는 이 옵션을 무시하므로 실제 요청은 같습니다.
      const res = await fetch(new URL(path, app), { method, headers, redirect: 'error', signal: AbortSignal.timeout(10000),
        alephEvidence: { caseId: attackId, requestKey: randomUUID() } });
      // observed에는 실행기가 기록한 응답과 대조할 수 있도록 사실값(HTTP 상태)만 적고, 설명은 expected에 둡니다.
      results.push({ attackId, expected: `로그인 없는 ${method} ${path.replace(/[0-9a-f-]{36}$/u, ':id')}는 401·403 JSON으로 거부(메모 없음)`,
        observed: `HTTP ${res.status}` });
    }
    if (config.step >= 6) {
      // 6~8단계: 로컬 판정기에 계약 모양의 가상 요청을 보내 봅니다. 미등록 기기·복합 이상 접속·구역 밖 요청의 실제 공격은 심판이 맡습니다.
      const DECIDER_CHECKS = [
        [6, 'registered_device_request', '로컬 판정기: 등록 기기 정상 요청은 allow', {}, 'allow'],
        [6, 'unregistered_device_request', '로컬 판정기: 미등록 기기 가상 요청은 deny·device_not_registered', { deviceRegistered: false }, 'deny', 'device_not_registered'],
        [7, 'unusual_access_step_up', '로컬 판정기: 새벽·처음 보는 네트워크·대량 요청 가상 사건은 step_up·step_up_required', SUSPICIOUS, 'step_up', 'step_up_required'],
        [7, 'unusual_access_after_relogin', '로컬 판정기: 엔진이 검증한 새 로그인 뒤 같은 사건은 allow', { ...SUSPICIOUS, stepUp: { verified: true, authAgeSeconds: 60 } }, 'allow'],
        [8, 'student_notice_update_zone', '로컬 판정기: 공지 수정은 역할 계약이 없어 deny·instructor_required', { method: 'PUT', route: 'PUT /notices/:id', path: '/notices/demo' }, 'deny', 'instructor_required'],
        [8, 'unknown_route_zone', '로컬 판정기: 구역 목록에 없는 경로는 deny·route_not_allowed', { route: 'GET /notes/export', path: '/notes/export' }, 'deny', 'route_not_allowed'],
      ];
      for (const [fromStep, attackId, expected, overrides, decision, reasonCode] of DECIDER_CHECKS) {
        if (config.step < fromStep) continue;
        const request = engineRequest(overrides);
        const out = await decide(request);
        const ok = validDecision(request, out) && out.decision === decision && (!reasonCode || out.reasonCode === reasonCode);
        results.push({ attackId, expected,
          observed: `not_run: 네트워크 요청 없음. 로컬 판정기 가상 요청 ${out?.decision}·${out?.reasonCode} (${ok ? '기대와 같음' : '기대와 다름'}, 심판 판정 아님)` });
      }
    }
    if (config.step >= 9) {
      // 9단계: 로컬 탐지 함수에 가상 조회 사건을 보내 봅니다. 실제 회수와 경과 시간은 심판이 확인합니다.
      // 제출 묶음 점검 상한(20개) 때문에 탐지 연습 6건은 한 줄로 묶어 기록합니다.
      const failed = [];
      for (const [name, events, want] of DETECT_CASES) if (!sameFlat(await detect(events), want)) failed.push(name);
      results.push({ attackId: 'detect_practice_cases', expected: '로컬 탐지: 같은 사용자 GET 10분 120건 초과만 propose_revocation·burst_read, 나머지 observe',
        observed: `not_run: 네트워크 요청 없음. 로컬 탐지 가상 사건 ${DETECT_CASES.length}건 중 ${DETECT_CASES.length - failed.length}건 기대와 같음${failed.length ? ` (다름: ${failed.join(', ')})` : ''} (실제 회수·심판 판정 아님)` });
    }
    if (config.step >= 10) {
      // 10단계: 검증한 정책 사본을 다시 읽어 해시를 확인하고, 현재 시험 정책과 같은지 봅니다(파일은 바꾸지 않음).
      let observed;
      try {
        const manifest = JSON.parse(readFileSync(new URL('../backup/policy/manifest.json', import.meta.url), 'utf8'));
        const backupOk = sha256(readFileSync(new URL('../backup/policy/decider.mjs', import.meta.url), 'utf8')) === manifest.sha256;
        const same = sha256(readFileSync(new URL('./decider.mjs', import.meta.url), 'utf8')) === manifest.sha256;
        observed = `not_run: 네트워크 요청 없음. ${backupOk ? `정책 사본 ${manifest.version} 해시 확인, 현재 시험 정책과 ${same ? '같음' : '다름'}` : `정책 사본 ${manifest.version} 해시 불일치`}`;
      } catch { observed = 'not_run: 네트워크 요청 없음. 검증한 정책 사본을 읽을 수 없음'; }
      results.push({ attackId: 'policy_backup_verify', expected: '검증한 정책 사본의 해시가 맞고 현재 시험 정책과 같아야 함', observed });
    }
    if (config.step >= 7) {
      results.push({ attackId: 'relogin_live_block', expected: '재로그인 전 실제 자료 차단, 새 로그인 뒤 요청 허용',
        observed: 'not_run: 새 로그인 시각을 검증하는 제공 엔진이 이 환경에 없어 실제 요청을 보내지 않음' });
    }
    if (config.step >= 4) {
      // 공개 키(anon)로 원본 자료 주소를 직접 읽어 봅니다. 5단계부터 화면 코드에는 키가 없어 환경변수로 받습니다.
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!key) {
        results.push({ attackId: 'anon_data_api_read', expected: 'anon 키로 원본 자료 직접 조회는 권한 없음으로 거부',
          observed: 'not_run: SUPABASE_PUBLISHABLE_KEY 환경변수가 없어 요청을 보내지 않음' });
        return results;
      }
      const restUrl = new URL('?select=id&limit=1', config.originalApiUrl ?? new URL('/rest/v1/notes', config.identityProvider.issuer));
      const res = await fetch(restUrl, { headers: { apikey: key, Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(10000) });
      results.push({ attackId: 'anon_data_api_read', expected: 'anon 키로 원본 자료 직접 조회는 권한 없음으로 거부(행 0건)',
        observed: `HTTP ${res.status}` });
    }
    return results;
  }
  if (config.step !== 2) throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');

  const staticRes = await get('/data.json', app);
  const staticNotes = await noteCount(staticRes);
  const apiRes = await get('/api/notes', app);
  const apiNotes = await noteCount(apiRes);
  return [
    { attackId: 'anonymous_static_note_read', expected: '공개 /data.json에 가상 메모가 없어야 함',
      observed: staticNotes ? `공개 /data.json에서 메모 ${staticNotes}건이 보임 (HTTP ${staticRes.status})` : `공개 /data.json에서 메모가 보이지 않음 (HTTP ${staticRes.status})` },
    { attackId: 'anonymous_api_note_read', expected: '2단계의 남은 약점: 비로그인 /api/notes 호출이 아직 열려 있음(3단계에서 막음)',
      observed: apiNotes ? `비로그인 /api/notes 요청에서 메모 ${apiNotes}건이 응답됨 (HTTP ${apiRes.status})` : `비로그인 /api/notes 요청에서 메모가 응답되지 않음 (HTTP ${apiRes.status})` },
  ];
}
