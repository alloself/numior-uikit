import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';

export interface CheckboxGroupContext {
  readonly name: ComputedRef<string | undefined>;
  readonly disabled: ComputedRef<boolean>;
  readonly invalid: ComputedRef<boolean>;
}

const CHECKBOX_GROUP_KEY: InjectionKey<CheckboxGroupContext> = Symbol('nui:checkbox-group');

export const provideCheckboxGroup = (context: CheckboxGroupContext): void => {
  provide(CHECKBOX_GROUP_KEY, context);
};

export const useCheckboxGroup = (): CheckboxGroupContext | null => inject(CHECKBOX_GROUP_KEY, null);
