# Data layer: react-query + permission gating

`@tanstack/react-query` sits between the screens and the media engine
(`docs/media-engine.md`), handling caching, pagination, and request
de-duplication. Permission is modeled as its own query/mutation pair so the UI
can show an explicit "grant access" step instead of discovering denial as a
thrown error mid-fetch.

## Provider

`src/providers/QueryProvider.tsx` creates one `QueryClient` in `useState` (so
it survives re-renders but not remounts) and wraps children in
`QueryClientProvider`. Mounted once, at the root, in `src/app/_layout.tsx` —
every route has access.

## `src/hooks/use-media-permission.ts`

- `useQuery(['media-permission'], hasMediaLibraryPermission)` — current
  granted/not-granted status.
- `useMutation(ensureMediaLibraryPermission)` — actually requests permission;
  on settle, invalidates the status query so `isGranted` updates.
- Returns `{ isGranted, isChecking, request, isRequesting, requestError }`.

`requestError` is populated when the user declines (the mutation function
throws `MediaPermissionDeniedError`) — the screen uses this to show a denial
message rather than a generic error.

## Asset query hooks

There are two, both gated by an `enabled` flag (the gallery screen passes
`isGranted` so the query won't run before permission is confirmed):

- `src/hooks/use-gallery-assets.ts` — `useInfiniteQuery` wrapping the live
  `loadAssets()` media engine (paginated, `PAGE_SIZE = 60`, `pageParam` is an
  offset, `getNextPageParam` keyed off `lastPage.hasMore`). **Not currently
  used by the gallery screen** — it's the direct-from-media-library path, kept
  for screens that want live data without the SQLite index.
- `src/hooks/use-indexed-assets.ts` — plain `useQuery` (no pagination) wrapping
  `queryIndexedAssets()`, returning the full `IndexedAsset[]` in one shot. This
  is what the gallery screen actually uses, because it needs the index's
  sort/group-by capabilities. See `docs/sqlite-index.md`.

## How the gallery screen composes these

`src/app/(main)/(app)/index.tsx`:

1. `useMediaPermission()` first. While `isChecking`, show a loading message.
2. If `!isGranted`, show an explanation + a "Grant access" button wired to
   `request()`; show a denial message if `requestError` is set.
3. Holds `sort`/`group` state; only once `isGranted` is true does
   `useIndexedAssets({ sort, groupBy: group }, isGranted)` run.
4. `galleryQuery.data ?? []` is the full asset list — no page flattening, no
   `onEndReached`; the entire set goes to `MediaGrid`, which virtualizes it.

This keeps the screen itself thin — all loading/paging/permission state comes
from the two hooks; the screen just branches on their status flags.
