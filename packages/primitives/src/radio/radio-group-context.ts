import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';

export interface RadioGroupContext<T = unknown> {
  readonly name: ComputedRef<string>;
  readonly modelValue: Ref<T | undefined>;
  readonly disabled: ComputedRef<boolean>;
  readonly invalid: ComputedRef<boolean>;
  select(value: T): void;
}

export const RADIO_GROUP_KEY: InjectionKey<RadioGroupContext> = Symbol('nui:radio-group');

export function provideRadioGroup<T>(context: RadioGroupContext<T>): void {
  provide(RADIO_GROUP_KEY, context);
}

export function useRadioGroup(): RadioGroupContext | null {
  return inject(RADIO_GROUP_KEY, null);
}
