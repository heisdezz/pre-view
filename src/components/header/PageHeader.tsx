import { DropdownMenu, DropdownMenuItem, Host, IconButton, Row } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, paddingAll } from "@expo/ui/jetpack-compose/modifiers";
import { useState } from "react";

import type { AssetGroupBy, AssetSort } from "@/client/db";
import JText from "@/components/ui/JText";

const SORT_LABELS: Record<AssetSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  name: "Name",
};

const GROUP_LABELS: Record<AssetGroupBy, string> = {
  day: "Day",
  month: "Month",
  name: "Name",
  path: "Path",
};

const SORT_OPTIONS = Object.keys(SORT_LABELS) as AssetSort[];
const GROUP_OPTIONS = Object.keys(GROUP_LABELS) as AssetGroupBy[];

// Prefix keeps the active option visually marked without needing icon assets.
function withCheck(active: boolean, label: string): string {
  return `${active ? "✓  " : "     "}${label}`;
}

type PageHeaderProps = {
  title: string;
  sort: AssetSort;
  onSortChange: (sort: AssetSort) => void;
  group: AssetGroupBy;
  onGroupChange: (group: AssetGroupBy) => void;
};

export default function PageHeader({
  title,
  sort,
  onSortChange,
  group,
  onGroupChange,
}: PageHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Host matchContents>
      <Row
        horizontalArrangement="spaceBetween"
        verticalAlignment="center"
        modifiers={[fillMaxWidth(), paddingAll(16)]}
      >
        <JText style={{ typography: "titleLarge" }}>{title}</JText>

        <DropdownMenu expanded={menuOpen} onDismissRequest={() => setMenuOpen(false)}>
          <DropdownMenu.Trigger>
            {/* Standard IconButton has a transparent container (no filled
                background) — just a ripple. '⋮' is the overflow/menu glyph,
                avoiding the need for a drawable icon asset. */}
            <IconButton onClick={() => setMenuOpen(true)}>
              <JText style={{ fontSize: 22 }}>⋮</JText>
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>
            <DropdownMenuItem enabled={false}>
              <DropdownMenuItem.Text>
                <JText>Sort by</JText>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={`sort-${option}`}
                onClick={() => {
                  onSortChange(option);
                  setMenuOpen(false);
                }}
              >
                <DropdownMenuItem.Text>
                  <JText>{withCheck(sort === option, SORT_LABELS[option])}</JText>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}

            <DropdownMenuItem enabled={false}>
              <DropdownMenuItem.Text>
                <JText>Group by</JText>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
            {GROUP_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={`group-${option}`}
                onClick={() => {
                  onGroupChange(option);
                  setMenuOpen(false);
                }}
              >
                <DropdownMenuItem.Text>
                  <JText>{withCheck(group === option, GROUP_LABELS[option])}</JText>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            ))}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Row>
    </Host>
  );
}
