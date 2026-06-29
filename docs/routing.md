# Routing

File-based routing via `expo-router`, typed routes enabled
(`experiments.typedRoutes` in `app.json`).

```
src/app/
  _layout.tsx                 root layout (Stack)
  (main)/
    _layout.tsx                Drawer
    (app)/
      _layout.tsx               NativeTabs
      index.tsx                 gallery (implemented)
      explore.tsx                stub
      albums.tsx                 stub
      videos.tsx                 implemented (same composition as index.tsx)
  view/
    [id].tsx                   full-screen media viewer, modal presentation
```

Route groups (`(main)`, `(app)`) are invisible in the URL — they exist purely
to nest layouts without adding path segments. `view/[id]` is a real path
segment (dynamic — note the square brackets, not `$id`; that's the
`react-router`/TanStack Router convention and expo-router doesn't recognize
it, so a file named `$id.tsx` registers as a literal static route instead of
a dynamic one).

## `src/app/_layout.tsx` — root

Wraps the whole app in `GestureHandlerRootView` (required by
`MediaDetailsSheet`'s pan gesture, see `docs/components.md`) and
`QueryProvider` (see `docs/data-layer.md`), then renders a regular `Stack`
with `headerShown: false` and a per-screen override for `view/[id]`
(`presentation: 'modal'`, `animation: 'slide_from_bottom'`). This is the one
place app-wide providers belong.

**Why `Stack`, not `ExperimentalStack`.** Every other screen used to run
under `expo-router`'s gamma `ExperimentalStack`, but it only supports
`title`/`headerShown`/`headerTransparent`/`headerBackVisible` — `presentation`
and `animation` are silently dropped with a `__DEV__` warning telling you to
fall back to `<Stack />` for those screens. Since `presentation`/`animation`
have to be set on the navigator that performs the push (the root one), the
whole app moved to `Stack` rather than nesting a second navigator just for
`view/[id]` (that wouldn't produce a real modal transition — the inner
navigator's first screen has no push of its own to animate).

## `src/app/(main)/_layout.tsx` — Drawer

`expo-router/drawer`'s `Drawer`, `headerShown: false`. Currently has a single
child group, `(app)`.

## `src/app/(main)/(app)/_layout.tsx` — NativeTabs

`expo-router/unstable-native-tabs`. Registers `index`, `explore`, `videos`,
and `albums` as tab triggers. `explore.tsx` and `albums.tsx` are reachable
but still empty stubs (`return <></>`) — registering the trigger makes the
tab show up; it doesn't implement the screen.

## `src/app/(main)/(app)/index.tsx` / `videos.tsx` — gallery screens

Both fully implemented, with the same composition (`videos.tsx` just adds
`mediaTypes: ['video']`). See `docs/sqlite-index.md` for how they compose
`useMediaPermission` + `useIndexedAssets` + `PageHeader`, and
`docs/components.md` for `MediaGrid`/`MediaCard`/`ViewCard`.

## `src/app/view/[id].tsx` — media viewer (modal)

Opened by tapping a tile in `MediaGrid` (see `docs/components.md` for the
`viewQueueRef` handoff that lets it swipe through the same list the grid was
showing). Reads `id`/`type` from the route params, falls back to
`loadAsset(id)` for a cold deep link with no handed-off list, and renders a
horizontally paging `FlatList` plus the `MediaDetailsSheet` bottom sheet for
the asset currently in view.

Each page is a `PhotoPage` (plain `expo-image`) or `VideoPage` depending on
`asset.mediaType`. `VideoPage` uses `expo-video`'s `useVideoPlayer`/
`VideoView` and only calls `player.play()` when its page is the one the
`FlatList` is currently on (`isActive`, derived by comparing `renderItem`'s
`index` to the pager's current `index` state) — otherwise every video in the
list would play at once and fight over audio focus. It also shows the
existing cached thumbnail (`getThumbnailUri`, see `docs/components.md`) as a
poster overlay until `onFirstFrameRender` fires, since `VideoView` has no
built-in poster prop.

## Adding a new screen

Add a file under `src/app/(main)/(app)/`, then register it as a
`NativeTabs.Trigger` in that folder's `_layout.tsx` if it should be a visible
tab. Keep the screen file thin — push data loading into hooks
(`src/hooks/`) and presentation into `components/`.
