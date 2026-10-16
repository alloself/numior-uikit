import NuiContentBadgeCell from './NuiContentBadgeCell.vue';
import NuiContentCheckCell from './NuiContentCheckCell.vue';
import type { NuiContentCellViews } from './content-table.types';

export const contentCellViews: NuiContentCellViews = {
  boolean: NuiContentCheckCell,
  select: NuiContentBadgeCell,
};
