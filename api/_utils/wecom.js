const https = require('https');

const WEBHOOK_TIMEOUT_MS = 5000;

function notifyWecom(type, data) {
  return new Promise(function(resolve) {
    const webhook = process.env.WECOM_WEBHOOK;
    if (!webhook) {
      console.log('[WECOM] 未配置 WECOM_WEBHOOK，跳过通知');
      resolve({ success: false, error: 'webhook_not_configured' });
      return;
    }

    let url;
    try {
      url = new URL(webhook);
    } catch (e) {
      console.log('[WECOM] Webhook URL 格式错误:', e.message);
      resolve({ success: false, error: 'invalid_webhook_url' });
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
          if (ret.errcode === 0) {
            console.log('[WECOM] 通知发送成功: ' + type);
            resolve({ success: true });
          } else {
            console.log('[WECOM] 通知发送失败:', ret.errmsg);
            resolve({ success: false, error: ret.errmsg });
          }
        } catch(e) {
          resolve({ success: false, error: 'parse_error' });
        }
      });
    });

    wecomReq.on('error', function(e) {
      console.log('[WECOM] 通知发送失败:', e.message);
      resolve({ success: false, error: e.message });
    });

    wecomReq.setTimeout(WEBHOOK_TIMEOUT_MS, function() {
      wecomReq.destroy();
      console.log('[WECOM] 通知请求超时');
      resolve({ success: false, error: 'timeout' });
    });

    wecomReq.write(postData);
    wecomReq.end();
  });
}

module.exports = { notifyWecom };
