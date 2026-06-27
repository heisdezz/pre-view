export type GalleryMediaType = 'image' | 'video';

export type GalleryAsset = {
  id: string;
  uri: string;
  filename: string;
  mediaType: GalleryMediaType;
  width: number;
  height: number;
  /** Milliseconds, null for images. */
  duration: number | null;
  /** Unix timestamp in milliseconds, null if unavailable. */
  creationTime: number | null;
  /** Unix timestamp in milliseconds, null if unavailable. */
  modificationTime: number | null;
  isFavorite: boolean;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  assetCount: number;
  coverAsset: GalleryAsset | null;
};
