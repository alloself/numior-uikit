import { inject, provide, type InjectionKey } from 'vue';
import type { ElementRef } from '@numior/primitives';

const TRIGGER_KEY: InjectionKey<ElementRef | null> = Symbol('nui:collapsible-trigger');

export const provideCollapsibleTrigger = (register: ElementRef | null): void => {
  provide(TRIGGER_KEY, register);
};

export const useCollapsibleTrigger = (): ElementRef | undefined =>
  inject(TRIGGER_KEY, null) ?? undefined;
