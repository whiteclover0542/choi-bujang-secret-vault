import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createLoginVerifier } from './verify-login.mjs';

// 메모 API 공통: 서버가 토큰을 검사해 확인한 사용자 ID만 씁니다.
// 브라우저가 보낸 userId·role·owner_id는 믿지 않습니다.
const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
let verifyLogin;
let db;

// 11단계: 브라우저 로그인 세션과 기기 ID는 서버가 HttpOnly 쿠키로만 둡니다(화면 스크립트가 읽을 수 없음).
// 기기 ID는 서버가 만든 무작위 값이고 기기 개인키가 아닙니다. DB에는 SHA-256 해시만 저장합니다.
export const SESSION_COOKIE = '__Host-vault-sid';
export const DEVICE_COOKIE = '__Host-vault-did';
export const DEVICE_ID = /^[A-Za-z0-9_-]{43}$/u;
export const deviceHash = id => createHash('sha256').update(id).digest('hex');

export function readCookies(request) {
  const cookies = {};
  for (const part of String(request.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) cookies[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return cookies;
}

export function setCookie(response, name, value, maxAgeSeconds) {
  const cookie = `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`;
  const prev = response.getHeader('Set-Cookie');
  response.setHeader('Set-Cookie', [...(Array.isArray(prev) ? prev : prev ? [prev] : []), cookie]);
}

// 로그인 사용자와 DB 클라이언트를 돌려줍니다. 실패하면 응답을 보내고 null을 돌려줍니다.
// 토큰은 Authorization: Bearer(심판·점검 스크립트) 또는 서버가 둔 세션 쿠키(브라우저)에서 받습니다.
// device가 true면 학생 로그인은 승인된 기기 쿠키가 있어야 합니다. 심판 토큰은 반 엔진이 기기를 먼저 확인하므로 제외합니다.
export async function requireUser(request, response, { device = true } = {}) {
  response.setHeader('Cache-Control', 'no-store');
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('notes: SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 없습니다.');
    response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
    return null;
  }
  verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey: SUPABASE_SECRET_KEY });
  const cookies = readCookies(request);
  const authorization = request.headers.authorization
    ?? (cookies[SESSION_COOKIE] ? `Bearer ${cookies[SESSION_COOKIE]}` : undefined);
  const user = await verifyLogin(authorization);
  if (!user) {
    response.status(401).json({ error: 'LOGIN_REQUIRED', message: '로그인이 필요합니다.' });
    return null;
  }
  db ??= createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (device && user.kind === 'student') {
    const id = cookies[DEVICE_COOKIE];
    let approved = null;
    if (id && DEVICE_ID.test(id)) {
      const { data, error } = await db.from('devices').select('status')
        .eq('user_id', user.userId).eq('device_hash', deviceHash(id)).eq('status', 'approved').maybeSingle();
      if (error) { dbFailed(response, '기기 승인 조회', error); return null; }
      approved = data;
    }
    if (!approved) {
      response.status(403).json({ error: 'DEVICE_NOT_APPROVED', message: '승인된 기기에서만 자료를 열 수 있습니다.' });
      return null;
    }
  }
  return { user, db, cookies };
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
