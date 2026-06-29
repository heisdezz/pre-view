# SQLite index & sync

`src/client/db/` — a local SQLite cache of the device media library, built on
`@op-engineering/op-sqlite` (JSI-backed, requires a dev build — not Expo Go).
It exists because `expo-media-library`'s native `Query` can't sort by name or
group by date; those need a real query engine over a local copy of the
metadata.

## Schema (`schema.ts`)

One `assets` table mirroring `GalleryAsset` (id, uri, filename, media_type,
width, height, duration, creation_time, modification_time, is_favorite) plus a
`folder` column (the asset's containing directory name, derived from its URI
at sync time — backs path grouping). Indexed on `creation_time`, `media_type`,
`filename`, and `folder`. A `sync_meta` key-value table tracks sync state
(currently just `last_modification_time`).

`folder` was added after the initial schema, so `client.ts` runs a guarded
`ALTER TABLE ... ADD COLUMN folder` migration for DBs created by the older
schema; when that ALTER actually applies, it clears `sync_meta` to force a full
re-index (incremental sync would otherwise skip existing rows and never
backfill their folders).

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

`queryIndexedAssets({ sort, groupBy, mediaTypes })` runs a parameterized
`SELECT` directly against `assets`. **No pagination** — it returns the entire
matching set in one query; the whole list is held in memory and LegendList
virtualizes rendering. (This is deliberate: the gallery has no "load more on
scroll to end" — see `docs/components.md` on why.)

- `sort`: `newest`/`oldest` (by effective date — see below), or `name`
  (`filename COLLATE NOCASE`) — sorting by filename isn't something the
  native media-library API supports at all.
- **Effective date** (`EFFECTIVE_TIME = COALESCE(creation_time, modification_time)`):
  used for both date sorting and day/month grouping. `creation_time` comes from
  Android's `DATE_TAKEN`, which is EXIF-only and null for many files
  (screenshots, downloads, lots of videos); `modification_time` (`DATE_MODIFIED`)
  is always set. Both are stored in ms. Without this fallback, everything
  lacking EXIF lands in a single "Unknown date" section.
- `groupBy`: `day`/`month`/`name`/`path`, each defined by a `GROUP_CONFIG`
  entry (a SQL key expression + a group ordering direction):
  - `day`/`month`: SQLite `strftime()` over `EFFECTIVE_TIME` (ms ÷ 1000 for
    `unixepoch`), groups ordered newest-first.
  - `name`: `UPPER(SUBSTR(filename, 1, 1))` (first letter), groups A→Z.
  - `path`: the `folder` column, groups alphabetical.
  Every expression is wrapped in `COALESCE`/`NULLIF` so the `group_key` is
  always non-empty (sentinel `unknown`/`#`), which is why `IndexedAsset.groupKey`
  is a plain `string`, not nullable. `groupKey` both clusters rows and drives
  the section headers `MediaGrid` renders between groups (see
  `docs/components.md`). The gallery defaults to `day`.

  Album-based grouping still isn't implemented (would need a denormalized album
  column from `asset.getAlbums()`, an extra native call per asset during sync);
  `path` (folder) grouping covers most of the same intent more cheaply.

## Wiring

- `src/hooks/use-indexed-assets.ts` — plain `useQuery` (not infinite) returning
  the full `IndexedAsset[]`, gated by an `enabled` flag.
- `src/hooks/use-media-sync.ts` — runs `syncMediaLibrary()` once on app load
  and invalidates the `['indexed-assets']` query if anything new came in. Also
  registers the background sync task (see `docs/background-sync.md`).
- The gallery screen (`src/app/(main)/(app)/index.tsx`) holds `sort`/`group`
  state, feeds it to `useIndexedAssets`, passes `group` to `MediaGrid` for
  header formatting, and renders `PageHeader` (see `docs/components.md`) to let
  the user change it.
