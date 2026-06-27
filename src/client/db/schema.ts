export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    uri TEXT NOT NULL,
    filename TEXT NOT NULL,
    media_type TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    duration INTEGER,
    creation_time INTEGER,
    modification_time INTEGER,
    is_favorite INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_assets_creation_time ON assets(creation_time DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_assets_media_type ON assets(media_type);`,
  `CREATE INDEX IF NOT EXISTS idx_assets_filename ON assets(filename COLLATE NOCASE);`,
  `CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
];
