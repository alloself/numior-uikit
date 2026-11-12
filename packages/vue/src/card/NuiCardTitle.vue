<template>
  <component :is="as" class="nui-card__title" :class="{ 'nui-card__title--loading': loading }">
    <NuiSkeleton v-if="loading" :width="TITLE_WIDTH" />
    <NuiLink
      v-else-if="action?.kind === CardActionKind.Link"
      :as="action.as"
      :href="action.href"
      :to="action.to"
      tone="neutral"
      underline="none"
      class="nui-card__action"
    >
      <slot />
    </NuiLink>
    <button
      v-else-if="action?.kind === CardActionKind.Button"
      type="button"
      class="nui-card__action"
    >
      <slot />
    </button>
    <slot v-else />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiLink from '../link/NuiLink.vue';
import NuiSkeleton from '../skeleton/NuiSkeleton.vue';
import { useCard, useCardLoading } from './card-context';
import { CardActionKind, NuiCardTitleTag, type NuiCardTitleProps } from './card.types';

const TITLE_WIDTH = '60%';

const { as = NuiCardTitleTag.H3 } = defineProps<NuiCardTitleProps>();
const card = useCard();
const loading = useCardLoading();
const action = computed(() => card?.action.value);
</script>
