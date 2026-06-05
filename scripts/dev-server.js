/**
 * 本地开发服务器
 * 用法: node dev-server.js
 * 端口: 3000
 */
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const WECOM_WEBHOOK = process.env.WECOM_WEBHOOK || '';
const ROOT = path.join(__dirname, '..', 'public');

// MIME types
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Simple body parser
function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try {
          resolve(JSON.parse(buf.toString()));
        } catch {
          resolve({});
        }
      } else if (ct.includes('multipart/form-data')) {
        resolve(buf);
      } else {
        resolve(buf.toString());
      }
    });
    req.on('error', () => resolve({}));
  });
}

// CORS headers
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
}

// Static file server
function serveStatic(reqPath, res) {
  const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\$))+/g, '');
  const filePath = path.join(ROOT, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Try index.html for directory
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveFile(indexPath, res);
    }
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  serveFile(filePath, res);
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  fs.createReadStream(filePath).pipe(res);
}

// API handler loader
async function handleApi(reqPath, req, res) {
  const apiName = reqPath.replace(/^\/api\//, '').split('/')[0];
  const apiFile = path.join(__dirname, '..', 'api', apiName + '.js');

  if (!fs.existsSync(apiFile)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'API not found: ' + apiName }));
    return;
  }

  // Clear require cache for hot reload
  delete require.cache[require.resolve(apiFile)];

  const handler = require(apiFile);
  const body = await parseBody(req);

  // Mock req.body for compatibility
  req.body = body;

  // Patch res helpers
  const origWriteHead = res.writeHead.bind(res);
  res.writeHead = function(statusCode, headers) {
    setCors(res);
    if (headers && typeof headers === 'object') {
      Object.entries(headers).forEach(([k, v]) => {
        if (k.toLowerCase() !== 'content-type') {
          res.setHeader(k, v);
        } else {
          res.setHeader('Content-Type', v);
        }
      });
    }
    res.statusCode = statusCode;
    return res;
  };

  // Call handler
  try {
    await handler(req, res);
  } catch (err) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error', detail: err.message }));
    }
  }
}

// Mock API fallback (when Supabase is not configured)
// Disk-persisted mock storage
const MOCK_FILE = path.join(__dirname, '..', 'mock-data.json');

const defaultWorks = [
  { id: 1, title: '光影之间 · 私宅', category: '私宅', year: '2024', tags: '原木 白墙 光影', description: '120㎡', image_urls: ['/assets/images/img_01.jpg', '/assets/images/img_02.jpg', '/assets/images/img_03.jpg', '/assets/images/img_04.jpg'], sort_order: 0 },
  { id: 2, title: '沏 · 茶空间', category: '商业', year: '2023', tags: '新中式 茶室', description: '', image_urls: [], sort_order: 1 }
];
const defaultMessages = [
  { id: 1, name: '访客A', content: '网站做得很漂亮！', created_at: new Date().toISOString(), visible: true },
  { id: 2, name: '访客B', content: '期待看到更多作品', created_at: new Date(Date.now() - 86400000).toISOString(), visible: true }
];
const defaultSettings = { guestbook_enabled: true };
const defaultAbout = { image_url: '', intro1: '我是林一，一名常驻上海的独立室内设计师。从事室内设计 8 年来，我始终相信：好的设计不在繁复，而在恰到好处。', intro2: '从私宅到商业空间，我擅长在功能与美学之间寻找平衡点，让每个项目都拥有独一无二的性格。我的设计语言融合了东方留白美学与现代极简主义，注重材质质感和光影层次。', intro3: '每个项目我都亲自跟进——从概念设计到施工落地，确保每一处细节都忠于初心。', stat_years: '8+', stat_projects: '60+', stat_satisfaction: '100%' };

