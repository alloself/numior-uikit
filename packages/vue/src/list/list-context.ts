import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import type { NuiSize } from '../shared/types';
import type { NuiListSelectable, NuiListVariant } from './list.types';

export interface ListContext<T = unknown> {
  readonly selectable: ComputedRef<NuiListSelectable | undefined>;
  readonly variant: ComputedRef<NuiListVariant>;
  readonly size: ComputedRef<NuiSize>;
  readonly tabStopKey: ComputedRef<string | undefined>;
  readonly activeId: ComputedRef<string | undefined>;
  keyOf(value: T): string;
  isSelected(value: T): boolean;
  select(value: T): void;
}

const LIST_KEY: InjectionKey<ListContext> = Symbol('nui:list');

export const provideList = <T>(context: ListContext<T>): void => {
  provide(LIST_KEY, context);
};

export const useList = (): ListContext | null => inject(LIST_KEY, null);
