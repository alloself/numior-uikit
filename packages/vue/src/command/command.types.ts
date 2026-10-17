import type { NuiListSource, NuiOption, NuiOptionKey } from '../shared/options';

export interface NuiCommandItem<T = string> extends NuiOption<T> {
  readonly shortcut?: string | undefined;
  readonly keywords?: readonly string[] | undefined;
}

export type NuiCommandSource<T = string> = NuiListSource<NuiCommandItem<T>>;

export type NuiCommandFilter<T> = (item: NuiCommandItem<T>, query: string) => boolean;

export interface NuiCommandProps<T = string> {
  id?: string | undefined;
  items: NuiCommandSource<T>;
  selected?: T | undefined;
  filter?: NuiCommandFilter<T> | false | undefined;
  loading?: boolean | undefined;
  loop?: boolean | undefined;
  autofocus?: boolean | undefined;
  getKey?: NuiOptionKey<T> | undefined;
  label?: string | undefined;
  placeholder?: string | undefined;
  emptyLabel?: string | undefined;
  loadingLabel?: string | undefined;
}

export interface NuiCommandItemSlot<T = string> {
  readonly item: NuiCommandItem<T>;
  readonly active: boolean;
}

export interface NuiCommandDialogProps<T = string> extends NuiCommandProps<T> {
  title?: string | undefined;
  hotkey?: string | false | undefined;
  closeOnSelect?: boolean | undefined;
}
