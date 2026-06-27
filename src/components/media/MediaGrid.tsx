import { LegendList } from '@legendapp/list/react-native';
import { useWindowDimensions } from 'react-native';

import type { GalleryAsset } from '@/client/media';

import MediaCard from './MediaCard';

const NUM_COLUMNS = 4;
const GAP = 2;
// Generous off-screen buffer (default is 250px) so tiles a few rows out of
// view stay mounted instead of being recycled/unloaded the moment they pass
// the viewport edge — that's what was causing images to "unload too fast".
const DRAW_DISTANCE = 1500;

type MediaGridProps = {
  assets: GalleryAsset[];
  onPressAsset?: (asset: GalleryAsset) => void;
  onEndReached?: () => void;
};

export default function MediaGrid({ assets, onPressAsset, onEndReached }: MediaGridProps) {
  const { width } = useWindowDimensions();
  const tileSize = (width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  return (
    <LegendList
      data={assets}
      keyExtractor={(asset) => asset.id}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={{ gap: GAP, rowGap: GAP }}
      estimatedItemSize={tileSize}
      drawDistance={DRAW_DISTANCE}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      recycleItems
      renderItem={({ item }) => <MediaCard asset={item} size={tileSize} onPress={onPressAsset} />}
    />
  );
}
