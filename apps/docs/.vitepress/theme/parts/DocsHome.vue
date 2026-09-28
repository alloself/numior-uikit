<template>
  <div id="docs-content" class="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16" tabindex="-1">
    <section class="grid-auto-lg items-start gap-12">
      <div class="flex flex-col gap-6 pt-2">
        <h1 class="m-0 text-4xl leading-tight font-bold tracking-tight">{{ home.title }}</h1>
        <p class="m-0 max-w-prose text-lg text-muted-foreground">{{ home.tagline }}</p>
        <div class="flex flex-wrap gap-3">
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
    <section class="grid-auto-sm gap-8 border-t pt-10" :aria-label="texts.facts">
      <div class="flex flex-col gap-1">
        <p class="m-0 text-2xl font-semibold tracking-tight">{{ componentCount }}</p>
        <p class="m-0 text-sm text-muted-foreground">{{ home.componentsFact }}</p>
      </div>
      <div v-for="fact in home.facts" :key="fact.title" class="flex flex-col gap-1">
        <p class="m-0 text-2xl font-semibold tracking-tight">{{ fact.title }}</p>
        <p class="m-0 text-sm text-muted-foreground">{{ fact.details }}</p>
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
