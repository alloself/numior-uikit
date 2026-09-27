<template>
  <div class="nui-max-w-3xl nui-mx-auto nui-p-6 nui-flex nui-flex-col nui-gap-8">
    <section class="nui-flex nui-flex-col nui-gap-4 nui-mt-8">
      <p class="nui-text-sm nui-font-medium nui-text-primary nui-uppercase">{{ home.eyebrow }}</p>
      <h1 class="nui-text-4xl nui-font-bold nui-tracking-tight nui-leading-tight">
        {{ home.title }}
      </h1>
      <p class="nui-text-lg nui-text-muted nui-max-w-prose">{{ home.tagline }}</p>
      <div class="nui-flex nui-wrap nui-gap-2 nui-mt-2">
        <NuiButton
          v-for="action in home.actions"
          :key="action.link"
          :href="withBase(action.link)"
          :variant="action.primary ? 'solid' : 'outline'"
          :tone="action.primary ? 'primary' : 'neutral'"
          >{{ action.text }}</NuiButton
        >
      </div>
    </section>
    <section class="nui-grid-auto nui-gap-4">
      <NuiCard
        v-for="feature in home.features"
        :key="feature.title"
        :title="feature.title"
        :description="feature.details"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';
import { NuiButton, NuiCard } from '@numior/vue';
import { homeOf } from '../home-content';

const { localeIndex } = useData();
const home = computed(() => homeOf(localeIndex.value));
</script>
