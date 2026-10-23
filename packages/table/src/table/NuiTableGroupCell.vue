<template>
  <span v-if="cell?.kind === 'toggle'" class="nui-table__group" @click="emit('toggle')">
    <span :key="cell.node" class="nui-table__toggle" aria-hidden="true">
      <NuiIcon icon="chevron-right" class="nui-table__chevron" />
    </span>
    <span class="nui-table__text">{{ cell.text }}</span>
    <span class="nui-table__count">{{ cell.count }}</span>
  </span>
  <span v-else-if="cell" class="nui-table__text">{{ cell.text }}</span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiTableGroupCellProps } from './table.types';

const { cell } = defineProps<NuiTableGroupCellProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
