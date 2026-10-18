<template>
  <b>{{ '★'.repeat(Number(value ?? 0)) }}</b>
</template>

<script setup lang="ts">
import type { NuiContentCellViewProps } from '../../../src/table';

const { value } = defineProps<NuiContentCellViewProps>();
</script>
