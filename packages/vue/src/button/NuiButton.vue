<template>
  <button
    class="nui-button"
    :class="[
      `nui-button--variant-${variant}`,
      `nui-button--tone-${tone}`,
      `nui-button--size-${size}`,
      {
        'nui-button--loading': loading,
        'nui-button--icon-only': iconOnly ?? isIconOnlyContent(slots.default),
      },
    ]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span class="nui-button__content">
      <slot />
    </span>
    <span v-if="loading" class="nui-button__loader">
      <NuiIcon alias="loader" class="nui-button__spinner" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiButtonProps } from './button.types';
import { isIconOnlyContent } from './icon-only';

const {
  variant = 'solid',
  tone = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  iconOnly = undefined,
} = defineProps<NuiButtonProps>();

const slots = useSlots();
</script>
