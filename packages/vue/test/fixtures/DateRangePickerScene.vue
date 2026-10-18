<template>
  <div>
    <OptionalField :field="field">
      <NuiDateRangePicker v-bind="picker" v-model="model" />
    </OptionalField>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import {
  NuiDateRangePicker,
  type NuiDateRange,
  type NuiDateRangePickerProps,
  type NuiFieldProps,
} from '../../src';
import OptionalField from './OptionalField.vue';

const { picker, field } = defineProps<{
  picker: NuiDateRangePickerProps;
  field?: NuiFieldProps | undefined;
}>();

const model = defineModel<NuiDateRange>({ required: true });

defineExpose({ model });
</script>
