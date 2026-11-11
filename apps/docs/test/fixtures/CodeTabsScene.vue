<template>
  <CodeTabs v-for="(items, index) in groups" :key="index" :items="items" :texts="texts" />
</template>

<script setup lang="ts">
import CodeTabs from '../../.vitepress/theme/parts/CodeTabs.vue';
import type { CodeGroupItem, DocsTexts } from '../../.vitepress/theme/theme.types';

interface Props {
  groups: readonly (readonly CodeGroupItem[])[];
  texts: DocsTexts;
}

const { groups, texts } = defineProps<Props>();
</script>
