<template>
  <div
    id="docs-content"
    class="mx-auto flex max-w-[120rem] flex-col gap-16 px-6 py-16"
    tabindex="-1"
  >
    <section
      class="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center"
      :aria-labelledby="`${sectionId}-title`"
    >
      <h1 :id="`${sectionId}-title`" class="m-0 text-4xl leading-tight font-bold tracking-tight">
        {{ home.title }}
      </h1>
      <p class="m-0 max-w-prose text-lg text-muted-foreground">{{ home.tagline }}</p>
      <div class="flex flex-wrap justify-center gap-3">
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
      <NuiCode
        class="w-full max-w-md text-start"
        :code="home.install"
        :copy-label="texts.copyCode"
        :copied-label="texts.copied"
      />
    </section>
    <Suspense>
      <HomeScreenView :name="home.screen" :locale="locale" :texts="texts" />
    </Suspense>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { useData, withBase } from 'vitepress';
import { NuiButton, NuiCode } from '@numior/vue';
import { useDocs } from '../composables/use-docs';
import { exampleLocaleOf } from '../examples';
import { homeOf } from '../home-content';
import HomeScreenView from './HomeScreenView.vue';

const { localeIndex } = useData();
const { texts } = useDocs();

const sectionId = useId();

const home = computed(() => homeOf(localeIndex.value));
const locale = computed(() => exampleLocaleOf(localeIndex.value));
</script>
