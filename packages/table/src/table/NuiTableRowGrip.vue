<template>
  <button
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
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiTableRowGripProps } from './table.types';

const { label, disabled = false, active = false } = defineProps<NuiTableRowGripProps>();

const emit = defineEmits<{ grab: [event: PointerEvent] }>();
</script>
