function unauthorized() { return new Response('Unauthorized', { status: 401 }); }
function allowed(context) {
  return context.request.headers.get('X-Admin-Username') === (context.env.ADMIN_USERNAME || 'Admin') &&
    context.env.ADMIN_PASSWORD && context.request.headers.get('Authorization') === 'Bearer ' + context.env.ADMIN_PASSWORD;
}
async function setup(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS video_assets (id INTEGER PRIMARY KEY AUTOINCREMENT, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)').run();
}
function unavailable(context) {
  return !context.env.ANALYTICS_DB || !context.env.VIDEOS ? new Response('Video storage is not configured', { status: 503 }) : null;
}
function extension(type) {
  return ({ 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mov' })[type] || '';
}

export async function onRequestGet(context) {
  if (!allowed(context)) return unauthorized();
  var missing = unavailable(context); if (missing) return missing;
  await setup(context.env.ANALYTICS_DB);
  var result = await context.env.ANALYTICS_DB.prepare('SELECT id, file_name, content_type, size_bytes, created_at FROM video_assets ORDER BY created_at DESC').all();
  return Response.json({ videos: result.results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  if (!allowed(context)) return unauthorized();
  var missing = unavailable(context); if (missing) return missing;
  var form;
  try { form = await context.request.formData(); } catch (_) { return new Response('Invalid upload', { status: 400 }); }
  var file = form.get('video');
  var permitted = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  if (!file || typeof file.arrayBuffer !== 'function' || permitted.indexOf(file.type) < 0 || !file.size || file.size > 100 * 1024 * 1024) {
    return new Response('Use an MP4, WebM, OGV, or MOV video up to 100 MB.', { status: 400 });
  }
  var name = String(file.name || 'video.' + extension(file.type)).replace(/[\r\n]/g, '').slice(0, 180) || 'video.' + extension(file.type);
  var objectKey = 'videos/' + crypto.randomUUID() + '.' + extension(file.type);
  await context.env.VIDEOS.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
  try {
    await setup(context.env.ANALYTICS_DB);
    var result = await context.env.ANALYTICS_DB.prepare('INSERT INTO video_assets (object_key, file_name, content_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?)').bind(objectKey, name, file.type, file.size, Date.now()).run();
    return Response.json({ ok: true, id: result.meta.last_row_id });
  } catch (error) {
    await context.env.VIDEOS.delete(objectKey);
    throw error;
  }
}

export async function onRequestDelete(context) {
  if (!allowed(context)) return unauthorized();
  var missing = unavailable(context); if (missing) return missing;
  var id = Number(new URL(context.request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) return new Response('Invalid video', { status: 400 });
  await setup(context.env.ANALYTICS_DB);
  var row = await context.env.ANALYTICS_DB.prepare('SELECT object_key FROM video_assets WHERE id = ?').bind(id).first();
  if (!row) return new Response('Video not found', { status: 404 });
  await context.env.VIDEOS.delete(row.object_key);
  await context.env.ANALYTICS_DB.prepare('DELETE FROM video_assets WHERE id = ?').bind(id).run();
  return Response.json({ ok: true });
}
