import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import type { NuiSize } from '../shared/scale.types';
import type { NuiListSelectable, NuiListVariant } from './list.types';

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

export interface ListboxContext<T = unknown> extends ListShellContext<T> {
  readonly kind: 'list';
  readonly tabStopKey: ComputedRef<string | undefined>;
  select(value: T): void;
}

export interface TreeContext<T = unknown> extends ListShellContext<T> {
  readonly kind: 'tree';
  nodeOf(value: T): TreeItemState | undefined;
}

export type ListContext<T = unknown> = ListboxContext<T> | TreeContext<T>;

const LIST_KEY: InjectionKey<ListContext> = Symbol('nui:list');

export const provideList = <T>(context: ListContext<T>): void => {
  provide(LIST_KEY, context);
};

export const useList = (): ListContext | null => inject(LIST_KEY, null);
