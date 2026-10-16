<template>
  <NuiBadge v-if="typeof value === 'string' && value !== ''" size="sm">{{ value }}</NuiBadge>
</template>

<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
import type { NuiContentCellViewProps } from './content-table.types';

const { value } = defineProps<NuiContentCellViewProps>();
</script>