const defaultContent = {
  hero_subtitle: 'INTERIOR DESIGNER',
  hero_title: '用空间讲述<br />生活的故事',
  hero_desc: '每个空间都应当反映居住者的灵魂。<br />我专注于创造既美观又宜居的室内环境，<br />让设计与人的生活自然融合。',
  about_subtitle: '设计，是人与空间的对话',
  phi_title1: '慢设计', phi_desc1: '不追赶潮流，每个项目都花足够的时间去理解居住者的生活习惯与深层需求。',
  phi_title2: '留白美学', phi_desc2: '好的空间需要呼吸感。用克制的手法为居住者的生活留出想象和变化的空间。',
  phi_title3: '材质为先', phi_desc3: '真实的木材、粗粝的石材、温润的织物——用材质的对话取代多余的装饰。',
  svc_title1: '全案设计', svc_desc1: '从空间规划、硬装设计到软装搭配的一站式服务。包含概念方案、施工图绘制、材料选样、家具订制、饰品采购及项目全程管理。',
  svc_title2: '软装设计', svc_desc2: '针对已有硬装的客户，提供家具、灯具、布艺、配饰等整体搭配方案，让空间焕然一新。',
  svc_title3: '设计咨询', svc_desc3: '如果你正在进行装修项目，需要专业建议，我提供按次/按小时的咨询服务——平面优化、配色建议、材料推荐。',
  contact_intro: '期待与你的空间对话',
  contact_phone: '138-8888-8888', contact_email: 'hello@linyi.design',
  contact_address: '上海市静安区常熟路 88 号', contact_hours: '周一至周五 10:00 - 18:00',
  contact_note: '初次咨询免费（线上30分钟），欢迎先聊聊你的想法。',
  footer_wechat: '微信公众号：林一设计', footer_xhs: '小红书', footer_ig: 'Instagram',
  footer_copyright: '© 2025 林一 · 室内设计 · All Rights Reserved'
};

function loadMockData() {
  try {
    if (fs.existsSync(MOCK_FILE)) {
      var raw = fs.readFileSync(MOCK_FILE, 'utf8');
      var d = JSON.parse(raw);
      mockWorks = d.works || defaultWorks;
      mockMessages = d.messages || defaultMessages;
      mockContacts = d.contacts || [];
      mockSettings = d.settings || defaultSettings;
      mockAbout = d.about || defaultAbout;
      mockContent = d.content || defaultContent;
      console.log('[MOCK] 从磁盘加载数据: ' + mockWorks.length + ' 个作品, ' + mockMessages.length + ' 条留言');
      return;
    }
  } catch(e) { console.log('[MOCK] 数据文件读取失败，使用默认数据'); }
  mockWorks = defaultWorks;
  mockMessages = defaultMessages;
  mockContacts = [];
  mockSettings = defaultSettings;
  mockAbout = defaultAbout;
  mockContent = defaultContent;
}

function saveMockData() {
  try {
    fs.writeFileSync(MOCK_FILE, JSON.stringify({
      works: mockWorks,
      messages: mockMessages,
      contacts: mockContacts,
      settings: mockSettings,
      about: mockAbout,
      content: mockContent
    }, null, 2), 'utf8');
  } catch(e) { console.log('[MOCK] 数据保存失败:', e.message); }
}

let mockWorks = [];
let mockContacts = [];
let mockMessages = [];
let mockSettings = {};
let mockAbout = {};
let mockContent = {};
loadMockData();

