<template>
  <Suspense>
    <ThemeBuilderView :locale="locale" :texts="texts" />
  </Suspense>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useDocs } from '../composables/use-docs';
import { exampleLocaleOf } from '../examples';
import ThemeBuilderView from './ThemeBuilderView.vue';

const { localeIndex } = useData();
const { texts } = useDocs();

const locale = computed(() => exampleLocaleOf(localeIndex.value));
</script>
