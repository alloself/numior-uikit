<template>
  <span
    ref="handle"
    class="nui-table__resizer"
    :class="{
      'nui-table__resizer--row': axis === ReorderAxis.Y,
      'nui-table__resizer--start': start,
      'nui-table__resizer--active': active,
    }"
    aria-hidden="true"
    @dblclick="emit('reset')"
  ></span>
</template>

<script setup lang="ts">
import { ReorderAxis } from '@numior/primitives';
import { useTemplateRef } from 'vue';
import { useTableHandle } from './table-handles';
import type { NuiTableResizerProps } from './table.types';

const { axis = 'x', start = false, active = false } = defineProps<NuiTableResizerProps>();

const emit = defineEmits<{ grab: [event: PointerEvent]; reset: [] }>();

useTableHandle(useTemplateRef('handle'), (event) => {
  emit('grab', event);
});
</script>
