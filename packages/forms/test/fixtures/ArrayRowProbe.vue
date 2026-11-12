<template>
  <li>
    <input :id="`row-${row.key}`" :value="text(value)" @input="onInput" @blur="onBlur" />
    <span v-if="errorMessage !== undefined" :id="`row-${row.key}-error`">{{ errorMessage }}</span>
  </li>
</template>

<script setup lang="ts">
import { onBeforeUnmount, toRef } from 'vue';
import { useField, type AnyFieldRule, type FieldArrayRow, type FormContext } from '../../src';
import type { Contact, RowProbes, Team } from './scenes.types';

const {
  form,
  row,
  rules = [],
  keepValue = undefined,
  probes,
} = defineProps<{
  form: FormContext<Team>;
  row: FieldArrayRow<Contact>;
  rules?: readonly AnyFieldRule<string | undefined, Team>[] | undefined;
  keepValue?: boolean | undefined;
  probes: RowProbes;
}>();

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const field = useField(
  toRef(() => (values: Team) => values.contacts[row.index]?.name),
  { form, rules, keepValue: () => keepValue },
);

const { value, errorMessage } = field;
const { key } = row;

probes.rows.set(key, field);
onBeforeUnmount(() => probes.rows.delete(key));

const onInput = (event: Event): void => {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  probes.work.set(key, field.setValue(event.target.value));
};

const onBlur = (): void => {
  probes.work.set(key, field.handleBlur());
};
</script>
