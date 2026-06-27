import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { GalleryAsset } from '@/client/media';
import { getThumbnailUri } from '@/client/thumbnails';

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
  // Shows the full-res asset immediately, then swaps to the cached, downscaled
  // thumbnail once it's ready (instant on repeat visits, since it's disk-cached).
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setThumbnailUri(null);

    getThumbnailUri(asset, size).then(
      (uri) => {
        if (!cancelled) setThumbnailUri(uri);
      },
      () => {}
    );

    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.uri, size]);

  return (
    <Pressable
      onPress={onPress ? () => onPress(asset) : undefined}
      style={[styles.card, { width: size, height: size }]}
    >
      <Image
        source={{ uri: thumbnailUri ?? asset.uri }}
        style={styles.image}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        recyclingKey={asset.id}
      />
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
});