function handleMockApi(reqPath, req, res) {
  const apiName = reqPath.replace(/^\/api\//, '').split('/')[0];
  const method = req.method;
  const body = req.body || {};

  setCors(res);
  res.setHeader('Content-Type', 'application/json');

  if (apiName === 'contact' && method === 'POST') {
    console.log('[MOCK] Contact received:', body);
    body.created_at = new Date().toISOString();
    body.id = mockContacts.length > 0 ? Math.max.apply(null, mockContacts.map(function(c) { return c.id || 0; })) + 1 : 1;
    mockContacts.push(body);
    saveMockData();
    notifyWecom('contact', body);
    res.end(JSON.stringify({ success: true, message: '提交成功（模拟模式）' }));
    return;
  }

  if (apiName === 'messages') {
    if (method === 'GET') {
      res.end(JSON.stringify({ success: true, data: mockMessages }));
      return;
    }
    if (method === 'POST') {
      console.log('[MOCK] Message received:', body);
      var newMsg = {
        id: mockMessages.length + 1,
        name: body.name || '匿名',
        content: body.content || '',
        created_at: new Date().toISOString(),
        visible: true
      };
      mockMessages.unshift(newMsg);
      saveMockData();
      notifyWecom('message', newMsg);
      res.end(JSON.stringify({ success: true, message: '留言成功' }));
      return;
    }
  }

  if (apiName === 'works') {
    if (method === 'GET') {
      res.end(JSON.stringify({ success: true, data: mockWorks }));
      return;
    }
    if (method === 'POST') {
      var newId = mockWorks.length > 0 ? Math.max.apply(null, mockWorks.map(function(w) { return w.id; })) + 1 : 1;
      // Support multiple images: image_base64s array or single image_base64
      var imageUrls = [];
      if (body.image_base64s && Array.isArray(body.image_base64s)) {
        imageUrls = body.image_base64s;
      } else if (body.image_base64) {
        imageUrls = [body.image_base64];
      }
      var newWork = {
        id: newId,
        title: body.title || '未命名作品',
        category: body.category || '',
        year: body.year || '',
        tags: body.tags || '',
        description: body.description || '',
        image_urls: imageUrls,
        sort_order: body.sort_order || 0
      };
      mockWorks.push(newWork);
      console.log('[MOCK] Work added:', newWork.title, '(' + imageUrls.length + ' images)');
      saveMockData();
      res.end(JSON.stringify({ success: true, image_urls: imageUrls }));
      return;
    }
    if (method === 'DELETE') {
      console.log('[MOCK] Work delete:', body.id);
      mockWorks = mockWorks.filter(function(w) { return w.id !== body.id; });
      saveMockData();
      res.end(JSON.stringify({ success: true }));
      return;
    }
  }

  if (apiName === 'admin' && method === 'POST') {
    const token = req.headers['x-admin-token'] || body.token;
    if (token !== (process.env.ADMIN_TOKEN || 'demo')) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: '未授权访问' }));
      return;
    }

    const action = body.action;

    // Verify: just check the token and return
    if (action === 'verify') {
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (action === 'contacts') {
      res.end(JSON.stringify({ success: true, data: mockContacts }));
      return;
    }
    if (action === 'messages') {
      res.end(JSON.stringify({ success: true, data: mockMessages }));
      return;
    }
    if (action === 'works') {
      res.end(JSON.stringify({ success: true, data: mockWorks }));
      return;
    }
    if (action === 'toggle_message') {
      var msg = mockMessages.find(function(m) { return m.id === body.id; });
      if (msg) msg.visible = body.visible;
      saveMockData();
      res.end(JSON.stringify({ success: true }));
      return;
    }
    if (action === 'delete_message') {
      mockMessages = mockMessages.filter(function(m) { return m.id !== body.id; });
      saveMockData();
      res.end(JSON.stringify({ success: true }));
      return;
    }
    if (action === 'delete_contact') {
      mockContacts = mockContacts.filter(function(c) { return c.id !== body.id; });
      saveMockData();
      res.end(JSON.stringify({ success: true }));
      return;
    }
    if (action === 'settings') {
      res.end(JSON.stringify({ success: true, data: mockSettings }));
      return;
    }
    if (action === 'toggle_guestbook') {
      mockSettings.guestbook_enabled = !mockSettings.guestbook_enabled;
      saveMockData();
      res.end(JSON.stringify({ success: true, guestbook_enabled: mockSettings.guestbook_enabled }));
      return;
    }
    if (action === 'about') {
      res.end(JSON.stringify({ success: true, data: mockAbout }));
      return;
    }
    if (action === 'update_about') {
      mockAbout = Object.assign(mockAbout, body.data || {});
      saveMockData();
      res.end(JSON.stringify({ success: true, data: mockAbout }));
      return;
    }
    if (action === 'content') {
      res.end(JSON.stringify({ success: true, data: mockContent }));
      return;
    }
    if (action === 'update_content') {
      Object.assign(mockContent, body.data || {});
      saveMockData();
      res.end(JSON.stringify({ success: true, data: mockContent }));
      return;
    }
  }

  if (apiName === 'settings') {
    res.end(JSON.stringify({ success: true, guestbook_enabled: mockSettings.guestbook_enabled }));
    return;
  }

  if (apiName === 'about' && method === 'GET') {
    res.end(JSON.stringify({ success: true, data: mockAbout }));
    return;
  }

  if (apiName === 'content' && method === 'GET') {
    res.end(JSON.stringify({ success: true, data: mockContent }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
}

// WeCom notification
function notifyWecom(type, data) {
  if (!WECOM_WEBHOOK) return;
  var now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  var markdown = '';

  if (type === 'contact') {
    markdown = '**【林一设计】新咨询留言**\n' +
      '> 姓名：<font color="info">' + (data.name || '-') + '</font>\n' +
      '> 联系方式：<font color="info">' + (data.email || '-') + '</font>\n' +
      '> 项目类型：<font color="comment">' + (data.project_type || '未填写') + '</font>\n' +
      '> 留言内容：' + (data.message || '-') + '\n' +
      '> 时间：' + now;
  } else if (type === 'message') {
    markdown = '**【林一设计】新访客留言**\n' +
      '> 称呼：<font color="info">' + (data.name || '-') + '</font>\n' +
      '> 内容：' + (data.content || '-') + '\n' +
      '> 时间：' + now;
  }

  var postData = JSON.stringify({
    msgtype: 'markdown',
    markdown: { content: markdown }
  });

  var url = new URL(WECOM_WEBHOOK);
  var options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };

  var req = https.request(options, function(res) {
    var body = '';
    res.on('data', function(chunk) { body += chunk; });
    res.on('end', function() {
      try {
        var ret = JSON.parse(body);
        if (ret.errcode === 0) console.log('[WECOM] 通知发送成功: ' + type);
        else console.log('[WECOM] 通知发送失败:', ret.errmsg);
      } catch(e) {}
    });
  });
  req.on('error', function(e) { console.log('[WECOM] 通知发送失败:', e.message); });
  req.write(postData);
  req.end();
}

// Check if Supabase is configured
const hasSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;
if (!hasSupabase) {
  console.log('⚠️  未配置 Supabase，API 将返回模拟数据（MOCK MODE）');
  console.log('   如需连接真实数据库，请创建 .env 文件并配置环境变量\n');
}

// Create server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const reqPath = decodeURIComponent(url.pathname);

  console.log(`${req.method} ${reqPath}`);

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 200;
    res.end();
    return;
  }

  // API routes
  if (reqPath.startsWith('/api/')) {
    if (hasSupabase) {
      await handleApi(reqPath, req, res);
    } else {
      const body = await parseBody(req);
      req.body = body;
      handleMockApi(reqPath, req, res);
    }
    return;
  }

  // Static files
  if (reqPath === '/') {
    serveStatic('index.html', res);
  } else if (reqPath.startsWith('/admin')) {
    serveStatic(reqPath.slice(1), res);
  } else {
    serveStatic(reqPath.slice(1), res);
  }
});

function startServer(port) {
  const srv = server.listen(port, () => {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     林一设计 · 本地开发服务器            ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  前端页面: http://localhost:${port}/            ║`);
    console.log(`║  管理后台: http://localhost:${port}/admin/      ║`);
    console.log(`║  API 接口: http://localhost:${port}/api/...     ║`);
    console.log('╚══════════════════════════════════════════╝\n');
    console.log('按 Ctrl+C 停止服务器');
  });

  srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  端口 ${port} 被占用，尝试 ${port + 1}...`);
      setTimeout(() => startServer(port + 1), 100);
    } else {
      console.error('服务器错误:', err);
      process.exit(1);
    }
  });
}

startServer(PORT);
