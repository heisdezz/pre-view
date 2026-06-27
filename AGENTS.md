# AGENTS.md

Guidance for AI coding agents working in **pre-view** (Expo SDK 56 gallery app).
See [PROJECTS.md](PROJECTS.md) for the product overview and stack rationale.

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
- **Theming**: pull spacing/colors from `src/constants/theme.ts` and the
  `ThemedText` / `ThemedView` components — don't hardcode colors or raw pixel values.
- **Routing**: screens live in `src/app/` (expo-router, typed routes are on). Add a
  file to add a route; keep it thin and push logic into `components/` and `hooks/`.
- New-architecture + React Compiler are enabled — avoid manual `useMemo`/`useCallback`
  micro-optimizations the compiler already handles; write straightforward components.

## Native modules

`expo-media-library` and `react-native-permissions` are native and require a dev
build. When adding native modules:

1. Install with `bunx expo install`.
2. Register/configure via **config plugins in `app.json`** (not by editing native files).
3. Note that the change needs a fresh `expo prebuild` + dev build to take effect.

## Before you finish

- [ ] `bun run typecheck` passes.
- [ ] `bun run lint` is clean.
- [ ] Any new dependency was added with `bunx expo install` (or `bun add` for non-Expo).
- [ ] No edits to `/android` or `/ios`; native config went through `app.json`.
- [ ] Don't commit, push, or open PRs unless explicitly asked.
</content>
