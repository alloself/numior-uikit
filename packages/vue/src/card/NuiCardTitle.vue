<template>
  <component :is="as" class="nui-card__title">
    <NuiLink
      v-if="action?.kind === 'link'"
      :as="action.as"
      :href="action.href"
      :to="action.to"
      tone="neutral"
      underline="none"
      class="nui-card__action"
    >
      <slot />
    </NuiLink>
    <button v-else-if="action?.kind === 'button'" type="button" class="nui-card__action">
      <slot />
    </button>
    <slot v-else />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiLink from '../link/NuiLink.vue';
import { useCard } from './card-context';
import type { NuiCardTitleProps } from './card.types';

const { as = 'h3' } = defineProps<NuiCardTitleProps>();
const card = useCard();
const action = computed(() => card?.action.value);
</script>
