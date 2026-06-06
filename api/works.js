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

// Parse request body safely
// Vercel auto-parses JSON body into req.body, but large payloads may fail
function getBody(req) {
  // If Vercel already parsed the body, use it directly
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  // Return empty object if body wasn't parsed (e.g. payload too large)
  console.error('Body not parsed - payload may exceed size limit');
  return {};
}

// Extract MIME type from base64 data URL
function getMimeType(dataUrl) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : 'image/jpeg';
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

      const body = getBody(req);

      // Collect all image base64 data
      const imageBases = body.image_base64s || (body.image_base64 ? [body.image_base64] : []);
      const filenames = body.image_filenames || (body.image_filename ? [body.image_filename] : []);

      if (!Array.isArray(imageBases) || imageBases.length === 0) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: '未收到图片数据，请检查图片大小是否超过限制' }));
        return;
      }

      // First insert work record to get ID for folder name
      const { data: insertData, error: insertError } = await supabase
        .from('works')
        .insert([{
          title: body.title || '未命名作品',
          category: body.category || '',
          year: body.year || '',
          tags: body.tags || '',
          description: body.description || '',
          image_urls: JSON.stringify([])
        }])
        .select('id');

      if (insertError) throw insertError;
      const workId = insertData[0]?.id;
      if (!workId) {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: '无法获取作品ID' }));
        return;
      }

      // Create folder name using work ID and title
      const folderName = workId + '_' + (body.title || 'untitled').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_').substring(0, 20);

      // Upload each image to Supabase Storage in a dedicated folder
      const image_urls = [];
      const uploadErrors = [];
      for (let i = 0; i < imageBases.length; i++) {
        const mimeType = getMimeType(imageBases[i]);
        const ext = mimeType.split('/')[1] || 'jpg';
        const base64Data = imageBases[i].replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const rawName = (filenames[i] || 'image_' + i).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = folderName + '/' + Date.now() + '_' + i + '_' + rawName + '.' + ext;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('works')
          .upload(filename, buffer, {
            contentType: mimeType,
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error for ' + filename + ':', uploadError);
          uploadErrors.push({ index: i, filename: filename, error: uploadError.message || 'Unknown error' });
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
        const errorMsg = uploadErrors.length > 0 ? '图片上传失败: ' + uploadErrors.map(e => e.error).join(', ') : '图片上传失败，请检查 Supabase Storage 配置';
        res.end(JSON.stringify({ error: errorMsg }));
        return;
      }

      // Update work record with actual image URLs
      const { error: updateError } = await supabase
        .from('works')
        .update({ image_urls: JSON.stringify(image_urls) })
        .eq('id', workId);

      if (updateError) throw updateError;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, image_urls }));
      return;
    }

    // DELETE - remove work
    if (req.method === 'DELETE') {
      if (!checkAuth(req)) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: '未授权访问' }));
        return;
      }
      const body = getBody(req);
      const { id } = body || {};

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
