<template>
  <NuiField v-bind="field">
    <NuiInput v-bind="control" />
    <template v-if="slots.label !== undefined" #label>{{ slots.label }}</template>
    <template v-if="slots.description !== undefined" #description>
      <em>{{ slots.description }}</em>
    </template>
    <template v-if="slots.error !== undefined" #error>{{ slots.error }}</template>
  </NuiField>
</template>

<script setup lang="ts">
import { NuiField, NuiInput, type NuiFieldProps, type NuiInputProps } from '../../src';
import type { FieldSlotTexts } from '../drivers/field';

const {
  field,
  control = {},
  slots = {},
} = defineProps<{
  field: NuiFieldProps;
  control?: NuiInputProps | undefined;
  slots?: FieldSlotTexts | undefined;
}>();
</script>
