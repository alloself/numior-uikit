import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';

export interface RadioGroupContext<T = unknown> {
  readonly name: ComputedRef<string>;
  readonly modelValue: Ref<T | undefined>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly invalid: ComputedRef<boolean>;
  select(value: T): void;
}

export const RADIO_GROUP_KEY: InjectionKey<RadioGroupContext> = Symbol('nui:radio-group');

export const provideRadioGroup = <T>(context: RadioGroupContext<T>): void => {
  provide(RADIO_GROUP_KEY, context);
};

export const useRadioGroup = (): RadioGroupContext | null => {
  return inject(RADIO_GROUP_KEY, null);
};
