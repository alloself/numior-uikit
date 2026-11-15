<template>
  <span
    v-if="cell?.kind === TableGroupCellKind.Toggle"
    class="nui-table__group-room"
    :style="{ '--_level': cell.level }"
    :aria-hidden="copy ? 'true' : undefined"
  >
    <span class="nui-table__group" @click="emit('toggle')">
      <span class="nui-table__group-head">
        <span :key="cell.node" class="nui-table__toggle" aria-hidden="true">
          <NuiIcon icon="chevron-right" />
        </span>
        <span class="nui-table__text">{{ cell.text }}</span>
      </span>
      <span class="nui-table__count">{{ cell.count }}</span>
    </span>
  </span>
  <span v-else-if="cell" class="nui-table__text">{{ cell.text }}</span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import { TableGroupCellKind, type NuiTableGroupCellProps } from './table.types';

const { cell, copy = false } = defineProps<NuiTableGroupCellProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
