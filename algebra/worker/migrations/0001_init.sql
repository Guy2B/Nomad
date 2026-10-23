-- Algebra schema in the shared AlGBr D1 database (algbr-crm), tables prefixed alg_.
-- Applied automatically by the Worker (worker/src/schema.js); this file is the readable reference.
CREATE TABLE IF NOT EXISTS alg_orders (
  id TEXT PRIMARY KEY,                 -- internal id (uuid)
  number TEXT NOT NULL UNIQUE,         -- customer-facing, ALG-YYMMDD-XXXX
  status TEXT NOT NULL,                -- see worker/src/orders.js STATUSES
  lang TEXT NOT NULL,
  country TEXT NOT NULL,
  email TEXT,
  name TEXT,
  address_json TEXT,                   -- shipping address from Stripe Checkout
  items_json TEXT NOT NULL,            -- [{sku, qty, price, productId, color, size, cut, supplierArticleId, printFile, embroideryFile}]
  subtotal REAL NOT NULL,
  shipping REAL NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  supplier TEXT NOT NULL DEFAULT 'valadio',
  supplier_order_id TEXT,
  supplier_status TEXT,
  fulfillment_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS alg_orders_status ON alg_orders(status);

CREATE TABLE IF NOT EXISTS alg_order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS alg_order_events_order ON alg_order_events(order_id);

-- processed Stripe events (idempotency)
CREATE TABLE IF NOT EXISTS alg_stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- processed fulfillment provider webhooks (idempotency)
CREATE TABLE IF NOT EXISTS alg_provider_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  order_id TEXT,
  status TEXT,                         -- Algebra status: received | production | shipped | delivered | cancelled | error
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alg_subscribers (
  email TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  status TEXT NOT NULL,                -- pending | confirmed | unsubscribed
  token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT
);
