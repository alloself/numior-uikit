<template>
  <div id="docs-content" class="mx-auto flex max-w-6xl flex-col gap-20 px-6 py-16" tabindex="-1">
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
    <HomeScreen :src="withBase(blockRouteOf(home.screen, locale))" :texts="texts" />
    <section
      v-for="(section, index) in home.sections"
      :key="section.block"
      class="flex flex-col gap-2"
      :aria-labelledby="`${sectionId}-${index}`"
    >
      <DocsCaption>{{ section.label }}</DocsCaption>
      <h2 :id="`${sectionId}-${index}`" class="m-0 text-2xl font-semibold tracking-tight">
        {{ section.title }}
      </h2>
      <p class="m-0 max-w-prose text-muted-foreground">{{ section.text }}</p>
      <NuiLink v-if="section.more" :href="withBase(section.more.link)" class="self-start">{{
        section.more.text
      }}</NuiLink>
      <DocsBlock :name="section.block" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { useData, withBase } from 'vitepress';
import { NuiButton, NuiCode, NuiLink } from '@numior/vue';
import { blockRouteOf } from '../../blocks';
import { useDocs } from '../composables/use-docs';
import { exampleLocaleOf } from '../examples';
import { homeOf } from '../home-content';
import DocsBlock from './DocsBlock.vue';
import DocsCaption from './DocsCaption.vue';
import HomeScreen from './HomeScreen.vue';

const { localeIndex } = useData();
const { texts } = useDocs();

const sectionId = useId();

const home = computed(() => homeOf(localeIndex.value));
const locale = computed(() => exampleLocaleOf(localeIndex.value));
</script>
