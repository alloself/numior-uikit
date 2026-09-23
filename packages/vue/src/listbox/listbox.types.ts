import type { NuiOption, NuiOptionKey, NuiOptionSource } from '../shared/options';

export interface NuiListboxProps<T> {
  id: string;
  options: NuiOptionSource<T>;
  selectedKeys: ReadonlySet<string>;
  keyOf: NuiOptionKey<T>;
  activeId?: string | undefined;
  multiple?: boolean | undefined;
  loading?: boolean | undefined;
  emptyLabel: string;
  loadingLabel?: string | undefined;
  labelledBy?: string | undefined;
}

export interface NuiListboxOptionSlot<T> {
  readonly option: NuiOption<T>;
  readonly selected: boolean;
  readonly active: boolean;
}

export interface NuiListboxOptionProps<T> {
  option: NuiOption<T>;
  id: string;
  selected: boolean;
  active: boolean;
}

export const optionElementId = (listboxId: string, index: number): string =>
  `${listboxId}-option-${index}`;

export const optionIndexOf = (element: Element): number =>
  Number(element.id.slice(element.id.lastIndexOf('-') + 1));
