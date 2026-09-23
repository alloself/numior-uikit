<template>
  <NuiLink
    v-if="href !== undefined"
    :as="as"
    :href="href"
    :to="as === 'a' ? undefined : href"
    tone="neutral"
    underline="none"
    class="nui-pagination__control"
    :class="{ 'nui-pagination__control--current': current }"
    :aria-label="label"
    :aria-current="current ? 'page' : undefined"
    :disabled="disabled"
    @click="emit('select', page)"
  >
    <slot />
  </NuiLink>
  <button
    v-else
    type="button"
    class="nui-pagination__control"
    :class="{ 'nui-pagination__control--current': current }"
    :aria-label="label"
    :aria-current="current ? 'page' : undefined"
    :disabled="disabled"
    @click="emit('select', page)"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import NuiLink from '../link/NuiLink.vue';
import type { NuiPaginationControlProps } from './pagination.types';

const {
  page,
  label,
  current = false,
  disabled = false,
  href,
  as = 'a',
} = defineProps<NuiPaginationControlProps>();
const emit = defineEmits<{ select: [page: number] }>();
</script>
