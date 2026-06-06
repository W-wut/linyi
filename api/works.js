const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

      // Upload each image to Supabase Storage
      const image_urls = [];
      const uploadErrors = [];
      for (let i = 0; i < imageBases.length; i++) {
        const mimeType = getMimeType(imageBases[i]);
        const ext = mimeType.split('/')[1] || 'jpg';
        const base64Data = imageBases[i].replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const rawName = (filenames[i] || 'image_' + i).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = Date.now() + '_' + i + '_' + rawName + '.' + ext;

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

      // Save work record
      const { error: insertError } = await supabase
        .from('works')
        .insert([{
          title: body.title || '未命名作品',
          category: body.category || '',
          year: body.year || '',
          tags: body.tags || '',
          description: body.description || '',
          image_urls: JSON.stringify(image_urls)
        }]);

      if (insertError) throw insertError;

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
      const body = getBody(req);
      const { id } = body || {};

      if (!id) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: '缺少作品ID' }));
        return;
      }

      // Get existing work
      const { data: existingWork, error: fetchError } = await supabase
        .from('works')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Get existing images
      let existingUrls = [];
      if (existingWork?.image_urls) {
        try { existingUrls = JSON.parse(existingWork.image_urls); } catch(e) { existingUrls = []; }
      } else if (existingWork?.image_url) {
        existingUrls = [existingWork.image_url];
      }

      // Process deleted images
      const deletedUrls = body.deleted_urls || [];
      console.log('DEBUG - PUT works - deleted_urls received:', deletedUrls);
      
      const urlsToDelete = [];
      for (const url of deletedUrls) {
        if (!url) continue;
        
        let path = null;
        // Try multiple URL patterns to extract file path
        if (url.includes('/storage/v1/object/public/works/')) {
          path = url.split('/storage/v1/object/public/works/')[1];
          console.log('DEBUG - URL pattern 1 (Supabase standard):', url, '->', path);
        } else if (url.includes('/storage/v1/object/')) {
          // Alternative: /storage/v1/object/<bucket>/<path>
          const match = url.match(/\/storage\/v1\/object\/[^\/]+\/([^\/\?#]+)/);
          if (match) {
            path = match[1];
            console.log('DEBUG - URL pattern 2 (storage/v1/object):', url, '->', path);
          }
        } else if (url.includes('/works/')) {
          // Alternative pattern: /works/filename
          const match = url.match(/\/works\/([^\/\?#]+)/);
          if (match) {
            path = match[1];
            console.log('DEBUG - URL pattern 3 (/works/):', url, '->', path);
          }
        } else {
          // Try to extract just the filename from any URL
          const lastSlash = url.lastIndexOf('/');
          if (lastSlash >= 0 && lastSlash < url.length - 1) {
            path = url.substring(lastSlash + 1).split('?')[0].split('#')[0];
            console.log('DEBUG - URL pattern 4 (filename extraction):', url, '->', path);
          } else {
            // Just use the URL as-is if it looks like a filename
            if (url.includes('.') && !url.includes('://')) {
              path = url;
              console.log('DEBUG - URL pattern 5 (direct filename):', url, '->', path);
            } else {
              console.log('DEBUG - No URL pattern matched:', url);
            }
          }
        }
        
        if (path) {
          // Decode URL encoded characters
          path = decodeURIComponent(path);
          // Remove any query string or fragment that might remain
          path = path.split('?')[0].split('#')[0];
          urlsToDelete.push(path);
        }
      }
      console.log('DEBUG - Final paths to delete:', urlsToDelete);
      
      if (urlsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage.from('works').remove(urlsToDelete);
        if (storageError) {
          console.error('Failed to delete images from storage:', storageError);
        } else {
          console.log('Successfully deleted', urlsToDelete.length, 'files from storage');
        }
      } else {
        console.log('DEBUG - No files to delete from storage');
      }

      // Process new images
      const newImageBases = body.new_image_base64s || [];
      const newFilenames = body.new_image_filenames || [];
      const newImageUrls = [];
      for (let i = 0; i < newImageBases.length; i++) {
        const mimeType = getMimeType(newImageBases[i]);
        const ext = mimeType.split('/')[1] || 'jpg';
        const base64Data = newImageBases[i].replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const rawName = (newFilenames[i] || 'new_image_' + i).replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = Date.now() + '_' + i + '_' + rawName + '.' + ext;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('works')
          .upload(filename, buffer, { contentType: mimeType, upsert: false });

        if (uploadError) {
          console.error('Upload error for ' + filename + ':', uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage.from('works').getPublicUrl(filename);
        newImageUrls.push(urlData.publicUrl);
      }

      // Combine images: remaining existing + new
      const remainingUrls = existingUrls.filter(url => !deletedUrls.includes(url));
      const orderedUrls = body.ordered_urls || [];
      
      let finalUrls = [];
      if (orderedUrls.length > 0) {
        // Use ordered URLs
        finalUrls = orderedUrls.filter(url => existingUrls.includes(url) || newImageUrls.includes(url));
        // Add any new images not in order
        for (const url of newImageUrls) {
          if (!finalUrls.includes(url)) finalUrls.push(url);
        }
      } else {
        // Default: remaining existing + new
        finalUrls = [...remainingUrls, ...newImageUrls];
      }

      // Update work
      const { error: updateError } = await supabase
        .from('works')
        .update({
          title: body.title || existingWork.title,
          category: body.category || existingWork.category,
          year: body.year || existingWork.year,
          tags: body.tags || existingWork.tags,
          description: body.description || existingWork.description,
          image_urls: JSON.stringify(finalUrls)
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
      console.log('DEBUG - DELETE works - image URLs to process:', urlsToDelete);
      const pathsToRemove = [];
      for (const url of urlsToDelete) {
        if (!url) continue;
        
        let path = null;
        if (url.includes('/storage/v1/object/public/works/')) {
          path = url.split('/storage/v1/object/public/works/')[1];
          console.log('DEBUG - DELETE - URL pattern 1 matched:', url, '->', path);
        } else if (url.includes('/storage/v1/object/')) {
          const match = url.match(/\/storage\/v1\/object\/[^\/]+\/([^\/\?#]+)/);
          if (match) {
            path = match[1];
            console.log('DEBUG - DELETE - URL pattern 2 matched:', url, '->', path);
          }
        } else if (url.includes('/works/')) {
          const match = url.match(/\/works\/([^\/\?#]+)/);
          if (match) {
            path = match[1];
            console.log('DEBUG - DELETE - URL pattern 3 matched:', url, '->', path);
          }
        } else {
          const lastSlash = url.lastIndexOf('/');
          if (lastSlash >= 0 && lastSlash < url.length - 1) {
            path = url.substring(lastSlash + 1).split('?')[0].split('#')[0];
            console.log('DEBUG - DELETE - URL pattern 4 (filename):', url, '->', path);
          } else if (url.includes('.') && !url.includes('://')) {
            path = url;
            console.log('DEBUG - DELETE - URL pattern 5 (direct):', url, '->', path);
          } else {
            console.log('DEBUG - DELETE - No URL pattern matched:', url);
          }
        }
        
        if (path) {
          path = decodeURIComponent(path).split('?')[0].split('#')[0];
          pathsToRemove.push(path);
        }
      }
      console.log('DEBUG - DELETE - Final paths to remove:', pathsToRemove);
      
      if (pathsToRemove.length > 0) {
        const { error: storageError } = await supabase.storage.from('works').remove(pathsToRemove);
        if (storageError) {
          console.error('DEBUG - DELETE - Failed to delete:', storageError);
        } else {
          console.log('DEBUG - DELETE - Successfully deleted', pathsToRemove.length, 'files');
        }
      } else {
        console.log('DEBUG - DELETE - No files to remove from storage');
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
