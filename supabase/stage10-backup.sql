-- 10단계: 비공개 메모 사본(notes_backup)과 복원 감사 기록(restore_audit)(학습용). 기존 notes 테이블은 바꾸지 않습니다.
-- 사본은 메모 본문을 담으므로 Git에 넣지 않고 DB에만 둡니다. 두 테이블 모두 브라우저용 역할에는 권한을 주지 않습니다.
-- 침해 전, 운영 배포 교차 점검이 통과한 상태에서 ①②를 한 번 실행합니다. 단계별로 결과를 보면서 실행하세요.

-- ① 테이블 만들기 -------------------------------------------------------------
create table if not exists public.notes_backup (
  id uuid primary key,
  owner_id uuid not null,
  title text not null,
  body text not null,
  content_sha256 text not null,
  backed_up_at timestamptz not null default now()
);

-- 감사 기록은 추가만 합니다(앱은 insert만 하고 수정·삭제 경로가 없음).
create table if not exists public.restore_audit (
  id bigserial primary key,
  note_id uuid not null,
  actor uuid not null,
  result text not null,
  at timestamptz not null default now()
);

revoke all on table public.notes_backup, public.restore_audit from public, anon, authenticated;
revoke all on sequence public.restore_audit_id_seq from public, anon, authenticated;
alter table public.notes_backup enable row level security;
alter table public.restore_audit enable row level security;

-- ② 지금의 메모로 사본 만들기 ---------------------------------------------------
-- 내용 해시 = SHA-256(제목 + 줄바꿈 + 본문). 앱의 복원 API도 같은 방식으로 다시 계산해 대조합니다.
insert into public.notes_backup (id, owner_id, title, body, content_sha256)
select id, owner_id, title, body, encode(extensions.digest(convert_to(title || E'\n' || body, 'UTF8'), 'sha256'), 'hex')
from public.notes
on conflict (id) do nothing;

-- ③ 확인 ----------------------------------------------------------------------
-- 기대: 0행 (브라우저용 역할에 권한 없음)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('notes_backup', 'restore_audit')
  and grantee in ('PUBLIC', 'anon', 'authenticated');

-- 기대: notes와 notes_backup 건수가 같고, mismatched = 0 (사본을 다시 읽어 해시 검증)
select
  (select count(*) from public.notes) as notes,
  (select count(*) from public.notes_backup) as backups,
  (select count(*) from public.notes_backup
    where content_sha256 <> encode(extensions.digest(convert_to(title || E'\n' || body, 'UTF8'), 'sha256'), 'hex')) as mismatched;
