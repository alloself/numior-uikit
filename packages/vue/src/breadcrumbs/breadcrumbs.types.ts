import type { NuiRouteLocation } from '../shared/destination';
import type { Component } from 'vue';
import type { IconAlias } from '@numior/primitives';

export interface NuiBreadcrumbItem {
  readonly label: string;
  readonly href?: string | undefined;
  readonly to?: NuiRouteLocation | undefined;
  readonly icon?: IconAlias | undefined;
}

export interface NuiBreadcrumbsProps {
  items: readonly NuiBreadcrumbItem[];
  maxItems?: number | undefined;
  separator?: IconAlias | undefined;
  label?: string | undefined;
  moreLabel?: string | undefined;
  as?: string | Component | undefined;
}

export interface NuiBreadcrumbsItemSlot {
  readonly item: NuiBreadcrumbItem;
  readonly index: number;
  readonly current: boolean;
}
