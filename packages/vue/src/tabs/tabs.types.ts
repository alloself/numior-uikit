import type { IconSource } from '@numior/primitives';
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

export interface NuiTabsProps {
  id?: string | undefined;
  activation?: NuiTabsActivation | undefined;
  orientation?: NuiTabsOrientation | undefined;
  variant?: NuiTabsVariant | undefined;
  size?: NuiSize | undefined;
  lazy?: boolean | undefined;
  tabs?: readonly NuiTabDescriptor[] | undefined;
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

export interface NuiTabPanelProps {
  value: string;
  lazy?: boolean | undefined;
  focusable?: boolean | undefined;
}

export const NuiTabsActivation = { Automatic: 'automatic', Manual: 'manual' } as const;

export const NuiTabsOrientation = { Horizontal: 'horizontal', Vertical: 'vertical' } as const;

export const NuiTabsVariant = { Line: 'line', Soft: 'soft' } as const;
