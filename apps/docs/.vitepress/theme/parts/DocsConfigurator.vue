<template>
  <Suspense>
    <ConfiguratorView :name="name" :locale="locale" :texts="texts" />
  </Suspense>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { useDocs } from '../composables/use-docs';
import { exampleLocaleOf } from '../examples';
import type { DocsConfiguratorProps } from '../theme.types';
import ConfiguratorView from './ConfiguratorView.vue';

const { name } = defineProps<DocsConfiguratorProps>();

const { localeIndex } = useData();
const { texts } = useDocs();

const locale = computed(() => exampleLocaleOf(localeIndex.value));
</script>
