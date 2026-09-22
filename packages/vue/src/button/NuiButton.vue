<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiButtonProps } from './button.types';

const {
  variant = 'solid',
  tone = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
} = defineProps<NuiButtonProps>();
</script>

<template>
  <button
    class="nui-button"
    :class="[
      `nui-button--variant-${variant}`,
      `nui-button--tone-${tone}`,
      `nui-button--size-${size}`,
      { 'nui-button--loading': loading },
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
