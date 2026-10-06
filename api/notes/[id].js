import { UUID, dbFailed, readNoteInput, requireUser } from '../../src/notes-api.mjs';

// GET·PUT·DELETE /api/notes/:id
// 약점(4단계에서 고침): 로그인만 확인하고 소유자는 확인하지 않아, B가 A의 메모를 읽고 고치고 지울 수 있습니다.
export default async function handler(request, response) {
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response);
  if (!auth) return;
  const { db } = auth;
  const id = request.query.id;
  if (typeof id !== 'string' || !UUID.test(id)) return response.status(404).json({ error: 'NOTE_NOT_FOUND' });
  const notes = db.from('notes');

  if (request.method === 'GET') {
    const { data, error } = await notes.select('id, title, body').eq('id', id).maybeSingle();
    if (error) return dbFailed(response, '조회', error);
    return data ? response.status(200).json(data) : response.status(404).json({ error: 'NOTE_NOT_FOUND' });
  }

  if (request.method === 'PUT') {
    const input = readNoteInput(request.body);
    if (!input) return response.status(400).json({ error: 'INVALID_NOTE', message: 'title·body 문자열이 필요합니다.' });
    const { data, error } = await notes.update(input).eq('id', id).select('id, title, body').maybeSingle();
    if (error) return dbFailed(response, '수정', error);
    return data ? response.status(200).json(data) : response.status(404).json({ error: 'NOTE_NOT_FOUND' });
  }

  const { data, error } = await notes.delete().eq('id', id).select('id').maybeSingle();
  if (error) return dbFailed(response, '삭제', error);
  return data ? response.status(204).end() : response.status(404).json({ error: 'NOTE_NOT_FOUND' });
}
