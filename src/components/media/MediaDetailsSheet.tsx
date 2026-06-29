import { useEffect, useState } from 'react';
import * as RNFS from 'react-native-fs';
import Modal from 'react-native-modal';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import type { GalleryAsset } from '@/client/media';
import { tw } from '@/tw/tw';

const EXPANDED_RATIO = 0.62;

type FileStats = {
  size: number | null;
  path: string;
};

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

// expo-media-library doesn't expose file size/path directly (AssetInfo only
// has id/uri/dimensions/duration/timestamps) — stat the file ourselves.
// Content URIs (rare on this API, but possible) can't be stat'd; fall back
// to showing the raw uri with an unknown size rather than failing the sheet.
async function statAsset(asset: GalleryAsset): Promise<FileStats> {
  try {
    const result = await RNFS.stat(stripFileScheme(asset.uri));
    return { size: result.size, path: result.path };
  } catch {
    return { size: null, path: stripFileScheme(asset.uri) };
  }
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number | null): string {
  if (ms === null) return 'Unknown';
  return new Date(ms).toLocaleString();
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={tw`flex-row justify-between gap-3 py-1.5`}>
      <Text style={tw`text-white/60 text-sm`}>{label}</Text>
      <Text style={tw`text-white text-sm shrink text-right`} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Handle() {
  return <View style={tw`self-center w-9 h-1 rounded-full bg-white/30 mb-2.5`} />;
}

type MediaDetailsSheetProps = {
  asset: GalleryAsset;
};

// Peek row + expanded sheet, split across two different mount strategies:
//
// - The peek row (size/path) is a plain, always-rendered `Pressable` pinned
//   to the bottom — *not* inside any modal. That matters: a `Modal` opens a
//   separate native window that swallows touches for the whole screen, which
//   would block swiping the image pager in `view/[id].tsx` behind it. Since
//   the peek row needs to be visible at all times while the viewer is open,
//   it can't be the thing that pulls in `react-native-modal`.
// - Tapping the peek row opens the full metadata list in a `react-native-
//   modal` sheet (slide-up from the bottom, swipe-down-to-dismiss). This one
//   *is* a real modal, but only mounted while expanded — the pager is meant
//   to be non-interactive while the details sheet is open, so the touch
//   capture is desired here, not a problem.
//
// (Previously used `@expo/ui`'s community `BottomSheet`, which turned out to
// be broken; this hand-rolled split replaces it without adding a snap-point
// abstraction we don't need — there are exactly two states, peek and
// expanded, and `isExpanded` already models that directly.)
export default function MediaDetailsSheet({ asset }: MediaDetailsSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const expandedHeight = screenHeight * EXPANDED_RATIO;

  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<FileStats>({ size: null, path: asset.uri });

  useEffect(() => {
    let cancelled = false;
    statAsset(asset).then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.uri]);

  return (
    <>
      <Pressable
        onPress={() => setIsExpanded(true)}
        style={tw`absolute left-0 right-0 bottom-0 rounded-t-2xl bg-[#1c1c1eee] pt-2 px-4 pb-4`}
      >
        <Handle />
        <MetadataRow label="Size" value={formatBytes(stats.size)} />
        <MetadataRow label="Path" value={stats.path} />
      </Pressable>

      <Modal
        isVisible={isExpanded}
        style={tw`m-0 justify-end`}
        swipeDirection="down"
        onSwipeComplete={() => setIsExpanded(false)}
        onBackdropPress={() => setIsExpanded(false)}
        propagateSwipe
      >
        <View style={[tw`rounded-t-2xl bg-[#1c1c1eee] px-4 pt-2 pb-1`, { height: expandedHeight }]}>
          <Pressable onPress={() => setIsExpanded(false)}>
            <Handle />
            <MetadataRow label="Size" value={formatBytes(stats.size)} />
            <MetadataRow label="Path" value={stats.path} />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false}>
            <MetadataRow label="Type" value={asset.mediaType === 'video' ? 'Video' : 'Photo'} />
            <MetadataRow label="Dimensions" value={`${asset.width} × ${asset.height}`} />
            {asset.mediaType === 'video' && asset.duration !== null && (
              <MetadataRow label="Duration" value={formatDuration(asset.duration)} />
            )}
            <MetadataRow label="Created" value={formatDate(asset.creationTime)} />
            <MetadataRow label="Modified" value={formatDate(asset.modificationTime)} />
            <MetadataRow label="Favorite" value={asset.isFavorite ? 'Yes' : 'No'} />
            <MetadataRow label="Filename" value={asset.filename} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
