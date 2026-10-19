import type { IconSource } from '@numior/primitives';
import type { NuiSize } from '../shared/scale.types';

export type NuiTabsActivation = 'automatic' | 'manual';
export type NuiTabsOrientation = 'horizontal' | 'vertical';
export type NuiTabsVariant = 'line' | 'soft';

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
