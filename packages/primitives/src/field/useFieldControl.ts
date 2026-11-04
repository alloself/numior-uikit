import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useDraftCommit } from './draft-commits';
import { createFieldContext, useFieldContext, type FieldContext } from './field-context';
import { FieldReadonlyAttr } from './field.types';

export interface FieldControlProps {
  readonly id?: string | undefined;
  readonly invalid?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly readonly?: boolean | undefined;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly error?: string | undefined;
}

export interface FieldControlOptions {
  readonly group?: boolean | undefined;
  readonly detached?: boolean | undefined;
  readonly inlineLabel?: boolean | undefined;
  readonly readonlyAttr?: FieldReadonlyAttr | undefined;
  readonly commit?: (() => void) | undefined;
}

export interface FieldFrame {
  readonly field: FieldContext;
  readonly own: boolean;
  readonly label: string | undefined;
  readonly description: string | undefined;
  readonly error: string | undefined;
}

export interface FieldControlAttrs {
  readonly id: string;
  readonly 'aria-describedby': string | undefined;
  readonly 'aria-invalid': 'true' | undefined;
  readonly 'aria-readonly': 'true' | undefined;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
}

export interface FieldControl {
  readonly id: ComputedRef<string>;
  readonly invalid: ComputedRef<boolean>;
  readonly required: ComputedRef<boolean>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly describedBy: ComputedRef<string | undefined>;
  readonly attrs: ComputedRef<FieldControlAttrs>;
  readonly field: ComputedRef<FieldContext | null>;
  readonly own: ComputedRef<boolean>;
  readonly frame: ComputedRef<FieldFrame>;
}

const hasText = (value: string | undefined): boolean => value !== undefined && value !== '';

export const useFieldControl = (
  props: MaybeRefOrGetter<FieldControlProps>,
  options: FieldControlOptions = {},
): FieldControl => {
  const outer = useFieldContext();

  useDraftCommit(options.commit);

  const linked = computed<FieldContext | null>(() =>
    outer !== null && options.detached !== true && (outer.labelable.value || options.group === true)
      ? outer
      : null,
  );

  const ownTexts = computed(() => {
    const { label, description, error } = toValue(props);

    return { label, description, error };
  });

  const ownContext = createFieldContext({
    id: () => toValue(props).id,
    invalid: () => toValue(props).invalid,
    required: () => toValue(props).required,
    disabled: () => toValue(props).disabled,
    readonly: () => toValue(props).readonly,
    hasLabel: () => options.inlineLabel !== true && hasText(ownTexts.value.label),
    hasDescription: () => hasText(ownTexts.value.description),
    hasError: () => hasText(ownTexts.value.error),
    labelable: () => options.group !== true,
  });

  const own = computed(() => linked.value === null && options.detached !== true);

  const field = computed<FieldContext | null>(
    () => linked.value ?? (own.value ? ownContext : null),
  );

  const resolve = (
    explicit: (current: FieldControlProps) => boolean | undefined,
    inherited: (source: FieldContext) => boolean,
  ): ComputedRef<boolean> =>
    computed(() => explicit(toValue(props)) ?? (field.value ? inherited(field.value) : false));

  const id = computed(() => toValue(props).id ?? linked.value?.id.value ?? ownContext.id.value);

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

  const readonly = resolve(
    (current) => current.readonly,
    (source) => source.readonly.value,
  );

  const describedBy = computed(() => field.value?.describedBy.value);
  const readonlyAsAria = options.readonlyAttr === FieldReadonlyAttr.AriaReadonly;

  const attrs = computed<FieldControlAttrs>(() => ({
    id: id.value,
    'aria-describedby': describedBy.value,
    'aria-invalid': invalid.value ? 'true' : undefined,
    'aria-readonly': readonlyAsAria && readonly.value ? 'true' : undefined,
    required: required.value,
    disabled: disabled.value,
    readonly: !readonlyAsAria && readonly.value,
  }));

  const frame = computed<FieldFrame>(() => ({
    field: linked.value ?? ownContext,
    own: own.value,
    ...ownTexts.value,
  }));

  return { id, invalid, required, disabled, readonly, describedBy, attrs, field, own, frame };
};
