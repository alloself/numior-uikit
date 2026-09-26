import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue';

export interface FormScope {
  readonly disabled: ComputedRef<boolean>;
}

const FORM_SCOPE_KEY: InjectionKey<FormScope> = Symbol('nui:form-scope');

export const provideFormScope = (disabled: () => boolean): void => {
  provide(FORM_SCOPE_KEY, { disabled: computed(disabled) });
};

export const useFormScope = (): FormScope | null => inject(FORM_SCOPE_KEY, null);
