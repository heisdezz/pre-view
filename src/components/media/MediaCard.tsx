import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GalleryAsset } from '@/client/media';
import { getCachedThumbnailUri, getThumbnailUri } from '@/client/thumbnails';

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type MediaCardProps = {
  asset: GalleryAsset;
  size: number;
  onPress?: (asset: GalleryAsset) => void;
};

export default function MediaCard({ asset, size, onPress }: MediaCardProps) {
  // Only ever renders the cached, downscaled thumbnail — never the full-res
  // original — so the grid keeps small images in memory. Until the thumbnail
  // resolves, the card shows its plain placeholder background. Because this
  // mounts/unmounts as LegendList recycles tiles in/out of `drawDistance`,
  // thumbnails are loaded when a tile scrolls into the buffer and unloaded
  // when it scrolls out (disk cache makes the reload instant).
  // Seeded synchronously when this asset's thumbnail was already resolved
  // this session, so an already-known tile never flashes blank on remount/
  // recycle while the (otherwise async) lookup below re-confirms it.
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(
    () => getCachedThumbnailUri(asset.id) ?? null
  );

  useEffect(() => {
    let cancelled = false;
    setThumbnailUri(getCachedThumbnailUri(asset.id) ?? null);

    // Each tile loads its own thumbnail independently. Cached hits return
    // immediately; cache-miss generation is throttled by a shared queue in
    // thumbnails.ts (not batched per scroll-settle), so tiles fill in
    // progressively. `shouldProceed` lets the queue skip this tile if it has
    // already recycled out of view before its turn comes up.
    getThumbnailUri(asset, { shouldProceed: () => !cancelled }).then(
      (uri) => {
        if (!cancelled) setThumbnailUri(uri);
      },
      () => {}
    );

    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.uri]);

  return (
    <Pressable
      onPress={onPress ? () => onPress(asset) : undefined}
      style={[styles.card, { width: size, height: size }]}
    >
      {thumbnailUri && (
        <Image
          source={{ uri: thumbnailUri }}
          style={styles.image}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          recyclingKey={asset.id}
        />
      )}
      {asset.mediaType === 'video' && (
        <View style={styles.playBadge}>
          <View style={styles.playTriangle} />
        </View>
      )}
      {asset.mediaType === 'video' && asset.duration !== null && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(asset.duration)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: '#0001',
  },
  image: {
    flex: 1,
  },
  durationBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#000000aa',
  },
  durationText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 32,
    height: 32,
    marginTop: -16,
    marginLeft: -16,
    borderRadius: 16,
    backgroundColor: '#000000aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    // CSS-triangle trick: a transparent box with only the left border visible,
    // angled by transparent top/bottom borders — no icon asset/library needed.
    width: 0,
    height: 0,
    marginLeft: 2,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'white',
  },
});
