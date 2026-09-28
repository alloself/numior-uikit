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
      :aria-label="removeText"
      :tabindex="removeTabbable ? undefined : -1"
      :disabled="disabled"
      @click="emit('remove')"
    >
      <NuiIcon alias="x" />
    </NuiButton>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMessages } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { chipMessages } from './chip.messages';
import type { NuiChipProps } from './chip.types';

const {
  tone = 'neutral',
  variant = 'soft',
  size = 'md',
  icon,
  removable = false,
  removeTabbable = true,
  removeLabel,
  disabled = false,
} = defineProps<NuiChipProps>();

const emit = defineEmits<{ remove: [] }>();

const messages = useMessages(chipMessages);
const removeText = computed(() => removeLabel ?? messages.value.remove);
</script>
