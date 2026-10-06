import { UUID, dbFailed, readNoteInput, requireUser } from '../../src/notes-api.mjs';

// GET·PUT·DELETE /api/notes/:id
// 4단계: 서버가 검증한 사용자 ID와 DB의 owner_id를 비교합니다. 본인 메모가 아니면 기본 거부합니다.
// URL·본문의 owner_id·userId는 믿지 않습니다.
const notFound = response => response.status(404).json({ error: 'NOTE_NOT_FOUND' });
const forbidden = response => response.status(403).json({ error: 'NOT_NOTE_OWNER', message: '본인 메모만 다룰 수 있습니다.' });

export default async function handler(request, response) {
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response);
  if (!auth) return;
  const { user, db } = auth;
  const id = request.query.id;
  if (typeof id !== 'string' || !UUID.test(id)) return notFound(response);

  // 기존 행의 소유자 확인
  const { data: row, error: readError } = await db.from('notes').select('id, title, body, owner_id').eq('id', id).maybeSingle();
  if (readError) return dbFailed(response, '조회', readError);
  if (!row) return notFound(response);
  if (row.owner_id !== user.userId) return forbidden(response);

  if (request.method === 'GET') return response.status(200).json({ id: row.id, title: row.title, body: row.body });

  if (request.method === 'PUT') {
    // 새 행의 소유자도 본인이어야 합니다. 본문으로 소유자를 바꾸려 하면 거부합니다.
    if (request.body && typeof request.body === 'object' && 'owner_id' in request.body
        && request.body.owner_id !== user.userId) return forbidden(response);
    const input = readNoteInput(request.body);
    if (!input) return response.status(400).json({ error: 'INVALID_NOTE', message: 'title·body 문자열이 필요합니다.' });
    const { data, error } = await db.from('notes').update(input)
      .eq('id', id).eq('owner_id', user.userId).select('id, title, body').maybeSingle();
    if (error) return dbFailed(response, '수정', error);
    return data ? response.status(200).json(data) : notFound(response);
  }

  const { data, error } = await db.from('notes').delete()
    .eq('id', id).eq('owner_id', user.userId).select('id').maybeSingle();
  if (error) return dbFailed(response, '삭제', error);
  return data ? response.status(204).end() : notFound(response);
}
