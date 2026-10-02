/**
 * CRM storage on Cloudflare D1: one key/value table, same interface as the
 * former Netlify Blobs store (get with {type:'json'}, setJSON, delete).
 * D1 has a single primary, so reads after writes are consistent.
 */
const SCHEMA = 'CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at TEXT NOT NULL)';

export function d1Store(db) {
  let ready = null;
  const init = () => (ready ??= db.prepare(SCHEMA).run());
  return {
    async get(key, opts) {
      await init();
      const row = await db.prepare('SELECT v FROM kv WHERE k = ?').bind(key).first();
      if (!row) return null;
      return opts?.type === 'json' ? JSON.parse(row.v) : row.v;
    },
    async setJSON(key, value) {
      await init();
      await db
        .prepare('INSERT INTO kv (k, v, updated_at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at')
        .bind(key, JSON.stringify(value), new Date().toISOString())
        .run();
    },
    async delete(key) {
      await init();
      await db.prepare('DELETE FROM kv WHERE k = ?').bind(key).run();
    },
  };
}
