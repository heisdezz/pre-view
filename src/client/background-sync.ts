import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { syncMediaLibrary } from './db';
import { notifyNewMedia } from './notifications';

export const MEDIA_SYNC_TASK_NAME = 'media-library-sync';

// Must run at module scope, not inside a component/hook — the OS can invoke
// this task with no UI mounted, so the definition has to exist as soon as
// the JS bundle loads. Import this module (for its side effect) from the
// root layout, unconditionally.
TaskManager.defineTask(MEDIA_SYNC_TASK_NAME, async () => {
  try {
    const { upserted } = await syncMediaLibrary();
    await notifyNewMedia(upserted);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Registers the periodic background sync. Safe to call on every app start —
 * no-ops if already registered. The OS treats `minimumInterval` as a lower
 * bound, not a guarantee (especially on iOS).
 */
export async function registerMediaSyncTask(): Promise<void> {
  const alreadyRegistered = await TaskManager.isTaskRegisteredAsync(MEDIA_SYNC_TASK_NAME);
  if (alreadyRegistered) return;
  await BackgroundTask.registerTaskAsync(MEDIA_SYNC_TASK_NAME, { minimumInterval: 60 });
}
