# 林一设计 · 个人网站

林一室内设计个人品牌网站，包含前台展示 + 管理后台的全栈应用。

---

## 在线地址

- **官网**: https://linyi.design
- **后台**: https://linyi.design/admin/

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | 纯 HTML / CSS / JavaScript |
| 后端 | Node.js Serverless Functions（Vercel） |
| 数据库 | Supabase（PostgreSQL + Storage） |
| 部署平台 | Vercel + GitHub |

---

## 功能介绍

### 前台功能
- 响应式单页网站（首页 / 关于 / 作品 / 服务 / 联系）
- 作品展示区（多图轮播 + 灯箱翻看）
- 联系表单（提交到后台）
- 访客留言板（可开关）
- 全段落内容可编辑（通过管理后台）

### 管理后台
- 咨询留言管理（查看 + 删除）
- 访客留言管理
- 作品管理（列表 + 删除 + 上传）
- 关于我（照片上传 + 文字编辑）
- 网站内容编辑（Hero / 理念 / 服务 / 联系 / 页脚）
- 系统设置（留言板开关）

---

## 文件结构

```
├── public/
│   ├── index.html          # 前台页面
│   ├── admin/index.html    # 管理后台
│   └── assets/images/      # 默认作品图
├── api/
│   ├── contact.js          # 咨询留言 API
│   ├── messages.js         # 访客留言 API
│   ├── works.js            # 作品管理 API
│   ├── admin.js            # 管理后台 API
│   └── about.js            # 关于我 API
├── scripts/
│   └── dev-server.js       # 本地开发服务器
├── supabase-schema.sql     # 数据库建表 SQL
├── vercel.json             # Vercel 配置
└── package.json            # Node.js 依赖
```

---

## 部署指南

### 前置条件
1. GitHub 仓库：https://github.com/W-wut/linyi
2. Vercel 账号（已绑定 GitHub）
3. Supabase 账号

### 环境变量
在 Vercel 项目 → **Settings** → **Environment Variables** 配置：

| 变量名 | 说明 |
|---|---|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_KEY` | Supabase service_role 密钥 |
| `ADMIN_TOKEN` | 管理后台登录密码 |
| `GUESTBOOK_ENABLED` | 留言板开关（true/false） |

### 自动部署
代码推送到 GitHub 的 `main` 分支后，Vercel 会自动部署。

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器
npm run dev

# 本地访问
http://localhost:3000
```

---

## 重要说明

- 后台每次访问都需要输入密码（不记住登录状态）
- 图片存储在 Supabase Storage 的 `works` bucket
- 代码更新直接 push 到 GitHub 即可自动部署

---

## 作者

林一 · 室内设计师
