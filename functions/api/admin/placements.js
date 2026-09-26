function unauthorized() { return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }); }
function allowed(context) {
  return context.request.headers.get('X-Admin-Username') === (context.env.ADMIN_USERNAME || 'Admin') && context.env.ADMIN_PASSWORD && context.request.headers.get('Authorization') === 'Bearer ' + context.env.ADMIN_PASSWORD;
}

export async function onRequestGet(context) {
  if (!allowed(context)) return unauthorized();
  if (!context.env.ANALYTICS_DB) return new Response('Analytics database is not configured', { status: 503 });
  var result = await context.env.ANALYTICS_DB.prepare("SELECT placement, ad_code FROM ad_placements WHERE placement IN ('left', 'right', 'beforeCountries', 'topHeader', 'bottom')").all();
  var ads = { left: '', right: '', beforeCountries: '', topHeader: '', bottom: '' };
  result.results.forEach(function (row) { ads[row.placement] = row.ad_code || ''; });
  return Response.json(ads, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  if (!allowed(context)) return unauthorized();
  if (!context.env.ANALYTICS_DB) return new Response('Analytics database is not configured', { status: 503 });
  var body;
  try { body = await context.request.json(); } catch (_) { return new Response('Invalid JSON', { status: 400 }); }
  var left = typeof body.left === 'string' ? body.left.slice(0, 20000) : '';
  var right = typeof body.right === 'string' ? body.right.slice(0, 20000) : '';
  var beforeCountries = typeof body.beforeCountries === 'string' ? body.beforeCountries.slice(0, 20000) : '';
  var topHeader = typeof body.topHeader === 'string' ? body.topHeader.slice(0, 20000) : '';
  var bottom = typeof body.bottom === 'string' ? body.bottom.slice(0, 20000) : '';
  var now = Date.now();
  await context.env.ANALYTICS_DB.batch([
    context.env.ANALYTICS_DB.prepare('INSERT INTO ad_placements (placement, ad_code, updated_at) VALUES (?, ?, ?) ON CONFLICT(placement) DO UPDATE SET ad_code = excluded.ad_code, updated_at = excluded.updated_at').bind('left', left, now),
    context.env.ANALYTICS_DB.prepare('INSERT INTO ad_placements (placement, ad_code, updated_at) VALUES (?, ?, ?) ON CONFLICT(placement) DO UPDATE SET ad_code = excluded.ad_code, updated_at = excluded.updated_at').bind('right', right, now),
    context.env.ANALYTICS_DB.prepare('INSERT INTO ad_placements (placement, ad_code, updated_at) VALUES (?, ?, ?) ON CONFLICT(placement) DO UPDATE SET ad_code = excluded.ad_code, updated_at = excluded.updated_at').bind('beforeCountries', beforeCountries, now),
    context.env.ANALYTICS_DB.prepare('INSERT INTO ad_placements (placement, ad_code, updated_at) VALUES (?, ?, ?) ON CONFLICT(placement) DO UPDATE SET ad_code = excluded.ad_code, updated_at = excluded.updated_at').bind('topHeader', topHeader, now),
    context.env.ANALYTICS_DB.prepare('INSERT INTO ad_placements (placement, ad_code, updated_at) VALUES (?, ?, ?) ON CONFLICT(placement) DO UPDATE SET ad_code = excluded.ad_code, updated_at = excluded.updated_at').bind('bottom', bottom, now)
  ]);
  return Response.json({ ok: true });
}
