<template>
  <div :dir="dir">
    <OptionalField :field="field">
      <NuiTimeField v-bind="props" v-model="model" />
    </OptionalField>
    <button type="button" class="outside">Outside</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTimeField, type NuiFieldProps, type NuiTimeFieldProps } from '../../src';
import OptionalField from './OptionalField.vue';

const {
  props = {},
  initialValue = null,
  field = undefined,
  dir = undefined,
} = defineProps<{
  props?: NuiTimeFieldProps | undefined;
  initialValue?: string | null | undefined;
  field?: NuiFieldProps | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
}>();

const model = ref(initialValue);

defineExpose({ model });
</script>
