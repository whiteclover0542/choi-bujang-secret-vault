import { UUID, dbFailed, readNoteInput, requireUser } from '../../src/notes-api.mjs';

// GET·PUT /api/notices/:id
// 8단계: 공지 읽기는 로그인 사용자 누구나, 수정은 서버가 검증한 사용자 ID가 instructors 표에 있을 때만 허용합니다.
// 화면 메뉴·요청 본문·헤더의 role은 읽지 않습니다.
const notFound = response => response.status(404).json({ error: 'NOTICE_NOT_FOUND' });
const notInstructor = response => response.status(403).json({ error: 'NOT_INSTRUCTOR', message: '강사만 공지를 수정할 수 있습니다.' });

export default async function handler(request, response) {
  if (!['GET', 'PUT'].includes(request.method)) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response);
  if (!auth) return;
  const { user, db } = auth;
  const id = request.query.id;
  if (typeof id !== 'string' || !UUID.test(id)) return notFound(response);

  if (request.method === 'GET') {
    const { data, error } = await db.from('notices').select('id, title, body').eq('id', id).maybeSingle();
    if (error) return dbFailed(response, '공지 조회', error);
    return data ? response.status(200).json({ resource: `notice:${data.id}`, ...data }) : notFound(response);
  }

  // 수정 전에 저장된 강사 권한을 먼저 대조합니다. 강사가 아니면 공지가 있는지도 알려 주지 않습니다.
  const { data: instructor, error: roleError } = await db.from('instructors').select('user_id').eq('user_id', user.userId).maybeSingle();
  if (roleError) return dbFailed(response, '강사 권한 조회', roleError);
  if (!instructor) return notInstructor(response);

  const input = readNoteInput(request.body);
  if (!input) return response.status(400).json({ error: 'INVALID_NOTICE', message: 'title·body 문자열이 필요합니다.' });
  const { data, error } = await db.from('notices')
    .update({ ...input, updated_by: user.userId, updated_at: new Date().toISOString() })
    .eq('id', id).select('id, title, body').maybeSingle();
  if (error) return dbFailed(response, '공지 수정', error);
  return data ? response.status(200).json({ resource: `notice:${data.id}`, ...data }) : notFound(response);
}
