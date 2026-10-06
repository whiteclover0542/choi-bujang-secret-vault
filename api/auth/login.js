import { createClient } from '@supabase/supabase-js';

// 5단계: 로그인도 서버 함수가 대신 Supabase Auth를 부릅니다. 브라우저에는 Supabase 주소·키가 없습니다.
// POST {email, password} → 200 {access_token, expires_at, email}. 비밀번호와 refresh token은 돌려주지도 기록하지도 않습니다.
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });

  const { email, password } = request.body && typeof request.body === 'object' ? request.body : {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password
      || email.length > 320 || password.length > 200) {
    return response.status(400).json({ error: 'INVALID_LOGIN', message: '이메일과 비밀번호를 입력해 주세요.' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return response.status(401).json({ error: 'LOGIN_FAILED', message: error?.message ?? '로그인하지 못했습니다.' });
  }
  return response.status(200).json({
    access_token: data.session.access_token,
    expires_at: data.session.expires_at,
    email: data.user.email,
  });
}
