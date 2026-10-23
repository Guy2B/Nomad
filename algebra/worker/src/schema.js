/**
 * D1 schema, applied by the Worker itself on first use (CREATE … IF NOT EXISTS), so deploys need no D1 API rights.
 * Algebra shares the AlGBr database algbr-crm; every table is prefixed alg_ to stay separate from the other shops.
 * Readable version with comments: worker/migrations/0001_init.sql (keep both in sync, a test checks it).
 */
export const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS alg_orders ( id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, status TEXT NOT NULL, lang TEXT NOT NULL, country TEXT NOT NULL, email TEXT, name TEXT, address_json TEXT, items_json TEXT NOT NULL, subtotal REAL NOT NULL, shipping REAL NOT NULL, total REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR', stripe_session_id TEXT UNIQUE, stripe_payment_intent TEXT, supplier TEXT NOT NULL DEFAULT 'valadio', supplier_order_id TEXT, supplier_status TEXT, fulfillment_attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, carrier TEXT, tracking_number TEXT, tracking_url TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL )",
  "CREATE INDEX IF NOT EXISTS alg_orders_status ON alg_orders(status)",
  "CREATE TABLE IF NOT EXISTS alg_order_events ( id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, type TEXT NOT NULL, data TEXT, created_at TEXT NOT NULL )",
  "CREATE INDEX IF NOT EXISTS alg_order_events_order ON alg_order_events(order_id)",
  "CREATE TABLE IF NOT EXISTS alg_stripe_events ( id TEXT PRIMARY KEY, type TEXT NOT NULL, created_at TEXT NOT NULL )",
  "CREATE TABLE IF NOT EXISTS alg_provider_events ( id TEXT PRIMARY KEY, provider TEXT NOT NULL, order_id TEXT, status TEXT, created_at TEXT NOT NULL )",
  "CREATE TABLE IF NOT EXISTS alg_subscribers ( email TEXT PRIMARY KEY, lang TEXT NOT NULL, status TEXT NOT NULL, token TEXT NOT NULL, created_at TEXT NOT NULL, confirmed_at TEXT )",
];

const done = new WeakMap();
/** Runs the CREATE statements once per database binding and isolate. */
export function ensureSchema(db) {
  if (!db) return Promise.resolve();
  if (!done.has(db)) {
    const p = (async () => {
      for (const s of SCHEMA) await db.prepare(s).run();
    })().catch((e) => {
      done.delete(db);
      throw e;
    });
    done.set(db, p);
  }
  return done.get(db);
}
