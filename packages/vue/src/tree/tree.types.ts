import type { IconSource } from '@numior/primitives';
import type { NuiOption, NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/scale.types';
import type { TreeNode } from './flatten';

export interface NuiTreeItem<T = string> extends Omit<
  NuiOption<T>,
  'key' | 'href' | 'to' | 'onClick' | 'children'
> {
  readonly children?: readonly NuiTreeItem<T>[] | undefined;
  readonly lazy?: boolean | undefined;
}

export type CheckState = (typeof CheckState)[keyof typeof CheckState];

export type NuiTreeSelectable = (typeof NuiTreeSelectable)[keyof typeof NuiTreeSelectable];

export type NuiTreeVariant = (typeof NuiTreeVariant)[keyof typeof NuiTreeVariant];

export interface NuiTreeProps<T> {
  id?: string | undefined;
  items: readonly NuiTreeItem<T>[];
  getKey?: NuiOptionKey<T> | undefined;
  variant?: NuiTreeVariant | undefined;
  size?: NuiSize | undefined;
  selectable?: NuiTreeSelectable | false | undefined;
  checkable?: boolean | undefined;
  icons?: boolean | undefined;
  virtual?: boolean | undefined;
  height?: string | undefined;
  itemHeight?: number | undefined;
  loop?: boolean | undefined;
  typeahead?: boolean | undefined;
  loading?: boolean | undefined;
  loadingLabel?: string | undefined;
  emptyLabel?: string | undefined;
  label?: string | undefined;
  labelledBy?: string | undefined;
}

export interface NuiTreeItemSlot<T> {
  readonly item: NuiTreeItem<T>;
  readonly level: number;
  readonly expanded: boolean;
  readonly selected: boolean;
  readonly checked: CheckState;
  readonly loading: boolean;
}

export interface NuiTreeNodeProps<T> {
  node: TreeNode<T>;
  id: string;
  checked?: CheckState | undefined;
  icon?: IconSource | undefined;
  folder: boolean;
  revealing?: boolean | undefined;
}

export const NuiTreeSelectable = { Single: 'single', Multiple: 'multiple' } as const;

export const NuiTreeVariant = {
  Plain: 'plain',
  Divided: 'divided',
  Bordered: 'bordered',
  Floating: 'floating',
} as const;

export const CheckState = {
  Checked: 'checked',
  Unchecked: 'unchecked',
  Indeterminate: 'indeterminate',
} as const;
