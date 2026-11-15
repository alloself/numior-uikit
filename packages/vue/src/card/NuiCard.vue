<template>
  <div
    ref="root"
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
    @click="onClick"
  >
    <NuiCardHeader v-if="title || description">
      <NuiCardTitle v-if="title">{{ title }}</NuiCardTitle>
      <NuiCardDescription v-if="description">{{ description }}</NuiCardDescription>
    </NuiCardHeader>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
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

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const root = useTemplateRef<HTMLElement>('root');

const action = computed<CardAction | undefined>(() => {
  if (loading) {
    return undefined;
  }

  if (href !== undefined || to !== undefined) {
    return { kind: CardActionKind.Link, href, to, as };
  }
  return interactive ? { kind: CardActionKind.Button } : undefined;
});

const ownActionOf = (target: EventTarget | null): Element | null => {
  const found = target instanceof Element ? target.closest('.nui-card__action') : null;

  return found?.closest('.nui-card') === root.value ? found : null;
};

const onClick = (event: MouseEvent): void => {
  if (ownActionOf(event.target) === null) {
    return;
  }

  emit('click', event);
};

provideCard({ action, loading: computed(() => loading) });
</script>
