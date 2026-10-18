<template>
  <div>
    <OptionalField :field="field">
      <NuiCombobox
        v-bind="combobox"
        v-model="model"
        v-model:values="values"
        @search="searches.push($event)"
      />
    </OptionalField>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { NuiCombobox, type NuiComboboxProps, type NuiFieldProps } from '../../src';
import OptionalField from './OptionalField.vue';

const { combobox, field } = defineProps<{
  combobox: NuiComboboxProps<unknown>;
  field?: NuiFieldProps | undefined;
}>();

const model = defineModel<unknown>({ required: true });

const values = defineModel<unknown[]>('values', { required: true });

const searches: string[] = [];

defineExpose({ model, values, searches });
</script>
