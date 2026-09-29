<template>
  <span
    class="nui-table__resizer"
    :class="{ 'nui-table__resizer--start': start, 'nui-table__resizer--active': active }"
    aria-hidden="true"
    @pointerdown="emit('grab', $event)"
  ></span>
</template>

<script setup lang="ts">
import type { NuiTableResizerProps } from './table.types';

const { start = false, active = false } = defineProps<NuiTableResizerProps>();

const emit = defineEmits<{ grab: [event: PointerEvent] }>();
</script>
