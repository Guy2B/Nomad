-- 0004 · first-party statistics, only after consent (27.10.2026)
-- No cookie, no IP address, no user agent stored. session = random id kept in the tab's sessionStorage.
-- Country comes from Cloudflare (request.cf.country), device is a coarse class (mobile | tablet | desktop).
-- Rows older than 13 months are deleted by the cron.

CREATE TABLE IF NOT EXISTS alg_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  session TEXT NOT NULL,
  event TEXT NOT NULL,                   -- page_view | view_item | add_to_cart | begin_checkout | purchase | circle_signup …
  path TEXT,
  item TEXT,                             -- Algebra product id
  lang TEXT,
  country TEXT,
  device TEXT,
  source TEXT,                           -- referrer host or utm_source, first page of the session only
  campaign TEXT,                         -- utm_campaign
  value REAL
);
CREATE INDEX IF NOT EXISTS alg_events_ts ON alg_events(ts);
CREATE INDEX IF NOT EXISTS alg_events_session ON alg_events(session);
