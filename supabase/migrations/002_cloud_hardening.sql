-- 先执行 001_initial.sql（仅新数据库），再执行本文件。已执行001的数据库直接执行本文件。
begin;
-- 限定唯一管理员；如已有多个管理员则终止，由用户先核查。
alter table public.admin_users add column if not exists singleton boolean not null default true check(singleton);
create unique index if not exists admin_users_singleton on public.admin_users(singleton);
revoke all on public.admin_users from anon,authenticated;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;
alter table public.projects enable row level security;
alter table public.cost_items enable row level security;
alter table public.investors enable row level security;
alter table public.settings enable row level security;
-- 不允许客户端直接修改快照或明细，只能通过事务 RPC；删除项目使用RLS。
revoke all on public.projects,public.cost_items,public.investors,public.settings from anon,authenticated;
grant select,delete on public.projects to authenticated;
grant select on public.cost_items,public.investors to authenticated;
grant select,insert,update,delete on public.settings to authenticated;
-- 为规范化数据增加项目参数及顺序；资金占比由出资实时计算，不接受用户输入。
alter table public.projects add column if not exists product text not null default '';
alter table public.projects add column if not exists note text not null default '';
alter table public.projects add column if not exists profit_mode text not null default 'capital' check(profit_mode in ('capital','custom'));
alter table public.cost_items add column if not exists position integer not null default 0;
alter table public.investors add column if not exists position integer not null default 0;
update public.projects set product=coalesce(data->>'product',''),note=coalesce(data->>'note',''),profit_mode=coalesce(data->>'mode','capital');
create or replace function public.save_project(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare pid uuid; r jsonb; v text; n numeric; pos integer; canonical jsonb;
begin
if not public.is_admin() then raise exception '仅指定管理员可操作' using errcode='42501'; end if;
if jsonb_typeof(payload)<>'object' or payload->>'mode' is null or payload->>'mode' not in ('capital','custom') or coalesce(trim(payload->>'name'),'')='' or jsonb_typeof(payload->'costs') is distinct from 'array' or jsonb_typeof(payload->'investors') is distinct from 'array' then raise exception '项目结构无效'; end if;
pid:=(payload->>'id')::uuid;
if pid is null then raise exception '项目ID不能为空'; end if;
for v in select x from (values(payload->>'weight'),(payload->>'salesWeight'),(payload->>'price')) t(x) union all select x from jsonb_array_elements(payload->'costs') j cross join lateral (values(j->>'amount')) t(x) union all select x from jsonb_array_elements(payload->'investors') j cross join lateral (values(j->>'amount'),(j->>'share')) t(x)
loop
if v is null or v !~ '^\d+(\.\d{1,6})?$' then raise exception '金额、重量与比例必须为非负十进制数字，最多6位小数'; end if;
n:=v::numeric;if n>999999999999 then raise exception '数值超出允许范围';end if;
end loop;
-- 使用文本保留小数精度，快照和规范化表在同一事务内更新。
canonical:=payload;
insert into public.projects(id,owner_id,name,weight,sales_weight,price,data,product,note,profit_mode) values(pid,auth.uid(),payload->>'name',(payload->>'weight')::numeric,(payload->>'salesWeight')::numeric,(payload->>'price')::numeric,canonical,coalesce(payload->>'product',''),coalesce(payload->>'note',''),payload->>'mode')
on conflict(id) do update set name=excluded.name,weight=excluded.weight,sales_weight=excluded.sales_weight,price=excluded.price,data=excluded.data,product=excluded.product,note=excluded.note,profit_mode=excluded.profit_mode where projects.owner_id=auth.uid();
if not found then raise exception '无权修改此项目';end if;
delete from public.cost_items where project_id=pid;
pos:=0;
for r in select * from jsonb_array_elements(payload->'costs') loop
insert into public.cost_items(id,project_id,name,amount,note,position) values((r->>'id')::uuid,pid,r->>'name',(r->>'amount')::numeric,coalesce(r->>'note',''),pos);pos:=pos+1;end loop;
delete from public.investors where project_id=pid;
pos:=0;
for r in select * from jsonb_array_elements(payload->'investors') loop
insert into public.investors(id,project_id,name,amount,share,position) values((r->>'id')::uuid,pid,r->>'name',(r->>'amount')::numeric,(r->>'share')::numeric,pos);pos:=pos+1;end loop;
end $$;
revoke all on function public.save_project(jsonb) from public,anon;
grant execute on function public.save_project(jsonb) to authenticated;
commit;
