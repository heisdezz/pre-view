import { useInfiniteQuery } from '@tanstack/react-query';

import { queryIndexedAssets } from '@/client/db';
import type { QueryIndexedAssetsOptions } from '@/client/db';

const PAGE_SIZE = 60;

export function useIndexedAssets(
  options: Omit<QueryIndexedAssetsOptions, 'offset' | 'limit'> = {},
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: ['indexed-assets', options],
    queryFn: ({ pageParam }) => queryIndexedAssets({ ...options, offset: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled,
  });
}
