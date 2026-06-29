import { open, type DB } from '@op-engineering/op-sqlite';

import { SCHEMA_STATEMENTS } from './schema';

let db: DB | null = null;

/**
 * Opens (or returns the already-open) local SQLite index. JSI-backed via
 * op-sqlite — only works in a dev/production native build, not Expo Go.
 */
export function getDb(): DB {
  if (db) return db;

  db = open({ name: 'pre-view.db' });
  for (const statement of SCHEMA_STATEMENTS) {
    db.executeSync(statement);
  }
  migrate(db);
  return db;
}

// Additive migrations for DBs created by an older schema version. SQLite has no
// "ADD COLUMN IF NOT EXISTS", and `CREATE TABLE IF NOT EXISTS` won't add a
// column to an existing table — so the ALTER runs guarded.
function migrate(db: DB): void {
  try {
    db.executeSync(`ALTER TABLE assets ADD COLUMN folder TEXT NOT NULL DEFAULT ''`);
    // The column was just added (didn't throw), so existing rows have an empty
    // folder. Clear the sync high-water mark to force the next sync to re-index
    // every asset and backfill folders (incremental sync would skip them).
    db.executeSync(`DELETE FROM sync_meta`);
  } catch {
    // Column already exists (table created with the current schema) — ignore.
  }
}
