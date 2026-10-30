-- 先在 Supabase Auth 手动创建唯一管理员，再将下方 UUID 替换为该用户 ID。
create table public.admin_users(id uuid primary key references auth.users(id));
-- insert into public.admin_users values ('替换管理员UUID');
alter table public.admin_users enable row level security;
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from admin_users where id=auth.uid()) $$;
create table public.projects(id uuid primary key, owner_id uuid not null default auth.uid() references auth.users(id), name text not null check(length(trim(name))>0), weight numeric(24,6) not null check(weight>=0), sales_weight numeric(24,6) not null check(sales_weight>=0), price numeric(24,6) not null check(price>=0), data jsonb not null);
create table public.cost_items(id uuid primary key,project_id uuid not null references public.projects(id) on delete cascade,name text not null check(length(trim(name))>0),amount numeric(24,6) not null check(amount>=0),note text);
create table public.investors(id uuid primary key,project_id uuid not null references public.projects(id) on delete cascade,name text not null check(length(trim(name))>0),amount numeric(24,6) not null check(amount>=0),share numeric(12,6) not null check(share between 0 and 100));
create table public.settings(owner_id uuid primary key default auth.uid() references auth.users(id), preferences jsonb not null default '{}');
alter table public.projects enable row level security;
alter table public.cost_items enable row level security;
alter table public.investors enable row level security;
alter table public.settings enable row level security;
create policy projects_admin on public.projects for all to authenticated using(public.is_admin() and owner_id=auth.uid()) with check(public.is_admin() and owner_id=auth.uid());
create policy costs_admin on public.cost_items for all to authenticated using(public.is_admin() and exists(select 1 from public.projects where id=project_id)) with check(public.is_admin() and exists(select 1 from public.projects where id=project_id));
create policy investors_admin on public.investors for all to authenticated using(public.is_admin() and exists(select 1 from public.projects where id=project_id)) with check(public.is_admin() and exists(select 1 from public.projects where id=project_id));
create policy settings_admin on public.settings for all to authenticated using(public.is_admin() and owner_id=auth.uid()) with check(public.is_admin() and owner_id=auth.uid());
create function public.save_project(payload jsonb) returns void language plpgsql security invoker set search_path=public as $$
declare pid uuid := (payload->>'id')::uuid; r jsonb;
begin
if not public.is_admin() then raise exception '仅管理员可操作'; end if;
if payload->>'mode' not in ('capital','custom') then raise exception '无效分配模式'; end if;
insert into projects(id,name,weight,sales_weight,price,data) values(pid,payload->>'name',(payload->>'weight')::numeric,(payload->>'salesWeight')::numeric,(payload->>'price')::numeric,payload) on conflict(id) do update set name=excluded.name,weight=excluded.weight,sales_weight=excluded.sales_weight,price=excluded.price,data=excluded.data;
delete from cost_items where project_id=pid;
for r in select * from jsonb_array_elements(payload->'costs') loop
insert into cost_items values((r->>'id')::uuid,pid,r->>'name',(r->>'amount')::numeric,r->>'note'); end loop;
delete from investors where project_id=pid;
for r in select * from jsonb_array_elements(payload->'investors') loop
insert into investors values((r->>'id')::uuid,pid,r->>'name',(r->>'amount')::numeric,(r->>'share')::numeric); end loop;
end $$;
revoke all on function public.save_project(jsonb) from public,anon;
grant execute on function public.save_project(jsonb) to authenticated;
