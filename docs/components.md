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

Unimplemented placeholder (`return <></>`) — not wired into any screen yet.

## `src/components/media/MediaCard.tsx`

A single grid tile. Renders a cached thumbnail (see "Thumbnails" below) via
`expo-image` (`contentFit="cover"`, `transition={150}`,
`cachePolicy="memory-disk"`, `recyclingKey={asset.id}` so `LegendList`'s view
recycling doesn't show stale images while scrolling fast). On mount/recycle it
shows the full-resolution `asset.uri` immediately, then swaps to the
downscaled thumbnail once `getThumbnailUri()` resolves — the `useEffect`
tracks a `cancelled` flag keyed on `[asset.id, asset.uri, size]` so a fast
recycle (LegendList reassigning this component instance to a different item
mid-flight) can't apply a stale thumbnail to the wrong tile. Videos get a
small duration badge (`mm:ss`, computed from `asset.duration`) overlaid
bottom-right. Wrapped in `Pressable`; `onPress` is optional.

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
- `onEndReached`/`onEndReachedThreshold={0.5}` forwarded from props, driving
  the infinite-query pagination in `docs/data-layer.md`/`docs/sqlite-index.md`.

## `src/components/header/PageHeader.tsx`

Sort + group-by controls for the gallery, built from `@expo/ui/jetpack-compose`
primitives (`Host`, `Row`, `Button`, `DropdownMenu`, `JText`) — same design
system as the rest of the app, Android-only for now (see the Compose `Host`
gotcha above; this component owns its own single `Host`, so don't nest it
inside another Compose tree). Two `DropdownMenu`s (sort: newest/oldest/name;
group: none/day/month/year), each with local `expanded` state toggled by its
trigger `Button` and closed via `onDismissRequest` or item selection. Purely
controlled — `sort`/`group` and their `onChange` callbacks come from the
parent screen, which feeds them into `useIndexedAssets()` (see
`docs/sqlite-index.md`).

## Thumbnails (`src/client/thumbnails.ts`)

Not a component, but what `MediaCard` renders. `getThumbnailUri(asset, size)`:

1. Checks for an already-cached file at
   `${CachesDirectoryPath}/thumbnails/${safeId}-${size}.jpg` via
   `react-native-fs` (`RNFS.exists`) — instant on every call after the first.
2. If missing, generates one: `react-native-compressor`'s `Image.compress()`
   for photos (downscaled to `2 × size` for high-density screens, quality
   0.7, JPEG), or `createVideoThumbnail()` for videos — then moves the result
   into the deterministic cache path with `RNFS.moveFile` (compressor's own
   output path/scheme isn't something we control, so the cache key has to be
   ours, not theirs).

This exists because rendering full-resolution originals directly in a
4-column grid (the previous behavior) meant every tile was decoding a
multi-megapixel image — expensive enough that it compounded the
recycling/unloading problem above. Small cached JPEGs are cheap to decode and
keep in memory, which is what actually makes the larger `drawDistance` buffer
affordable.
