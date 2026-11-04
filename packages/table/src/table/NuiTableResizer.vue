<template>
  <span
    class="nui-table__resizer"
    :class="{
      'nui-table__resizer--row': axis === ReorderAxis.Y,
      'nui-table__resizer--start': start,
      'nui-table__resizer--active': active,
    }"
    aria-hidden="true"
    @pointerdown="emit('grab', $event)"
    @dblclick="emit('reset')"
  ></span>
</template>

<script setup lang="ts">
import type { NuiTableResizerProps } from './table.types';
import { ReorderAxis } from '@numior/primitives';

const { axis = 'x', start = false, active = false } = defineProps<NuiTableResizerProps>();

const emit = defineEmits<{ grab: [event: PointerEvent]; reset: [] }>();
</script>
