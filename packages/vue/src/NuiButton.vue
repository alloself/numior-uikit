<script setup lang="ts">
import type { NuiButtonProps } from './button.types';

withDefaults(defineProps<NuiButtonProps>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  loading: false,
});
</script>

<template>
  <button
    class="nui-button"
    :data-variant="variant"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <slot />
  </button>
</template>
