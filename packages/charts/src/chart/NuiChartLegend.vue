<template>
  <ul class="nui-chart__legend" :aria-label="label">
    <li v-for="item in items" :key="item.id" class="nui-chart__legend-item">
      <span
        class="nui-chart__swatch"
        :class="`nui-chart__swatch--slot-${item.slot}`"
        aria-hidden="true"
      ></span>
      {{ item.name }}
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { NuiChartLegendProps } from './chart.types';

const { items, label } = defineProps<NuiChartLegendProps>();
</script>
