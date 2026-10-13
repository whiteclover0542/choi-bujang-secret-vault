-- 11단계: 기기 승인 표(devices)(학습용). 기존 테이블은 바꾸지 않습니다.
-- 기기 ID 원문은 저장하지 않고 SHA-256 해시만 둡니다. 브라우저용 역할에는 권한을 주지 않습니다.
-- 화면의 "이 기기 승인 요청"은 pending만 만들고, 승인은 여기(SQL Editor, 관리자)에서만 합니다.

-- ① 테이블 만들기 -------------------------------------------------------------
create table if not exists public.devices (
  user_id uuid not null, -- 학생 계정(auth.users)과 심판 토큰 사용자 모두 기록하므로 auth.users를 참조하지 않음
  device_hash text not null check (device_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  primary key (user_id, device_hash)
);
revoke all on table public.devices from public, anon, authenticated;
alter table public.devices enable row level security;

-- ② 승인 대기 목록 보기 (기기 번호 = 해시 앞 12자리, 화면에 표시되는 값) -------------
-- 이메일이 비어 있으면 심판 토큰 사용자의 요청입니다.
select u.email, left(d.device_hash, 12) as device_ref, d.status, d.requested_at
from public.devices d left join auth.users u on u.id = d.user_id
order by d.requested_at desc;

-- ③ 승인하기: 화면에 보이는 기기 번호를 직접 넣어 실행합니다 ---------------------------
-- update public.devices set status = 'approved', approved_at = now()
-- where left(device_hash, 12) = '<기기 번호 12자리>' and status = 'pending'
-- returning left(device_hash, 12) as device_ref, status;

-- ④ 승인 취소(분실·의심 기기) -------------------------------------------------------
-- update public.devices set status = 'revoked' where left(device_hash, 12) = '<기기 번호 12자리>';

-- ⑤ 확인: 기대 0행 (브라우저용 역할에 권한 없음) ----------------------------------------
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'devices' and grantee in ('PUBLIC', 'anon', 'authenticated');

-- ⑥ 11단계 수정(이미 ①을 실행한 경우): 심판 토큰 사용자도 기기 요청을 남길 수 있게 auth.users 참조를 뺍니다.
alter table public.devices drop constraint if exists devices_user_id_fkey;
