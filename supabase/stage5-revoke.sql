-- 5단계: notes 테이블의 직접 접근 권한을 PUBLIC·anon·authenticated에서 모두 회수합니다(학습용).
-- 브라우저는 이제 서버 함수만 부르고, 서버 함수는 서버 전용 키(service_role)로 접근하므로 앱 동작은 그대로입니다.
-- 다른 테이블은 건드리지 않습니다. RLS와 4단계 본인 행 정책은 이중 방어로 그대로 둡니다.

-- ① 적용 전 권한 확인 (4단계 뒤라면 authenticated에 SELECT·INSERT·UPDATE·DELETE가 보임)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('PUBLIC', 'anon', 'authenticated')
order by grantee, privilege_type;

select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
order by r.role, p.priv;

-- ② 회수
revoke all on table public.notes from public, anon, authenticated;
alter table public.notes enable row level security;

-- ③ 적용 후 확인
-- 기대: 아래 쿼리는 0행
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('PUBLIC', 'anon', 'authenticated')
order by grantee, privilege_type;

-- 기대: 14행 모두 allowed = false
select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
order by r.role, p.priv;
