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
    <NuiIcon v-if="icon" :icon="icon" class="nui-chip__icon" />
    <span class="nui-chip__label"><slot /></span>
    <NuiButton
      v-if="removable"
      :variant="REMOVE_VARIANTS[variant]"
      :tone="tone"
      size="inline"
      round
      class="nui-chip__remove"
      :aria-label="removeText"
      :tabindex="removeTabbable ? undefined : -1"
      :disabled="disabled"
      icon="x"
      @click="emit('remove')"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMessages } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { chipMessages } from './chip.messages';
import type { NuiButtonVariant } from '../button/button.types';
import { NuiChipSize, NuiChipVariant, type NuiChipProps } from './chip.types';
import { NuiTone } from '../shared/scale.types';

const REMOVE_VARIANTS: Readonly<Record<NuiChipVariant, NuiButtonVariant>> = {
  soft: 'soft',
  solid: 'solid',
  outline: 'ghost',
};

const {
  tone = NuiTone.Neutral,
  variant = NuiChipVariant.Soft,
  size = NuiChipSize.Md,
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
