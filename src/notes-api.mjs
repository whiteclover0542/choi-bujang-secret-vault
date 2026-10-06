import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createLoginVerifier } from './verify-login.mjs';

// 메모 API 공통: 서버가 토큰을 검사해 확인한 사용자 ID만 씁니다.
// 브라우저가 보낸 userId·role·owner_id는 믿지 않습니다.
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
let verifyLogin;
let db;

// 로그인 사용자와 DB 클라이언트를 돌려줍니다. 실패하면 응답을 보내고 null을 돌려줍니다.
export async function requireUser(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('notes: SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 없습니다.');
    response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
    return null;
  }
  verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey: SUPABASE_SECRET_KEY });
  const user = await verifyLogin(request.headers.authorization);
  if (!user) {
    response.status(401).json({ error: 'LOGIN_REQUIRED', message: '로그인이 필요합니다.' });
    return null;
  }
  db ??= createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user, db };
}

// 제목 1~100자, 본문 0~2000자 문자열만 받습니다.
export function readNoteInput(body) {
  const { title, body: text } = body && typeof body === 'object' ? body : {};
  if (typeof title !== 'string' || !title.trim() || title.length > 100
      || typeof text !== 'string' || text.length > 2000) return null;
  return { title: title.trim(), body: text };
}

export function dbFailed(response, where, error) {
  console.error(`notes: ${where} 실패`, error?.code);
  return response.status(502).json({ error: 'NOTES_DB_FAILED' });
}
