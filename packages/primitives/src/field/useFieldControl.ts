import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useControlId } from '../id/useControlId';
import { useField, type FieldContext } from './field-context';

export interface FieldControlProps {
  readonly id?: string | undefined;
  readonly invalid?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
}

export interface FieldControlOptions {
  readonly group?: boolean | undefined;
}

export interface FieldControlAttrs {
  readonly id: string;
  readonly 'aria-describedby': string | undefined;
  readonly 'aria-invalid': 'true' | undefined;
  readonly required: boolean;
  readonly disabled: boolean;
}

export interface FieldControl {
  readonly id: ComputedRef<string>;
  readonly invalid: ComputedRef<boolean>;
  readonly required: ComputedRef<boolean>;
  readonly disabled: ComputedRef<boolean>;
  readonly describedBy: ComputedRef<string | undefined>;
  readonly attrs: ComputedRef<FieldControlAttrs>;
}

export function useFieldControl(
  props: MaybeRefOrGetter<FieldControlProps>,
  options: FieldControlOptions = {},
): FieldControl {
  const field = useField();
  const linked = computed<FieldContext | null>(() =>
    field !== null && (field.labelable.value || options.group === true) ? field : null,
  );
  const resolve = (
    explicit: (current: FieldControlProps) => boolean | undefined,
    inherited: (source: FieldContext) => boolean,
  ): ComputedRef<boolean> =>
    computed(() => explicit(toValue(props)) ?? (linked.value ? inherited(linked.value) : false));

  const id = useControlId(() => toValue(props).id ?? linked.value?.id.value);
  const invalid = resolve(
    (current) => current.invalid,
    (source) => source.invalid.value,
  );
  const required = resolve(
    (current) => current.required,
    (source) => source.required.value,
  );
  const disabled = resolve(
    (current) => current.disabled,
    (source) => source.disabled.value,
  );
  const describedBy = computed(() => linked.value?.describedBy.value);
  const attrs = computed<FieldControlAttrs>(() => ({
    id: id.value,
    'aria-describedby': describedBy.value,
    'aria-invalid': invalid.value ? 'true' : undefined,
    required: required.value,
    disabled: disabled.value,
  }));
  return { id, invalid, required, disabled, describedBy, attrs };
}
