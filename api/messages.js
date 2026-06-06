const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// 企业微信机器人通知
function notifyWecom(type, data) {
  return new Promise(function(resolve) {
    const webhook = process.env.WECOM_WEBHOOK;
    if (!webhook) {
      console.log('[WECOM] 未配置 WECOM_WEBHOOK，跳过通知');
      resolve();
      return;
    }

    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    let markdown = '';

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

    const postData = JSON.stringify({
      msgtype: 'markdown',
      markdown: { content: markdown }
    });

    const url = new URL(webhook);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };

    const wecomReq = https.request(options, function(wecomRes) {
      let body = '';
      wecomRes.on('data', function(chunk) { body += chunk; });
      wecomRes.on('end', function() {
        try {
          const ret = JSON.parse(body);
          if (ret.errcode === 0) console.log('[WECOM] 通知发送成功: ' + type);
          else console.log('[WECOM] 通知发送失败:', ret.errmsg);
        } catch(e) {}
        resolve();
      });
    });
    wecomReq.on('error', function(e) {
      console.log('[WECOM] 通知发送失败:', e.message);
      resolve();
    });
    wecomReq.write(postData);
    wecomReq.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // GET - list visible messages
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('messages')
        .select('id, name, content, created_at')
        .eq('visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: data || [] }));
      return;
    }

    // POST - create message
    if (req.method === 'POST') {
      const { name, content } = req.body || {};

      if (!name || !content) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: '请填写姓名和留言内容' }));
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert([{ name, content }]);

      if (error) throw error;

      // 企业微信机器人通知
      await notifyWecom('message', { name, content });

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, message: '留言成功' }));
      return;
    }

    res.writeHead(405, corsHeaders);
    res.end(JSON.stringify({ error: 'Method not allowed' }));

  } catch (err) {
    console.error('Handler error:', err);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: '服务器错误' }));
  }
};
