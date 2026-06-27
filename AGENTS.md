# AGENTS.md

Guidance for AI coding agents working in **pre-view** (Expo SDK 56 gallery app).
See [PROJECTS.md](PROJECTS.md) for the product overview and stack rationale.

## Docs

Implementation notes live in `docs/`, one file per logic area. Read the
relevant one before touching that area — they cover gotchas that aren't
obvious from the code alone (e.g. why `Host` can't be nested, why
`@legendapp/list` needs a subpath import).

- [`docs/media-engine.md`](docs/media-engine.md) — `src/client/media/`: loading
  device photos/videos/albums via `expo-media-library`'s SDK 56 `Query`/
  `Asset`/`Album` API, hydration into plain types, permission handling.
- [`docs/data-layer.md`](docs/data-layer.md) — `@tanstack/react-query` setup,
  the permission-status hook, the infinite-query gallery hook, and how the
  gallery screen composes them.
- [`docs/components.md`](docs/components.md) — `JText`, `PageWrap`,
  `PageHeader`, `MediaCard`, `MediaGrid`, the Compose `Host` nesting gotcha,
  and the thumbnail pipeline.
- [`docs/routing.md`](docs/routing.md) — the `(main)`/`(app)` route group
  structure (Drawer → NativeTabs), which screens are implemented vs. stubs.
- [`docs/sqlite-index.md`](docs/sqlite-index.md) — the `op-sqlite` local index
  (`src/client/db/`): schema, incremental sync, and the sort/group-by queries
  that back `PageHeader`'s filters.
- [`docs/background-sync.md`](docs/background-sync.md) — `expo-task-manager`/
  `expo-background-task` periodic sync and `expo-notifications` — including
  why the task must be defined at module scope, not inside a hook.

## Environment

- **Package manager: `bun`.** Never run `npm`/`yarn`/`npx`. Use `bun`, `bun add`,
  `bun run`, and `bunx`.
- For anything in the Expo ecosystem, install with **`bunx expo install <pkg>`** so
  versions are pinned to SDK 56. Use `bun add` only for non-Expo JS packages.
- Node native folders `/android` and `/ios` are **generated, not committed**. Don't
  hand-edit them — change `app.json` config plugins and re-run prebuild instead.

## Commands

```bash
bun install                              # deps
bun run start                            # metro
bun run android | ios | web              # platforms (need a dev build, not Expo Go)
bun run typecheck                        # typecheck  (run before finishing)
bun run lint                             # expo lint
bunx expo prebuild --platform android --clean   # regenerate native project
```

There is no unit-test suite yet; verify with `bun run typecheck` and `bun run lint`.

## Conventions

- **TypeScript, strict.** No `any` without justification.
- **File naming: kebab-case** (`themed-text.tsx`, `use-color-scheme.ts`). Match it.
- **Imports use the `@/` alias** → `src/` (e.g. `@/components/...`, `@/constants/theme`).
- **Platform splits** use `.web.tsx` / `.web.ts` siblings (see `app-tabs.web.tsx`,
  `use-color-scheme.web.ts`). Keep the shared API identical across variants.
- **Theming**: pull colors from `Color.android.dynamic.*` (from `expo-router`,
  see `src/components/layout/PageWrap.tsx`) for Material You dynamic color —
  don't hardcode colors. There's no `theme.ts`/`ThemedText` anymore (removed
  as dead code); the app is Android-first for now (see `docs/components.md`
  on `JText`/`PageHeader`).
- **Routing**: screens live in `src/app/` (expo-router, typed routes are on). Add a
  file to add a route; keep it thin and push logic into `components/` and `hooks/`.
- New-architecture + React Compiler are enabled — avoid manual `useMemo`/`useCallback`
  micro-optimizations the compiler already handles; write straightforward components.

## Native modules

All native and require a dev build (none work in Expo Go):
`expo-media-library`, `react-native-permissions`, `@op-engineering/op-sqlite`,
`react-native-fs`, `react-native-compressor` (+ its peer dep
`react-native-nitro-modules`), `expo-background-task`, `expo-task-manager`,
`expo-notifications`.

When adding native modules:

1. Install Expo-ecosystem packages with `bunx expo install`; install others
   (like `@op-engineering/op-sqlite`, not on the Expo registry) with `bun add`
   — check the actual package name first, some differ from the import name
   (e.g. it's `@op-engineering/op-sqlite`, not `op-sqlite`).
2. Register/configure via **config plugins in `app.json`** (not by editing native files) — only needed if the package ships one; check for `app.plugin.js` in the package root.
3. Note that the change needs a fresh `expo prebuild` + dev build to take effect.

## Before you finish

- [ ] `bun run typecheck` passes.
- [ ] `bun run lint` is clean.
- [ ] Any new dependency was added with `bunx expo install` (or `bun add` for non-Expo).
- [ ] No edits to `/android` or `/ios`; native config went through `app.json`.
- [ ] Don't commit, push, or open PRs unless explicitly asked.
</content>
