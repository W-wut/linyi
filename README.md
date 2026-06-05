# 林一设计 · 个人网站

林一室内设计个人品牌网站，包含前台展示 + 管理后台的全栈应用。

---

## 在线预览

**前端页面**: https://2026-06-05-05-17-41.vercel.app

**管理后台**: https://2026-06-05-05-17-41.vercel.app/admin/
- 密码: `linyi20260605`

> 注意：当前数据库（Supabase）处于不可用状态，API 返回 500 错误，作品区和留言板等功能暂时无法使用。需要先恢复数据库才能正常使用全部功能。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | 纯 HTML / CSS / JavaScript（单文件） |
| 后端 | Node.js Serverless Functions（Vercel） |
| 数据库 | Supabase（PostgreSQL + Storage） |
| 部署平台 | Vercel |
| 本地开发 | Node.js + scripts/dev-server.js |

---

## 功能清单

### 前台功能
- [x] 响应式单页网站（首页 / 关于 / 作品 / 服务 / 联系）
- [x] 作品展示区（多图轮播 + 灯箱翻看）
- [x] 联系表单（提交到后台）
- [x] 访客留言板（可开关）
- [x] 全段落内容可编辑（通过管理后台）

### 管理后台（7 个 Tab）
- [x] 咨询留言管理（查看 + 删除）
- [x] 访客留言管理
- [x] 作品管理（列表 + 删除）
- [x] 作品上传（多图，最多 9 张）
- [x] 关于我（照片上传 + 文字编辑）
- [x] 网站内容编辑（Hero / 理念 / 服务 / 联系 / 页脚）
- [x] 系统设置（留言板开关）

### 其他
- [x] 企业微信 Webhook 通知
- [x] Token 登录验证
- [x] Mock 数据本地开发模式

---

## 文件结构

```
├── public/
│   ├── index.html          # 前台页面
│   ├── admin/index.html    # 管理后台
│   └── assets/images/      # 默认作品图（4张）
├── api/
│   ├── contact.js          # 咨询留言 API
│   ├── messages.js         # 访客留言 API
│   ├── works.js            # 作品管理 API（多图上传）
│   ├── admin.js            # 管理后台 API（认证 + CRUD）
│   └── about.js            # 关于我 API
├── scripts/
│   └── dev-server.js       # 本地开发服务器
├── supabase-schema.sql     # 数据库建表 SQL
├── vercel.json             # Vercel 配置
├── package.json            # Node.js 依赖
├── setup.md                # 详细部署指南
└── README.md               # 本文件
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动本地开发服务器（Mock 模式）
npm run dev
# 或双击：启动开发服务器.bat

# 本地访问
http://localhost:3000          # 前台
http://localhost:3000/admin/   # 后台（密码: demo）
```

---

## 部署指南

### 前置条件
1. Vercel 账号（https://vercel.com）
2. Supabase 账号（https://supabase.com）
3. 本项目的代码

### 步骤 1：创建 Supabase 项目
1. 登录 Supabase → 新建项目
2. 执行 `supabase-schema.sql` 中的 SQL 创建数据表
3. 创建 Storage bucket `works`，设置 Public，配置 Policy
4. 记录 Project URL 和 service_role key

### 步骤 2：配置 Vercel
1. 导入本项目到 Vercel
2. 在 Vercel 项目设置中添加环境变量：
   - `SUPABASE_URL` = Supabase Project URL
   - `SUPABASE_SERVICE_KEY` = service_role key
   - `ADMIN_TOKEN` = 管理后台密码
   - `GUESTBOOK_ENABLED` = true/false
3. 部署

### 步骤 3：验证
1. 首页正常打开
2. `/admin/` 能用密码登录
3. 后台能上传作品
4. 前台联系表单能提交

详细步骤见 `setup.md`

---

## 环境变量

| 变量名 | 说明 | 必填 |
|---|---|---|
| `SUPABASE_URL` | Supabase 项目 URL | 是 |
| `SUPABASE_SERVICE_KEY` | Supabase service_role 密钥 | 是 |
| `ADMIN_TOKEN` | 管理后台登录密码 | 是 |
| `GUESTBOOK_ENABLED` | 留言板开关（true/false） | 是 |
| `WECOM_WEBHOOK` | 企业微信群机器人 Webhook 地址 | 否 |

> 本地开发时，在 `.env` 文件中配置；生产环境在 Vercel 后台配置。

---

## 当前状态

| 项目 | 状态 |
|---|---|
| 前端部署 | 在线（Vercel） |
| 后端部署 | 在线（Vercel） |
| 数据库连接 | **不可用**（Supabase 域名解析失败） |
| 作品区 | 加载中（数据库连不上） |
| 留言板 | 加载中（数据库连不上） |
| 联系表单 | 提交失败（数据库连不上） |
| 管理后台 | 可登录，但数据加载失败 |

**阻塞原因**: `qkvjkphcktzevitptdvi.supabase.co` 域名无法解析，Supabase 项目可能被暂停或删除。

**解决方案**:
1. 去 https://supabase.com 登录，找到 `linyi-designer` 项目，点击 **Resume**（如果被暂停）
2. 或创建新的 Supabase 项目，执行 `supabase-schema.sql`，更新 Vercel 环境变量后重新部署

---

## 备份与恢复

### 推送到 GitHub
运行 `node create-repo.js`，按提示输入 GitHub Token，自动创建仓库并推送代码。

### 从 GitHub 恢复
```bash
git clone https://github.com/你的用户名/linyi-designer.git
cd linyi-designer
npm install
# 配置 .env 后启动开发服务器
```

---

## 作者

林一 · 室内设计师
