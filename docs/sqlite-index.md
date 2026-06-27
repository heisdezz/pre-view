# SQLite index & sync

`src/client/db/` — a local SQLite cache of the device media library, built on
`@op-engineering/op-sqlite` (JSI-backed, requires a dev build — not Expo Go).
It exists because `expo-media-library`'s native `Query` can't sort by name or
group by date; those need a real query engine over a local copy of the
metadata.

## Schema (`schema.ts`)

One `assets` table mirroring `GalleryAsset` (id, uri, filename, media_type,
width, height, duration, creation_time, modification_time, is_favorite),
indexed on `creation_time`, `media_type`, and `filename`. A `sync_meta`
key-value table tracks sync state (currently just
`last_modification_time`).

## Sync (`sync.ts`)

`syncMediaLibrary()`:

1. Reads `last_modification_time` from `sync_meta` (0 if never synced).
2. Queries the media library directly (not through `loadAssets()` — that
   helper is opinionated for newest-first scroll; sync needs ascending
   `MODIFICATION_TIME` and a `gt()` filter instead) for everything modified
   since then, paginating in batches of 200 until exhausted.
3. Upserts each hydrated asset into `assets` (`INSERT ... ON CONFLICT DO
   UPDATE`), tracking the highest `modificationTime` seen.
4. Writes that high-water mark back to `sync_meta` once the whole pass
   completes.

Because the filter is `> last_modification_time`, first-ever sync (where it's
0) naturally pulls in the entire library — same code path as an incremental
sync, no separate "full sync" branch needed.

Returns `{ upserted }` — the caller uses this to decide whether to invalidate
the gallery's query cache or fire a "new media" notification.

## Advanced queries (`queries.ts`)

`queryIndexedAssets({ sort, groupBy, mediaTypes, limit, offset })` runs a
parameterized `SELECT` directly against `assets`:

- `sort`: `newest`/`oldest` (`creation_time`), or `name`
  (`filename COLLATE NOCASE`) — sorting by filename isn't something the
  native media-library API supports at all.
- `groupBy`: `none`/`day`/`month`/`year`, computed via SQLite's `strftime()`
  over `creation_time` (stored in ms, divided by 1000 for `unixepoch`) and
  returned as a `groupKey` column on each row. Album-based grouping isn't
  implemented yet — it would need a denormalized album id/title column
  populated via `asset.getAlbums()`, which is an extra native call per asset
  during sync and was left out to keep sync cost bounded. Today, `groupKey`
  only affects sort order (rows cluster by group, newest group first) — there's
  no sectioned-header UI yet; `MediaGrid` still renders a flat list.

## Wiring

- `src/hooks/use-indexed-assets.ts` — `useInfiniteQuery` wrapper, same
  offset/limit paging pattern as `useGalleryAssets` (see `docs/data-layer.md`),
  gated by an `enabled` flag.
- `src/hooks/use-media-sync.ts` — runs `syncMediaLibrary()` once on app load
  and invalidates the `['indexed-assets']` query if anything new came in. Also
  registers the background sync task (see `docs/background-sync.md`).
- The gallery screen (`src/app/(main)/(app)/index.tsx`) holds `sort`/`group`
  state, feeds it to `useIndexedAssets`, and renders `PageHeader` (see
  `docs/components.md`) to let the user change it.
