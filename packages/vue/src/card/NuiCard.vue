<template>
  <div
    class="nui-card"
    :class="[
      `nui-card--variant-${variant}`,
      `nui-card--padding-${padding}`,
      { 'nui-card--interactive': action !== undefined },
    ]"
  >
    <NuiCardHeader v-if="title || description">
      <NuiCardTitle v-if="title">{{ title }}</NuiCardTitle>
      <NuiCardDescription v-if="description">{{ description }}</NuiCardDescription>
    </NuiCardHeader>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiCardDescription from './NuiCardDescription.vue';
import NuiCardHeader from './NuiCardHeader.vue';
import NuiCardTitle from './NuiCardTitle.vue';
import { provideCard, type CardAction } from './card-context';
import type { NuiCardProps } from './card.types';

const {
  variant = 'outline',
  padding = 'md',
  href,
  to,
  as = 'a',
  interactive = false,
  title,
  description,
} = defineProps<NuiCardProps>();

const action = computed<CardAction | undefined>(() => {
  if (href !== undefined || to !== undefined) {
    return { kind: 'link', href, to, as };
  }
  return interactive ? { kind: 'button' } : undefined;
});
provideCard({ action });
</script>
