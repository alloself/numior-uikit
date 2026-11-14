import type { NuiRouteLocation } from '../shared/destination';
import type { IconSource } from '@numior/primitives';
import type { Component } from 'vue';
import type { NuiListEntry } from '../shared/options';

export type NuiSidebarCollapsible =
  (typeof NuiSidebarCollapsible)[keyof typeof NuiSidebarCollapsible];
export type NuiSidebarMarker = (typeof NuiSidebarMarker)[keyof typeof NuiSidebarMarker];
export type NuiSidebarSide = (typeof NuiSidebarSide)[keyof typeof NuiSidebarSide];
export type NuiSidebarVariant = (typeof NuiSidebarVariant)[keyof typeof NuiSidebarVariant];

export interface NuiSidebarProps {
  collapsible?: NuiSidebarCollapsible | undefined;
  side?: NuiSidebarSide | undefined;
  variant?: NuiSidebarVariant | undefined;
  marker?: NuiSidebarMarker | undefined;
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
  icon?: IconSource | undefined;
  href?: string | undefined;
  to?: NuiRouteLocation | undefined;
  as?: string | Component | undefined;
  current?: boolean | undefined;
  disabled?: boolean | undefined;
  badge?: string | number | undefined;
  tooltip?: string | undefined;
}

export interface NuiSidebarSubProps {
  label: string;
  icon?: IconSource | undefined;
  active?: boolean | undefined;
  id?: string | undefined;
}

export interface NuiSidebarTriggerProps {
  label?: string | undefined;
}

export const NuiSidebarCollapsible = {
  Icon: 'icon',
  Offcanvas: 'offcanvas',
  None: 'none',
} as const;

export const NuiSidebarMarker = { Line: 'line', Square: 'square' } as const;

export const NuiSidebarSide = { Start: 'start', End: 'end' } as const;

export const NuiSidebarVariant = {
  Panel: 'panel',
  Plain: 'plain',
  Inset: 'inset',
  Floating: 'floating',
} as const;
