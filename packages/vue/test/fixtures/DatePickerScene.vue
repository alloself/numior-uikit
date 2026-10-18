<template>
  <div>
    <OptionalField :field="field">
      <NuiDatePicker v-bind="picker" v-model="model" />
    </OptionalField>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { NuiDatePicker, type NuiDatePickerProps, type NuiFieldProps } from '../../src';
import OptionalField from './OptionalField.vue';

const { picker, field } = defineProps<{
  picker: NuiDatePickerProps;
  field?: NuiFieldProps | undefined;
}>();

const model = defineModel<string | null>({ required: true });

defineExpose({ model });
</script>
