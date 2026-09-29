<template>
  <span v-if="cell?.kind === 'toggle'" class="nui-grid__group" @click="emit('toggle')">
    <span class="nui-grid__toggle" aria-hidden="true">
      <NuiIcon alias="chevron-right" class="nui-grid__chevron" />
    </span>
    <span class="nui-grid__text">{{ cell.text }}</span>
    <span class="nui-grid__count">{{ cell.count }}</span>
  </span>
  <span v-else-if="cell" class="nui-grid__text">{{ cell.text }}</span>
</template>

<script setup lang="ts">
import { NuiIcon } from '@numior/vue';
import type { NuiDataGridGroupCellProps } from './data-grid.types';

const { cell } = defineProps<NuiDataGridGroupCellProps>();

const emit = defineEmits<{ toggle: [] }>();
</script>
