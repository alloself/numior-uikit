<template>
  <div
    v-for="drop in layer.drops.value"
    :key="drop.axis"
    class="nui-table__drop"
    :class="`nui-table__drop--${drop.axis}`"
    :style="drop.style"
    aria-hidden="true"
  ></div>
  <div
    v-if="layer.ghost.value"
    class="nui-table__ghost"
    :class="`nui-table__ghost--${layer.ghost.value.axis}`"
    :style="layer.ghost.value.style"
    aria-hidden="true"
  >
    <NuiIcon alias="grip" class="nui-table__ghost-grip" />
    <span class="nui-table__ghost-label">{{ layer.ghost.value.label }}</span>
  </div>
</template>

<script setup lang="ts">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiTableDragLayerProps } from './table.types';

const { layer } = defineProps<NuiTableDragLayerProps>();
</script>
