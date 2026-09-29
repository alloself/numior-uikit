<template>
  <span class="nui-grid__text">{{ text }}</span>
  <span v-if="countText" class="nui-grid__count">{{ countText }}</span>
</template>

<script setup lang="ts">
import type { NuiDataGridFooterCellProps } from './data-grid.types';

const { text, countText } = defineProps<NuiDataGridFooterCellProps>();
</script>
