<template>
  <div
    v-if="drop"
    class="nui-table__drop"
    :class="dropClass"
    :style="dropStyle"
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
      <span class="nui-table__ghost-grip"><NuiIcon icon="grip" /></span>
      <span class="nui-table__ghost-label">{{ ghost.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NuiIcon } from '@numior/vue';
import { TableDropMarkKind, type NuiTableDragLayerProps } from './table.types';

const { axis = 'x', drop, ghost } = defineProps<NuiTableDragLayerProps>();

const dropClass = computed(() =>
  drop?.kind === TableDropMarkKind.Box ? 'nui-table__drop--box' : `nui-table__drop--${axis}`,
);

const dropStyle = computed(() => {
  if (drop === undefined) {
    return undefined;
  }
  if (drop.kind === TableDropMarkKind.Box) {
    return { '--_drop': `${drop.start}px`, '--_size': `${drop.size}px` };
  }
  const inset = drop.inset;

  return {
    '--_drop': `${drop.start}px`,
    '--_drop-inset':
      inset === undefined ? '0px' : `calc(${inset.start}px + ${inset.level} * var(--_indent))`,
  };
});
</script>
