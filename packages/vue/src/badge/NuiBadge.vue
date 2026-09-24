<template>
  <span
    class="nui-badge"
    :class="[
      `nui-badge--tone-${tone}`,
      `nui-badge--variant-${variant}`,
      `nui-badge--size-${size}`,
      { 'nui-badge--dot': dot, 'nui-badge--floating': floating },
    ]"
    :role="dot && label ? 'img' : undefined"
    :aria-label="dot ? label : undefined"
    :aria-hidden="dot && !label ? 'true' : undefined"
  >
    <template v-if="!dot">
      <NuiIcon v-if="icon" :alias="icon" class="nui-badge__icon" />
      <span v-if="$slots.default || count !== undefined" class="nui-badge__label">
        <slot>{{ countText }}</slot>
      </span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { formatCount } from './badge-count';
import type { NuiBadgeProps } from './badge.types';

const {
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  icon,
  dot = false,
  count,
  max = 99,
  label,
  floating = false,
} = defineProps<NuiBadgeProps>();

const countText = computed(() => (count === undefined ? '' : formatCount(count, max)));
</script>
