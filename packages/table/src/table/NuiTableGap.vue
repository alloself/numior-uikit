<template>
  <tr v-if="size > 0" class="nui-table__gap" role="presentation" :style="{ '--_gap': `${size}px` }">
    <td></td>
  </tr>
</template>

<script setup lang="ts">
import type { NuiTableGapProps } from './table.types';

const { size } = defineProps<NuiTableGapProps>();
</script>
