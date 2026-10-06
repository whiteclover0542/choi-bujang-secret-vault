-- 3단계: 메모 API 모양 {id(uuid), title, body}에 맞게 notes 테이블을 바꿉니다.
-- Supabase SQL Editor에서 한 번만 실행하세요. 메모 문장은 들어 있지 않습니다.
-- owner_id에는 여전히 auth.users 외래키를 걸지 않습니다(심판 계정도 메모를 만들 수 있어야 함).

alter table public.notes drop constraint if exists notes_title_key;
alter table public.notes rename column content to body;
alter table public.notes drop constraint notes_pkey;
alter table public.notes rename column id to seq;
alter table public.notes add column id uuid not null default gen_random_uuid() primary key;
create index if not exists notes_owner_id_idx on public.notes (owner_id);

-- RLS는 켜 둔 채, 브라우저 키(anon·authenticated)는 계속 직접 접근하지 못합니다.
alter table public.notes enable row level security;
revoke all on table public.notes from anon, authenticated;
