# Yonder Trade Cost Manager

用于人民币贸易项目的成本与投资测算，支持多项目、费用增删改、分类选择、资金比例、独立利润比例、亏损分摊和 Excel 导出。Supabase 提供唯一管理员密码登录、RLS 隔离及云端保存。修改后需点击“保存项目”。

## 本地运行

安装 Node.js 20.9+（建议当前 LTS）和 npm：

```sh
npm ci
```

复制 `.env.example` 为 `.env.local`，填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的公开publishable_key
NEXT_PUBLIC_DEMO_MODE=false
```

不要填写 service_role、secret key 或密码。运行 `npm run dev` 后访问 http://localhost:3000，用已有管理员邮箱密码登录。未配置云端时不会自动加载演示数据。

数据库配置见 [SUPABASE_SETUP.md](SUPABASE_SETUP.md)。已完成迁移的数据库无需重复迁移；管理员 UID 只在数据库维护。

## 检查

```sh
npm run check
npm run lint
npm test
npm run build
```

`npm start` 启动生产构建。测试使用本地测试对象，不向远程数据库写入测试或演示数据。

## GitHub 与敏感数据

仅上传至 Private 仓库。`.env.local`、依赖、构建输出、备份及常见财务导出格式已被忽略。不要把密码、数据库连接串、令牌或真实账本放进源码或提交历史；忽略规则不能清除历史泄露，也不能替代提交内容审查。

## Vercel 部署（手动）

1. 在 Vercel 导入 GitHub 私有仓库，框架选择 Next.js。
2. 配置上面三个环境变量，演示模式保持 `false`，仅使用公开 publishable key。
3. 使用默认安装、构建与输出设置；确认后由你发起部署。
4. 在 Supabase Auth URL Configuration 中配置正式 Site URL 及需要的允许回调地址，保持公开注册关闭。
5. 部署后使用管理员账户验收保存、刷新及重新登录后的读取。

本次开发不会自动部署或修改远程数据库。客户端公开变量会包含在浏览器代码中，数据权限依赖数据库 RLS。

## 使用限制

每个项目独立保存，切换或刷新前请保存。当前为单人编辑模型，不含并发冲突合并。自定义分成合计须为 100% 才能形成有效分配；金额按十进制计算，显示到分可能存在尾差。
