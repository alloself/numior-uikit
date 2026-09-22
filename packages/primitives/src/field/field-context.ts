import {
  computed,
  inject,
  provide,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue';
import { useControlId } from '../id/useControlId';

export interface FieldContext {
  /** Id of the labelled control; label, description and error ids derive from it. */
  readonly id: ComputedRef<string>;
  readonly labelId: ComputedRef<string>;
  readonly descriptionId: ComputedRef<string>;
  readonly errorId: ComputedRef<string>;
  /** Space-separated ids for aria-describedby, undefined when nothing describes the control. */
  readonly describedBy: ComputedRef<string | undefined>;
  readonly invalid: ComputedRef<boolean>;
  readonly required: ComputedRef<boolean>;
  readonly disabled: ComputedRef<boolean>;
  /** False when the field labels a group (fieldset/legend) instead of one labelable control. */
  readonly labelable: ComputedRef<boolean>;
}

export interface FieldOptions {
  id?: MaybeRefOrGetter<string | undefined>;
  invalid?: MaybeRefOrGetter<boolean | undefined>;
  required?: MaybeRefOrGetter<boolean | undefined>;
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  hasDescription?: MaybeRefOrGetter<boolean | undefined>;
  hasError?: MaybeRefOrGetter<boolean | undefined>;
  labelable?: MaybeRefOrGetter<boolean | undefined>;
}

export const FIELD_KEY: InjectionKey<FieldContext> = Symbol('nui:field');

const flag = (source: MaybeRefOrGetter<boolean | undefined>): ComputedRef<boolean> =>
  computed(() => toValue(source) === true);

/**
 * Build a field context from static or reactive options. The described-by list is
 * decided here, from what the field renders, so server and client markup agree.
 */
export function createFieldContext(options: FieldOptions = {}): FieldContext {
  const id = useControlId(options.id);
  const hasDescription = flag(options.hasDescription);
  const hasError = flag(options.hasError);
  const descriptionId = computed(() => `${id.value}-description`);
  const errorId = computed(() => `${id.value}-error`);
  return {
    id,
    labelId: computed(() => `${id.value}-label`),
    descriptionId,
    errorId,
    describedBy: computed(() => {
      const ids = [
        ...(hasDescription.value ? [descriptionId.value] : []),
        ...(hasError.value ? [errorId.value] : []),
      ];
      return ids.length > 0 ? ids.join(' ') : undefined;
    }),
    invalid: computed(() => toValue(options.invalid) === true || hasError.value),
    required: flag(options.required),
    disabled: flag(options.disabled),
    labelable: computed(() => toValue(options.labelable) !== false),
  };
}

export function provideField(options: FieldOptions = {}): FieldContext {
  const context = createFieldContext(options);
  provide(FIELD_KEY, context);
  return context;
}

export function useField(): FieldContext | null {
  return inject(FIELD_KEY, null);
}
