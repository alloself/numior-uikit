<template>
  <ThemeBuilder :preview="example.component" :texts="texts" />
</template>

<script setup lang="ts">
import { loadExample } from '../examples';
import type { ThemeBuilderViewProps } from '../theme.types';
import ThemeBuilder from './ThemeBuilder.vue';

const { locale, texts } = defineProps<ThemeBuilderViewProps>();

const example = await loadExample(locale, 'theme/Preview');
</script>
