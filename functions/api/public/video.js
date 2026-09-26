async function setup(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS video_assets (id INTEGER PRIMARY KEY AUTOINCREMENT, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)').run();
}
function rangeFor(request, total) {
  var value = request.headers.get('Range');
  if (!value) return null;
  var match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match) return false;
  var start, end;
  if (!match[1] && match[2]) { end = total - 1; start = Math.max(0, total - Number(match[2])); }
  else { start = Number(match[1]); end = match[2] ? Math.min(total - 1, Number(match[2])) : total - 1; }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= total) return false;
  return { offset: start, length: end - start + 1, end: end };
}
async function metadata(context) {
  if (!context.env.ANALYTICS_DB || !context.env.VIDEOS) return null;
  var id = Number(new URL(context.request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) return false;
  await setup(context.env.ANALYTICS_DB);
  return context.env.ANALYTICS_DB.prepare('SELECT object_key, content_type, size_bytes FROM video_assets WHERE id = ?').bind(id).first();
}
function headersFor(row, range) {
  var headers = new Headers({ 'Content-Type': row.content_type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' });
  headers.set('Content-Length', String(range ? range.length : row.size_bytes));
  if (range) headers.set('Content-Range', 'bytes ' + range.offset + '-' + range.end + '/' + row.size_bytes);
  return headers;
}

export async function onRequestHead(context) {
  var row = await metadata(context);
  if (row === false) return new Response('Invalid video', { status: 400 });
  if (!row) return new Response('Video not found', { status: 404 });
  var range = rangeFor(context.request, row.size_bytes);
  if (range === false) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + row.size_bytes } });
  return new Response(null, { status: range ? 206 : 200, headers: headersFor(row, range) });
}

export async function onRequestGet(context) {
  var row = await metadata(context);
  if (row === false) return new Response('Invalid video', { status: 400 });
  if (!row) return new Response('Video not found', { status: 404 });
  var range = rangeFor(context.request, row.size_bytes);
  if (range === false) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + row.size_bytes } });
  var object = await context.env.VIDEOS.get(row.object_key, range ? { range: { offset: range.offset, length: range.length } } : undefined);
  if (!object) return new Response('Video not found', { status: 404 });
  return new Response(object.body, { status: range ? 206 : 200, headers: headersFor(row, range) });
}
