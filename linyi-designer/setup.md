# 林一设计网站后端部署指南

## 技术栈
- 部署平台：Vercel（Serverless）
- 数据库：Supabase（PostgreSQL）
- 文件存储：Supabase Storage
- 邮件通知：Resend

---

## 第一步：注册账号（免费）

| 平台 | 地址 | 用途 |
|---|---|---|
| Vercel | https://vercel.com | 部署网站 |
| Supabase | https://supabase.com | 数据库 + 图片存储 |
| Resend | https://resend.com | 发邮件通知 |

---

## 第二步：创建 Supabase 项目

1. 登录 Supabase → New Project
2. 项目名称：`linyi-designer`
3. 选择地区：选离你最近的（如 Singapore）
4. 等数据库创建完成

### 创建数据表

进入左侧 **SQL Editor** → **New Query**，依次执行以下 SQL：

```sql
-- 1. 联系表单表
CREATE TABLE contacts (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  project_type text,
  message text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- 2. 留言板表
CREATE TABLE messages (
  id serial PRIMARY KEY,
  name text NOT NULL,
  content text NOT NULL,
  created_at timestamp DEFAULT now(),
  visible boolean DEFAULT true
);

-- 3. 作品管理表
CREATE TABLE works (
  id serial PRIMARY KEY,
  title text NOT NULL,
  category text,
  year text,
  tags text,
  description text,
  image_urls text DEFAULT '[]',
  sort_order integer DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- 4. 关于我表
CREATE TABLE about (
  id serial PRIMARY KEY,
  image_url text DEFAULT '',
  intro1 text DEFAULT '',
  intro2 text DEFAULT '',
  intro3 text DEFAULT '',
  stat_years text DEFAULT '',
  stat_projects text DEFAULT '',
  stat_satisfaction text DEFAULT ''
);

-- 插入默认数据
INSERT INTO about (id, intro1, intro2, intro3, stat_years, stat_projects, stat_satisfaction)
VALUES (1, '我是林一，一名常驻上海的独立室内设计师...', '', '', '8+', '60+', '100%');
```

### 创建 Storage 存储桶

进入左侧 **Storage** → **New bucket**：
- Name: `works`
- Public bucket: ✅ 勾选（图片需要公网访问）
- 创建后点击 `works` bucket → **Policies** → 给 `public` 角色添加 `SELECT` 和 `INSERT` 权限

### 获取 API 密钥

进入左侧 **Project Settings** → **API**：
- 复制 `URL`（如 `https://xxxxxxxx.supabase.co`）
- 复制 `service_role secret`（⚠️ 不要泄露，这是管理密钥）
- 复制 `anon public` 备用

---

## 第三步：注册 Resend（邮件通知）

1. 注册登录 https://resend.com
2. 左侧 **API Keys** → **Create API Key**
3. 复制 API Key
4. 左侧 **Domains** → 验证你的域名（或使用 `onboarding@resend.dev` 测试）

---

## 第四步：部署到 Vercel

### 方式一：命令行部署（推荐）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 进入项目目录，执行部署
vercel

# 后续更新直接执行
vercel --prod
```

### 方式二：GitHub 自动部署

1. 把项目 push 到 GitHub 仓库
2. 登录 Vercel → **Add New Project**
3. 导入你的 GitHub 仓库
4. Framework Preset: **Other**
5. 点击 Deploy

---

## 第五步：配置环境变量

部署完成后，进入 Vercel 项目 → **Settings** → **Environment Variables**，添加以下变量：

| 变量名 | 值 | 来源 |
|---|---|---|
| `SUPABASE_URL` | `https://xxxxxxxx.supabase.co` | Supabase API 页面 |
| `SUPABASE_SERVICE_KEY` | `eyJ...` | Supabase service_role secret |
| `RESEND_API_KEY` | `re_xxxxxxxx` | Resend API Keys 页面 |
| `ADMIN_EMAIL` | `hello@linyi.design` | 你的邮箱 |
| `ADMIN_TOKEN` | 自己设一个密码 | 如 `linyi2024` |
| `GUESTBOOK_ENABLED` | `true` | 留言板开关（`false` 关闭） |
| `WECOM_WEBHOOK` | 群机器人地址 | 企业微信通知（可选） |

添加后点击 **Save**，然后重新部署：

```bash
vercel --prod
```

---

## 第六步：访问后台

```
https://你的域名/admin/
```

输入你在 `ADMIN_TOKEN` 里设置的密码即可登录。

---

## 常见问题

**Q: GitHub Pages 还能用吗？**  
A: 不能。加了后端必须用 Vercel。可以把自定义域名解析到 Vercel。

**Q: 免费额度够用吗？**  
A: 够用。Vercel Hobby 免费，Supabase 免费版有 500MB 存储和 2GB 数据库空间，Resend 免费版每天 100 封邮件。

**Q: 图片加载慢怎么办？**  
A: Supabase Storage 自带 CDN。如果慢，可以换成国内阿里云 OSS + CDN。

**Q: 如何绑定自己的域名？**  
A: Vercel 项目 → Settings → Domains → 添加域名并按提示配置 DNS。
