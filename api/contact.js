const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const https = require('https');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// 企业微信机器人通知
function notifyWecom(type, data) {
  const webhook = process.env.WECOM_WEBHOOK;
  if (!webhook) return;

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

  const wecomReq = https.request(options, (wecomRes) => {
    let body = '';
    wecomRes.on('data', (chunk) => { body += chunk; });
    wecomRes.on('end', () => {
      try {
        const ret = JSON.parse(body);
        if (ret.errcode === 0) console.log('[WECOM] 通知发送成功: ' + type);
        else console.log('[WECOM] 通知发送失败:', ret.errmsg);
      } catch(e) {}
    });
  });
  wecomReq.on('error', (e) => { console.log('[WECOM] 通知发送失败:', e.message); });
  wecomReq.write(postData);
  wecomReq.end();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, corsHeaders);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const { name, email, project_type, message } = req.body || {};

    if (!name || !email || !message) {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: '请填写必填项' }));
      return;
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Save to database
    const { error: dbError } = await supabase
      .from('contacts')
      .insert([{ name, email, project_type, message }]);

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: '保存失败，请重试' }));
      return;
    }

    // 企业微信机器人通知
    notifyWecom('contact', { name, email, project_type, message });

    // Send email notification
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: process.env.ADMIN_EMAIL,
          subject: '【林一设计】新咨询留言',
          html: `
            <h2>收到新的咨询留言</h2>
            <p><strong>姓名：</strong>${name}</p>
            <p><strong>邮箱：</strong>${email}</p>
            <p><strong>项目类型：</strong>${project_type || '未填写'}</p>
            <p><strong>留言内容：</strong></p>
            <p style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:4px;">${message}</p>
            <hr />
            <p style="color:#999;font-size:12px;">时间：${new Date().toLocaleString('zh-CN')}</p>
          `
        });
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        // Don't fail the request if email fails
      }
    }

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ success: true, message: '提交成功，我会尽快联系你' }));

  } catch (err) {
    console.error('Handler error:', err);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: '服务器错误' }));
  }
};
