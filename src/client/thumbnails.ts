import { createVideoThumbnail, Image as ImageCompressor } from 'react-native-compressor';
import * as RNFS from 'react-native-fs';

import type { GalleryAsset } from './media/types';

const THUMBNAIL_DIR = `${RNFS.CachesDirectoryPath}/thumbnails`;
let dirReady: Promise<void> | null = null;

function ensureThumbnailDir(): Promise<void> {
  if (!dirReady) {
    dirReady = RNFS.mkdir(THUMBNAIL_DIR).catch(() => undefined);
  }
  return dirReady;
}

function thumbnailPath(asset: GalleryAsset, size: number): string {
  const safeId = asset.id.replace(/[^a-zA-Z0-9]/g, '_');
  return `${THUMBNAIL_DIR}/${safeId}-${size}.jpg`;
}

function stripFileScheme(path: string): string {
  return path.startsWith('file://') ? path.slice('file://'.length) : path;
}

/**
 * Returns a `file://` URI to a small, cached thumbnail for the asset,
 * generating and caching one on first request (downscaled via
 * react-native-compressor, stored via react-native-fs). Subsequent calls
 * for the same asset+size reuse the cached file instead of recompressing —
 * grid tiles should render this instead of the full-resolution asset URI.
 */
export async function getThumbnailUri(asset: GalleryAsset, size: number): Promise<string> {
  await ensureThumbnailDir();
  const destPath = thumbnailPath(asset, size);

  if (await RNFS.exists(destPath)) {
    return `file://${destPath}`;
  }

  // 2x the tile size as a rough allowance for high-density screens.
  const targetSize = Math.round(size * 2);

  if (asset.mediaType === 'video') {
    const { path } = await createVideoThumbnail(asset.uri, { quality: 0.7 });
    await RNFS.moveFile(stripFileScheme(path), destPath);
    return `file://${destPath}`;
  }

  const compressedUri = await ImageCompressor.compress(asset.uri, {
    compressionMethod: 'manual',
    maxWidth: targetSize,
    maxHeight: targetSize,
    quality: 0.7,
    output: 'jpg',
    returnableOutputType: 'uri',
  });

  await RNFS.moveFile(stripFileScheme(compressedUri), destPath);
  return `file://${destPath}`;
}
