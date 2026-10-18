<template>
  <NuiAccordion v-bind="accordion" v-model="model" v-model:values="values">
    <NuiAccordionItem v-for="section in SECTIONS" :key="section.value" v-bind="section">
      {{ section.label }} body
    </NuiAccordionItem>
  </NuiAccordion>
</template>

<script setup lang="ts">
import { NuiAccordion, NuiAccordionItem, type NuiAccordionProps } from '../../src';

const { accordion = {} } = defineProps<{ accordion?: NuiAccordionProps | undefined }>();

const model = defineModel<string | null>({ required: true });

const values = defineModel<string[]>('values', { required: true });

const SECTIONS = [
  { value: 'install', label: 'Install' },
  { value: 'usage', label: 'Usage' },
  { value: 'api', label: 'API', disabled: true },
  { value: 'faq', label: 'FAQ' },
];

defineExpose({ model, values });
</script>
