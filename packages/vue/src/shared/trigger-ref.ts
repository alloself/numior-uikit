import { shallowRef, type ComponentPublicInstance, type ShallowRef } from 'vue';

export type NuiTriggerRef = (value: Element | ComponentPublicInstance | null) => void;

export interface TriggerElement {
  readonly trigger: ShallowRef<HTMLElement | null>;
  readonly setTrigger: NuiTriggerRef;
}

export const useTriggerElement = (): TriggerElement => {
  const trigger = shallowRef<HTMLElement | null>(null);

  const setTrigger: NuiTriggerRef = (value) => {
    const candidate: unknown = value instanceof Element ? value : value?.$el;
    trigger.value = candidate instanceof HTMLElement ? candidate : null;
  };

  return { trigger, setTrigger };
};
