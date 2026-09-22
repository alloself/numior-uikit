<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiButtonProps } from './button.types';

withDefaults(defineProps<NuiButtonProps>(), {
  variant: 'solid',
  tone: 'primary',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
});
</script>

<template>
  <button
    class="nui-button"
    :data-variant="variant"
    :data-tone="tone"
    :data-size="size"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <NuiIcon v-if="loading" alias="loader" class="nui-button__spinner" />
    <slot />
  </button>
</template>
