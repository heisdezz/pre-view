# Routing

File-based routing via `expo-router`, typed routes enabled
(`experiments.typedRoutes` in `app.json`).

```
src/app/
  _layout.tsx                 root layout
  (main)/
    _layout.tsx                Drawer
    (app)/
      _layout.tsx               NativeTabs
      index.tsx                 gallery (implemented)
      explore.tsx                stub
      albums.tsx                 stub
      videos.tsx                  stub
```

Route groups (`(main)`, `(app)`) are invisible in the URL — they exist purely
to nest layouts without adding path segments.

## `src/app/_layout.tsx` — root

Wraps the whole app in `QueryProvider` (see `docs/data-layer.md`), then
renders `ExperimentalStack` with `headerShown: false`. This is the one place
app-wide providers belong.

## `src/app/(main)/_layout.tsx` — Drawer

`expo-router/drawer`'s `Drawer`, `headerShown: false`. Currently has a single
child group, `(app)`.

## `src/app/(main)/(app)/_layout.tsx` — NativeTabs

`expo-router/unstable-native-tabs`. Registers `index`, `explore`, `videos`,
and `albums` as tab triggers. `explore.tsx`, `videos.tsx`, and `albums.tsx`
are reachable but still empty stubs (`return <></>`) — registering the trigger
makes the tab show up; it doesn't implement the screen.

## `src/app/(main)/(app)/index.tsx` — gallery screen

The one fully implemented screen. See `docs/sqlite-index.md` for how it
composes `useMediaPermission` + `useIndexedAssets` + `PageHeader`, and
`docs/components.md` for `MediaGrid`/`MediaCard`.

## Adding a new screen

Add a file under `src/app/(main)/(app)/`, then register it as a
`NativeTabs.Trigger` in that folder's `_layout.tsx` if it should be a visible
tab. Keep the screen file thin — push data loading into hooks
(`src/hooks/`) and presentation into `components/`.
