import { createVideoThumbnail, Image as ImageCompressor } from 'react-native-compressor';
import * as RNFS from 'react-native-fs';

import type { GalleryAsset } from './media/types';

// Hard cap on the thumbnail's longest edge, in pixels. Kept small (<=150px)
// so grid tiles decode fast and stay cheap in memory for smooth scrolling.
const THUMB_MAX_PX = 150;

const THUMBNAIL_DIR = `${RNFS.CachesDirectoryPath}/thumbnails`;
let dirReady: Promise<void> | null = null;

// In-memory cache of asset id -> resolved thumbnail URI, for this session.
// Skips the async RNFS.exists bridge call (and the resulting blank-tile flash)
// on every recycle/remount of a tile whose thumbnail we've already resolved —
// the disk-cache check below is for thumbnails generated in a *previous*
// session, this is for "we already know" within the current one.
const resolvedUris = new Map<string, string>();

// Dedupes concurrent generation: while a tile recycles in/out during a fast
// scroll it can request the same asset's thumbnail several times before the
// first compress finishes. Sharing the in-flight promise avoids compressing
// the same image more than once.
const inFlight = new Map<string, Promise<string>>();

// Caps how many thumbnails compress at once. Each tile requests its own
// thumbnail independently (so they fill in per-cell, progressively), but the
// actual generation is throttled through this queue — that keeps a screenful
// of cache misses from kicking off dozens of compresses simultaneously, which
// is what made loading look like it happened in section-sized batches.
const MAX_CONCURRENT = 4;
let activeCount = 0;
const pending: (() => void)[] = [];

function pump(): void {
  if (activeCount >= MAX_CONCURRENT) return;
  const job = pending.shift();
  if (!job) return;
  activeCount += 1;
  job();
}

function schedule<T>(work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pending.push(() => {
      work()
        .then(resolve, reject)
        .finally(() => {
          activeCount -= 1;
          pump();
        });
    });
    pump();
  });
}

function ensureThumbnailDir(): Promise<void> {
  if (!dirReady) {
    dirReady = RNFS.mkdir(THUMBNAIL_DIR).catch(() => undefined);
  }
  return dirReady;
}

function thumbnailPath(asset: GalleryAsset): string {
  const safeId = asset.id.replace(/[^a-zA-Z0-9]/g, '_');
  // The size is baked into the name so bumping THUMB_MAX_PX invalidates old files.
  return `${THUMBNAIL_DIR}/${safeId}-${THUMB_MAX_PX}.jpg`;
}

function stripFileScheme(path: string): string {
  return path.startsWith('file://') ? path.slice('file://'.length) : path;
}

async function generateThumbnail(asset: GalleryAsset, destPath: string): Promise<string> {
  // For videos, extract a frame first; that frame is at full video resolution,
  // so it still goes through the compressor below to be capped at THUMB_MAX_PX.
  const sourceUri =
    asset.mediaType === 'video'
      ? (await createVideoThumbnail(asset.uri, { quality: 0.7 })).path
      : asset.uri;

  const compressedUri = await ImageCompressor.compress(sourceUri, {
    compressionMethod: 'manual',
    maxWidth: THUMB_MAX_PX,
    maxHeight: THUMB_MAX_PX,
    quality: 0.7,
    output: 'jpg',
    returnableOutputType: 'uri',
  });

  await RNFS.moveFile(stripFileScheme(compressedUri), destPath);
  return `file://${destPath}`;
}

/**
 * Synchronous lookup of a thumbnail already resolved this session, or
 * `undefined` if unknown. For seeding a component's initial state so an
 * already-resolved tile never flashes blank on remount/recycle.
 */
export function getCachedThumbnailUri(assetId: string): string | undefined {
  return resolvedUris.get(assetId);
}

export type GetThumbnailOptions = {
  /**
   * Checked right before a queued generation starts. Return false to skip it —
   * lets a caller (e.g. a tile that scrolled out of view while waiting in the
   * queue) avoid spending a compress slot on a thumbnail no longer needed.
   */
  shouldProceed?: () => boolean;
};

/**
 * Returns a `file://` URI to a small (<=150px), cached thumbnail for the asset,
 * generating one on first request (downscaled via react-native-compressor,
 * stored via react-native-fs) and reusing the cached file thereafter. Grid
 * tiles render this instead of the full-resolution asset URI.
 *
 * Each tile calls this for itself; cached hits resolve immediately, while
 * cache-miss generation is funnelled through a concurrency-limited queue so a
 * screenful of misses doesn't compress everything at once.
 */
export async function getThumbnailUri(
  asset: GalleryAsset,
  options: GetThumbnailOptions = {}
): Promise<string> {
  // Already resolved this session — skip the async RNFS bridge call entirely.
  const cached = resolvedUris.get(asset.id);
  if (cached) return cached;

  await ensureThumbnailDir();
  const destPath = thumbnailPath(asset);

  // Cached path is cheap — resolve directly, never queued, so revisited tiles
  // (scroll-back) show instantly regardless of the generation backlog.
  if (await RNFS.exists(destPath)) {
    const uri = `file://${destPath}`;
    resolvedUris.set(asset.id, uri);
    return uri;
  }

  const existing = inFlight.get(destPath);
  if (existing) return existing;

  const task = schedule(() => {
    if (options.shouldProceed && !options.shouldProceed()) {
      return Promise.reject(new Error('thumbnail request cancelled'));
    }
    return generateThumbnail(asset, destPath);
  })
    .then((uri) => {
      resolvedUris.set(asset.id, uri);
      return uri;
    })
    .finally(() => {
      inFlight.delete(destPath);
    });

  inFlight.set(destPath, task);
  return task;
}
