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
      :style="tableRectStyle(placed.rect)"
      :ref="press((event) => emit('down', event, placed.shown))"
      @click="emit('select', placed.shown)"
      @dblclick="emit('settings', placed.shown)"
      @contextmenu="emit('menu', $event, placed.shown)"
    >
      <NuiSpreadsheetDrawingBody :shown="placed.shown" />
    </div>
    <span
      class="nui-spreadsheet__drawing-frame"
      :class="{
        'nui-spreadsheet__drawing-frame--selected': placed.shown.drawing.id === selected,
      }"
      :style="tableRectStyle(placed.frame)"
    >
      <span
        v-for="grip in GRIPS"
        :key="grip"
        class="nui-spreadsheet__handle"
        :class="`nui-spreadsheet__handle--${grip}`"
        :ref="press((event) => emit('grip', event, placed.shown, grip))"
      ></span>
      <span
        v-if="
          editable &&
          placed.shown.kind === ShownDrawingKind.Chart &&
          placed.shown.drawing.id === selected
        "
        class="nui-spreadsheet__drawing-tools"
        :ref="press(stop)"
        @mousedown.prevent
      >
        <NuiButton
          variant="outline"
          tone="neutral"
          size="xs"
          icon-only
          tabindex="-1"
          :aria-label="settingsLabel"
          @click="emit('settings', placed.shown)"
        >
          <NuiIcon :icon="SETTINGS_ICON" />
        </NuiButton>
      </span>
    </span>
  </template>
</template>

<script setup lang="ts">
import { Settings2 } from '@lucide/vue';
import { tableRectStyle } from '@numior/table';
import { NuiButton, NuiIcon } from '@numior/vue';
import { computed, markRaw } from 'vue';
import { useSheetPress } from '../sheet-presses';
import { FrameGrip } from '../sheet.types';
import { boxOf } from './drawing-box';
import NuiSpreadsheetDrawingBody from './NuiSpreadsheetDrawingBody.vue';
import {
  ShownDrawingKind,
  type PlacedDrawing,
  type SheetDrawingsProps,
  type ShownDrawing,
} from './drawings.types';

const GRIPS = Object.values(FrameGrip);

const SETTINGS_ICON = markRaw(Settings2);

const kindClass = (kind: ShownDrawingKind): string => `nui-spreadsheet__drawing--kind-${kind}`;

const stop = (event: PointerEvent): void => {
  event.stopPropagation();
};

const {
  drawings,
  rectOf,
  near,
  frozenRows,
  frozenCols,
  selected,
  moving,
  editable,
  settingsLabel,
} = defineProps<SheetDrawingsProps>();

const emit = defineEmits<{
  down: [event: PointerEvent, shown: ShownDrawing];
  grip: [event: PointerEvent, shown: ShownDrawing, grip: FrameGrip];
  select: [shown: ShownDrawing];
  settings: [shown: ShownDrawing];
  menu: [event: MouseEvent, shown: ShownDrawing];
}>();

const press = useSheetPress();

const placedDrawings = computed(() =>
  drawings.reduce<PlacedDrawing[]>((placed, shown) => {
    const span = moving?.id === shown.drawing.id ? moving.span : shown.span;
    const place = boxOf(span, near, rectOf, { rows: frozenRows, cols: frozenCols });

    if (place !== undefined && place.rect.width > 0 && place.rect.height > 0) {
      placed.push({ shown, ...place });
    }
    return placed;
  }, []),
);
</script>
