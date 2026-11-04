import type { IconSource } from '@numior/primitives';
import type { NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/scale.types';

export type NuiToggleGroupVariant =
  (typeof NuiToggleGroupVariant)[keyof typeof NuiToggleGroupVariant];

export type NuiToggleGroupOrientation =
  (typeof NuiToggleGroupOrientation)[keyof typeof NuiToggleGroupOrientation];

export interface NuiToggleItem<T = string> {
  readonly value: T;
  readonly label: string;
  readonly icon?: IconSource | undefined;
  readonly disabled?: boolean | undefined;
}

export interface NuiToggleGroupProps<T = string> {
  items: readonly NuiToggleItem<T>[];
  multiple?: boolean | undefined;
  required?: boolean | undefined;
  variant?: NuiToggleGroupVariant | undefined;
  size?: NuiSize | undefined;
  orientation?: NuiToggleGroupOrientation | undefined;
  disabled?: boolean | undefined;
  iconOnly?: boolean | undefined;
  label?: string | undefined;
  getKey?: NuiOptionKey<T> | undefined;
}

export interface NuiToggleItemSlot<T = string> {
  readonly item: NuiToggleItem<T>;
  readonly selected: boolean;
}

export const NuiToggleGroupVariant = { Outline: 'outline', Segmented: 'segmented' } as const;

export const NuiToggleGroupOrientation = {
  Horizontal: 'horizontal',
  Vertical: 'vertical',
} as const;
