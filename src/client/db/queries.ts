import type { Scalar } from '@op-engineering/op-sqlite';

import type { GalleryAsset, GalleryMediaType } from '../media/types';
import { getDb } from './client';

export type AssetSort = 'newest' | 'oldest' | 'name';
export type AssetGroupBy = 'none' | 'day' | 'month' | 'year';

export type IndexedAsset = GalleryAsset & {
  /** Null when groupBy is 'none'. Otherwise a sortable string like '2026-06'. */
  groupKey: string | null;
};

const SORT_CLAUSE: Record<AssetSort, string> = {
  newest: 'creation_time DESC',
  oldest: 'creation_time ASC',
  name: 'filename COLLATE NOCASE ASC',
};

// Expressed in terms of unixepoch seconds; creation_time is stored in milliseconds.
const GROUP_KEY_EXPR: Record<AssetGroupBy, string | null> = {
  none: null,
  day: "strftime('%Y-%m-%d', creation_time / 1000, 'unixepoch')",
  month: "strftime('%Y-%m', creation_time / 1000, 'unixepoch')",
  year: "strftime('%Y', creation_time / 1000, 'unixepoch')",
};

export type QueryIndexedAssetsOptions = {
  sort?: AssetSort;
  groupBy?: AssetGroupBy;
  mediaTypes?: GalleryMediaType[];
  limit?: number;
  offset?: number;
};

/**
 * Queries the local SQLite index for sorting/grouping that the device media
 * store doesn't support directly (e.g. sort by name, group by day/month/year).
 * Requires `syncMediaLibrary()` to have run at least once — see `sync.ts`.
 */
export function queryIndexedAssets(options: QueryIndexedAssetsOptions = {}): IndexedAsset[] {
  const {
    sort = 'newest',
    groupBy = 'none',
    mediaTypes = ['image', 'video'],
    limit = 60,
    offset = 0,
  } = options;

  const db = getDb();
  const groupKeyExpr = GROUP_KEY_EXPR[groupBy];
  const mediaTypePlaceholders = mediaTypes.map(() => '?').join(', ');

  const result = db.executeSync(
    `SELECT *, ${groupKeyExpr ?? 'NULL'} AS group_key
     FROM assets
     WHERE media_type IN (${mediaTypePlaceholders})
     ORDER BY ${groupKeyExpr ? 'group_key DESC, ' : ''}${SORT_CLAUSE[sort]}
     LIMIT ? OFFSET ?`,
    [...mediaTypes, limit, offset]
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
    groupKey: row.group_key === null || row.group_key === undefined ? null : String(row.group_key),
  };
}
