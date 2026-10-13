import { dbFailed, requireUser } from '../src/notes-api.mjs';

// GET /api/notices : 로그인 사용자 누구나 읽는 강사 공지 목록. 자원 ID는 notice:<id>로 메모(note:<id>)와 구분합니다.
// 공지 수정은 api/notices/[id].js에서 강사 표로만 허용합니다.
export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response);
  if (!auth) return;
  const { data, error } = await auth.db.from('notices').select('id, title, body').order('created_at');
  if (error) return dbFailed(response, '공지 목록 조회', error);
  return response.status(200).json({ notices: data.map(n => ({ resource: `notice:${n.id}`, ...n })) });
}
