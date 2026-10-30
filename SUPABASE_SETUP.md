# Supabase 云端配置与验收

当前项目继续使用原有 Next.js、页面设计和 Decimal.js 计算；没有重新开发或导入演示账本。

## 1. 本地参数
项目根目录的 `.env.local` 已写入你提供的 URL 和公开 publishable key。变量名必须是：
```
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的公开publishable_key
NEXT_PUBLIC_DEMO_MODE=false
```
参考 `.env.example`。`.gitignore` 排除 `.env.local`；不要提交真实配置。公开 key 可以用于浏览器，但其权限必须由数据库 RLS 限制，绝不填写 service_role 或 secret key。修改环境变量后重启 `npm run dev`；生产版本需重新构建。

未配置云端不会再自动回退为本地业务存储。仅显式设置 DEMO_MODE=true 且没有配置云端时才开放原本的本地虚构演示。Supabase Auth 可能在浏览器保存会话令牌，这与业务数据使用 localStorage 不同。云端项目从数据库读取，失败时明确报错。

## 2. 关闭公开注册并创建唯一账户
打开你的 Supabase Dashboard，选择 dzzhoajwnehuzcxxafvw 项目。
1. Authentication → Sign In / Providers（部分版本显示 Providers），找到 User Signups / Allow new users to sign up 并关闭。保留 Email 密码登录；关闭匿名登录及不需要的其他登录提供商。
2. Authentication → Users → Add user → Create new user。输入管理员邮箱和强密码；选择 Auto Confirm User（否则必须先完成邮箱确认）。密码只在 Supabase 和网页登录框填写，无需发送到聊天。
3. 点击该用户，复制 User UID（UUID），不要复制邮箱或访问令牌。

## 3. 执行迁移
在 SQL Editor → New query：
- 如果尚未建立这套表，先执行 `supabase/migrations/001_initial.sql` 全文，然后执行 `002_cloud_hardening.sql` 全文。
- 如果之前已成功执行001，只执行002。不要重复执行001；若存在同名但来源不明的表，先检查结构，不要删除或强行覆盖。
- SQL 不创建任何演示项目；002仅回填已有项目的结构化字段。

然后在 SQL Editor 执行以下语句，将占位文字替换成刚复制的 UID：
```sql
insert into public.admin_users(id) values ('你的管理员UUID');
```
唯一索引确保只能指定一个管理员。不要向任何浏览器角色授予 admin_users 的读写权限。管理员身份由数据库函数验证，前端不存储或信任手动填写的 UID。需要换管理员时请先备份并核查旧项目 owner_id，不要直接删除旧账户。

## 4. RLS 检查
在 SQL Editor 执行 `supabase/verify_rls.sql`。脚本检查所有业务表与管理员表的 RLS、唯一管理员、匿名权限、非管理员读取/保存拒绝，以及管理员身份识别；测试最后 ROLLBACK。若中途异常，先执行 ROLLBACK 再修复，不要禁用RLS。

该脚本必须由你在真实数据库执行才算远程验证通过；本次开发未执行远程SQL。浏览器使用的公开密钥不能查询完整策略目录或创建表，所以只读连接检查不能替代这些验证。

## 5. 实际保存验收
1. 重启本地服务，访问 http://localhost:3000 ，使用唯一管理员邮箱密码登录。
2. 新建一个明确标注“验收”的项目；输入重量、预计销售重量和单价，添加成本和投资人，设置自定义利润比例。点击保存，必须出现“已保存至云端”。
3. 刷新浏览器并重新登录，核对所有金额、备注、模式和自定义比例；切换模式再保存、刷新，确认自定义比例仍保留。
4. 在另一设备或无痕窗口登录，确认可读取；SQL Table Editor 检查 projects、cost_items、investors。资金比例依据已保存出资重新精确计算，不持久化可失效的冗余百分比。
5. 测试断网保存，必须提示保存失败、保留当前编辑，不显示成功；恢复网络后重试。
6. 删除验收项目后刷新，确认删除及明细级联删除。退出后不能看到财务数据。
7. 配合 verify_rls.sql 确认非管理员访问被拒绝。不要为测试而开放公开注册。

自定义利润比例可保存未完成草稿，但合计不为100%时不能确认或生成有效分配。事务RPC检查数据库管理员身份、字段和NUMERIC约束，并一次性更新项目快照及明细；失败整笔回滚。客户端禁止直接写成本或投资表，避免明细与快照不同步。settings启用RLS，仅指定管理员可维护自己的设置。

## 6. 演示隔离
云端启动不读取 yonder-demo、不生成种子、不自动迁移本地数据。本次未新增导入入口；未来如你明确选择指定数据，再单独进行导入。

## 本次验证记录
- 10项自动测试通过（计算、零分母、十进制、亏损、输入校验、非管理员拒绝、权限请求失败、保存失败、字符串传输、零行删除）。
- Next.js生产构建和TypeScript检查通过。
- 只读访问 Auth settings 返回200，密钥有效；发现 disable_signup=false，需手动关闭。
- 只读访问 projects 返回404，API缓存未找到该表，需执行迁移后复查。
- 未验证：SQL在真实PostgreSQL执行、真实RLS脚本、管理员登录、实际云端增删改/刷新/跨设备、浏览器交互、断网体验。
- 未修改远程数据库、未创建账户、未部署、未推送GitHub。

官方参考：https://supabase.com/docs/guides/database/postgres/row-level-security 和 https://supabase.com/docs/guides/getting-started/api-keys
