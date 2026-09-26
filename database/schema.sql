-- Run once in your Cloudflare D1 database.
CREATE TABLE IF NOT EXISTS visitor_sessions (
  visitor_id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL,
  country TEXT NOT NULL,
  source TEXT NOT NULL,
  last_path TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT 'Unknown',
  browser TEXT NOT NULL DEFAULT 'Unknown',
  pageviews INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS traffic_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time INTEGER NOT NULL,
  country TEXT NOT NULL,
  source TEXT NOT NULL,
  path TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_traffic_events_time ON traffic_events(event_time);

CREATE TABLE IF NOT EXISTS traffic_devices (
  event_time INTEGER NOT NULL,
  device TEXT NOT NULL,
  browser TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ad_placements (
  placement TEXT PRIMARY KEY,
  ad_code TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS profile_images (
  country TEXT NOT NULL,
  slot INTEGER NOT NULL,
  image_data TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(country, slot)
);

CREATE TABLE IF NOT EXISTS video_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
