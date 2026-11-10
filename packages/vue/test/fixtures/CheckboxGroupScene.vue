<template>
  <OptionalField :field="field">
    <NuiCheckboxGroup v-bind="group" v-model:values="model" :options="options" />
  </OptionalField>
</template>

<script setup lang="ts">
import { NuiCheckboxGroup, type NuiCheckboxGroupProps, type NuiFieldProps } from '../../src';
import OptionalField from './OptionalField.vue';

const {
  group = {},
  options,
  field,
} = defineProps<{
  group?: Omit<NuiCheckboxGroupProps<string>, 'options'> | undefined;
  options: NuiCheckboxGroupProps<string>['options'];
  field?: NuiFieldProps | undefined;
}>();

const model = defineModel<string[]>({ required: true });

defineExpose({ model });
</script>
