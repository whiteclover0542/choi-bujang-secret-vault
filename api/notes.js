import { randomUUID } from 'node:crypto';
import { UUID, dbFailed, readNoteInput, requireUser } from '../src/notes-api.mjs';

// GET /api/notes  : 로그인 사용자의 메모 목록
// POST /api/notes : {id?, title, body} → 201 {id}. owner_id는 서버가 확인한 사용자 ID
// 본문의 owner_id·userId는 읽지 않습니다. 이미 있는 id(남의 메모 포함)는 409로 거부합니다.
export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response);
  if (!auth) return;
  const { user, db } = auth;

  if (request.method === 'GET') {
    const { data, error } = await db.from('notes').select('id, title, body')
      .eq('owner_id', user.userId).order('created_at');
    if (error) return dbFailed(response, '목록 조회', error);
    return response.status(200).json({ notes: data });
  }

  const input = readNoteInput(request.body);
  const id = request.body?.id ?? randomUUID();
  if (!input || typeof id !== 'string' || !UUID.test(id)) {
    return response.status(400).json({ error: 'INVALID_NOTE', message: 'title·body 문자열과 UUID 형식 id가 필요합니다.' });
  }
  const { error } = await db.from('notes').insert({ id, owner_id: user.userId, ...input });
  if (error?.code === '23505') return response.status(409).json({ error: 'NOTE_ID_TAKEN' });
  if (error) return dbFailed(response, '추가', error);
  return response.status(201).json({ id });
}
