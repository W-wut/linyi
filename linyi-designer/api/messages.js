const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

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
