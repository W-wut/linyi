# 林一设计网站 · 项目状态

**更新日期**: 2026-06-05 06:38

## 已完成的全部功能（11项）

1. ✅ 管理后台登录验证（调 API 验证 token）
2. ✅ 作品区动态从 /api/works 加载（替代硬编码 HTML）
3. ✅ 多图上传（最多 9 张，轮播 + 灯箱翻看）
4. ✅ Mock 数据磁盘持久化（mock-data.json）
5. ✅ 留言板后台开关（/api/settings）
6. ✅ 关于我照片管理（后台上传照片 + 编辑文字）
7. ✅ 咨询留言创建时间修复
8. ✅ 删除咨询留言
9. ✅ 网站全段落可编辑（Hero/理念/服务/联系/页脚）
10. ✅ 联系表单 "邮箱地址" → "联系方式"
11. ✅ 企业微信 Webhook 通知（咨询留言 + 访客留言）

## 技术栈

- **前端**: 纯 HTML/CSS/JS（单文件），响应式设计
- **后端**: Node.js Serverless（Vercel）+ Supabase
- **本地开发**: scripts/dev-server.js（Mock 模式，端口 3000）
- **通知**: 企业微信群机器人 Webhook

## 文件结构

```
├── public/
│   ├── index.html          前台页面
│   ├── admin/index.html    管理后台（7 个 tab：咨询/留言/作品/上传/关于我/内容/设置）
│   └── assets/images/      4 张默认作品图
├── api/
│   ├── contact.js          咨询留言 API
│   ├── messages.js         访客留言 API
│   ├── works.js            作品管理 API（多图上传到 Supabase Storage）
│   ├── admin.js            管理后台 API（认证 + CRUD）
│   └── about.js            关于我 API
├── scripts/dev-server.js   本地开发服务器（Mock + 通知 + 持久化）
├── setup.md                部署指南（含 SQL 建表语句）
├── .env.example            环境变量模板
├── vercel.json             Vercel 配置文件
├── package.json            Node.js 项目配置
├── create-github-repo.bat  GitHub 仓库创建脚本（一键推代码）
├── deploy-with-token.bat   Vercel Token 部署脚本
├── vercel-deploy.bat       辅助脚本：绕过代理部署
└── vercel-login.bat        辅助脚本：绕过代理登录 Vercel
```

---

## 当前进度

### ✅ 步骤 1：Vercel 部署（已完成）

| 项目 | 状态 | 详情 |
|---|---|---|
| Vercel 账号 | ✅ | GitHub 登录，Hobby 免费版 |
| Vercel 项目 | ✅ | `linyi-design-s-projects/2026-06-05-05-17-41` |
| 生产环境网址 | ✅ | `https://2026-06-05-05-17-41.vercel.app` |
| 部署成功 | ✅ | 前端页面可正常访问 |

### ✅ 步骤 2：Git 本地提交（已完成）

| 项目 | 状态 | 详情 |
|---|---|---|
| Git 初始化 | ✅ | 已完成 |
| 代码提交 | ✅ | 22 个文件已提交到 master 分支 |
| GitHub 推送 | ⏳ | 待创建远程仓库并推送 |

### ⏳ 步骤 3：GitHub 备份（待执行）

运行 `create-github-repo.bat`，按提示输入：
1. GitHub 用户名
2. GitHub Personal Access Token
3. 仓库名称（默认 `linyi-designer`）

脚本会自动创建仓库并推送代码。

### ❌ 步骤 4：数据库恢复（阻塞中）

**问题**: Supabase 项目 `linyi-designer` 无法访问
- 错误: `getaddrinfo ENOTFOUND qkvjkphcktzevitptdvi.supabase.co`
- 原因: 域名解析失败，项目可能被暂停或删除

**影响**: 所有 API 返回 500，作品区/留言板/联系表单/管理后台均无法使用

**解决方案**（三选一）：

| 方案 | 操作 | 预计时间 | 功能保留 |
|---|---|---|---|
| **A. 恢复 Supabase** | 去 supabase.com 登录 → Resume 项目 | 5分钟 | 全部 |
| **B. 新建 Supabase** | 创建新项目 → 执行 SQL 建表 | 15分钟 | 全部 |
| **C. 改纯静态** | 移除后端，用 JSON 文件存储 | 30分钟 | 部分 |

---

## 已知注意事项

- `image_urls` 字段存储 JSON 数组字符串（非单值）
- Mock 模式密码固定为 `demo`
- 生产模式密码 = ADMIN_TOKEN 环境变量（当前: `linyi20260605`）
- 前台联系表单 type 已从 email 改为 text（placeholder="联系方式"）
- 本地代理 `http://127.0.0.1:10809` 会干扰 Vercel CLI，所有 CLI 命令必须绕过代理
- `.env` 和 `.env.local` 包含敏感密钥，已加入 .gitignore，不会推送到 GitHub
