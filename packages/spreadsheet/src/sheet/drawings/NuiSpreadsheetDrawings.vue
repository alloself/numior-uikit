<template>
  <div
    v-for="placed in placedDrawings"
    :key="placed.shown.drawing.id"
    class="nui-spreadsheet__drawing"
    :class="kindClass(placed.shown.kind)"
    :style="rectStyle(placed.rect)"
  >
    <img
      v-if="placed.shown.kind === ShownDrawingKind.Picture && placed.shown.url !== undefined"
      class="nui-spreadsheet__picture"
      :src="placed.shown.url"
      :alt="placed.shown.label"
      draggable="false"
    />
    <template v-else-if="placed.shown.kind === ShownDrawingKind.Chart">
      <p v-if="placed.shown.title !== undefined" class="nui-spreadsheet__chart-title">
        {{ placed.shown.title }}
      </p>
      <span class="nui-spreadsheet__chart">
        <NuiChart
          :spec="placed.shown.spec"
          :label="placed.shown.label"
          height="fill"
          :focusable="false"
        />
      </span>
    </template>
    <p v-else-if="placed.shown.kind === ShownDrawingKind.Foreign" class="nui-spreadsheet__foreign">
      {{ placed.shown.label }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { NuiChart } from '@numior/charts';
import { computed } from 'vue';
import { rectStyle } from '../sheet-rect';
import { boxOf } from './drawing-box';
import { ShownDrawingKind, type PlacedDrawing, type SheetDrawingsProps } from './drawings.types';

const kindClass = (kind: ShownDrawingKind): string => `nui-spreadsheet__drawing--kind-${kind}`;

const { drawings, rectOf, near } = defineProps<SheetDrawingsProps>();

const placedDrawings = computed(() =>
  drawings.reduce<PlacedDrawing[]>((placed, shown) => {
    const rect = boxOf(shown.span, near, rectOf);

    if (rect !== undefined && rect.width > 0 && rect.height > 0) {
      placed.push({ shown, rect });
    }
    return placed;
  }, []),
);
</script>
