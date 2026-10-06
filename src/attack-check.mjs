// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
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
