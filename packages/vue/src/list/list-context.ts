import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import type { ElementCollection } from '@numior/primitives';
import type { NuiSize } from '../shared/scale.types';
import type { ListContextKind, NuiListSelectable, NuiListVariant } from './list.types';

export interface TreeItemState {
  readonly level: number;
  readonly setSize: number;
  readonly posInSet: number;
  readonly expanded: boolean | undefined;
  readonly checked: boolean | 'mixed' | undefined;
  readonly loading: boolean;
}

interface ListShellContext<T> {
  readonly selectable: ComputedRef<NuiListSelectable | undefined>;
  readonly variant: ComputedRef<NuiListVariant>;
  readonly size: ComputedRef<NuiSize>;
  readonly activeId: ComputedRef<string | undefined>;
  keyOf(value: T): string;
  isSelected(value: T): boolean;
}

export type ListItemKey = string | symbol;

export interface ListItems {
  readonly elements: ElementCollection<ListItemKey>;
  readonly titles: WeakMap<HTMLElement, () => string>;
}

export interface ListboxContext<T = unknown> extends ListShellContext<T> {
  readonly kind: typeof ListContextKind.List;
  readonly items: ListItems;
  readonly tabStopKey: ComputedRef<string | undefined>;
  select(value: T): void;
}

export interface TreeContext<T = unknown> extends ListShellContext<T> {
  readonly kind: typeof ListContextKind.Tree;
  nodeOf(value: T): TreeItemState | undefined;
}

export type ListContext<T = unknown> = ListboxContext<T> | TreeContext<T>;

const LIST_KEY: InjectionKey<ListContext> = Symbol('nui:list');

export const provideList = <T>(context: ListContext<T>): void => {
  provide(LIST_KEY, context);
};

export const useList = (): ListContext | null => inject(LIST_KEY, null);

const LIST_ITEMS_KEY: InjectionKey<ListItems | null> = Symbol('nui:list-items');

export const provideListItems = (items: ListItems | null): void => {
  provide(LIST_ITEMS_KEY, items);
};

export const useListItems = (): ListItems | null => inject(LIST_ITEMS_KEY, null);
