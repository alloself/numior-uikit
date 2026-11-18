<template>
  <Suspense>
    <ThemeStepView :theme="theme" :locale="locale" :texts="texts" />
  </Suspense>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useDocs } from '../composables/use-docs';
import { exampleLocaleOf } from '../examples';
import type { ThemeStepProps } from '../theme.types';
import ThemeStepView from './ThemeStepView.vue';

const { theme } = defineProps<ThemeStepProps>();

const { localeIndex } = useData();
const { texts } = useDocs();

const locale = computed(() => exampleLocaleOf(localeIndex.value));
</script>
