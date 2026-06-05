const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  'Content-Type': 'application/json'
};

function checkAuth(req) {
  const token = req.headers?.['x-admin-token'];
  return token === process.env.ADMIN_TOKEN;
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
    // GET - list all works
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse image_urls from JSON string to array
      const works = (data || []).map(w => {
        let urls = [];
        if (w.image_urls) {
          try { urls = JSON.parse(w.image_urls); } catch(e) { urls = []; }
        }
        // Backward compatibility: if image_url exists but image_urls doesn't
        if (urls.length === 0 && w.image_url) {
          urls = [w.image_url];
        }
        return { ...w, image_urls: urls };
      });

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, data: works }));
      return;
    }

    // POST - create work (supports multiple base64 image uploads)
    if (req.method === 'POST') {
      if (!checkAuth(req)) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: '未授权访问' }));
        return;
      }
      const body = req.body || {};

      // Collect all image base64 data
      const imageBases = body.image_base64s || (body.image_base64 ? [body.image_base64] : []);
      const filenames = body.image_filenames || (body.image_filename ? [body.image_filename] : []);

      // Upload each image to Supabase Storage
      const image_urls = [];
      for (let i = 0; i < imageBases.length; i++) {
        const base64Data = imageBases[i].replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const rawName = (filenames[i] || 'image_' + i).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = Date.now() + '_' + i + '_' + rawName;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('works')
          .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: urlData } = supabase
          .storage
          .from('works')
          .getPublicUrl(filename);

        image_urls.push(urlData.publicUrl);
      }

      if (image_urls.length === 0) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: '图片上传失败' }));
        return;
      }

      // Save work record with image URL array as JSON string
      const { error: dbError } = await supabase
        .from('works')
        .insert([{
          title: body.title || '未命名作品',
          category: body.category || '',
          year: body.year || '',
          tags: body.tags || '',
          description: body.description || '',
          image_urls: JSON.stringify(image_urls),
          sort_order: body.sort_order || 0
        }]);

      if (dbError) throw dbError;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, image_urls }));
      return;
    }

    // PUT - update work
    if (req.method === 'PUT') {
      if (!checkAuth(req)) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: '未授权访问' }));
        return;
      }
      const { id, title, category, year, tags, description, sort_order, image_urls } = req.body || {};

      if (!id) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: '缺少作品ID' }));
        return;
      }

      const imageUrls = image_urls || [];
      const finalUrls = [];

      // Upload new images
      for (const url of imageUrls) {
        if (url.startsWith('data:image')) {
          const base64Data = url.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const filename = 'edit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '.jpg';

          const { error: uploadError } = await supabase
            .storage
            .from('works')
            .upload(filename, buffer, { contentType: 'image/jpeg', upsert: false });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data: urlData } = supabase
            .storage
            .from('works')
            .getPublicUrl(filename);

          finalUrls.push(urlData.publicUrl);
        } else {
          finalUrls.push(url);
        }
      }

      // Update work
      const { error: updateError } = await supabase
        .from('works')
        .update({
          title: title || '未命名作品',
          category: category || '',
          year: year || '',
          tags: tags || '',
          description: description || '',
          image_urls: JSON.stringify(finalUrls),
          sort_order: sort_order || 0
        })
        .eq('id', id);

      if (updateError) throw updateError;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, image_urls: finalUrls }));
      return;
    }

    // DELETE - remove work
    if (req.method === 'DELETE') {
      if (!checkAuth(req)) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: '未授权访问' }));
        return;
      }
      const { id } = req.body || {};

      if (!id) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: '缺少作品ID' }));
        return;
      }

      // Get image URLs first
      const { data: work } = await supabase
        .from('works')
        .select('image_urls,image_url')
        .eq('id', id)
        .single();

      // Collect all image URLs to delete
      let urlsToDelete = [];
      if (work?.image_urls) {
        try { urlsToDelete = JSON.parse(work.image_urls); } catch(e) { urlsToDelete = []; }
      }
      // Backward compatibility
      if (urlsToDelete.length === 0 && work?.image_url) {
        urlsToDelete = [work.image_url];
      }

      // Delete all images from storage
      const pathsToRemove = [];
      for (const url of urlsToDelete) {
        if (url && url.includes('/storage/v1/object/public/works/')) {
          const path = url.split('/storage/v1/object/public/works/')[1];
          if (path) pathsToRemove.push(path);
        }
      }
      if (pathsToRemove.length > 0) {
        await supabase.storage.from('works').remove(pathsToRemove);
      }

      const { error } = await supabase
        .from('works')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
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
