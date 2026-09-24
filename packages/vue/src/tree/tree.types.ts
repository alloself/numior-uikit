import type { IconAlias } from '@numior/primitives';
import type { NuiOptionKey } from '../shared/options';
import type { NuiSize } from '../shared/types';
import type { CheckState } from './cascade';
import type { TreeNode } from './flatten';

export interface NuiTreeItem<T = string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string | undefined;
  readonly icon?: IconAlias | false | undefined;
  readonly disabled?: boolean | undefined;
  readonly children?: readonly NuiTreeItem<T>[] | undefined;
  readonly lazy?: boolean | undefined;
}

export type NuiTreeSelectable = 'single' | 'multiple';

export interface NuiTreeProps<T> {
  id?: string | undefined;
  items: readonly NuiTreeItem<T>[];
  getKey?: NuiOptionKey<T> | undefined;
  selectable?: NuiTreeSelectable | false | undefined;
  checkable?: boolean | undefined;
  icons?: boolean | undefined;
  virtual?: boolean | undefined;
  height?: string | undefined;
  itemHeight?: number | undefined;
  size?: NuiSize | undefined;
  loop?: boolean | undefined;
  typeahead?: boolean | undefined;
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
  active: boolean;
  selected: boolean;
  selectable: boolean;
  checked?: CheckState | undefined;
  icon?: IconAlias | undefined;
  start?: number | undefined;
}
