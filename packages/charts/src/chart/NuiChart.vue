<template>
  <figure
    class="nui-chart"
    :class="{ 'nui-chart--interactive': !empty, 'nui-chart--fill': filled }"
    :aria-label="label"
    :tabindex="empty || !focusable ? undefined : 0"
    :style="filled ? undefined : { '--_height': `${String(height)}px` }"
    @keydown="pointer.onKeydown"
    @blur="pointer.onBlur"
  >
    <NuiChartLegend
      v-if="legend && legendItems.length > 1"
      :items="legendItems"
      :label="texts.legend"
    />
    <div
      ref="frame"
      class="nui-chart__frame"
      @pointermove="pointer.onPointermove"
      @pointerleave="pointer.onPointerleave"
      @contextmenu="pointer.onContextmenu"
      @click="pointer.onClick"
    >
      <span ref="probe" class="nui-chart__font-probe" aria-hidden="true"></span>
      <p v-if="empty" class="nui-chart__empty">{{ texts.empty }}</p>
      <NuiChartScene v-else :scene="scene" :focus="focus" :font-size="fontSize" />
      <NuiChartTooltip
        v-if="tooltip !== undefined"
        :content="tooltip.content"
        :x="tooltip.x"
        :y="tooltip.y"
        :side="tooltip.side"
        :reach="tooltip.reach"
        :shown="pointer.hovered.value !== undefined"
      >
        <template v-if="$slots.tooltip" #default>
          <slot name="tooltip" :hit="tooltip.hit" :content="tooltip.content" />
        </template>
      </NuiChartTooltip>
    </div>
    <p class="nui-chart__live" aria-live="polite">{{ announcement }}</p>
    <NuiChartTable
      :spec="spec"
      :label="label"
      :locale="resolvedLocale"
      :category-name="categoryNameOf"
      :category-title="spec.categoryAxis?.title ?? texts.category"
      :shown="showTable"
    />
  </figure>
</template>

<script setup lang="ts">
import { Direction, DIRECTION_KEY, useDirection, useLocale, useMessages } from '@numior/primitives';
import { useMounted } from '@vueuse/core';
import { computed, inject, ref, useTemplateRef, watch } from 'vue';
import { anchorOf, layoutChart, type ChartHit, type ChartScene, type SceneAnchor } from '../core';
import NuiChartLegend from './NuiChartLegend.vue';
import NuiChartScene from './NuiChartScene.vue';
import NuiChartTable from './NuiChartTable.vue';
import NuiChartTooltip from './NuiChartTooltip.vue';
import { tooltipContent, tooltipText } from './chart-tooltip';
import { categoryName, categoryTexts } from './chart-table';
import { chartMessages } from './chart.messages';
import {
  ChartFocusSource,
  NuiChartHeight,
  type NuiChartLegendItem,
  type NuiChartProps,
  NuiChartTooltipSide,
  type NuiChartTooltipSlot,
} from './chart.types';
import { useChartFrame } from './use-chart-frame';
import { useChartPointer } from './use-chart-pointer';
import { ChartAxis, ChartCategoriesKind, ChartKind } from '../core/chart.types';
import { CHART_FONT_SIZE } from '../core/layout';

const {
  spec,
  label,
  height = 300,
  focusable = true,
  locale,
  timeZone = 'UTC',
  showTable = false,
  legend = true,
} = defineProps<NuiChartProps>();

const selected = defineModel<ChartHit | null>('selected', { default: null });

defineSlots<{
  tooltip?(props: NuiChartTooltipSlot): unknown;
}>();

const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 300;

const frameElement = useTemplateRef<HTMLElement>('frame');
const probeElement = useTemplateRef<HTMLElement>('probe');
const texts = useMessages(chartMessages, () => locale);
const resolvedLocale = useLocale(() => locale);
const direction = useDirection(frameElement);
const sizing = useChartFrame(frameElement, probeElement);

const filled = computed(() => height === NuiChartHeight.Fill);

const sceneHeight = computed((): number => {
  if (height !== NuiChartHeight.Fill) {
    return height;
  }
  return sizing.height.value > 0 ? sizing.height.value : FALLBACK_HEIGHT;
});

const configuredDirection = inject(DIRECTION_KEY, null);
const mounted = useMounted();

const rtl = computed(() => {
  void sizing.restyled.value;
  return mounted.value ? direction.isRtl() : configuredDirection?.value === Direction.Rtl;
});

const fontSize = computed(() => sizing.fontSize.value ?? CHART_FONT_SIZE);

const scene = computed(() =>
  layoutChart(
    spec,
    {
      width: sizing.width.value > 0 ? sizing.width.value : FALLBACK_WIDTH,
      height: sceneHeight.value,
    },
    {
      rtl: rtl.value,
      locale: resolvedLocale.value,
      timeZone,
      fontSize: fontSize.value,
      measure: sizing.measure.value,
    },
  ),
);

const categoryNameOf = computed(() => categoryName(spec, resolvedLocale.value, timeZone));

const round = computed(() => spec.kind === ChartKind.Pie || spec.kind === ChartKind.Doughnut);

const empty = computed(
  () =>
    spec.series.length === 0 ||
    (spec.categories.kind === ChartCategoriesKind.Text
      ? spec.categories.labels.length === 0
      : spec.categories.values.length === 0) ||
    (round.value && scene.value.slices.length === 0),
);

const legendItems = computed((): NuiChartLegendItem[] => {
  const { slots } = scene.value;

  if (round.value) {
    return categoryTexts(spec, categoryNameOf.value).map((name, index) => ({
      id: `category-${String(index)}`,
      name,
      slot: slots[index] ?? 0,
    }));
  }
  return spec.series.map((series, index) => ({
    id: series.id,
    name: series.name,
    slot: slots[index] ?? 0,
  }));
});

const pointer = useChartPointer({
  scene: () => scene.value,
  frame: frameElement,
  rtl: () => rtl.value,
  selected,
});

const shownHit = ref<ChartHit>();

watch(
  pointer.hovered,
  (hit) => {
    shownHit.value = hit ?? shownHit.value;
  },
  { flush: 'sync' },
);

const focus = computed(() => pointer.hovered.value ?? selected.value ?? undefined);

const sideOf = (anchor: SceneAnchor, current: ChartScene): NuiChartTooltipSide => {
  if (anchor.along === ChartAxis.Y) {
    return anchor.y > current.height / 2 ? NuiChartTooltipSide.Above : NuiChartTooltipSide.Below;
  }
  return anchor.x > current.width / 2 ? NuiChartTooltipSide.Start : NuiChartTooltipSide.End;
};

const tooltip = computed(() => {
  const hit = shownHit.value;

  if (hit === undefined || empty.value) {
    return undefined;
  }

  const anchor = anchorOf(scene.value, hit);

  return {
    hit,
    content: tooltipContent(spec, scene.value, hit, resolvedLocale.value, categoryNameOf.value),
    x: anchor.x,
    y: anchor.y,
    reach: anchor.reach,
    side: sideOf(anchor, scene.value),
  };
});

const announcement = computed(() =>
  pointer.source.value === ChartFocusSource.Keyboard &&
  pointer.hovered.value !== undefined &&
  tooltip.value !== undefined
    ? tooltipText(tooltip.value.content)
    : '',
);
</script>
