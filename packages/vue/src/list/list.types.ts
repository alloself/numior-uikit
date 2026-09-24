import type { IconAlias } from '@numior/primitives';
import type { Component } from 'vue';
import type { NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/types';

export type NuiListVariant = 'plain' | 'divided' | 'bordered';
export type NuiListSelectable = 'single' | 'multiple';
export type NuiListTag = 'ul' | 'ol';

export interface NuiListEntry<T = string> {
  readonly key?: string | undefined;
  readonly title: string;
  readonly description?: string | undefined;
  readonly icon?: IconAlias | undefined;
  readonly value?: T | undefined;
  readonly href?: string | undefined;
  readonly to?: unknown;
  readonly disabled?: boolean | undefined;
  readonly onClick?: (() => void) | undefined;
}

export interface NuiListProps<T> {
  as?: NuiListTag | undefined;
  variant?: NuiListVariant | undefined;
  size?: NuiSize | undefined;
  items?: readonly NuiListEntry<T>[] | undefined;
  selectable?: NuiListSelectable | undefined;
  getKey?: NuiOptionKey<T> | undefined;
  loop?: boolean | undefined;
  typeahead?: boolean | undefined;
  label?: string | undefined;
  emptyLabel?: string | undefined;
  linkAs?: string | Component | undefined;
}

export interface NuiListItemSlot<T> {
  readonly item: NuiListEntry<T>;
  readonly selected: boolean;
}

export interface NuiListItemProps {
  value?: unknown;
  title?: string | undefined;
  description?: string | undefined;
  icon?: IconAlias | undefined;
  href?: string | undefined;
  to?: unknown;
  as?: string | Component | undefined;
  interactive?: boolean | undefined;
  disabled?: boolean | undefined;
}
