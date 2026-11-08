<template>
  <img
    v-if="shown.kind === ShownDrawingKind.Picture && shown.url !== undefined"
    class="nui-spreadsheet__picture"
    :src="shown.url"
    :alt="shown.label"
    draggable="false"
  />
  <template v-else-if="shown.kind === ShownDrawingKind.Chart">
    <p v-if="shown.title !== undefined" class="nui-spreadsheet__chart-title">
      {{ shown.title }}
    </p>
    <span class="nui-spreadsheet__chart">
      <NuiChart
        :spec="shown.spec"
        :label="shown.label"
        :legend="shown.legend"
        height="fill"
        :focusable="false"
      />
    </span>
  </template>
  <p v-else-if="shown.kind === ShownDrawingKind.Foreign" class="nui-spreadsheet__foreign">
    {{ shown.label }}
  </p>
</template>

<script setup lang="ts">
import { NuiChart } from '@numior/charts';
import { ShownDrawingKind, type DrawingBodyProps } from './drawings.types';

const { shown } = defineProps<DrawingBodyProps>();
</script>
