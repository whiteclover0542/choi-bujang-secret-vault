// 11단계 기기 승인 실측(운영 배포).
// 실행: node --env-file=.env.local --env-file=.env.devices.local scripts/stage11-live-check.mjs
// 상태 코드·건수·기기 번호만 출력합니다. 쿠키·토큰·기기 ID·메모 본문은 출력하지 않습니다.
// 주의: 매번 "새 기기 승인 요청" 시험용 pending 행이 하나씩 생깁니다(승인하지 않으면 권한 없음).
import { DEVICE_COOKIE, api, cookieValue, login, logout } from './live-session.mjs';

const rows = [];
const check = (name, ok, detail) => rows.push(`${ok ? '통과' : '확인 필요'} · ${name} → ${detail}`);
const json = async (res) => { try { return await res.json(); } catch { return {}; } };
const sessions = [];
try {
  // 정적 파일: 설치형 웹앱 설정·오프라인 안내
  for (const path of ['/manifest.webmanifest', '/sw.js', '/offline.html', '/icon.svg']) {
    const res = await api(path, null);
    check(`정적 ${path}`, res.status === 200, `HTTP ${res.status} ${res.headers.get('content-type') ?? ''}`);
  }
  const anon = await api('/api/devices/me', null);
  check('로그인 없이 기기 상태', anon.status === 401, `HTTP ${anon.status}`);

  // 로그인: 토큰은 응답 본문에 없고 HttpOnly 쿠키로만
  const bare = await login('A', { useDevice: false });
  sessions.push(bare);
  const sidCookie = bare.setCookie.find((c) => c.startsWith('__Host-vault-sid=')) ?? '';
  check('로그인 응답 본문에 토큰 없음', !bare.tokenInBody, bare.tokenInBody ? 'access_token 있음' : '없음');
  check('세션 쿠키 HttpOnly·Secure·SameSite=Strict', /HttpOnly/i.test(sidCookie) && /Secure/i.test(sidCookie) && /SameSite=Strict/i.test(sidCookie), '속성 확인');

  // 기기 쿠키 없음 → 자료 없음
  const noDevice = await api('/api/notes', bare);
  const noDeviceBody = await json(noDevice);
  check('기기 없이 메모 목록', noDevice.status === 403 && !('notes' in noDeviceBody), `HTTP ${noDevice.status} ${noDeviceBody.error ?? ''}, 메모 ${Array.isArray(noDeviceBody.notes) ? noDeviceBody.notes.length : 0}건`);
  const me0 = await json(await api('/api/devices/me', bare));
  check('기기 없이 상태', me0.status === 'none', me0.status);

  // 새 기기 승인 요청만으로는 권한 없음
  const req = await api('/api/devices/request', bare, { method: 'POST' });
  const reqBody = await json(req);
  const fresh = { sid: bare.sid, did: cookieValue(req, DEVICE_COOKIE) };
  check('새 기기 승인 요청', req.status === 201 && reqBody.status === 'pending', `HTTP ${req.status} ${reqBody.status ?? reqBody.error} 기기 번호 ${reqBody.deviceRef ?? '-'}`);
  const pendingNotes = await api('/api/notes', fresh);
  check('승인 대기 기기로 메모 목록', pendingNotes.status === 403, `HTTP ${pendingNotes.status} ${(await json(pendingNotes)).error ?? ''}`);

  // 승인된 시험 기기 → 기존 자료실 정상
  if (!process.env.A_DEVICE) throw new Error('.env.devices.local에 A_DEVICE가 없습니다. scripts/device-enroll.mjs와 SQL 승인을 먼저 하세요.');
  const approved = { sid: bare.sid, did: process.env.A_DEVICE };
  const me = await json(await api('/api/devices/me', approved));
  check('승인 기기 상태', me.status === 'approved', `${me.status} 기기 번호 ${me.deviceRef ?? '-'}`);
  const ok = await api('/api/notes', approved);
  const okBody = await json(ok);
  check('승인 기기로 메모 목록', ok.status === 200 && Array.isArray(okBody.notes), `HTTP ${ok.status}, 메모 ${okBody.notes?.length ?? 0}건`);
  const notices = await api('/api/notices', approved);
  check('승인 기기로 공지 목록', notices.status === 200, `HTTP ${notices.status}`);
} catch (error) {
  rows.push(`첫 오류 · ${error.message}`);
  process.exitCode = 1;
} finally {
  for (const s of sessions) await logout(s);
  console.log(rows.join('\n'));
  if (rows.some((r) => r.startsWith('확인 필요'))) process.exitCode = 1;
}
