import type { Scalar } from '@op-engineering/op-sqlite';

import type { GalleryAsset, GalleryMediaType } from '../media/types';
import { getDb } from './client';

export type AssetSort = 'newest' | 'oldest' | 'name';
export type AssetGroupBy = 'day' | 'month' | 'name' | 'path';

export type IndexedAsset = GalleryAsset & {
  /**
   * The group this asset belongs to, as a sortable + displayable key. Shape
   * depends on the active groupBy: '2026-06-28' (day), '2026-06' (month),
   * 'A' (name), or a folder name like 'Camera' (path). Always non-empty —
   * falls back to a sentinel ('unknown'/'#') when the source value is missing.
   */
  groupKey: string;
};

// Effective timestamp for date sorting/grouping. creation_time comes from
// Android's DATE_TAKEN, which is EXIF-only and null for many files (screenshots,
// downloads, lots of videos); modification_time (DATE_MODIFIED) is always set.
// Both are stored in milliseconds. Falling back avoids "unknown date" sections
// for everything without EXIF.
const EFFECTIVE_TIME = 'COALESCE(creation_time, modification_time)';

const SORT_CLAUSE: Record<AssetSort, string> = {
  newest: `${EFFECTIVE_TIME} DESC`,
  oldest: `${EFFECTIVE_TIME} ASC`,
  name: 'filename COLLATE NOCASE ASC',
};

type GroupConfig = {
  // SQL expression producing the (non-null) group key.
  keyExpr: string;
  // Ordering of the groups themselves: dates newest-first, text alphabetical.
  order: 'ASC' | 'DESC';
};

const GROUP_CONFIG: Record<AssetGroupBy, GroupConfig> = {
  // EFFECTIVE_TIME is in ms, so / 1000 for SQLite's unixepoch-seconds functions.
  day: { keyExpr: `COALESCE(strftime('%Y-%m-%d', ${EFFECTIVE_TIME} / 1000, 'unixepoch'), 'unknown')`, order: 'DESC' },
  month: { keyExpr: `COALESCE(strftime('%Y-%m', ${EFFECTIVE_TIME} / 1000, 'unixepoch'), 'unknown')`, order: 'DESC' },
  name: { keyExpr: "COALESCE(NULLIF(UPPER(SUBSTR(filename, 1, 1)), ''), '#')", order: 'ASC' },
  path: { keyExpr: "COALESCE(NULLIF(folder, ''), 'unknown')", order: 'ASC' },
};

export type QueryIndexedAssetsOptions = {
  sort?: AssetSort;
  groupBy?: AssetGroupBy;
  mediaTypes?: GalleryMediaType[];
};

/**
 * Queries the entire local SQLite index (no pagination — the full result set
 * is returned and held in memory; LegendList virtualizes the rendering). Backs
 * sorting/grouping the device media store can't do directly (sort by name,
 * group by day/month/name/path). Requires `syncMediaLibrary()` to have run at
 * least once — see `sync.ts`.
 */
export function queryIndexedAssets(options: QueryIndexedAssetsOptions = {}): IndexedAsset[] {
  const { sort = 'newest', groupBy = 'day', mediaTypes = ['image', 'video'] } = options;

  const db = getDb();
  const group = GROUP_CONFIG[groupBy];
  const mediaTypePlaceholders = mediaTypes.map(() => '?').join(', ');

  const result = db.executeSync(
    `SELECT *, ${group.keyExpr} AS group_key
     FROM assets
     WHERE media_type IN (${mediaTypePlaceholders})
     ORDER BY group_key ${group.order}, ${SORT_CLAUSE[sort]}`,
    [...mediaTypes]
  );

  return result.rows.map(rowToIndexedAsset);
}

function rowToIndexedAsset(row: Record<string, Scalar>): IndexedAsset {
  return {
    id: String(row.id),
    uri: String(row.uri),
    filename: String(row.filename),
    mediaType: row.media_type as GalleryMediaType,
    width: Number(row.width),
    height: Number(row.height),
    duration: row.duration === null ? null : Number(row.duration),
    creationTime: row.creation_time === null ? null : Number(row.creation_time),
    modificationTime: row.modification_time === null ? null : Number(row.modification_time),
    isFavorite: Boolean(row.is_favorite),
    groupKey: String(row.group_key),
  };
}
