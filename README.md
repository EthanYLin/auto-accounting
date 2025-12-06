# 自动记账系统 (Auto Accounting)

基于 Next.js 14 和 HeroUI v2 构建的现代化记账应用，集成了 Supabase 认证系统。

## 技术栈

- [Next.js 15](https://nextjs.org/docs/getting-started) - React 框架（App Router）
- [HeroUI v2](https://heroui.com/) - UI 组件库
- [Supabase](https://supabase.com/) - 后端服务（认证、数据库）
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Framer Motion](https://www.framer.com/motion/) - 动画库
- [next-themes](https://github.com/pacocoursey/next-themes) - 主题切换

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 设置 Supabase

#### 启动本地 Supabase 实例

```bash
# 如果已全局安装 supabase CLI
supabase start

# 或使用 npx
npx supabase start
```

#### 配置环境变量

运行自动化设置脚本：

```bash
./scripts/setup-auth.sh
```

或手动配置：

1. 复制环境变量模板：
   ```bash
   cp .env.example .env.local
   ```

2. 获取 Supabase 凭据：
   ```bash
   supabase status
   # 或
   npx supabase status
   ```

3. 在 `.env.local` 中更新以下变量：
   ```
   NEXT_PUBLIC_SUPABASE_URL=<从 supabase status 获取的 API URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<从 supabase status 获取的 anon key>
   ```

### 3. 运行开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 4. 测试邮件功能

在本地开发环境中，所有邮件都会被 Inbucket 捕获。访问 [http://localhost:54324](http://localhost:54324) 查看测试邮件（用于邮箱验证和密码重置）。

## 认证功能

本应用集成了完整的 Supabase 认证系统，包括：

- ✅ 用户注册（需要邮箱验证）
- ✅ 用户登录
- ✅ 忘记密码
- ✅ 重置密码
- ✅ 修改密码
- ✅ 登出
- ✅ 路由保护（中间件）
- ✅ SSR 支持

### 认证页面

- `/auth/login` - 登录页面
- `/auth/register` - 注册页面
- `/auth/forgot-password` - 忘记密码页面
- `/auth/reset-password` - 重置密码页面

### 访问控制

所有页面（除认证相关页面外）都需要登录才能访问。未登录用户会被自动重定向到登录页面。

## License

Licensed under the [MIT license](https://github.com/heroui-inc/next-app-template/blob/main/LICENSE).
