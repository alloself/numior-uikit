<template>
  <CodeTabs :items="items" :texts="texts" />
</template>

<script setup lang="ts">
import { useDocs } from '../composables/use-docs';
import type { DocsCodeGroupProps } from '../theme.types';
import CodeTabs from './CodeTabs.vue';

const { items } = defineProps<DocsCodeGroupProps>();

const { texts } = useDocs();
</script>
