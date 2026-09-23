import type { IconAlias } from '@numior/primitives';
import type { NuiSize } from '../shared/types';

export type NuiTabsActivation = 'automatic' | 'manual';
export type NuiTabsOrientation = 'horizontal' | 'vertical';
export type NuiTabsVariant = 'line' | 'soft';

export interface NuiTabDescriptor {
  readonly value: string;
  readonly label: string;
  readonly icon?: IconAlias | undefined;
  readonly disabled?: boolean | undefined;
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
  icon?: IconAlias | undefined;
  disabled?: boolean | undefined;
}

export interface NuiTabPanelProps {
  value: string;
  lazy?: boolean | undefined;
}
