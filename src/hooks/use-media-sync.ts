import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { registerMediaSyncTask } from '@/client/background-sync';
import { syncMediaLibrary } from '@/client/db';

/**
 * Runs a foreground sync of the SQLite media index on app load, and
 * registers the periodic background sync task. Invalidates the indexed
 * assets query so the gallery picks up newly synced items automatically.
 */
export function useMediaSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    syncMediaLibrary()
      .then(({ upserted }) => {
        if (upserted > 0) {
          queryClient.invalidateQueries({ queryKey: ['indexed-assets'] });
        }
      })
      .catch(() => {});

    registerMediaSyncTask().catch(() => {});
  }, [queryClient]);
}
