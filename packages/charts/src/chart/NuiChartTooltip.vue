<template>
  <div
    class="nui-chart__tooltip"
    :class="[`nui-chart__tooltip--side-${side}`, { 'nui-chart__tooltip--shown': shown }]"
    :style="{ left: `${x}px`, top: `${y}px`, '--_reach': `${reach}px` }"
    aria-hidden="true"
  >
    <slot>
      <p class="nui-chart__tooltip-title">{{ content.title }}</p>
      <ul class="nui-chart__tooltip-rows">
        <li v-for="row in content.rows" :key="row.key" class="nui-chart__tooltip-row">
          <span
            v-if="row.slot !== undefined"
            class="nui-chart__swatch"
            :class="`nui-chart__swatch--slot-${row.slot}`"
          ></span>
          <span v-if="row.name !== ''" class="nui-chart__tooltip-name">{{ row.name }}</span>
          <span class="nui-chart__tooltip-value">{{ row.value }}</span>
        </li>
      </ul>
    </slot>
  </div>
</template>

<script setup lang="ts">
import type { NuiChartTooltipProps } from './chart.types';

const { content, x, y, side, reach, shown } = defineProps<NuiChartTooltipProps>();

defineSlots<{
  default?(): unknown;
}>();
</script>
