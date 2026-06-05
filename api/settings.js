const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, corsHeaders);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Read guestbook setting from about table (id=1)
    const { data, error } = await supabase
      .from('about')
      .select('guestbook_enabled')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Fallback to env var if DB row missing
    const enabled = data?.guestbook_enabled !== false;

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ guestbook_enabled: enabled }));
  } catch (err) {
    console.error('Settings handler error:', err);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: '服务器错误' }));
  }
};
