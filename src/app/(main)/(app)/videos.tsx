import { useState } from 'react';
import { Button, Text } from 'react-native';

import type { AssetGroupBy, AssetSort } from '@/client/db';
import PageHeader from '@/components/header/PageHeader';
import PageWrap from '@/components/layout/PageWrap';
import MediaGrid from '@/components/media/MediaGrid';
import { useIndexedAssets } from '@/hooks/use-indexed-assets';
import { useMediaPermission } from '@/hooks/use-media-permission';

export default function VideosScreen() {
  const { isGranted, isChecking, request, isRequesting, requestError } = useMediaPermission();
  const [sort, setSort] = useState<AssetSort>('newest');
  const [group, setGroup] = useState<AssetGroupBy>('day');

  const videosQuery = useIndexedAssets({ sort, groupBy: group, mediaTypes: ['video'] }, isGranted);

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

  if (videosQuery.error) {
    return (
      <PageWrap>
        <Text>Could not load your videos.</Text>
      </PageWrap>
    );
  }

  const assets = videosQuery.data ?? [];

  return (
    <PageWrap>
      <PageHeader title="Videos" sort={sort} onSortChange={setSort} group={group} onGroupChange={setGroup} />
      <MediaGrid assets={assets} groupBy={group} />
    </PageWrap>
  );
}
