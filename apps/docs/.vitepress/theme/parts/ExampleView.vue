<template>
  <ExampleFrame :component="example.component" :files="example.files" :texts="texts" />
</template>

<script setup lang="ts">
import { loadExample } from '../examples';
import type { ExampleViewProps } from '../theme.types';
import ExampleFrame from './ExampleFrame.vue';

const { name, locale, texts } = defineProps<ExampleViewProps>();

const example = await loadExample(locale, name);
</script>
