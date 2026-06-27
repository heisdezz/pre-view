import { useInfiniteQuery } from '@tanstack/react-query';

import { loadAssets } from '@/client/media';
import type { LoadAssetsOptions } from '@/client/media';

const PAGE_SIZE = 60;

export function useGalleryAssets(
  options: Omit<LoadAssetsOptions, 'offset' | 'limit'> = {},
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: ['gallery-assets', options],
    queryFn: ({ pageParam }) => loadAssets({ ...options, offset: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAGE_SIZE : undefined,
    enabled,
  });
}
