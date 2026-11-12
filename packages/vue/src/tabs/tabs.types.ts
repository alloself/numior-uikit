import type { IconSource } from '@numior/primitives';
import type { Component } from 'vue';
import type { NuiRouteLocation } from '../shared/destination';
import type { NuiSize } from '../shared/scale.types';

export type NuiTabsActivation = (typeof NuiTabsActivation)[keyof typeof NuiTabsActivation];
export type NuiTabsOrientation = (typeof NuiTabsOrientation)[keyof typeof NuiTabsOrientation];
export type NuiTabsVariant = (typeof NuiTabsVariant)[keyof typeof NuiTabsVariant];

export interface NuiTabDescriptor {
  readonly value: string;
  readonly label: string;
  readonly icon?: IconSource | undefined;
  readonly disabled?: boolean | undefined;
  readonly closable?: boolean | undefined;
}

export interface NuiTabLinkDescriptor {
  readonly to: NuiRouteLocation;
  readonly label: string;
  readonly icon?: IconSource | undefined;
  readonly disabled?: boolean | undefined;
}

export type NuiTabLinkKey = (to: NuiRouteLocation) => string;

export interface NuiTabsProps {
  id?: string | undefined;
  activation?: NuiTabsActivation | undefined;
  orientation?: NuiTabsOrientation | undefined;
  variant?: NuiTabsVariant | undefined;
  size?: NuiSize | undefined;
  lazy?: boolean | undefined;
  tabs?: readonly NuiTabDescriptor[] | undefined;
  links?: readonly NuiTabLinkDescriptor[] | undefined;
  getKey?: NuiTabLinkKey | undefined;
  as?: string | Component | undefined;
  label?: string | undefined;
}

export interface NuiTabsPanelSlot {
  readonly tab: NuiTabDescriptor;
}

export interface NuiTabListProps {
  label?: string | undefined;
}

export interface NuiTabProps {
  value: string;
  icon?: IconSource | undefined;
  disabled?: boolean | undefined;
  closable?: boolean | undefined;
}

export interface NuiTabLinkProps {
  link: NuiTabLinkDescriptor;
  linkKey: string;
  as?: string | Component | undefined;
}

export interface TabPlace {
  readonly start: number;
  readonly size: number;
}

export interface TabOverflow {
  readonly start: boolean;
  readonly end: boolean;
}

export interface NuiTabPanelProps {
  value: string;
  lazy?: boolean | undefined;
  focusable?: boolean | undefined;
}

export const NuiTabsActivation = { Automatic: 'automatic', Manual: 'manual' } as const;

export const NuiTabsOrientation = { Horizontal: 'horizontal', Vertical: 'vertical' } as const;

export const NuiTabsVariant = { Line: 'line', Soft: 'soft' } as const;
