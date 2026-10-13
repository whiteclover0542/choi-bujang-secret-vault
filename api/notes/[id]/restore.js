import { createHash } from 'node:crypto';
import { UUID, dbFailed, requireUser } from '../../../src/notes-api.mjs';

// POST /api/notes/:id/restore
// 10단계: 비공개 사본(notes_backup)에서 지정한 메모 한 건만 되살립니다.
// 사본의 ID·소유자·내용 해시를 대조하고, 서버가 검증한 사용자가 사본의 소유자일 때만 복원합니다.
// 다른 메모는 건드리지 않고, 결과는 restore_audit에 한 줄씩 추가만 합니다. 메모 본문은 응답·로그에 넣지 않습니다.
export const contentHash = (title, body) => createHash('sha256').update(`${title}\n${body}`, 'utf8').digest('hex');

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const auth = await requireUser(request, response);
  if (!auth) return;
  const { user, db } = auth;
  const id = request.query.id;
  if (typeof id !== 'string' || !UUID.test(id)) return response.status(404).json({ error: 'BACKUP_NOT_FOUND' });

  const audit = async (result) => {
    const { error } = await db.from('restore_audit').insert({ note_id: id, actor: user.userId, result });
    if (error) console.error('notes: 복원 감사 기록 실패', error.code);
  };

  // ① 사본을 다시 읽어 검증합니다.
  const { data: backup, error: readError } = await db.from('notes_backup')
    .select('id, owner_id, title, body, content_sha256').eq('id', id).maybeSingle();
  if (readError) return dbFailed(response, '사본 조회', readError);
  if (!backup) return response.status(404).json({ error: 'BACKUP_NOT_FOUND' });
  if (backup.owner_id !== user.userId) {
    await audit('denied_not_owner');
    return response.status(403).json({ error: 'NOT_NOTE_OWNER', message: '본인 메모만 복원할 수 있습니다.' });
  }
  if (contentHash(backup.title, backup.body) !== backup.content_sha256) {
    await audit('aborted_backup_hash_mismatch');
    return response.status(409).json({ error: 'BACKUP_HASH_MISMATCH', message: '사본 검증에 실패해 복원을 중단했습니다.' });
  }

  // ② 지정한 한 건만 사본 값(ID·소유자·제목·본문)으로 되돌립니다.
  const { error: writeError } = await db.from('notes')
    .upsert({ id: backup.id, owner_id: backup.owner_id, title: backup.title, body: backup.body }, { onConflict: 'id' });
  if (writeError) return dbFailed(response, '복원', writeError);

  // ③ 되살린 행을 다시 읽어 ID·소유자·내용 해시가 사본과 같은지 확인합니다.
  const { data: row, error: checkError } = await db.from('notes').select('id, owner_id, title, body').eq('id', id).maybeSingle();
  if (checkError) return dbFailed(response, '복원 확인', checkError);
  const sha256 = row ? contentHash(row.title, row.body) : '';
  const matches = { id: row?.id === backup.id, owner: row?.owner_id === backup.owner_id, contentSha256: sha256 === backup.content_sha256 };
  const ok = matches.id && matches.owner && matches.contentSha256;
  await audit(ok ? 'restored' : 'restore_verify_failed');
  return response.status(ok ? 200 : 500).json({ resource: `note:${id}`, restored: ok, matches, contentSha256: sha256 });
}
