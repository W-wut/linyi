const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  'Content-Type': 'application/json'
};

function checkAuth(req) {
  const token = req.headers?.['x-admin-token'] || req.body?.token;
  return token === process.env.ADMIN_TOKEN;
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

  if (!checkAuth(req)) {
    res.writeHead(401, corsHeaders);
    res.end(JSON.stringify({ error: '未授权访问' }));
    return;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { action } = req.body || {};

    // Verify token -- just return success (auth already checked by checkAuth)
    if (action === 'verify') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Get all contacts
    if (action === 'contacts') {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: data || [] }));
      return;
    }

    // Get all messages (including hidden)
    if (action === 'messages') {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: data || [] }));
      return;
    }

    // Toggle message visibility
    if (action === 'toggle_message') {
      const { id, visible } = req.body;
      const { error } = await supabase
        .from('messages')
        .update({ visible })
        .eq('id', id);

      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Delete message
    if (action === 'delete_message') {
      const { id } = req.body;
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Delete contact
    if (action === 'delete_contact') {
      const { id } = req.body;
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Get all works
    if (action === 'works') {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse image_urls from JSON string to array
      const works = (data || []).map(w => {
        let urls = [];
        if (w.image_urls) {
          // Try to parse if it's a JSON array, otherwise use as single URL
          try {
            const parsed = JSON.parse(w.image_urls);
            if (Array.isArray(parsed)) {
              urls = parsed;
            } else {
              urls = [w.image_urls];
            }
          } catch(e) {
            // Not JSON, use as single URL
            urls = [w.image_urls];
          }
        }
        return { ...w, image_urls: urls };
      });

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: works }));
      return;
    }

    // Update work
    if (action === 'update_work') {
      const { id, ...updates } = req.body;
      const { error } = await supabase
        .from('works')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Site settings (read from about table)
    if (action === 'settings') {
      const { data, error } = await supabase
        .from('about')
        .select('guestbook_enabled')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      const enabled = data?.guestbook_enabled !== false;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        data: { guestbook_enabled: enabled }
      }));
      return;
    }

    if (action === 'toggle_guestbook') {
      const { data } = await supabase
        .from('about')
        .select('guestbook_enabled')
        .eq('id', 1)
        .single();

      const current = data?.guestbook_enabled !== false;
      const next = !current;

      const { error } = await supabase
        .from('about')
        .update({ guestbook_enabled: next })
        .eq('id', 1);

      if (error) throw error;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, guestbook_enabled: next }));
      return;
    }

    // Content management
    if (action === 'content') {
      const { data, error } = await supabase.from('content').select('*').eq('id', 1).single();
      if (error && error.code !== 'PGRST116') throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: data || {} }));
      return;
    }

    if (action === 'update_content') {
      const contentData = req.body.data || {};
      const { error } = await supabase.from('content').upsert({ id: 1, ...contentData });
      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: contentData }));
      return;
    }

    // About management
    if (action === 'about') {
      const { data, error } = await supabase.from('about').select('*').single();
      if (error && error.code !== 'PGRST116') throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: data || {} }));
      return;
    }

    if (action === 'update_about') {
      const aboutData = req.body.data || {};
      if (aboutData.image_url && aboutData.image_url.startsWith('data:image')) {
        const base64Data = aboutData.image_url.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = 'about_photo_' + Date.now() + '.jpg';
        await supabase.storage.from('works').upload(filename, buffer, { contentType: 'image/jpeg', upsert: true });
        const { data: urlData } = supabase.storage.from('works').getPublicUrl(filename);
        aboutData.image_url = urlData.publicUrl;
      }
      const { error } = await supabase.from('about').upsert({ id: 1, ...aboutData });
      if (error) throw error;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: aboutData }));
      return;
    }

    res.writeHead(400, corsHeaders);
    res.end(JSON.stringify({ error: '未知操作' }));

  } catch (err) {
    console.error('Admin handler error:', err);
    res.writeHead(500, corsHeaders);
    res.end(JSON.stringify({ error: '服务器错误' }));
  }
};
