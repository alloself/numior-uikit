<template>
  <OptionalField :field="field">
    <NuiRadioGroup v-bind="props" :model-value="modelValue">
      <NuiRadio
        v-for="value in values"
        :key="value"
        :value="value"
        :disabled="disabledValues.includes(value) || undefined"
      >
        {{ value }}
      </NuiRadio>
    </NuiRadioGroup>
  </OptionalField>
</template>

<script setup lang="ts">
import { NuiRadio, NuiRadioGroup, type NuiFieldProps, type NuiRadioGroupProps } from '../../src';
import OptionalField from './OptionalField.vue';

const {
  props = {},
  modelValue = undefined,
  values = ['a', 'b', 'c'],
  field = undefined,
  disabledValues = [],
} = defineProps<{
  props?: NuiRadioGroupProps<string> | undefined;
  modelValue?: string | undefined;
  values?: readonly string[] | undefined;
  field?: NuiFieldProps | undefined;
  disabledValues?: readonly string[] | undefined;
}>();
</script>
