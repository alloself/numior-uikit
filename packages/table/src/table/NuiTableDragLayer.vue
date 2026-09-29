<template>
  <div
    v-if="drop !== undefined"
    class="nui-table__drop"
    :style="{ '--_drop': `${drop}px` }"
    aria-hidden="true"
  ></div>
  <div
    v-if="ghost"
    class="nui-table__ghost"
    :style="{ '--_ghost': `${ghost.start}px` }"
    aria-hidden="true"
  >
    {{ ghost.label }}
  </div>
</template>

<script setup lang="ts">
import type { NuiTableDragLayerProps } from './table.types';

const { drop, ghost } = defineProps<NuiTableDragLayerProps>();
</script>
