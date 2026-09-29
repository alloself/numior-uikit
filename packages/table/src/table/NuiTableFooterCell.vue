<template>
  <span class="nui-table__text">{{ text }}</span>
  <span v-if="countText" class="nui-table__count">{{ countText }}</span>
</template>

<script setup lang="ts">
import type { NuiTableFooterCellProps } from './table.types';

const { text, countText } = defineProps<NuiTableFooterCellProps>();
</script>
