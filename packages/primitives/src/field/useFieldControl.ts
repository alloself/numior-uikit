import { computed, type ComputedRef } from 'vue';
import { useControlId } from '../id/useControlId';
import { useField } from './field-context';

export interface FieldControlProps {
  readonly id?: string | undefined;
  readonly invalid?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
}

export interface FieldControlOptions {
  /** The control is itself the labelled group root (radiogroup), so it adopts group fields too. */
  readonly group?: boolean | undefined;
}

/** Attributes for the native control; Vue drops the undefined ones. */
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

/**
 * Resolve a control's id and validation state: explicit props win, then the surrounding
 * field, then defaults. A plain control ignores a group field (fieldset/legend) so that
 * several controls under one legend never share an id.
 */
export function useFieldControl(
  props: FieldControlProps,
  options: FieldControlOptions = {},
): FieldControl {
  const field = useField();
  const linked = computed(() =>
    field !== null && (field.labelable.value || options.group === true) ? field : null,
  );
  const resolve = (
    explicit: () => boolean | undefined,
    inherited: (field: NonNullable<typeof linked.value>) => boolean,
  ): ComputedRef<boolean> =>
    computed(() => explicit() ?? (linked.value ? inherited(linked.value) : false));

  const id = useControlId(() => props.id ?? linked.value?.id.value);
  const invalid = resolve(
    () => props.invalid,
    (source) => source.invalid.value,
  );
  const required = resolve(
    () => props.required,
    (source) => source.required.value,
  );
  const disabled = resolve(
    () => props.disabled,
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
