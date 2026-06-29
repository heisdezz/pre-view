import { LegendList } from "@legendapp/list/react-native";
import { Color, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, useWindowDimensions } from "react-native";

import type { AssetGroupBy, IndexedAsset } from "@/client/db";
import { viewQueueRef, type GalleryAsset } from "@/client/media";

import MediaCard from "./MediaCard";

const NUM_COLUMNS = 4;
const GAP = 2;
// Generous off-screen buffer (default is 250px) so tiles a few rows out of
// view stay mounted instead of being recycled/unloaded the moment they pass
// the viewport edge — that's what was causing images to "unload too fast".
const DRAW_DISTANCE = 3500;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatDateGroup(groupKey: string): string {
  if (groupKey === "unknown") return "Unknown date";
  const [year, month, day] = groupKey.split("-").map(Number);
  if (month === undefined) return String(year);
  const monthName = MONTHS[month - 1] ?? "";
  if (day === undefined) return `${monthName} ${year}`;
  return `${monthName} ${day}, ${year}`;
}

// groupKey shape depends on the active groupBy (see queries.ts): a date string
// for day/month, a single letter for name, or a folder name for path.
function formatGroupLabel(groupKey: string, groupBy: AssetGroupBy): string {
  switch (groupBy) {
    case "day":
    case "month":
      return formatDateGroup(groupKey);
    case "path":
      return groupKey === "unknown" ? "Unknown folder" : groupKey;
    case "name":
      return groupKey;
  }
}

type GridRow =
  | { kind: "header"; key: string; label: string }
  | { kind: "asset"; key: string; asset: IndexedAsset };

// Flattens assets into a single list, inserting a header row each time the
// group changes. Headers span the full grid width (see overrideItemLayout).
function buildRows(assets: IndexedAsset[], groupBy: AssetGroupBy): GridRow[] {
  const rows: GridRow[] = [];
  let currentGroup: string | null = null;

  for (const asset of assets) {
    if (asset.groupKey !== currentGroup) {
      currentGroup = asset.groupKey;
      rows.push({
        kind: "header",
        key: `header:${asset.groupKey}`,
        label: formatGroupLabel(asset.groupKey, groupBy),
      });
    }
    rows.push({ kind: "asset", key: asset.id, asset });
  }

  return rows;
}

type MediaGridProps = {
  assets: IndexedAsset[];
  groupBy: AssetGroupBy;
};

export default function MediaGrid({ assets, groupBy }: MediaGridProps) {
  const { width } = useWindowDimensions();
  const tileSize = (width - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const rows = buildRows(assets, groupBy);
  const router = useRouter();

  // Holds the list currently on screen so a tap can hand it off to the
  // viewer for swipe navigation without forcing a re-render on every change
  // (only the LegendList itself needs to react to `assets` changing).
  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  const handlePressAsset = (asset: GalleryAsset) => {
    viewQueueRef.current = assetsRef.current;
    router.push({
      pathname: "/view/[id]",
      params: { id: asset.id, type: asset.mediaType },
    });
  };

  return (
    <LegendList
      data={rows}
      keyExtractor={(row) => row.key}
      numColumns={NUM_COLUMNS}
      columnWrapperStyle={{ gap: GAP, rowGap: GAP }}
      drawDistance={DRAW_DISTANCE}
      recycleItems
      getItemType={(row) => row.kind}
      overrideItemLayout={(layout, row) => {
        layout.span = row.kind === "header" ? NUM_COLUMNS : 1;
      }}
      renderItem={({ item }) =>
        item.kind === "header" ? (
          <Text
            style={[styles.header, { color: Color.android.dynamic.onSurface }]}
          >
            {item.label}
          </Text>
        ) : (
          <MediaCard
            asset={item.asset}
            size={tileSize}
            onPress={handlePressAsset}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 10,
    fontSize: 20,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
