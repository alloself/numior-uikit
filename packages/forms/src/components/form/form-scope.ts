import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue';

export interface FormScope {
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly reserveError: ComputedRef<boolean>;
}

export interface FormScopeOptions {
  readonly disabled: () => boolean;
  readonly readonly: () => boolean;
  readonly reserveError: () => boolean;
}

const FORM_SCOPE_KEY: InjectionKey<FormScope> = Symbol('nui:form-scope');

export const provideFormScope = (options: FormScopeOptions): void => {
  provide(FORM_SCOPE_KEY, {
    disabled: computed(options.disabled),
    readonly: computed(options.readonly),
    reserveError: computed(options.reserveError),
  });
};

export const useFormScope = (): FormScope | null => inject(FORM_SCOPE_KEY, null);
