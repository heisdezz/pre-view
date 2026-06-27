# pre-view

A fast, libre gallery app for browsing local photos and videos — inspired by [Aves](https://github.com/deckerst/aves), built with Expo.

## What it is

`pre-view` is a universal (Android / iOS / web) media gallery. The goal is a snappy
grid over thousands of items, instant previews, pinch-to-zoom, and metadata
inspection — without the bloat or telemetry of stock gallery apps.

## Stack

Built on **Expo SDK 56** (React Native 0.85, React 19, new architecture + React
Compiler enabled). The project intentionally stays on the **Expo-native** packages
rather than the heavier community alternatives, so that `expo prebuild` stays clean
and CI stays simple.

| Concern | Choice | Why |
| --- | --- | --- |
| Routing | `expo-router` (file-based, typed routes) | Standard, typed deep-linking |
| Media access | `expo-media-library` | Config-plugin driven, prebuild-friendly |
| Permissions | `react-native-permissions` | Fine-grained runtime permission control |
| Image rendering | `expo-image` | Caching + transitions, no extra native config |
| Virtualized list | `@legendapp/list` | Faster recycling than FlatList for large grids |
| Gestures | `react-native-gesture-handler` | Pinch / pan for the viewer |
| Animation | `react-native-reanimated` (v4 + worklets) | Shared-element + zoom transitions |
| State | `jotai` + `zustand` | Atom-level UI state + global store |
| Styling | NativeWind-style `global.css` + theme constants | See `src/constants/theme.ts` |

> Note: the project deliberately uses `expo-image`/`@legendapp/list` instead of
> `react-native-fast-image`/`@shopify/flash-list`. The Expo-native equivalents avoid
> extra native config and keep the managed prebuild reproducible in CI.

## Layout

```
src/
  app/            # expo-router screens (index, explore, _layout)
  components/     # UI: themed views/text, app tabs, animated icon, hint rows
  components/ui/  # primitives (collapsible, ...)
  constants/      # theme tokens (spacing, colors, insets)
  hooks/          # use-theme, use-color-scheme (+ .web variants)
scripts/          # reset-project helper
assets/           # icons, splash, images
.github/workflows # debug.yml — CI debug APK build via prebuild
```

## Develop

```bash
bun install
bun run start          # metro / dev server
bun run android        # dev client on Android
bun run ios            # dev client on iOS
bun run web            # web
bunx tsc --noEmit      # typecheck
```

`expo-media-library` and `react-native-permissions` use JSI / native modules, so
they need a **dev build** (`bunx expo run:android`), not Expo Go.

## Build

The native projects are generated, not committed (`/android`, `/ios` are gitignored):

```bash
bunx expo prebuild --platform android --clean
```

CI builds an unsigned debug APK on every push to `main` — see
[`.github/workflows/debug.yml`](.github/workflows/debug.yml). Download the
`pre-view-debug-apk` artifact from the run to sideload.

## Roadmap

- [ ] Media query + paginated grid over `expo-media-library` assets
- [ ] Full-screen viewer with pinch-to-zoom and swipe
- [ ] Video playback
- [ ] EXIF / metadata panel
- [ ] Albums / folders
- [ ] Background sync of new media
</content>
