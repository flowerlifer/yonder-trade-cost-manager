-- SQL Editor 执行：所有测试变更最终回滚，不创建真实业务或Auth账户。
begin;
do $$ declare t text;begin
foreach t in array array['projects','cost_items','investors','settings','admin_users'] loop
if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then raise exception '% 未开启RLS',t;end if;
end loop;
if (select count(*) from public.admin_users)<>1 then raise exception '应指定且仅指定一个管理员';end if;
end $$;
set local role anon;
do $$ begin
if has_table_privilege(current_user,'public.projects','SELECT') then raise exception '匿名可读取项目';end if;
if has_function_privilege(current_user,'public.save_project(jsonb)','EXECUTE') then raise exception '匿名可调用保存';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
set local role authenticated;
do $$ begin
if public.is_admin() then raise exception '非管理员被允许';end if;
if exists(select 1 from public.projects) or exists(select 1 from public.cost_items) or exists(select 1 from public.investors) or exists(select 1 from public.settings) then raise exception '非管理员可读取业务数据';end if;
begin perform public.save_project('{}');raise exception '非管理员可保存';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from public.admin_users limit 1),true);
set local role authenticated;
do $$ begin if not public.is_admin() then raise exception '管理员验证失败';end if;end $$;
reset role;
rollback;
-- 成功执行无异常说明上述检查通过；仍需使用管理员在网页保存、刷新与删除验证完整流程。
