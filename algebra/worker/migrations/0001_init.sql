-- Algebra D1 schema. Apply: npx wrangler d1 migrations apply algebra --remote
CREATE TABLE IF NOT EXISTS orders (
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
  supplier TEXT NOT NULL DEFAULT 'a61',
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
CREATE INDEX IF NOT EXISTS orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_events_order ON order_events(order_id);

-- processed Stripe events (idempotency)
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  status TEXT NOT NULL,                -- pending | confirmed | unsubscribed
  token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT
);
