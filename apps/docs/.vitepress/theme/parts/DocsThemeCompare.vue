<template>
  <Suspense>
    <ThemeCompareView :name="name" :locale="locale" :texts="texts" />
  </Suspense>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useDocs } from '../composables/use-docs';
import { exampleLocaleOf } from '../examples';
import type { DocsExampleProps } from '../theme.types';
import ThemeCompareView from './ThemeCompareView.vue';

const { name } = defineProps<DocsExampleProps>();

const { localeIndex } = useData();
const { texts } = useDocs();

const locale = computed(() => exampleLocaleOf(localeIndex.value));
</script>
