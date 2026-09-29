<template>
  <div
    v-if="drop !== undefined"
    class="nui-table__drop"
    :class="`nui-table__drop--${axis}`"
    :style="{ '--_drop': `${drop}px` }"
    aria-hidden="true"
  ></div>
  <div
    v-if="ghost"
    class="nui-table__ghost"
    :class="`nui-table__ghost--${axis}`"
    :style="{ '--_ghost': `${ghost.start}px`, '--_size': `${ghost.size}px` }"
    aria-hidden="true"
  >
    <div class="nui-table__ghost-body">
      <NuiIcon alias="grip" class="nui-table__ghost-grip" />
      <span class="nui-table__ghost-label">{{ ghost.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiTableDragLayerProps } from './table.types';

const { axis = 'x', drop, ghost } = defineProps<NuiTableDragLayerProps>();
</script>
