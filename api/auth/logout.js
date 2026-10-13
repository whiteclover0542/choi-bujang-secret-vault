import { createClient } from '@supabase/supabase-js';
import { SESSION_COOKIE, readCookies, setCookie } from '../../src/notes-api.mjs';

// POST, Authorization: Bearer <access_token> 또는 세션 쿠키 → 204. 서버 전용 키로 그 세션의 refresh token을 모두 폐기하고 세션 쿠키를 지웁니다.
// 기기 쿠키는 지우지 않습니다(같은 기기로 다시 로그인).
// ponytail: 이미 발급된 access token은 만료(약 1시간)까지 유효합니다. 즉시 차단이 필요하면 세션 검사를 추가합니다.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
  const token = /^Bearer (\S+)$/u.exec(request.headers.authorization ?? '')?.[1] ?? readCookies(request)[SESSION_COOKIE];
  setCookie(response, SESSION_COOKIE, '', 0);
  if (token) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.auth.admin.signOut(token);
    if (error) console.error('logout: 세션 폐기 실패', error.status);
  }
  return response.status(204).end();
}
