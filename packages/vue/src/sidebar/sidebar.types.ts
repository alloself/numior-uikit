import type { IconAlias } from '@numior/primitives';
import type { Component } from 'vue';
import type { NuiListEntry } from '../shared/options';

export type NuiSidebarCollapsible = 'icon' | 'offcanvas' | 'none';
export type NuiSidebarSide = 'start' | 'end';

export interface NuiSidebarProps {
  collapsible?: NuiSidebarCollapsible | undefined;
  side?: NuiSidebarSide | undefined;
  label?: string | undefined;
  title?: string | undefined;
  closeLabel?: string | undefined;
}

export interface NuiSidebarContentProps {
  label?: string | undefined;
}

export interface NuiSidebarGroupProps {
  id?: string | undefined;
  label?: string | undefined;
  items?: readonly NuiListEntry<unknown>[] | undefined;
  collapsible?: boolean | undefined;
}

export interface NuiSidebarItemProps {
  label: string;
  icon?: IconAlias | undefined;
  href?: string | undefined;
  to?: unknown;
  as?: string | Component | undefined;
  current?: boolean | undefined;
  disabled?: boolean | undefined;
  badge?: string | number | undefined;
  tooltip?: string | undefined;
}

export interface NuiSidebarSubProps {
  label: string;
  icon?: IconAlias | undefined;
  active?: boolean | undefined;
  id?: string | undefined;
}

export interface NuiSidebarTriggerProps {
  label?: string | undefined;
}
