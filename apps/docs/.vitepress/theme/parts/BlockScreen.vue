<template>
  <main id="docs-content" class="min-h-dvh bg-surface font-sans text-foreground" tabindex="-1">
    <div ref="stage">
      <Suspense>
        <BlockStage v-if="name" :name="name" :locale="locale" />
      </Suspense>
    </div>
  </main>
  <NuiToaster />
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useData } from 'vitepress';
import { NuiToaster } from '@numior/vue';
import { blockNamed } from '../../blocks';
import { useBlockHeightReport } from '../block-height';
import { exampleLocaleOf } from '../examples';
import BlockStage from './BlockStage.vue';

const { params, localeIndex } = useData();

const stage = useTemplateRef<HTMLElement>('stage');

const locale = computed(() => exampleLocaleOf(localeIndex.value));

const name = computed(() => {
  const value: unknown = params.value?.name;

  return typeof value === 'string' ? blockNamed(value)?.name : undefined;
});

useBlockHeightReport(stage);
</script>
