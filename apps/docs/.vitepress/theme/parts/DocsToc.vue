<template>
  <div class="p-6 pt-8">
    <DocsCaption class="mb-2">{{ texts.onThisPage }}</DocsCaption>
    <NuiToc :items="items" title="" :label="texts.onThisPage" marker="square" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { NuiToc } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import DocsCaption from './DocsCaption.vue';
import { tocItemsOf } from '../toc-items';

const { page } = useData();
const { texts } = useDocs();

const items = computed(() => tocItemsOf(page.value.headers));
</script>
