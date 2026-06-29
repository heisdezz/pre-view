import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { GalleryAsset } from '@/client/media';
import { getThumbnailUri } from '@/client/thumbnails';

type ViewCardProps = {
  asset: GalleryAsset;
  size: number;
  onPress?: (asset: GalleryAsset) => void;
};

// Same tile contract as MediaCard (thumbnail-only, recycled by the caller's
// list), kept separate so a non-grid surface (e.g. albums) can style its
// tiles differently without MediaCard's grid-specific badges.
export default function ViewCard({ asset, size, onPress }: ViewCardProps) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setThumbnailUri(null);

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
});
