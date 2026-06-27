import { Button, DropdownMenu, DropdownMenuItem, Host, Row } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { useState } from 'react';

import type { AssetGroupBy, AssetSort } from '@/client/db';
import JText from '@/components/ui/JText';

const SORT_LABELS: Record<AssetSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name: 'Name',
};

const GROUP_LABELS: Record<AssetGroupBy, string> = {
  none: 'None',
  day: 'Day',
  month: 'Month',
  year: 'Year',
};

type PageHeaderProps = {
  title: string;
  sort: AssetSort;
  onSortChange: (sort: AssetSort) => void;
  group: AssetGroupBy;
  onGroupChange: (group: AssetGroupBy) => void;
};

export default function PageHeader({ title, sort, onSortChange, group, onGroupChange }: PageHeaderProps) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  return (
    <Host matchContents>
      <Row
        horizontalArrangement="spaceBetween"
        verticalAlignment="center"
        modifiers={[fillMaxWidth(), paddingAll(16)]}
      >
        <JText style={{ typography: 'titleLarge' }}>{title}</JText>

        <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
          <DropdownMenu expanded={sortMenuOpen} onDismissRequest={() => setSortMenuOpen(false)}>
            <DropdownMenu.Trigger>
              <Button onClick={() => setSortMenuOpen(true)}>
                <JText>{`Sort: ${SORT_LABELS[sort]}`}</JText>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Items>
              {(Object.keys(SORT_LABELS) as AssetSort[]).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => {
                    onSortChange(option);
                    setSortMenuOpen(false);
                  }}
                >
                  <DropdownMenuItem.Text>
                    <JText>{SORT_LABELS[option]}</JText>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenu.Items>
          </DropdownMenu>

          <DropdownMenu expanded={groupMenuOpen} onDismissRequest={() => setGroupMenuOpen(false)}>
            <DropdownMenu.Trigger>
              <Button onClick={() => setGroupMenuOpen(true)}>
                <JText>{`Group: ${GROUP_LABELS[group]}`}</JText>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Items>
              {(Object.keys(GROUP_LABELS) as AssetGroupBy[]).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => {
                    onGroupChange(option);
                    setGroupMenuOpen(false);
                  }}
                >
                  <DropdownMenuItem.Text>
                    <JText>{GROUP_LABELS[option]}</JText>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
              ))}
            </DropdownMenu.Items>
          </DropdownMenu>
        </Row>
      </Row>
    </Host>
  );
}
