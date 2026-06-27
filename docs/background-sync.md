# Background sync & notifications

Keeps the SQLite index (`docs/sqlite-index.md`) fresh even when the app isn't
open, and tells the user when something new showed up.

## `src/client/background-sync.ts`

Uses `expo-task-manager` + `expo-background-task` (the SDK 56 replacement for
the deprecated `expo-background-fetch`).

- `TaskManager.defineTask(MEDIA_SYNC_TASK_NAME, ...)` is called at **module
  scope** — not inside a component or hook. This is a hard requirement from
  expo-task-manager: the OS can invoke a background task with no UI mounted
  at all, so the task definition has to exist as soon as the JS bundle loads,
  not be deferred behind a `useEffect`. The module is imported purely for this
  side effect from `src/app/_layout.tsx`'s top level
  (`import '@/client/background-sync';`) — removing that import would silently
  break background sync even though everything still compiles.
- The task body runs `syncMediaLibrary()` and, if it found new assets, calls
  `notifyNewMedia()`.
- `registerMediaSyncTask()` registers the task with a 60-minute
  `minimumInterval`. The OS treats this as a lower bound, not a schedule —
  Android (WorkManager-backed) will usually respect something close to it;
  iOS's `BGTaskScheduler` is opportunistic and often runs much less often
  (commonly only when the device is idle and charging). Don't rely on this for
  anything time-sensitive.
- Safe to call on every app start: it checks `isTaskRegisteredAsync` first and
  no-ops if already registered.

## `src/client/notifications.ts`

Thin wrapper over `expo-notifications`:

- Sets a notification handler once at module load (shows banner + list entry,
  no sound/badge) — required for foreground notifications to display at all.
- `ensureNotificationPermission()` — check-then-request, same pattern as
  `ensureMediaLibraryPermission()` in the media engine.
- `notifyNewMedia(count)` — schedules an immediate local notification
  (`trigger: null`) reporting how many new items synced. No-ops silently if
  permission isn't granted or `count` is 0 — this is a "nice to have" signal,
  not something worth interrupting the user to ask permission for on its own.

## Foreground vs. background sync

`useMediaSync()` (`src/hooks/use-media-sync.ts`) does both halves:

1. Runs `syncMediaLibrary()` immediately on mount — this is the "sync on app
   load" behavior, independent of whether the background task ever fires.
2. Calls `registerMediaSyncTask()` so syncing continues to happen
   periodically while the app is backgrounded or closed.

Both paths funnel through the same `syncMediaLibrary()` function, so there's
exactly one sync implementation regardless of what triggered it.
