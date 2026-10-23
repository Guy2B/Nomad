-- 0002 · fulfillment provider layer (23.10.2026)
-- Applied after 0001_init.sql. 0001 is immutable: it already ran on the shared D1 (algbr-crm), so the
-- alg_orders.supplier column keeps its historic default 'a61'; the Worker always writes the provider name explicitly.

-- processed fulfillment provider webhooks (idempotency, duplicate protection)
CREATE TABLE IF NOT EXISTS alg_provider_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  order_id TEXT,
  status TEXT,                         -- Algebra status: received | production | shipped | delivered | cancelled | error
  created_at TEXT NOT NULL
);
