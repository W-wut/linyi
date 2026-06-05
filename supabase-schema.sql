-- ==========================================
-- 林一设计网站 · Supabase 建表 SQL
-- 在 Supabase SQL Editor 中一次性执行全部
-- ==========================================

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
  stat_satisfaction text DEFAULT '',
  guestbook_enabled boolean DEFAULT true
);

-- 插入默认"关于我"数据
INSERT INTO about (id, intro1, intro2, intro3, stat_years, stat_projects, stat_satisfaction, guestbook_enabled)
VALUES (1, '我是林一，一名常驻上海的独立室内设计师...', '', '', '8+', '60+', '100%', true);

-- 5. 全站内容表
CREATE TABLE content (
  id serial PRIMARY KEY,
  hero_subtitle text DEFAULT '',
  hero_title text DEFAULT '',
  hero_desc text DEFAULT '',
  about_subtitle text DEFAULT '',
  phi_title1 text DEFAULT '',
  phi_desc1 text DEFAULT '',
  phi_title2 text DEFAULT '',
  phi_desc2 text DEFAULT '',
  phi_title3 text DEFAULT '',
  phi_desc3 text DEFAULT '',
  svc_title1 text DEFAULT '',
  svc_desc1 text DEFAULT '',
  svc_title2 text DEFAULT '',
  svc_desc2 text DEFAULT '',
  svc_title3 text DEFAULT '',
  svc_desc3 text DEFAULT '',
  contact_intro text DEFAULT '',
  contact_phone text DEFAULT '',
  contact_email text DEFAULT '',
  contact_address text DEFAULT '',
  contact_hours text DEFAULT '',
  contact_note text DEFAULT '',
  footer_wechat text DEFAULT '',
  footer_xhs text DEFAULT '',
  footer_ig text DEFAULT '',
  footer_copyright text DEFAULT ''
);

-- 插入默认内容数据
INSERT INTO content (id) VALUES (1);
