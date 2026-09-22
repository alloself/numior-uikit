import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';

export interface RadioGroupContext<T = unknown> {
  /** Shared native name: it is what gives radios arrow-key navigation for free. */
  readonly name: ComputedRef<string>;
  readonly modelValue: Ref<T | undefined>;
  readonly disabled: ComputedRef<boolean>;
  readonly invalid: ComputedRef<boolean>;
  select(value: T): void;
}

export const RADIO_GROUP_KEY: InjectionKey<RadioGroupContext> = Symbol('nui:radio-group');

export function provideRadioGroup<T>(context: RadioGroupContext<T>): void {
  provide(RADIO_GROUP_KEY, context as RadioGroupContext);
}

export function useRadioGroup<T = unknown>(): RadioGroupContext<T> | null {
  return inject(RADIO_GROUP_KEY, null) as RadioGroupContext<T> | null;
}
