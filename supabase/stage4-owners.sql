-- 4단계 만들기 1: 기존 가상 메모에 소유자를 연결합니다(학습용).
-- 처음 넣은 순서(seq) 앞의 세 건 → A, 네 번째 한 건 → B 시험 메모.
-- 이메일로 auth.users에서 ID를 찾습니다. 계정이 없으면 오류를 내고 아무것도 바꾸지 않습니다.
-- A·B 이메일이 다르면 아래 두 줄만 바꾸세요.

do $$
declare
  a_id uuid := (select id from auth.users where email = 'a@example.com');
  b_id uuid := (select id from auth.users where email = 'b@example.com');
begin
  if a_id is null or b_id is null then
    raise exception 'A 또는 B 계정을 auth.users에서 찾지 못했습니다.';
  end if;

  update public.notes set owner_id = a_id
  where seq in (select seq from public.notes where owner_id is null order by seq limit 3);

  update public.notes set owner_id = b_id
  where seq = (select seq from public.notes where owner_id is null order by seq limit 1);
end $$;

-- 확인: A 세 건, B 한 건이 보여야 합니다(본문은 출력하지 않음).
select u.email, count(*) as notes
from public.notes n join auth.users u on u.id = n.owner_id
group by u.email order by u.email;
