<template>
  <NuiField
    ref="field"
    :id="id"
    :label="label"
    :description="description"
    :error="control.errorMessage.value"
    :required="required"
    :disabled="isDisabled"
    :group="group"
    @focusout="onFocusout"
  >
    <template v-if="$slots.label" #label>
      <slot name="label" />
    </template>
    <slot v-bind="scope" />
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
  </NuiField>
</template>

<script setup lang="ts" generic="T extends object = object, P extends FormPath<T> = FormPath<T>">
import { computed, useTemplateRef } from 'vue';
import { provideDraftCommits } from '@numior/primitives';
import { NuiField } from '@numior/vue';
import type { FormPath } from '../../core/types';
import { useField } from '../../field/use-field';
import { useFormScope } from '../form/form-scope';
import { focusControl } from './focus-control';
import type { NuiFormFieldProps, NuiFormFieldValue } from './form-field.types';

const {
  name,
  form,
  id,
  label,
  description,
  required = undefined,
  disabled = undefined,
  group = false,
  keepValue = undefined,
  rules,
  validateOn,
  debounce,
} = defineProps<NuiFormFieldProps<T, P>>();

const fieldRef = useTemplateRef<InstanceType<typeof NuiField>>('field');
const formScope = useFormScope();
const drafts = provideDraftCommits();

const root = (): HTMLElement | null => {
  const element: unknown = fieldRef.value?.$el;
  return element instanceof HTMLElement ? element : null;
};

const isDisabled = computed(() => disabled ?? formScope?.disabled.value ?? false);

const control = useField<NuiFormFieldValue<T, P>>(() => name, {
  form,
  rules: () => rules,
  validateOn: () => validateOn,
  debounce: () => debounce,
  keepValue: () => keepValue,
  label: () => label,
  element: root,
  focus: () => focusControl(root()),
  flush: () => drafts.commitAll(),
  disabled: () => isDisabled.value,
});

const scope = computed(() => ({
  field: {
    name,
    modelValue: control.value.value,
    'onUpdate:modelValue': control.binding['onUpdate:modelValue'],
  },
  value: control.value.value,
  setValue: control.binding['onUpdate:modelValue'],
  error: control.errorMessage.value,
  invalid: control.errors.value.length > 0,
  touched: control.meta.touched,
  pending: control.meta.pending,
}));

const within = (node: unknown): boolean => node instanceof Node && root()?.contains(node) === true;

const onFocusout = (event: FocusEvent): void => {
  if (within(event.relatedTarget)) {
    return;
  }
  if (event.relatedTarget !== null) {
    void control.handleBlur();
    return;
  }

  queueMicrotask(() => {
    if (!within(document.activeElement)) {
      void control.handleBlur();
    }
  });
};
</script>
