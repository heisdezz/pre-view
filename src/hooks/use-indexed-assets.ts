import { useQuery } from '@tanstack/react-query';

import { queryIndexedAssets } from '@/client/db';
import type { QueryIndexedAssetsOptions } from '@/client/db';

/**
 * Loads the full indexed asset list in one shot (no pagination) — the whole
 * set is held in memory and LegendList virtualizes rendering, so there's no
 * "load more on scroll to end". See `queryIndexedAssets`.
 */
export function useIndexedAssets(options: QueryIndexedAssetsOptions = {}, enabled = true) {
  return useQuery({
    queryKey: ['indexed-assets', options],
    queryFn: () => queryIndexedAssets(options),
    enabled,
  });
}
