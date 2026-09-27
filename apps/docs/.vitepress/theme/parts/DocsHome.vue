<template>
  <div class="nui-max-w-5xl nui-mx-auto nui-px-6 nui-py-8 nui-flex nui-flex-col nui-gap-8">
    <section class="nui-grid-auto nui-grid-auto-lg nui-gap-8 nui-items-center">
      <div class="nui-flex nui-flex-col nui-gap-5">
        <h1 class="nui-m-0 nui-text-4xl nui-font-bold nui-tracking-tight nui-leading-tight">
          {{ home.title }}
        </h1>
        <p class="nui-m-0 nui-text-lg nui-text-muted">{{ home.tagline }}</p>
        <div class="nui-flex nui-wrap nui-gap-3">
          <NuiButton
            v-for="action in home.actions"
            :key="action.link"
            :href="withBase(action.link)"
            :variant="action.primary ? 'solid' : 'outline'"
            :tone="action.primary ? 'primary' : 'neutral'"
            size="lg"
            >{{ action.text }}</NuiButton
          >
        </div>
        <NuiCode :code="home.install" :copy-label="texts.copyCode" :copied-label="texts.copied" />
      </div>
      <DocsHomeMosaic :content="home.mosaic" />
    </section>
    <section class="nui-grid-auto nui-grid-auto-sm nui-gap-6" :aria-label="texts.facts">
      <div class="nui-flex nui-flex-col nui-gap-1">
        <p class="nui-m-0 nui-text-2xl nui-font-semibold nui-tracking-tight">
          {{ componentCount }}
        </p>
        <p class="nui-m-0 nui-text-sm nui-text-muted">{{ home.componentsFact }}</p>
      </div>
      <div v-for="fact in home.facts" :key="fact.title" class="nui-flex nui-flex-col nui-gap-1">
        <p class="nui-m-0 nui-text-2xl nui-font-semibold nui-tracking-tight">{{ fact.title }}</p>
        <p class="nui-m-0 nui-text-sm nui-text-muted">{{ fact.details }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import { NuiButton, NuiCode } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import { homeOf } from '../home-content';
import DocsHomeMosaic from './DocsHomeMosaic.vue';

const { localeIndex } = useData();
const { texts, sectionItems } = useDocs();

const home = computed(() => homeOf(localeIndex.value));
const componentCount = computed(() => sectionItems(home.value.componentsSection).length);
</script>
