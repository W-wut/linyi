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
  stat_satisfaction text DEFAULT ''
);

-- 插入默认"关于我"数据
INSERT INTO about (id, intro1, intro2, intro3, stat_years, stat_projects, stat_satisfaction)
VALUES (1, '我是林一，一名常驻上海的独立室内设计师...', '', '', '8+', '60+', '100%');
