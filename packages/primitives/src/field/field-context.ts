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
  readonly id: ComputedRef<string>;
  readonly labelId: ComputedRef<string>;
  readonly labelledBy: ComputedRef<string | undefined>;
  readonly descriptionId: ComputedRef<string>;
  readonly errorId: ComputedRef<string>;
  readonly describedBy: ComputedRef<string | undefined>;
  readonly invalid: ComputedRef<boolean>;
  readonly required: ComputedRef<boolean>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly labelable: ComputedRef<boolean>;
}

export interface FieldOptions {
  id?: MaybeRefOrGetter<string | undefined>;
  invalid?: MaybeRefOrGetter<boolean | undefined>;
  required?: MaybeRefOrGetter<boolean | undefined>;
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly?: MaybeRefOrGetter<boolean | undefined>;
  hasLabel?: MaybeRefOrGetter<boolean | undefined>;
  hasDescription?: MaybeRefOrGetter<boolean | undefined>;
  hasError?: MaybeRefOrGetter<boolean | undefined>;
  labelable?: MaybeRefOrGetter<boolean | undefined>;
}

export const FIELD_KEY: InjectionKey<FieldContext> = Symbol('nui:field');

const flag = (source: MaybeRefOrGetter<boolean | undefined>): ComputedRef<boolean> =>
  computed(() => toValue(source) === true);

export const createFieldContext = (options: FieldOptions = {}): FieldContext => {
  const id = useControlId(options.id);
  const hasLabel = flag(options.hasLabel);
  const hasDescription = flag(options.hasDescription);
  const hasError = flag(options.hasError);
  const labelId = computed(() => `${id.value}-label`);
  const descriptionId = computed(() => `${id.value}-description`);
  const errorId = computed(() => `${id.value}-error`);
  return {
    id,
    labelId,
    labelledBy: computed(() => (hasLabel.value ? labelId.value : undefined)),
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
    readonly: flag(options.readonly),
    labelable: computed(() => toValue(options.labelable) !== false),
  };
};

export const provideField = (options: FieldOptions = {}): FieldContext => {
  const context = createFieldContext(options);
  provide(FIELD_KEY, context);
  return context;
};

export const useFieldContext = (): FieldContext | null => {
  return inject(FIELD_KEY, null);
};
