-- 4단계 만들기 3: notes 테이블의 RLS와 최소 권한(학습용). 다른 테이블은 건드리지 않습니다.
-- 앱 API는 서버 전용 키로 접근하므로 RLS와 무관하게 API에서 소유자를 검사합니다.
-- 이 정책은 Data API를 직접 부르는 경우(anon·authenticated 역할)의 마지막 방어선입니다.
-- 단계별로 결과를 보면서 실행하세요.

-- ① 적용 전 권한 확인 ---------------------------------------------------------
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
order by r.role, p.priv;

-- ② 권한 회수 후 최소 권한 부여 ------------------------------------------------
begin;

revoke all on table public.notes from public, anon, authenticated;
grant select, insert, update, delete on table public.notes to authenticated;

alter table public.notes enable row level security;

drop policy if exists notes_select_own on public.notes;
drop policy if exists notes_insert_own on public.notes;
drop policy if exists notes_update_own on public.notes;
drop policy if exists notes_delete_own on public.notes;

create policy notes_select_own on public.notes for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy notes_insert_own on public.notes for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy notes_update_own on public.notes for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy notes_delete_own on public.notes for delete to authenticated
  using ((select auth.uid()) = owner_id);

commit;

-- ③ 적용 후 권한 확인 ---------------------------------------------------------
-- 기대: anon 행 없음 / authenticated는 DELETE·INSERT·SELECT·UPDATE 네 줄만
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 기대: anon은 모두 false / authenticated는 SELECT·INSERT·UPDATE·DELETE만 true
select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
order by r.role, p.priv;

-- 정책 네 개 확인
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'notes' order by policyname;
