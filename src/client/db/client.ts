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
  return db;
}
