-- 0005 · richer first-party statistics, still only after consent (27.10.2026)
-- visitor = random id kept in localStorage after consent (alg_vid): tells new from returning visitors, nothing else.
-- No cookie, no IP address, no user agent, no e-mail. 13-month retention by the cron, like alg_events.

CREATE TABLE IF NOT EXISTS alg_sessions (
  session TEXT PRIMARY KEY,
  visitor TEXT,
  is_returning INTEGER NOT NULL DEFAULT 0,
  first_ts TEXT NOT NULL,
  last_ts TEXT NOT NULL,
  pages INTEGER NOT NULL DEFAULT 0,
  landing TEXT,
  referrer TEXT,                         -- referring host (never the full URL)
  source TEXT,
  medium TEXT,
  campaign TEXT,
  content TEXT,
  term TEXT,
  lang TEXT,
  country TEXT,
  device TEXT,
  screen TEXT                            -- s (<600 px) | m (<1024) | l (<1440) | xl
);
CREATE INDEX IF NOT EXISTS alg_sessions_first ON alg_sessions(first_ts);

-- time and scroll depth per page view, sent when the visitor leaves the page
CREATE TABLE IF NOT EXISTS alg_engagement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  session TEXT NOT NULL,
  path TEXT,
  seconds INTEGER,
  scroll INTEGER                         -- deepest point reached, % of the page
);
CREATE INDEX IF NOT EXISTS alg_engagement_ts ON alg_engagement(ts);

-- shop search terms (lower case, 60 characters max) and number of results
CREATE TABLE IF NOT EXISTS alg_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  session TEXT NOT NULL,
  term TEXT NOT NULL,
  results INTEGER
);
CREATE INDEX IF NOT EXISTS alg_searches_ts ON alg_searches(ts);

-- which consented session started a checkout: attributes orders and revenue to a source
CREATE TABLE IF NOT EXISTS alg_order_sessions (
  order_id TEXT PRIMARY KEY,
  session TEXT NOT NULL
);
