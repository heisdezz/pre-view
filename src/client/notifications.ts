import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Fires a local notification reporting new media found by a sync. No-op if permission isn't granted. */
export async function notifyNewMedia(count: number): Promise<void> {
  if (count <= 0) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New media found',
      body: count === 1 ? '1 new photo or video was added.' : `${count} new photos or videos were added.`,
    },
    trigger: null,
  });
}
