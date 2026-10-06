import { createClient } from '@supabase/supabase-js';

// 2단계: 가상 메모를 서버 전용 키로 학습용 DB에서 읽습니다.
// 약점: 아직 로그인 확인이 없어 이 주소를 아는 누구나 호출할 수 있습니다(3단계에서 막음).
export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('notes: SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 없습니다.');
    return response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('notes').select('title, content').order('id');
  if (error) {
    console.error('notes: DB 조회 실패', error.code);
    return response.status(502).json({ error: 'NOTES_READ_FAILED' });
  }
  return response.status(200).json({ notes: data });
}
