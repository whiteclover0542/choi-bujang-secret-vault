// 운영 배포 점검 스크립트 공통: 11단계부터 로그인 세션·기기 ID는 HttpOnly 쿠키입니다.
// .env.local(이메일·비밀번호)과 .env.devices.local(승인된 시험 기기 ID, scripts/device-enroll.mjs가 만듦)을 학생 PC에서만 씁니다(둘 다 Git 제외).
// 쿠키·토큰·기기 ID·비밀번호는 출력하지 않습니다.
import { readFileSync } from 'node:fs';

export const { publicAppUrl } = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
export const SESSION_COOKIE = '__Host-vault-sid';
export const DEVICE_COOKIE = '__Host-vault-did';

const cookieValue = (res, name) => res.headers.getSetCookie()
  .map((c) => c.split(';')[0]).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

// session = { sid, did } 를 Cookie 헤더로 보냅니다.
export const api = (path, session, init = {}) => fetch(new URL(path, publicAppUrl), {
  ...init, redirect: 'error', signal: AbortSignal.timeout(15000),
  headers: {
    'Content-Type': 'application/json',
    ...(session ? { Cookie: [session.sid && `${SESSION_COOKIE}=${session.sid}`, session.did && `${DEVICE_COOKIE}=${session.did}`].filter(Boolean).join('; ') } : {}),
  },
});

// who = 'A' | 'B' | 'T'. useDevice가 false면 기기 쿠키 없이 로그인 세션만 만듭니다.
export async function login(who, { useDevice = true } = {}) {
  const email = process.env[`${who}_EMAIL`], password = process.env[`${who}_PASSWORD`];
  if (!email || !password) throw new Error(`.env.local에 ${who}_EMAIL·${who}_PASSWORD가 없습니다.`);
  const res = await api('/api/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) });
  if (!res.ok) {
    let message = '';
    try { message = String((await res.json())?.message ?? '').slice(0, 80); } catch { /* 비JSON */ }
    throw new Error(`${who} 로그인 실패: HTTP ${res.status} ${message}`);
  }
  const body = await res.json();
  const sid = cookieValue(res, SESSION_COOKIE);
  if (!sid) throw new Error(`${who} 로그인 응답에 세션 쿠키가 없습니다.`);
  return { sid, did: useDevice ? process.env[`${who}_DEVICE`] : undefined, tokenInBody: 'access_token' in body, setCookie: res.headers.getSetCookie() };
}

export { cookieValue };
export const logout = (session) => api('/api/auth/logout', session, { method: 'POST' }).catch(() => {});
