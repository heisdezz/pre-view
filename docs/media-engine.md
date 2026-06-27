# Media engine

`src/client/media/` — pure async functions that load device photos/videos and
albums as plain, serializable objects. No React, no caching, no writes
(delete/favorite aren't implemented). It's the data layer that hooks/screens
build on top of.

Built on `expo-media-library`'s SDK 56 class-based API (`Query`, `Asset`,
`Album`), not the older flat `getAssetsAsync`/`getAlbumsAsync` functions.

## Files

### `permissions.ts`

- `ensureMediaLibraryPermission()` — checks current permission via
  `getPermissionsAsync()`; if not granted, calls `requestPermissionsAsync()`.
  Throws `MediaPermissionDeniedError` (carries `canAskAgain`) if the user
  declines. Every loader below calls this first.
- `hasMediaLibraryPermission()` — non-throwing boolean check, used by the
  permission status query (see `docs/data-layer.md`).

### `types.ts`

`GalleryAsset` and `GalleryAlbum` — flat, plain-object shapes. The native SDK's
`Asset`/`Album` classes expose data through async getters (`getWidth()`,
`getUri()`, ...), which is awkward to consume in a list — each item field would
need its own await. Both loaders below hydrate the SDK objects into these flat
types up front instead.

### `assets.ts`

- `hydrateAsset(asset: Asset)` — calls `asset.getInfo()` once (a single native
  call that returns id, filename, uri, mediaType, width, height, duration,
  creationTime, modificationTime, isFavorite together) and maps it to a
  `GalleryAsset`. Returns `null` for non-image/video media (audio/unknown),
  which callers filter out.
- `loadAssets(options)` — builds an SDK `Query`: filters `mediaType` to
  `options.mediaTypes` (default `['image', 'video']`), orders by
  `CREATION_TIME` descending, applies `.limit()`/`.offset()` for paging
  (default page size 60), optionally scopes to `options.album` (accepts either
  a raw SDK `Album` instance or a `GalleryAlbum.id` string — the `Album`
  constructor takes an id directly, so a plain id round-trips fine). Returns
  `{ assets, hasMore }`, where `hasMore` is a heuristic: true iff the page came
  back full (`rawAssets.length === limit`).
- `loadAsset(id)` — re-hydrates a single asset by id; returns `null` if the
  asset no longer exists (`getInfo()` throws in that case — caught and
  swallowed).

### `albums.ts`

- `loadAlbums()` — `Album.getAll()`, then per album: `getTitle()` +
  `getAssets()` (the SDK has no count-only query, so the full per-album asset
  list is fetched to derive `assetCount`; these are lightweight id-only `Asset`
  refs, not hydrated). The first asset is hydrated via `hydrateAsset` to serve
  as `coverAsset`.
- `loadAlbumByTitle(title)` — `Album.get(title)`, then the same hydration.

### `index.ts`

Barrel export — this is what the rest of the app imports from
(`@/client/media`), not the individual files.

## Gotchas

- All loaders call `ensureMediaLibraryPermission()` internally, so they throw
  on first use if permission hasn't been granted yet. The gallery screen gates
  its data query on permission status instead of relying on this throw for UX
  (see `docs/data-layer.md`) — this internal check is defense-in-depth, not
  the primary permission flow.
- `hasMore` is a heuristic (full page = assume more), not a real total count.
  Good enough for infinite scroll; don't rely on it for "N items total" UI.
