# Components

## `src/components/ui/JText.tsx` — Jetpack Compose text bridge

Thin wrapper around `Text` from `@expo/ui/jetpack-compose`, merging in default
props (`softWrap: true`, `overflow: 'ellipsis'`) that callers can still
override by passing their own.

**Gotcha — `Host` must not be nested.** `Host` (from `@expo/ui/jetpack-compose`)
is the bridge boundary between the RN view tree and a single Compose subtree —
it's a real Android `View`, not a Composable. Earlier versions of this
component wrapped each `<Text>` in its own `<Host>`, which broke rendering
whenever `JText` was used inside a page that already had its own `<Host>`
around a `Column`/`Box` (a `Host`-as-`View` can't be laid out as a child of a
Composable `Column`). `JText` now renders `<Text>` directly with no `Host` of
its own — the caller is responsible for providing exactly one `Host` around
the whole Compose subtree it sits in.

Use plain React Native `Text` instead of `JText` for content that isn't inside
an existing `Host` (e.g. one-off error/status messages) — pulling in the
Compose bridge for a bare string isn't worth it.

## `src/components/layout/PageWrap.tsx`

`SafeAreaView` wrapper that sets `backgroundColor` from
`Color.android.dynamic.background` (Material You dynamic color via
`expo-router`'s `Color` helper). Used as the outermost element of every
screen.

## `src/components/ui/ViewCard.tsx`

Same `{ asset, size, onPress }` contract as `MediaCard` (thumbnail-only tile,
own `getThumbnailUri` lifecycle) but without the duration/play badges — for a
non-grid surface that wants plain thumbnail tiles with different chrome.
Not currently mounted by any screen; `MediaGrid` always uses `MediaCard`.

## `src/client/media/view-queue.ts`

Not a component — the cross-screen handoff that makes swiping work in
`src/app/view/[id].tsx`. `viewQueueRef` is a plain module-level
`{ current: GalleryAsset[] }`, not a `useRef`: a real `useRef` dies with its
owning component, and the list has to survive the grid screen unmounting (or
just sitting behind the modal) until the viewer reads it. `MediaGrid` writes
the list it's currently showing into `viewQueueRef.current` right before
`router.push`ing to `/view/[id]`; the viewer snapshots it into its own state
on mount. If the queue is empty (e.g. a cold deep link with no prior grid
screen), the viewer falls back to `loadAsset(id)` for a single-item list.

## `src/components/media/MediaCard.tsx`

A single grid tile. Renders **only** the cached, downscaled thumbnail (see
"Thumbnails" below) via `expo-image` (`contentFit="cover"`, `transition={150}`,
`cachePolicy="memory-disk"`, `recyclingKey={asset.id}` so `LegendList`'s view
recycling doesn't show stale images while scrolling fast) — never the
full-resolution original, so the grid only ever keeps small images in memory.
Until `getThumbnailUri()` resolves, the tile shows its plain placeholder
background (the `Image` isn't mounted at all). The `useEffect` tracks a
`cancelled` flag keyed on `[asset.id, asset.uri, size]` so a fast recycle
(LegendList reassigning this component instance to a different item mid-flight)
can't apply a stale thumbnail to the wrong tile.

Because the tile mounts/unmounts as LegendList recycles it in and out of
`drawDistance`, thumbnails are effectively loaded when a tile scrolls into the
buffer and freed when it scrolls out — the disk cache makes the reload
instant. (This is the intended memory behavior: the full asset list stays in
memory, but the *images* are what get loaded/unloaded by scroll position.)

Videos get a small duration badge (`mm:ss`, computed from `asset.duration`)
overlaid bottom-right. Wrapped in `Pressable`; `onPress` is optional.

## `src/components/media/MediaGrid.tsx`

`LegendList` (from `@legendapp/list/react-native` — **note the subpath**, the
package has no root `.` export) configured for a 4-column grid:

- `numColumns={4}`, `recycleItems` for view recycling.
- Tile size is computed from `useWindowDimensions().width`, divided evenly
  across 4 columns minus the inter-column gap — so it always exactly fills the
  screen width regardless of device.
- `columnWrapperStyle={{ gap, rowGap }}` for spacing both between columns and
  between rows.
- `drawDistance={1500}` — generous off-screen render buffer (default 250px).
  With the default, tiles just a row or two outside the viewport got
  recycled/unmounted almost immediately, which is what caused images to
  visibly "unload" while scrolling. A larger buffer keeps more rows mounted
  on either side of the viewport.
- **No `onEndReached`** — there's no pagination. The grid receives the entire
  asset list at once (`useIndexedAssets` loads everything, see
  `docs/sqlite-index.md`); LegendList virtualizes which rows are mounted. This
  is intentional: the user explicitly didn't want "load more at the end" — all
  data is loaded, and only the *thumbnails* within `drawDistance` are mounted.

**Tapping a tile.** `MediaGrid` owns navigation, not `MediaCard` — it keeps a
`useRef` mirroring the live `assets` list (synced via an effect, not written
during render, since the React Compiler's `react-hooks/refs` rule forbids
mutating a ref's `.current` in the render body) purely so the press handler
always has the latest list without depending on it being in scope at render
time. On press it copies that ref into `viewQueueRef` (see
`src/client/media/view-queue.ts`) and `router.push`es to
`/view/[id]` with `{ id, type: asset.mediaType }` — see `docs/routing.md` for
the viewer side.

### Section headers (grouping)

`MediaGrid` takes `IndexedAsset[]` (each carries a `groupKey` from the SQLite
index) plus the active `groupBy`, and `buildRows()` flattens them into a single
list, inserting a header row whenever `groupKey` changes. Headers and tiles
share one `LegendList`:

- `overrideItemLayout` sets `layout.span = numColumns` for header rows so each
  header occupies a full-width row of its own; tiles keep `span = 1`. This is
  how you get a full-bleed "MAY 2021" header sitting above its row of tiles in
  a single virtualized list (rather than nested lists per section).
- `getItemType` returns `'header'` / `'asset'` so LegendList pools and recycles
  the two very differently-sized rows separately — important with `recycleItems`
  on, or a header could get recycled into a tile slot.
- Header labels come from `formatGroupLabel(groupKey, groupBy)`. The `groupKey`
  shape depends on `groupBy`: a date string (`2026-06` / `2026-06-28`) for
  day/month, formatted to month/day text manually (no `Intl`/`toLocaleDateString`,
  unreliable under Hermes); a single letter for `name`; or a folder name for
  `path` — those last two are already display-ready.
- `groupBy` is always one of `day`/`month`/`name`/`path` (there's no ungrouped
  mode), so every row belongs to a group and gets a header.

## `src/components/media/MediaDetailsSheet.tsx`

Peek row + expanded sheet shown over the viewer in `src/app/view/[id].tsx`,
split across two different mount strategies rather than one snap-point
bottom sheet:

- The peek row (size/path) is a plain `Pressable` absolutely positioned at
  the bottom — always rendered, *not* inside any modal.
- Tapping it opens the full metadata list (dimensions, duration,
  created/modified, favorite, filename) in a `react-native-modal` sheet
  (slide up from the bottom, swipe-down or backdrop-tap to dismiss).

**Why split, not one sheet.** A `Modal` (RN's own, and therefore
`react-native-modal`, which wraps it) opens a separate native window that
captures touches for the *entire* screen, including the transparent areas
outside its own content. If the always-visible peek row were inside that
modal, it would permanently block swiping the image pager in `view/[id].tsx`
behind it. Keeping the peek row as a plain sibling view means the pager stays
swipeable everywhere except where the peek row visually sits; the modal only
mounts (and only then owns the screen's touches) while expanded, which is
the state where blocking the pager is actually correct.

Previously used `@expo/ui`'s community `BottomSheet` (a single component with
two snap points), which turned out to be broken on device — this two-state
split replaces it with `react-native-modal` (chosen explicitly over the
former) and doesn't need a snap-point abstraction, since there are exactly
two states and `isExpanded` already models that directly.

**Remount-per-asset.** The caller passes `key={asset.id}`, so swiping to a
new asset in the viewer remounts this component (fresh `isExpanded`/`stats`
state, collapses back to the peek row) rather than this component trying to
reset itself via an effect.

**File size/path.** `expo-media-library`'s `AssetInfo` (this app's SDK 56
`Asset.getInfo()`) only carries id/uri/dimensions/duration/timestamps — no
file size or resolved path. The sheet stats the file itself via
`react-native-fs`'s `RNFS.stat()`, falling back to "Unknown" size and the raw
(scheme-stripped) `uri` if that fails (e.g. a content URI that can't be
stat'd).

## `src/tw/tw.ts` — Tailwind-style styling

`twrnc`'s tagged-template `tw` export, re-exported as `tw` for a shorter
import. Use this (`style={tw\`flex-1 bg-black\`}`, mergeable with plain style
objects via `style={[tw\`...\`, { height }]}`) for any component that isn't
built on `@expo/ui/jetpack-compose` (`Host`/`Row`/`JText`/etc — see
`JText.tsx` above). Compose-based components keep using Compose modifiers
(`fillMaxWidth()`, `paddingAll()`, ...) instead; the two systems don't mix.

## `src/components/header/PageHeader.tsx`

Gallery filter control, built from `@expo/ui/jetpack-compose` primitives
(`Host`, `Row`, `Button`, `DropdownMenu`, `JText`) — same design system as the
rest of the app, Android-only for now (see the Compose `Host` gotcha above;
this component owns its own single `Host`, so don't nest it inside another
Compose tree). A **single** "Filters" `Button` opens one `DropdownMenu` that
lists both filter groups, each under a disabled (non-selectable) section-header
item: "Sort by" (newest/oldest/name) then "Group by" (day/month/name/path).
The active option in each group is prefixed with a `✓` (via `withCheck()`) —
cheaper than wiring up leading-icon slots, which would need drawable assets.
Purely controlled — `sort`/`group` and their `onChange` callbacks come from the
parent screen, which feeds them into `useIndexedAssets()` (see
`docs/sqlite-index.md`).

## Thumbnails (`src/client/thumbnails.ts`)

Not a component, but what `MediaCard` renders. Two cache layers, in order:

1. **In-memory** (`resolvedUris: Map<assetId, uri>`, this session only).
   `getThumbnailUri(asset)` checks this first and returns synchronously-fast
   (no native bridge call) if present. Without this, every tile remount/recycle
   — including just scrolling back over a cell you've already seen — would
   redo an async `RNFS.exists` round-trip purely to reconfirm something already
   known, and `MediaCard` would flash blank for a frame while it did.
   `getCachedThumbnailUri(assetId)` is the synchronous-lookup export `MediaCard`
   uses to seed its `useState` initializer and to reset state on recycle, so an
   already-known tile never shows that flash at all.
2. **Disk** (`react-native-fs`). Checks for an already-cached file at
   `${CachesDirectoryPath}/thumbnails/${safeId}-${THUMB_MAX_PX}.jpg` via
   `RNFS.exists` — this is what survives across app restarts (the in-memory
   map doesn't). Populates the in-memory cache on a hit, so the bridge call
   only happens once per asset per session.
3. If missing from both, generates one capped at **`THUMB_MAX_PX` = 150px** on the
   longest edge (small thumbnails decode fast and stay cheap in memory — the
   target for smooth scrolling). Photos go straight through
   `react-native-compressor`'s `Image.compress()` (quality 0.7, JPEG); videos
   first get a frame via `createVideoThumbnail()`, which comes out at full
   video resolution, so that frame is then run through the **same** compressor
   to be capped at 150px too. The result is moved into the deterministic cache
   path with `RNFS.moveFile` (compressor's own output path/scheme isn't ours to
   control, so the cache key has to be ours), then recorded in the in-memory
   cache too.
4. Concurrent requests for the same asset share one in-flight promise
   (`inFlight` map), so a tile that recycles in/out repeatedly during a fast
   scroll never compresses the same image twice.

The size is fixed (no longer derived from the tile/`size` prop) so there's one
canonical thumbnail per asset regardless of device density or column count;
`MediaCard` still uses its `size` prop for tile *layout*, just not for
thumbnail generation.

**Per-cell, throttled loading.** Each tile calls `getThumbnailUri()` for itself
on mount and resolves independently — there's no per-section or per-batch
loading. To keep a screenful of cache misses from compressing everything at
once, *generation* (not the cheap cached-hit path) is funnelled through a
concurrency-limited queue (`MAX_CONCURRENT = 4`) in `thumbnails.ts`; tiles fill
in progressively as slots free up.

> An earlier version wrapped the call in `InteractionManager.runAfterInteractions`
> to dodge scroll-frame jank, but that **queues every mounted tile and flushes
> them all together** when momentum settles — which is exactly what made
> thumbnails appear in section-sized bursts. The concurrency queue replaces it:
> work starts immediately per cell but only a few run at a time, so it's both
> smooth and progressive. `MediaCard` passes `shouldProceed: () => !cancelled`
> so the queue skips a tile that recycled out of view before its turn.

This whole layer exists because rendering full-resolution originals directly in
a 4-column grid (the original behavior) meant every tile decoded a
multi-megapixel image — expensive enough to compound the recycling/unloading
problem above. Small cached JPEGs are what make the larger `drawDistance`
buffer affordable.
