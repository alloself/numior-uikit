<template>
  <div
    class="nui-card"
    :class="[
      `nui-card--variant-${variant}`,
      `nui-card--padding-${padding}`,
      {
        'nui-card--interactive': action !== undefined,
        'nui-layer nui-layer--elevated': variant === NuiCardVariant.Elevated,
      },
    ]"
    :aria-busy="loading || undefined"
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
import { CardActionKind, NuiCardPadding, NuiCardVariant, type NuiCardProps } from './card.types';

const {
  variant = NuiCardVariant.Outline,
  padding = NuiCardPadding.Md,
  href,
  to,
  as,
  interactive = false,
  title,
  description,
  loading = false,
} = defineProps<NuiCardProps>();

const action = computed<CardAction | undefined>(() => {
  if (loading) {
    return undefined;
  }

  if (href !== undefined || to !== undefined) {
    return { kind: CardActionKind.Link, href, to, as };
  }
  return interactive ? { kind: CardActionKind.Button } : undefined;
});

provideCard({ action, loading: computed(() => loading) });
</script>
