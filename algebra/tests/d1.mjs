// Minimal D1 stand-in on node:sqlite, for tests only (same prepare/bind/first/all/run surface).
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function memoryD1(schemaPath) {
  const db = new DatabaseSync(':memory:');
  if (schemaPath) db.exec(readFileSync(schemaPath, 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  return { prepare: (sql) => stmt(sql), raw: db };
}
