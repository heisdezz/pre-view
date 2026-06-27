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

## `src/hooks/use-gallery-assets.ts`

`useInfiniteQuery` wrapping `loadAssets()`:

- `queryKey: ['gallery-assets', options]` — `options` is whatever filter the
  caller passes (album, mediaTypes), excluding `offset`/`limit` which are
  paging concerns, not identity.
- `pageParam` is an `offset` (starts at 0); `getNextPageParam` returns
  `allPages.length * PAGE_SIZE` while `lastPage.hasMore` is true, else
  `undefined` (which is how react-query knows pagination ended).
- `PAGE_SIZE = 60`, matching the media engine's default.
- Takes an `enabled` flag (second argument) — the gallery screen passes
  `isGranted` from the permission hook here, so the query doesn't even attempt
  to run until permission is confirmed.

## How the gallery screen composes these

`src/app/(main)/(app)/index.tsx`:

1. `useMediaPermission()` first. While `isChecking`, show a loading message.
2. If `!isGranted`, show an explanation + a "Grant access" button wired to
   `request()`; show a denial message if `requestError` is set.
3. Only once `isGranted` is true does `useGalleryAssets({}, isGranted)` start
   fetching.
4. `galleryQuery.data?.pages.flatMap((page) => page.assets)` flattens the
   paginated result into the flat array `MediaGrid` expects.
5. `MediaGrid`'s `onEndReached` calls `fetchNextPage()`, guarded by
   `hasNextPage && !isFetchingNextPage`.

This keeps the screen itself thin — all loading/paging/permission state comes
from the two hooks; the screen just branches on their status flags.
