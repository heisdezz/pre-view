import { Album, Asset, AssetField, MediaType, Query } from 'expo-media-library';

import { ensureMediaLibraryPermission } from './permissions';
import type { GalleryAsset, GalleryMediaType } from './types';

const GALLERY_TO_MEDIA_TYPE: Record<GalleryMediaType, MediaType> = {
  image: MediaType.IMAGE,
  video: MediaType.VIDEO,
};

const DEFAULT_MEDIA_TYPES: GalleryMediaType[] = ['image', 'video'];
const DEFAULT_PAGE_SIZE = 60;

export async function hydrateAsset(asset: Asset): Promise<GalleryAsset | null> {
  const info = await asset.getInfo();
  const mediaType = info.mediaType === MediaType.IMAGE ? 'image' : info.mediaType === MediaType.VIDEO ? 'video' : null;
  if (!mediaType) return null;

  return {
    id: info.id,
    uri: info.uri,
    filename: info.filename,
    mediaType,
    width: info.width,
    height: info.height,
    duration: info.duration,
    creationTime: info.creationTime,
    modificationTime: info.modificationTime,
    isFavorite: info.isFavorite,
  };
}

export type LoadAssetsOptions = {
  /** Restrict results to assets in this album. Accepts an Album instance or a GalleryAlbum id. */
  album?: Album | string;
  /** Defaults to images and videos. */
  mediaTypes?: GalleryMediaType[];
  /** Page size. Defaults to 60. */
  limit?: number;
  /** Number of results to skip, for paging. Defaults to 0. */
  offset?: number;
};

export type LoadAssetsResult = {
  assets: GalleryAsset[];
  /** True if there are likely more results past this page. */
  hasMore: boolean;
};

/**
 * Loads a page of device media as plain, serializable GalleryAsset objects.
 * Requests media library permission if it hasn't been granted yet.
 */
export async function loadAssets(options: LoadAssetsOptions = {}): Promise<LoadAssetsResult> {
  await ensureMediaLibraryPermission();

  const { album, mediaTypes = DEFAULT_MEDIA_TYPES, limit = DEFAULT_PAGE_SIZE, offset = 0 } = options;

  let query = new Query()
    .within(
      AssetField.MEDIA_TYPE,
      mediaTypes.map((type) => GALLERY_TO_MEDIA_TYPE[type])
    )
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .limit(limit)
    .offset(offset);

  if (album) {
    query = query.album(typeof album === 'string' ? new Album(album) : album);
  }

  const rawAssets = await query.exe();
  const hydrated = await Promise.all(rawAssets.map(hydrateAsset));
  const assets = hydrated.filter((asset): asset is GalleryAsset => asset !== null);

  return { assets, hasMore: rawAssets.length === limit };
}

/** Loads a single asset by id, or null if it no longer exists. */
export async function loadAsset(id: string): Promise<GalleryAsset | null> {
  await ensureMediaLibraryPermission();
  try {
    return await hydrateAsset(new Asset(id));
  } catch {
    return null;
  }
}
