<template>
  <div class="nui-p-6 nui-pt-8">
    <NuiToc :items="items" :title="texts.onThisPage" :label="texts.onThisPage" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { NuiToc } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import { tocItemsOf } from '../toc-items';

const { page } = useData();
const { texts } = useDocs();

const items = computed(() => tocItemsOf(page.value.headers));
</script>
