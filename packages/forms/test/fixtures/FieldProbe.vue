<template>
  <label class="probe">
    <input :id="spec.path" ref="input" :value="display(value)" @input="onInput" @blur="onBlur" />
    <span v-if="errorMessage !== undefined" :id="`${spec.path}-error`">{{ errorMessage }}</span>
  </label>
</template>

<script setup lang="ts" generic="V extends object">
import { onBeforeUnmount, useTemplateRef } from 'vue';
import { byPath, useField, type FormContext } from '../../src';
import type { FieldProbes, FieldSpec } from './scenes.types';

const { form, spec, active, disabled, probes } = defineProps<{
  form: FormContext<V>;
  spec: FieldSpec;
  active: boolean;
  disabled: boolean;
  probes: FieldProbes;
}>();

const display = (value: unknown): string => (typeof value === 'string' ? value : '');

const element = useTemplateRef<HTMLInputElement>('input');
const { path, ...options } = spec;

const field = useField(byPath(path), {
  ...options,
  form,
  element,
  active: () => active,
  disabled: () => disabled,
});

const { value, errorMessage } = field;

probes.fields.set(path, field);
onBeforeUnmount(() => probes.fields.delete(path));

const onInput = (event: Event): void => {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  probes.work.set(path, field.setValue(event.target.value));
};

const onBlur = (): void => {
  probes.work.set(path, field.handleBlur());
};
</script>
