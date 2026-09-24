<template>
  <span
    class="nui-chip"
    :class="[
      `nui-chip--tone-${tone}`,
      `nui-chip--variant-${variant}`,
      `nui-chip--size-${size}`,
      { 'nui-chip--removable': removable, 'nui-chip--disabled': disabled },
    ]"
  >
    <NuiIcon v-if="icon" :alias="icon" class="nui-chip__icon" />
    <span class="nui-chip__label"><slot /></span>
    <NuiButton
      v-if="removable"
      variant="ghost"
      :tone="tone"
      size="sm"
      class="nui-chip__remove"
      :aria-label="removeLabel"
      tabindex="-1"
      :disabled="disabled"
      @click="emit('remove')"
    >
      <NuiIcon alias="x" />
    </NuiButton>
  </span>
</template>

<script setup lang="ts">
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiChipProps } from './chip.types';

const {
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  icon,
  removable = false,
  removeLabel = 'Remove',
  disabled = false,
} = defineProps<NuiChipProps>();

const emit = defineEmits<{ remove: [] }>();
</script>
