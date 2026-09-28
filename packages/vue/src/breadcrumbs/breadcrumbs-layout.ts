import type { Component } from 'vue';
import type { NuiMenuEntry } from '../menu/menu.types';
import type { NuiBreadcrumbItem } from './breadcrumbs.types';

export interface CrumbEntry {
  readonly kind: 'item';
  readonly key: string;
  readonly item: NuiBreadcrumbItem;
  readonly index: number;
  readonly current: boolean;
}

export interface MoreEntry {
  readonly kind: 'more';
  readonly key: string;
  readonly menu: readonly NuiMenuEntry[];
}

export type BreadcrumbEntry = CrumbEntry | MoreEntry;

const crumb = (item: NuiBreadcrumbItem, index: number, count: number): CrumbEntry => ({
  kind: 'item',
  key: `item-${index}`,
  item,
  index,
  current: index === count - 1,
});

const toMenuEntry = (
  item: NuiBreadcrumbItem,
  as: string | Component | undefined,
): NuiMenuEntry => ({
  label: item.label,
  icon: item.icon,
  href: item.href,
  to: item.to,
  as,
});

export const layoutBreadcrumbs = (
  items: readonly NuiBreadcrumbItem[],
  maxItems: number | undefined,
  as: string | Component | undefined,
): BreadcrumbEntry[] => {
  const count = items.length;
  if (maxItems === undefined || maxItems < 2 || count <= maxItems) {
    return items.map((item, index) => crumb(item, index, count));
  }
  const tail = Math.max(1, maxItems - 2);
  const hidden = items.slice(1, count - tail);
  const first = items[0];
  return [
    ...(first === undefined ? [] : [crumb(first, 0, count)]),
    { kind: 'more', key: 'more', menu: hidden.map((item) => toMenuEntry(item, as)) },
    ...items.slice(count - tail).map((item, offset) => crumb(item, count - tail + offset, count)),
  ];
};
