import { getPermissionsAsync, requestPermissionsAsync } from 'expo-media-library';

export class MediaPermissionDeniedError extends Error {
  readonly canAskAgain: boolean;

  constructor(canAskAgain: boolean) {
    super('Media library permission was not granted.');
    this.name = 'MediaPermissionDeniedError';
    this.canAskAgain = canAskAgain;
  }
}

/**
 * Resolves once the app has media library access, requesting it if needed.
 * Throws MediaPermissionDeniedError if the user has denied access.
 */
export async function ensureMediaLibraryPermission(): Promise<void> {
  const current = await getPermissionsAsync();
  if (current.granted) return;

  const requested = await requestPermissionsAsync();
  if (!requested.granted) {
    throw new MediaPermissionDeniedError(requested.canAskAgain);
  }
}

export async function hasMediaLibraryPermission(): Promise<boolean> {
  const response = await getPermissionsAsync();
  return response.granted;
}
