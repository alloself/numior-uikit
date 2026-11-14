<template>
  <button
    ref="handle"
    type="button"
    class="nui-table__row-grip"
    :class="{ 'nui-table__row-grip--active': active }"
    tabindex="-1"
    :aria-label="label"
    :disabled="disabled"
  >
    <NuiIcon icon="grip" />
  </button>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import { useTemplateRef } from 'vue';
import { useTableHandle } from './table-handles';
import type { NuiTableRowGripProps } from './table.types';

const { label, disabled = false, active = false } = defineProps<NuiTableRowGripProps>();

const emit = defineEmits<{ grab: [event: PointerEvent] }>();

useTableHandle(useTemplateRef('handle'), (event) => {
  emit('grab', event);
});
</script>
