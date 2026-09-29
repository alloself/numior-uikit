<template>
  <NuiCheckbox
    v-if="control === 'checkbox'"
    :model-value="checked"
    :indeterminate="indeterminate"
    :disabled="disabled"
    :aria-label="label"
    size="sm"
    tabindex="-1"
    @update:model-value="emit('toggle')"
  />
  <button
    v-else-if="control === 'grip'"
    type="button"
    class="nui-table__row-grip"
    :class="{ 'nui-table__row-grip--active': active }"
    tabindex="-1"
    :aria-label="label"
    :disabled="disabled"
    @pointerdown="emit('grab', $event)"
  >
    <NuiIcon alias="grip" class="nui-table__grip-icon" />
  </button>
  <NuiSkeleton v-else-if="control === 'skeleton'" shape="rect" width="1rem" height="1rem" />
</template>

<script setup lang="ts">
import { NuiCheckbox, NuiIcon, NuiSkeleton } from '@numior/vue';
import type { NuiTableUtilityCellProps } from './table.types';

const {
  control,
  checked = false,
  indeterminate = false,
  disabled = false,
  active = false,
  label,
} = defineProps<NuiTableUtilityCellProps>();

const emit = defineEmits<{ toggle: []; grab: [event: PointerEvent] }>();
</script>
