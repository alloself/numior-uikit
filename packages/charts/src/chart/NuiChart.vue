<template>
  <figure
    class="nui-chart"
    :class="{ 'nui-chart--interactive': !empty }"
    :aria-label="label"
    :tabindex="empty ? undefined : 0"
    :style="{ '--_height': `${height}px` }"
    @keydown="pointer.onKeydown"
    @blur="pointer.onBlur"
  >
    <NuiChartLegend v-if="legend.length > 1" :items="legend" :label="texts.legend" />
    <div
      ref="frame"
      class="nui-chart__frame"
      @pointermove="pointer.onPointermove"
      @pointerleave="pointer.onPointerleave"
      @click="pointer.onClick"
    >
      <p v-if="empty" class="nui-chart__empty">{{ texts.empty }}</p>
      <NuiChartScene v-else :scene="scene" :focus="focus" />
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
      :category-title="spec.categoryAxis?.title ?? texts.category"
      :shown="showTable"
    />
  </figure>
</template>

<script setup lang="ts">
import { DIRECTION_KEY, useDirection, useLocale, useMessages } from '@numior/primitives';
import { useMounted, useMutationObserver } from '@vueuse/core';
import { computed, inject, ref, useTemplateRef, watch } from 'vue';
import { anchorOf, layoutChart, type ChartHit, type ChartScene, type SceneAnchor } from '../core';
import NuiChartLegend from './NuiChartLegend.vue';
import NuiChartScene from './NuiChartScene.vue';
import NuiChartTable from './NuiChartTable.vue';
import NuiChartTooltip from './NuiChartTooltip.vue';
import { tooltipContent, tooltipText } from './chart-tooltip';
import { categoryTexts } from './chart-table';
import { chartMessages } from './chart.messages';
import type {
  NuiChartLegendItem,
  NuiChartProps,
  NuiChartTooltipSide,
  NuiChartTooltipSlot,
} from './chart.types';
import { useChartFrame } from './use-chart-frame';
import { useChartPointer } from './use-chart-pointer';

const { spec, label, height = 300, locale, showTable = false } = defineProps<NuiChartProps>();

const selected = defineModel<ChartHit | null>('selected', { default: null });

defineSlots<{
  tooltip?(props: NuiChartTooltipSlot): unknown;
}>();

const FALLBACK_WIDTH = 640;
const FONT_SIZE = 12;

const frameElement = useTemplateRef<HTMLElement>('frame');
const texts = useMessages(chartMessages, () => locale);
const resolvedLocale = useLocale(() => locale);
const direction = useDirection(frameElement);
const sizing = useChartFrame(frameElement);
const directionRevision = ref(0);

const empty = computed(
  () =>
    spec.series.length === 0 ||
    (spec.categories.kind === 'text'
      ? spec.categories.labels.length === 0
      : spec.categories.values.length === 0),
);

const configuredDirection = inject(DIRECTION_KEY, null);
const mounted = useMounted();

const rtl = computed(() => {
  void directionRevision.value;
  return mounted.value ? direction.isRtl() : configuredDirection?.value === 'rtl';
});

const scene = computed(() =>
  layoutChart(
    spec,
    { width: sizing.width.value > 0 ? sizing.width.value : FALLBACK_WIDTH, height },
    {
      rtl: rtl.value,
      locale: resolvedLocale.value,
      fontSize: FONT_SIZE,
      measure: sizing.measure.value,
    },
  ),
);

const legend = computed((): NuiChartLegendItem[] => {
  const { slots } = scene.value;

  if (spec.kind === 'pie' || spec.kind === 'doughnut') {
    return categoryTexts(spec, resolvedLocale.value).map((name, index) => ({
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

const documentRoot = (): HTMLElement | undefined =>
  typeof document === 'undefined' ? undefined : document.documentElement;

useMutationObserver(
  documentRoot,
  () => {
    directionRevision.value += 1;
  },
  { attributes: true, attributeFilter: ['dir'], subtree: true },
);

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
  if (anchor.along === 'y') {
    return anchor.y > current.height / 2 ? 'above' : 'below';
  }
  return anchor.x > current.width / 2 ? 'start' : 'end';
};

const tooltip = computed(() => {
  const hit = shownHit.value;

  if (hit === undefined || empty.value) {
    return undefined;
  }

  const anchor = anchorOf(scene.value, hit);

  return {
    hit,
    content: tooltipContent(spec, scene.value, hit, resolvedLocale.value),
    x: anchor.x,
    y: anchor.y,
    reach: anchor.reach,
    side: sideOf(anchor, scene.value),
  };
});

const announcement = computed(() =>
  pointer.source.value === 'keyboard' &&
  pointer.hovered.value !== undefined &&
  tooltip.value !== undefined
    ? tooltipText(tooltip.value.content)
    : '',
);
</script>
