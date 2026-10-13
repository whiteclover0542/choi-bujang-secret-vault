// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
import { checkDecider } from '../scripts/decider-test.mjs';
import { fixtureRequests } from '../scripts/fixture-7.mjs';
import { checkDetection } from '../scripts/detect-test.mjs';
import { detect } from './detect.mjs';
import { diffPolicy } from '../scripts/policy-restore.mjs';
import { decide, RULE_IDS } from './decider.mjs';
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
  if (config.step >= 3 && config.step <= 11) {
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
    ];
    const results = [];
    for (const [attackId, method, path] of tries) {
      const headers = { 'Content-Type': 'application/json' };
      if (attackId === 'forged_user_header') Object.assign(headers, { 'X-User-Id': '00000000-0000-4000-8000-000000000000', 'X-Role': 'admin' });
      const res = await fetch(new URL(path, app), { method, headers, redirect: 'error', signal: AbortSignal.timeout(10000),
        body: ['POST', 'PUT'].includes(method) ? JSON.stringify({ title: '무로그인 시도', body: '거부되어야 함', role: 'instructor' }) : undefined });
      const json = (res.headers.get('content-type') ?? '').includes('application/json');
      const notes = await noteCount(res);
      results.push({ attackId, expected: `로그인 없는 ${method} ${path.replace(/[0-9a-f-]{36}$/u, ':id')}는 401·403 JSON으로 거부`,
        observed: `HTTP ${res.status}${json ? ' JSON' : ' 비JSON'} 응답${notes ? `, 메모 ${notes}건 노출` : ', 메모 없음'}` });
    }
    if (config.step >= 6) {
      // 6·7단계: 로컬 판정기에 가상 요청을 보내 봅니다. 미등록 기기·복합 이상 접속의 실제 공격은 심판이 맡습니다.
      const DECIDER_CHECKS = {
        '등록 기기의 정상 요청': ['registered_device_request', '로컬 판정기: 등록 기기 정상 요청은 allow'],
        '미등록 기기의 가상 요청': ['unregistered_device_request', '로컬 판정기: 미등록 기기 가상 요청은 deny·device_not_registered'],
        '복합 이상 접속': ['unusual_access_step_up', '로컬 판정기: 새벽·처음 보는 네트워크·대량 요청 가상 사건은 step_up·step_up_required'],
        '다시 확인한 복합 이상 접속': ['unusual_access_after_relogin', '로컬 판정기: 엔진이 검증한 새 로그인 뒤 같은 사건은 allow'],
      };
      for (const { name, passed } of await checkDecider({ decide, ruleIds: RULE_IDS })) {
        const [attackId, expected] = DECIDER_CHECKS[name] ?? [];
        if (!attackId) continue;
        results.push({ attackId, expected,
          observed: `로컬 판정기 가상 요청 결과 ${passed ? '기대와 같음' : '기대와 다름'} (심판 판정 아님)` });
      }
    }
    if (config.step >= 8) {
      // 8단계: 로컬 판정기에 구역 밖 가상 요청을 보내 봅니다(엔진 요청 모양, 심판 판정 아님).
      const { normal } = fixtureRequests();
      const zone = async (method, route, path) => decide({ ...normal, method, route: `${method} ${route}`, path });
      const noticeEdit = await zone('PUT', '/notices/:id', '/notices/demo');
      const unknown = await zone('GET', '/notes/export', '/notes/export');
      results.push(
        { attackId: 'student_notice_update_zone', expected: '로컬 판정기: 공지 수정은 역할 계약이 없어 deny·instructor_required',
          observed: `로컬 판정기 가상 요청 ${noticeEdit.decision}·${noticeEdit.reasonCode} (심판 판정 아님)` },
        { attackId: 'unknown_route_zone', expected: '로컬 판정기: 구역 목록에 없는 경로는 deny·route_not_allowed',
          observed: `로컬 판정기 가상 요청 ${unknown.decision}·${unknown.reasonCode} (심판 판정 아님)` },
      );
    }
    if (config.step >= 9) {
      // 9단계: 로컬 탐지 함수에 가상 조회 사건을 보내 봅니다. 실제 회수와 경과 시간은 심판이 확인합니다.
      // 제출 묶음 점검 상한(20개) 때문에 탐지 연습 6건은 한 줄로 묶어 기록합니다.
      const cases = await checkDetection(detect);
      const failed = cases.filter((c) => !c.passed).map((c) => c.name);
      results.push({ attackId: 'detect_practice_cases', expected: '로컬 탐지: 같은 사용자 GET 10분 120건 초과만 propose_revocation·burst_read, 나머지 observe',
        observed: `로컬 탐지 가상 사건 ${cases.length}건 중 ${cases.length - failed.length}건 기대와 같음${failed.length ? ` (다름: ${failed.join(', ')})` : ''} (실제 회수·심판 판정 아님)` });
    }
    if (config.step >= 10) {
      // 10단계: 검증한 정책 사본을 다시 읽어 해시를 확인하고, 현재 시험 정책과 차이를 셉니다(파일은 바꾸지 않음).
      let observed;
      try {
        const diff = await diffPolicy();
        observed = `정책 사본 ${diff.version} 해시 확인, 현재 시험 정책과 ${diff.fileSame ? '같음' : `다름(바뀔 항목 ${diff.changes.length}개)`}`;
      } catch (error) { observed = `중단: ${error.message}`; }
      results.push({ attackId: 'policy_backup_verify', expected: '검증한 정책 사본의 해시가 맞고 현재 시험 정책과 같아야 함', observed });
    }
    if (config.step >= 7) {
      results.push({ attackId: 'relogin_live_block', expected: '재로그인 전 실제 자료 차단, 새 로그인 뒤 요청 허용',
        observed: '미실행: 새 로그인 시각을 검증하는 제공 엔진이 이 환경에 없어 실제 요청을 보내지 않음' });
    }
    if (config.step >= 4) {
      // 공개 키(anon)로 원본 자료 주소를 직접 읽어 봅니다. 5단계부터 화면 코드에는 키가 없어 환경변수로 받습니다.
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!key) {
        results.push({ attackId: 'anon_data_api_read', expected: 'anon 키로 원본 자료 직접 조회는 권한 없음으로 거부',
          observed: '미실행: SUPABASE_PUBLISHABLE_KEY 환경변수가 없어 요청을 보내지 않음' });
        return results;
      }
      const restUrl = new URL('?select=id&limit=1', config.originalApiUrl ?? new URL('/rest/v1/notes', config.identityProvider.issuer));
      const res = await fetch(restUrl, { headers: { apikey: key, Authorization: `Bearer ${key}` }, redirect: 'error', signal: AbortSignal.timeout(10000) });
      let rows = 0;
      try { const data = await res.json(); rows = Array.isArray(data) ? data.length : 0; } catch { /* 비JSON은 0건 */ }
      results.push({ attackId: 'anon_data_api_read', expected: 'anon 키로 원본 자료 직접 조회는 권한 없음으로 거부',
        observed: `HTTP ${res.status}, 행 ${rows}건` });
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
