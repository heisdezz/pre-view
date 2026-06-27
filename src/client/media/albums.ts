import { Album } from 'expo-media-library';

import { hydrateAsset } from './assets';
import { ensureMediaLibraryPermission } from './permissions';
import type { GalleryAlbum } from './types';

async function hydrateAlbum(album: Album): Promise<GalleryAlbum> {
  const [title, rawAssets] = await Promise.all([album.getTitle(), album.getAssets()]);
  const coverAsset = rawAssets.length > 0 ? await hydrateAsset(rawAssets[0]) : null;

  return {
    id: album.id,
    title,
    assetCount: rawAssets.length,
    coverAsset,
  };
}

/** Loads every album on the device, each with its title, asset count, and cover asset. */
export async function loadAlbums(): Promise<GalleryAlbum[]> {
  await ensureMediaLibraryPermission();
  const albums = await Album.getAll();
  return Promise.all(albums.map(hydrateAlbum));
}

/** Loads a single album by its title, or null if no album has that title. */
export async function loadAlbumByTitle(title: string): Promise<GalleryAlbum | null> {
  await ensureMediaLibraryPermission();
  const album = await Album.get(title);
  return album ? hydrateAlbum(album) : null;
}
