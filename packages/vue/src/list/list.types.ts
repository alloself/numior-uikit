import type { NuiRouteLocation } from '../shared/destination';
import type { IconSource } from '@numior/primitives';
import type { Component } from 'vue';
import type { NuiListEntry, NuiListSource, NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/scale.types';

export type NuiListVariant = 'plain' | 'divided' | 'bordered' | 'floating' | 'nav';
export type NuiListSelectable = 'single' | 'multiple';
export type NuiListTag = 'ul' | 'ol';

export interface NuiListProps<T, E extends NuiListEntry<T> = NuiListEntry<T>> {
  id?: string | undefined;
  as?: NuiListTag | undefined;
  variant?: NuiListVariant | undefined;
  size?: NuiSize | undefined;
  items?: NuiListSource<E> | undefined;
  selectable?: NuiListSelectable | undefined;
  getKey?: NuiOptionKey<T> | undefined;
  loop?: boolean | undefined;
  typeahead?: boolean | undefined;
  keyboard?: boolean | undefined;
  activeId?: string | undefined;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
  label?: string | undefined;
  labelledBy?: string | undefined;
  emptyLabel?: string | undefined;
  linkAs?: string | Component | undefined;
}

export interface NuiListItemSlot<E> {
  readonly item: E;
  readonly selected: boolean;
  readonly active: boolean;
}

export interface NuiListItemProps {
  value?: unknown;
  id?: string | undefined;
  label?: string | undefined;
  description?: string | undefined;
  icon?: IconSource | false | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
  as?: string | Component | undefined;
  interactive?: boolean | undefined;
  disabled?: boolean | undefined;
  current?: boolean | undefined;
  badge?: string | number | undefined;
  shortcut?: string | undefined;
}
