async function setup(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS video_assets (id INTEGER PRIMARY KEY AUTOINCREMENT, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)').run();
}

export async function onRequestGet(context) {
  if (!context.env.ANALYTICS_DB || !context.env.VIDEOS) return Response.json({ videos: [] }, { status: 503 });
  await setup(context.env.ANALYTICS_DB);
  var result = await context.env.ANALYTICS_DB.prepare('SELECT id FROM video_assets ORDER BY created_at DESC').all();
  return Response.json({ videos: result.results.map(function (row) { return { id: row.id, url: '/api/public/video?id=' + row.id }; }) }, { headers: { 'Cache-Control': 'no-store' } });
}
