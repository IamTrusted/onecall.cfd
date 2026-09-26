// Cloudflare Pages Function: records anonymous, aggregate traffic data in D1.
// Bind a D1 database named ANALYTICS_DB before deploying.

function clean(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function sourceFrom(referrer, siteHost) {
  if (!referrer) return 'Direct';
  try {
    var host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (host === siteHost || host === 'onecall.cfd' || host === 'callme-live.pages.dev') return 'Direct';
    if (host.indexOf('google.') !== -1) return 'Google';
    if (host.indexOf('facebook.') !== -1 || host === 'fb.com') return 'Facebook';
    if (host.indexOf('instagram.') !== -1) return 'Instagram';
    if (host.indexOf('tiktok.') !== -1) return 'TikTok';
    if (host.indexOf('youtube.') !== -1) return 'YouTube';
    if (host === 'x.com' || host.indexOf('twitter.') !== -1) return 'X / Twitter';
    if (host.indexOf('bing.') !== -1) return 'Bing';
    if (host.indexOf('linkedin.') !== -1) return 'LinkedIn';
    if (host.indexOf('whatsapp.') !== -1 || host === 'wa.me') return 'WhatsApp';
    if (host.indexOf('telegram.') !== -1 || host === 't.me') return 'Telegram';
    return host.slice(0, 100) || 'Referral';
  } catch (_) {
    return 'Direct';
  }
}
function deviceFrom(ua) { ua=(ua||'').toLowerCase(); if(/ipad|tablet/.test(ua))return 'Tablet'; if(/mobi|android|iphone|ipod/.test(ua))return 'Mobile'; return 'Desktop'; }
function browserFrom(ua) { ua=(ua||'').toLowerCase(); if(/edg\//.test(ua))return 'Edge'; if(/opr\//.test(ua))return 'Opera'; if(/firefox\//.test(ua))return 'Firefox'; if(/chrome\//.test(ua))return 'Chrome'; if(/safari\//.test(ua))return 'Safari'; return 'Other'; }
async function ensureSessionDeviceColumns(db) {
  var columns = await db.prepare('PRAGMA table_info(visitor_sessions)').all();
  var names = columns.results.map(function (column) { return column.name; });
  for (var i = 0; i < 2; i++) {
    var name = i === 0 ? 'device' : 'browser';
    if (names.indexOf(name) !== -1) continue;
    try { await db.prepare("ALTER TABLE visitor_sessions ADD COLUMN " + name + " TEXT NOT NULL DEFAULT 'Unknown'").run(); }
    catch (error) { if (!/duplicate column name/i.test(String(error))) throw error; }
  }
}

export async function onRequestPost(context) {
  if (!context.env.ANALYTICS_DB) return new Response('Analytics database is not configured', { status: 503 });

  var payload;
  try { payload = await context.request.json(); } catch (_) { return new Response('Invalid JSON', { status: 400 }); }
  var visitorId = clean(payload.visitorId, 80);
  var event = payload.event === 'pageview' ? 'pageview' : 'heartbeat';
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(visitorId)) return new Response('Invalid visitor', { status: 400 });

  var now = Date.now();
  var country = clean(context.request.cf && context.request.cf.country, 64) || 'Unknown';
  // Referer of the API call is the current page; the browser sends the original landing referrer separately.
  var siteHost = new URL(context.request.url).hostname.replace(/^www\./, '').toLowerCase();
  var source = sourceFrom(clean(payload.referrer, 500), siteHost);
  var path = clean(payload.path, 200) || '/';
  var db = context.env.ANALYTICS_DB;
  await ensureSessionDeviceColumns(db);
  var device = deviceFrom(context.request.headers.get('User-Agent'));
  var browser = browserFrom(context.request.headers.get('User-Agent'));
  var statements = [
    db.prepare('CREATE TABLE IF NOT EXISTS traffic_devices (event_time INTEGER NOT NULL, device TEXT NOT NULL, browser TEXT NOT NULL)').bind(),
    // Keep only the most recent seven days of anonymous analytics data.
    db.prepare('DELETE FROM traffic_events WHERE event_time < ?').bind(now - 604800000),
    db.prepare('DELETE FROM visitor_sessions WHERE last_seen < ?').bind(now - 604800000),
    db.prepare('INSERT INTO visitor_sessions (visitor_id, last_seen, country, source, last_path, device, browser, pageviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(visitor_id) DO UPDATE SET last_seen = excluded.last_seen, country = excluded.country, source = excluded.source, last_path = excluded.last_path, device = excluded.device, browser = excluded.browser, pageviews = visitor_sessions.pageviews + excluded.pageviews')
      .bind(visitorId, now, country, source, path, device, browser, event === 'pageview' ? 1 : 0)
  ];
  if (event === 'pageview') {
    statements.push(db.prepare('INSERT INTO traffic_events (event_time, country, source, path) VALUES (?, ?, ?, ?)').bind(now, country, source, path));
    statements.push(db.prepare('INSERT INTO traffic_devices (event_time, device, browser) VALUES (?, ?, ?)').bind(now, device, browser));
  }
  await db.batch(statements);
  return new Response(null, { status: 204 });
}
