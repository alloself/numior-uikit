<template>
  <main id="docs-content" class="min-h-dvh bg-surface font-sans text-foreground" tabindex="-1">
    <Suspense>
      <BlockStage v-if="name" :name="name" :locale="locale" />
    </Suspense>
  </main>
  <NuiToaster />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { NuiToaster } from '@numior/vue';
import { blockNamed } from '../../blocks';
import { exampleLocaleOf } from '../examples';
import BlockStage from './BlockStage.vue';

const { params, localeIndex } = useData();

const locale = computed(() => exampleLocaleOf(localeIndex.value));

const name = computed(() => {
  const value: unknown = params.value?.name;

  return typeof value === 'string' ? blockNamed(value)?.name : undefined;
});
</script>
