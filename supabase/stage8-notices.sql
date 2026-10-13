-- 8단계: 강사 공지(notices)와 강사 권한(instructors) 테이블(학습용). 기존 notes 테이블은 건드리지 않습니다.
-- 두 테이블 모두 브라우저용 역할(PUBLIC·anon·authenticated)에는 권한을 주지 않습니다.
-- 서버 함수만 서버 전용 키로 읽고, 강사 여부는 instructors 표로만 판단합니다(화면 메뉴·요청 본문의 role은 믿지 않음).
-- 단계별로 결과를 보면서 실행하세요.

-- ① 테이블 만들기 -------------------------------------------------------------
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '' check (char_length(body) <= 2000),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructors (
  user_id uuid primary key references auth.users (id) on delete cascade
);

revoke all on table public.notices, public.instructors from public, anon, authenticated;
alter table public.notices enable row level security;
alter table public.instructors enable row level security;

-- ② 가상 공지 한 건(실제 학생 정보 없음) ---------------------------------------
insert into public.notices (title, body)
select '실습용 가상 공지', '8단계 구역 나누기 시험용 가상 공지입니다.'
where not exists (select 1 from public.notices);

-- ③ 강사 지정(선택) ------------------------------------------------------------
-- 강사로 쓸 시험 계정이 있을 때만, 이메일을 SQL Editor에서 직접 바꿔 넣고 실행하세요. 이메일을 Git에 남기지 마세요.
-- 강사를 지정하지 않으면 모든 학생의 공지 수정이 403으로 거부됩니다.
-- insert into public.instructors (user_id)
-- select id from auth.users where email = '<강사 시험 계정 이메일>'
-- on conflict do nothing;

-- ④ 확인 ----------------------------------------------------------------------
-- 기대: 0행 (브라우저용 역할에 권한 없음)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('notices', 'instructors')
  and grantee in ('PUBLIC', 'anon', 'authenticated');

-- 기대: 공지 1건 이상, 강사 수는 ③을 실행했으면 1
select (select count(*) from public.notices) as notices, (select count(*) from public.instructors) as instructors;
