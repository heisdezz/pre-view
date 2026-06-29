import { AssetField, Query } from 'expo-media-library';

import { hydrateAsset } from '../media/assets';
import { ensureMediaLibraryPermission } from '../media/permissions';
import type { GalleryAsset } from '../media/types';
import { getDb } from './client';

const SYNC_PAGE_SIZE = 200;
const LAST_SYNC_KEY = 'last_modification_time';

// Derives the containing folder name from an asset URI for path grouping —
// e.g. 'file:///storage/emulated/0/DCIM/Camera/IMG.jpg' -> 'Camera'. Returns
// '' for content:// URIs or paths without a parent dir (callers treat '' as
// "unknown" at query time).
function folderFromUri(uri: string): string {
  if (!uri.startsWith('file://')) return '';
  const path = uri.slice('file://'.length);
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash <= 0) return '';
  const dir = path.slice(0, lastSlash);
  const parentSlash = dir.lastIndexOf('/');
  const name = parentSlash >= 0 ? dir.slice(parentSlash + 1) : dir;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function getLastSyncTime(): number {
  const db = getDb();
  const result = db.executeSync('SELECT value FROM sync_meta WHERE key = ?', [LAST_SYNC_KEY]);
  const row = result.rows[0];
  return row ? Number(row.value) : 0;
}

function setLastSyncTime(value: number): void {
  const db = getDb();
  db.executeSync(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [LAST_SYNC_KEY, String(value)]
  );
}

function upsertAsset(asset: GalleryAsset): void {
  const db = getDb();
  db.executeSync(
    `INSERT INTO assets (id, uri, filename, folder, media_type, width, height, duration, creation_time, modification_time, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       uri = excluded.uri,
       filename = excluded.filename,
       folder = excluded.folder,
       media_type = excluded.media_type,
       width = excluded.width,
       height = excluded.height,
       duration = excluded.duration,
       creation_time = excluded.creation_time,
       modification_time = excluded.modification_time,
       is_favorite = excluded.is_favorite`,
    [
      asset.id,
      asset.uri,
      asset.filename,
      folderFromUri(asset.uri),
      asset.mediaType,
      asset.width,
      asset.height,
      asset.duration,
      asset.creationTime,
      asset.modificationTime,
      asset.isFavorite ? 1 : 0,
    ]
  );
}

export type SyncResult = {
  /** Number of assets inserted or updated in this sync. */
  upserted: number;
};

/**
 * Syncs the local SQLite index against the device media library.
 *
 * Incremental: only fetches assets modified after the last successful sync
 * (tracked in `sync_meta`). On first run (no prior sync), this naturally
 * pulls in the entire library, since every asset's modificationTime is
 * greater than 0.
 */
export async function syncMediaLibrary(): Promise<SyncResult> {
  await ensureMediaLibraryPermission();

  const lastSyncTime = getLastSyncTime();
  let offset = 0;
  let upserted = 0;
  let maxModificationTime = lastSyncTime;

  while (true) {
    const rawAssets = await new Query()
      .gt(AssetField.MODIFICATION_TIME, lastSyncTime)
      .orderBy({ key: AssetField.MODIFICATION_TIME, ascending: true })
      .limit(SYNC_PAGE_SIZE)
      .offset(offset)
      .exe();

    if (rawAssets.length === 0) break;

    const hydrated = await Promise.all(rawAssets.map(hydrateAsset));
    for (const asset of hydrated) {
      if (!asset) continue;
      upsertAsset(asset);
      upserted += 1;
      if (asset.modificationTime !== null && asset.modificationTime > maxModificationTime) {
        maxModificationTime = asset.modificationTime;
      }
    }

    offset += rawAssets.length;
    if (rawAssets.length < SYNC_PAGE_SIZE) break;
  }

  if (maxModificationTime > lastSyncTime) {
    setLastSyncTime(maxModificationTime);
  }

  return { upserted };
}
