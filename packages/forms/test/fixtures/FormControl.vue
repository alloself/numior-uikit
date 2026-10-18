<template>
  <NuiSelect
    v-if="control === 'select'"
    :name="name"
    :model-value="textOf(value) ?? null"
    :options="PLANS"
    @update:model-value="change"
  />
  <NuiCheckbox
    v-else-if="control === 'checkbox'"
    :name="name"
    :model-value="value === true"
    @update:model-value="change"
  />
  <NuiNumberField
    v-else-if="control === 'number'"
    :name="name"
    :model-value="numberOf(value)"
    @update:model-value="change"
  />
  <NuiInput v-else :name="name" :model-value="textOf(value) ?? ''" @update:model-value="change" />
</template>

<script setup lang="ts">
import {
  NuiCheckbox,
  NuiInput,
  NuiNumberField,
  NuiSelect,
  type NuiOptionSource,
} from '@numior/vue';
import type { FormFieldConfig } from './scenes.types';

const { control, name, value, change } = defineProps<{
  control: FormFieldConfig['control'];
  name: string;
  value: unknown;
  change: (value: unknown) => void;
}>();

const PLANS: NuiOptionSource = [
  { value: 'free', label: 'Free' },
  { value: 'team', label: 'Team' },
];

const textOf = (current: unknown): string | undefined =>
  typeof current === 'string' ? current : undefined;

const numberOf = (current: unknown): number | null =>
  typeof current === 'number' ? current : null;
</script>
