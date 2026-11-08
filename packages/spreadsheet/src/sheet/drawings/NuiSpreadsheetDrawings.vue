<template>
  <template v-for="placed in placedDrawings" :key="placed.shown.drawing.id">
    <div
      class="nui-spreadsheet__drawing"
      :class="[
        kindClass(placed.shown.kind),
        {
          'nui-spreadsheet__drawing--editable': editable,
          'nui-spreadsheet__drawing--selected': placed.shown.drawing.id === selected,
        },
      ]"
      :style="rectStyle(placed.rect)"
      @pointerdown="emit('down', $event, placed.shown)"
      @click="emit('select', placed.shown)"
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
      <p
        v-else-if="placed.shown.kind === ShownDrawingKind.Foreign"
        class="nui-spreadsheet__foreign"
      >
        {{ placed.shown.label }}
      </p>
    </div>
    <span
      class="nui-spreadsheet__drawing-frame"
      :class="{
        'nui-spreadsheet__drawing-frame--selected': placed.shown.drawing.id === selected,
      }"
      :style="rectStyle(placed.rect)"
    >
      <span
        v-for="grip in GRIPS"
        :key="grip"
        class="nui-spreadsheet__handle"
        :class="`nui-spreadsheet__handle--${grip}`"
        @pointerdown="emit('grip', $event, placed.shown, grip)"
      ></span>
    </span>
  </template>
</template>

<script setup lang="ts">
import { NuiChart } from '@numior/charts';
import { computed } from 'vue';
import { rectStyle } from '../sheet-rect';
import { FrameGrip } from '../sheet.types';
import { boxOf } from './drawing-box';
import {
  ShownDrawingKind,
  type PlacedDrawing,
  type SheetDrawingsProps,
  type ShownDrawing,
} from './drawings.types';

const GRIPS = Object.values(FrameGrip);

const kindClass = (kind: ShownDrawingKind): string => `nui-spreadsheet__drawing--kind-${kind}`;

const { drawings, rectOf, near, selected, moving, editable } = defineProps<SheetDrawingsProps>();

const emit = defineEmits<{
  down: [event: PointerEvent, shown: ShownDrawing];
  grip: [event: PointerEvent, shown: ShownDrawing, grip: FrameGrip];
  select: [shown: ShownDrawing];
}>();

const placedDrawings = computed(() =>
  drawings.reduce<PlacedDrawing[]>((placed, shown) => {
    const span = moving?.id === shown.drawing.id ? moving.span : shown.span;
    const rect = boxOf(span, near, rectOf);

    if (rect !== undefined && rect.width > 0 && rect.height > 0) {
      placed.push({ shown, rect });
    }
    return placed;
  }, []),
);
</script>
