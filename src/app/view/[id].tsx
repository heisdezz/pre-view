import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { loadAsset, viewQueueRef, type GalleryAsset } from '@/client/media';
import { getThumbnailUri } from '@/client/thumbnails';
import MediaDetailsSheet from '@/components/media/MediaDetailsSheet';
import { tw } from '@/tw/tw';

function PhotoPage({ asset, width, height }: { asset: GalleryAsset; width: number; height: number }) {
  return (
    <View style={{ width, height }}>
      <Image source={{ uri: asset.uri }} style={tw`flex-1`} contentFit="contain" />
    </View>
  );
}

// Only the page the user has paged to should actually play (and have audio) —
// `isActive` comes from comparing this page's index to the FlatList's current
// page, so swiping away pauses it instead of leaving several videos playing
// (and competing for audio focus) at once.
function VideoPage({
  asset,
  width,
  height,
  isActive,
}: {
  asset: GalleryAsset;
  width: number;
  height: number;
  isActive: boolean;
}) {
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [hasFirstFrame, setHasFirstFrame] = useState(false);
  const player = useVideoPlayer(asset.uri, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    let cancelled = false;
    getThumbnailUri(asset).then((uri) => {
      if (!cancelled) setPosterUri(uri);
    }, () => {});
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={tw`flex-1`}
        contentFit="contain"
        nativeControls
        onFirstFrameRender={() => setHasFirstFrame(true)}
      />
      {!hasFirstFrame && posterUri && (
        <Image
          source={{ uri: posterUri }}
          style={[tw`flex-1`, { position: 'absolute', top: 0, left: 0, width, height }]}
          contentFit="contain"
        />
      )}
    </View>
  );
}

function ViewerPage({
  asset,
  width,
  height,
  isActive,
}: {
  asset: GalleryAsset;
  width: number;
  height: number;
  isActive: boolean;
}) {
  if (asset.mediaType === 'video') {
    return <VideoPage asset={asset} width={width} height={height} isActive={isActive} />;
  }
  return <PhotoPage asset={asset} width={width} height={height} />;
}

// Filename + tags overlay pinned above the pager. Tags are UI-only for now —
// the app has no tagging data model yet (GalleryAsset carries no tags field),
// so this always renders the empty state until that lands.
function DetailsOverlay({ asset }: { asset: GalleryAsset }) {
  return (
    <View style={tw`absolute top-0 left-0 right-0 pt-12 px-4 pb-6 bg-black/40`}>
      <Text style={tw`text-white text-base font-semibold`} numberOfLines={1}>
        {asset.filename}
      </Text>
      <Text style={tw`text-white/50 text-xs mt-1`}>No tags yet</Text>
    </View>
  );
}

export default function ViewScreen() {
  const { id } = useLocalSearchParams<{ id: string; type: string }>();
  const { width, height } = useWindowDimensions();

  // The grid handed this list off via `viewQueueRef` (a plain singleton, not
  // a React ref — it has to outlive the grid screen's own render) right
  // before navigating here; snapshot it once into state so the viewer can
  // page through it independently of further grid updates.
  const [list, setList] = useState<GalleryAsset[]>(() => viewQueueRef.current);
  const [index, setIndex] = useState(() => Math.max(0, list.findIndex((a) => a.id === id)));

  useEffect(() => {
    if (list.length > 0) return;
    let cancelled = false;
    loadAsset(id).then((asset) => {
      if (cancelled || !asset) return;
      setList([asset]);
      setIndex(0);
    });
    return () => {
      cancelled = true;
    };
  }, [id, list.length]);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  if (list.length === 0) {
    return (
      <View style={tw`flex-1 bg-black items-center justify-center`}>
        <Text style={tw`text-white`}>Media not found.</Text>
      </View>
    );
  }

  const currentAsset = list[Math.min(index, list.length - 1)];

  return (
    <View style={tw`flex-1 bg-black items-center justify-center`}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item, index: itemIndex }) => (
          <ViewerPage asset={item} width={width} height={height} isActive={itemIndex === index} />
        )}
      />
      <DetailsOverlay asset={currentAsset} />
      <MediaDetailsSheet key={currentAsset.id} asset={currentAsset} />
    </View>
  );
}
