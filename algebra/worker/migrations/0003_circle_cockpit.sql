-- 0003 · A Circle membership, consent log, real cost facts for the Operating Cockpit (27.10.2026)
-- Applied after 0002. Members are keyed by e-mail: Algebra has no customer accounts (guest checkout via Stripe),
-- so a member and a customer are the same person when the e-mail matches. Nobody becomes a member without a
-- confirmed opt-in (double opt-in, logged in alg_consent_log).

CREATE TABLE IF NOT EXISTS alg_members (
  email TEXT PRIMARY KEY,
  first_name TEXT,
  lang TEXT NOT NULL,
  program TEXT NOT NULL DEFAULT 'a-circle',
  tier TEXT NOT NULL DEFAULT 'circle',   -- circle | circle_private (prepared, never shown publicly yet)
  status TEXT NOT NULL,                  -- pending | active | left
  token TEXT NOT NULL,                   -- confirmation link, then the member page link
  source TEXT,                           -- page | home | footer
  consent_version TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  joined_at TEXT,
  left_at TEXT,
  prefs_json TEXT,                       -- {"graphic":true,"knitwear":true,"restocks":true}
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS alg_members_status ON alg_members(status);

CREATE TABLE IF NOT EXISTS alg_consent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,                 -- a-circle
  action TEXT NOT NULL,                  -- requested | confirmed | withdrawn | prefs
  consent_version TEXT,
  lang TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS alg_consent_log_email ON alg_consent_log(email);

-- Real costs once known (provider invoice, Stripe balance transaction, manual entry). Without a row the cockpit
-- uses the documented cost model and labels the result as an estimate.
CREATE TABLE IF NOT EXISTS alg_order_costs (
  order_id TEXT PRIMARY KEY,
  supplier_cost REAL,
  shipping_cost REAL,
  payment_fee REAL,
  source TEXT NOT NULL,                  -- provider_invoice | stripe_balance | manual
  updated_at TEXT NOT NULL
);
