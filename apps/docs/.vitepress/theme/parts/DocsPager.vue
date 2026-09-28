<template>
  <nav v-if="pager.previous || pager.next" :aria-label="texts.pager" class="grid-auto gap-4 mt-8">
    <NuiCard
      v-if="pager.previous"
      :href="withBase(pager.previous.link)"
      :title="pager.previous.text"
      :description="texts.previous"
      padding="sm"
    />
    <span v-else></span>
    <NuiCard
      v-if="pager.next"
      :href="withBase(pager.next.link)"
      :title="pager.next.text"
      :description="texts.next"
      padding="sm"
      class="text-end"
    />
  </nav>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import { NuiCard } from '@numior/vue';
import { useDocs } from '../composables/use-docs';

const { texts, pager } = useDocs();
</script>
