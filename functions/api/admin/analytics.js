function unauthorized() {
  return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } });
}

function rangeFrom(value, offsetMinutes) {
  var now = Date.now();
  // The browser supplies its timezone offset, so Today/Yesterday match the admin's local calendar.
  var offset = Number(offsetMinutes);
  if (!Number.isFinite(offset) || Math.abs(offset) > 840) offset = 0;
  var elapsedToday = ((now - offset * 60000) % 86400000 + 86400000) % 86400000;
  var todayStart = now - elapsedToday;
  if (value === '7d') return { since: todayStart - 6 * 86400000, until: now, bucketStart: todayStart - 6 * 86400000, bucketCount: 7, daily: true, offset: offset };
  if (value === 'yesterday') return { since: todayStart - 86400000, until: todayStart, bucketStart: todayStart - 86400000, bucketCount: 24, daily: false, offset: offset };
  return { since: todayStart, until: now, bucketStart: todayStart, bucketCount: Math.floor((now - todayStart) / 3600000) + 1, daily: false, offset: offset };
}

function bucketLabel(time, daily, offset) {
  var date = new Date(time - offset * 60000);
  var yyyy = date.getUTCFullYear();
  var mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  var dd = String(date.getUTCDate()).padStart(2, '0');
  if (daily) return yyyy + '-' + mm + '-' + dd;
  return yyyy + '-' + mm + '-' + dd + ' ' + String(date.getUTCHours()).padStart(2, '0') + ':00';
}

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

export async function onRequestGet(context) {
  var username = context.request.headers.get('X-Admin-Username');
  if (username !== (context.env.ADMIN_USERNAME || 'Admin') || !context.env.ADMIN_PASSWORD || context.request.headers.get('Authorization') !== 'Bearer ' + context.env.ADMIN_PASSWORD) return unauthorized();
  if (!context.env.ANALYTICS_DB) return new Response('Analytics database is not configured', { status: 503 });

  var url = new URL(context.request.url);
  var range = url.searchParams.get('range');
  if (range !== 'today' && range !== 'yesterday' && range !== '7d') range = 'today';
  var window = rangeFrom(range, url.searchParams.get('tzOffset'));
  var bucket = window.daily ? '%Y-%m-%d' : '%Y-%m-%d %H:00';
  var db = context.env.ANALYTICS_DB;
  await ensureSessionDeviceColumns(db);
  await db.prepare('CREATE TABLE IF NOT EXISTS traffic_devices (event_time INTEGER NOT NULL, device TEXT NOT NULL, browser TEXT NOT NULL)').run();
  // Also prune whenever the private dashboard is opened, even if no visitor is active.
  await db.batch([
    db.prepare('DELETE FROM traffic_events WHERE event_time < ?').bind(Date.now() - 604800000),
    db.prepare('DELETE FROM visitor_sessions WHERE last_seen < ?').bind(Date.now() - 604800000)
  ]);
  var results = await db.batch([
    db.prepare('SELECT COUNT(*) AS count FROM visitor_sessions WHERE last_seen >= ?').bind(Date.now() - 120000),
    db.prepare('SELECT COUNT(*) AS count FROM traffic_events WHERE event_time >= ? AND event_time < ?').bind(window.since, window.until),
    db.prepare("SELECT strftime('" + bucket + "', (event_time / 1000) - ?, 'unixepoch') AS label, COUNT(*) AS count FROM traffic_events WHERE event_time >= ? AND event_time < ? GROUP BY label ORDER BY label ASC").bind(window.offset * 60, window.since, window.until),
    db.prepare('SELECT country AS label, COUNT(*) AS count FROM traffic_events WHERE event_time >= ? AND event_time < ? GROUP BY country ORDER BY count DESC LIMIT 8').bind(window.since, window.until),
    db.prepare('SELECT source AS label, COUNT(*) AS count FROM traffic_events WHERE event_time >= ? AND event_time < ? GROUP BY source ORDER BY count DESC LIMIT 8').bind(window.since, window.until),
    db.prepare('SELECT country, source, device, browser, last_seen FROM visitor_sessions WHERE last_seen >= ? ORDER BY last_seen DESC LIMIT 50').bind(Date.now() - 120000),
    db.prepare('SELECT device AS label, COUNT(*) AS count FROM traffic_devices WHERE event_time >= ? AND event_time < ? GROUP BY device ORDER BY count DESC').bind(window.since, window.until),
    db.prepare('SELECT browser AS label, COUNT(*) AS count FROM traffic_devices WHERE event_time >= ? AND event_time < ? GROUP BY browser ORDER BY count DESC').bind(window.since, window.until)
  ]);
  var eventCounts = {};
  results[2].results.forEach(function (row) { eventCounts[row.label] = row.count; });
  var timeline = [];
  for (var i = 0; i < window.bucketCount; i++) {
    var moment = window.bucketStart + i * (window.daily ? 86400000 : 3600000);
    var label = bucketLabel(moment, window.daily, window.offset);
    timeline.push({ label: label, count: eventCounts[label] || 0 });
  }
  return Response.json({ range: range, generatedAt: Date.now(), liveVisitors: results[0].results[0].count, pageviews: results[1].results[0].count, timeline: timeline, countries: results[3].results, sources: results[4].results, live: results[5].results, devices: results[6].results, browsers: results[7].results }, { headers: { 'Cache-Control': 'no-store' } });
}
