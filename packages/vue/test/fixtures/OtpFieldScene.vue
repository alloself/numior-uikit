<template>
  <OptionalField :field="field">
    <NuiOtpField ref="control" v-bind="{ ...props, ...attrs }" v-model="model" @complete="record">
      <template v-if="separator !== undefined" #separator>{{ separator }}</template>
    </NuiOtpField>
  </OptionalField>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { NuiOtpField, type NuiFieldProps, type NuiOtpFieldProps } from '../../src';
import OptionalField from './OptionalField.vue';

const {
  props = {},
  initialValue = '',
  attrs = {},
  field = undefined,
  separator = undefined,
} = defineProps<{
  props?: NuiOtpFieldProps | undefined;
  initialValue?: string | undefined;
  attrs?: Record<string, unknown> | undefined;
  field?: NuiFieldProps | undefined;
  separator?: string | undefined;
}>();

const model = ref(initialValue);
const completions: string[] = [];
const control = useTemplateRef('control');

const record = (code: string): void => {
  completions.push(code);
};

const focusControl = (): void => {
  control.value?.focus();
};

defineExpose({ model, completions, focusControl });
</script>
