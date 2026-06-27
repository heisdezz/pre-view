import { useCallback, useState } from 'react';
import { Button, Text } from 'react-native';

import type { AssetGroupBy, AssetSort } from '@/client/db';
import PageHeader from '@/components/header/PageHeader';
import PageWrap from '@/components/layout/PageWrap';
import MediaGrid from '@/components/media/MediaGrid';
import { useIndexedAssets } from '@/hooks/use-indexed-assets';
import { useMediaPermission } from '@/hooks/use-media-permission';

export default function GalleryScreen() {
  const { isGranted, isChecking, request, isRequesting, requestError } = useMediaPermission();
  const [sort, setSort] = useState<AssetSort>('newest');
  const [group, setGroup] = useState<AssetGroupBy>('none');

  const galleryQuery = useIndexedAssets({ sort, groupBy: group }, isGranted);

  const loadMore = useCallback(() => {
    if (galleryQuery.hasNextPage && !galleryQuery.isFetchingNextPage) {
      galleryQuery.fetchNextPage();
    }
  }, [galleryQuery]);

  if (isChecking) {
    return (
      <PageWrap>
        <Text>Checking media access…</Text>
      </PageWrap>
    );
  }

  if (!isGranted) {
    return (
      <PageWrap>
        <Text>Allow access to your photos and videos to see them here.</Text>
        {requestError && <Text>Permission was denied. You can grant it from system settings.</Text>}
        <Button title="Grant access" onPress={() => request()} disabled={isRequesting} />
      </PageWrap>
    );
  }

  if (galleryQuery.error) {
    return (
      <PageWrap>
        <Text>Could not load your media library.</Text>
      </PageWrap>
    );
  }

  const assets = galleryQuery.data?.pages.flat() ?? [];

  return (
    <PageWrap>
      <PageHeader title="Gallery" sort={sort} onSortChange={setSort} group={group} onGroupChange={setGroup} />
      <MediaGrid assets={assets} onEndReached={loadMore} />
    </PageWrap>
  );
}
