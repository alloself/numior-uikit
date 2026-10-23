<template>
  <figure class="nui-chart" :aria-label="label" :style="{ '--_height': `${height}px` }">
    <NuiChartLegend v-if="legend.length > 1" :items="legend" :label="texts.legend" />
    <div ref="frame" class="nui-chart__frame">
      <p v-if="empty" class="nui-chart__empty">{{ texts.empty }}</p>
      <svg
        v-else
        class="nui-chart__svg"
        :width="scene.width"
        :height="scene.height"
        :viewBox="`0 0 ${scene.width} ${scene.height}`"
        aria-hidden="true"
        focusable="false"
      >
        <line
          v-for="(line, index) in grid"
          :key="`grid-${index}`"
          class="nui-chart__line nui-chart__line--grid"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
        />
        <path
          v-for="bar in scene.bars"
          :key="`${bar.series}-${bar.index}`"
          class="nui-chart__bar"
          :class="`nui-chart__bar--slot-${bar.slot}`"
          :d="bar.path"
        />
        <line
          v-for="(line, index) in baselines"
          :key="`baseline-${index}`"
          class="nui-chart__line nui-chart__line--baseline"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
        />
        <text
          v-for="(text, index) in labels"
          :key="`text-${index}`"
          class="nui-chart__text"
          :class="`nui-chart__text--${text.role}`"
          :x="text.x"
          :y="text.y"
          :text-anchor="text.anchor"
          :dominant-baseline="text.dominant"
          :transform="text.transform"
        >
          {{ text.text }}
        </text>
      </svg>
    </div>
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
import { useDirection, useLocale, useMessages } from '@numior/primitives';
import { useMutationObserver } from '@vueuse/core';
import { computed, ref, useTemplateRef } from 'vue';
import { layoutChart, type SceneText } from '../core';
import NuiChartLegend from './NuiChartLegend.vue';
import NuiChartTable from './NuiChartTable.vue';
import { chartMessages } from './chart.messages';
import type { NuiChartLegendItem, NuiChartProps } from './chart.types';
import { useChartFrame } from './use-chart-frame';

const { spec, label, height = 300, locale, showTable = false } = defineProps<NuiChartProps>();

const FALLBACK_WIDTH = 640;
const FONT_SIZE = 12;
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const BASELINES: Readonly<Record<SceneText['baseline'], string>> = {
  top: 'hanging',
  middle: 'central',
  bottom: 'text-after-edge',
};

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

const legend = computed((): NuiChartLegendItem[] =>
  spec.series.map((series, index) => ({
    id: series.id,
    name: series.name,
    slot: series.slot ?? SLOTS[index] ?? 0,
  })),
);

const rtl = computed(() => {
  void directionRevision.value;
  return direction.isRtl();
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

const documentRoot = (): HTMLElement | undefined =>
  typeof document === 'undefined' ? undefined : document.documentElement;

useMutationObserver(
  documentRoot,
  () => {
    directionRevision.value += 1;
  },
  { attributes: true, attributeFilter: ['dir'], subtree: true },
);

const labels = computed(() =>
  scene.value.texts.map((text) => ({
    ...text,
    dominant: BASELINES[text.baseline],
    transform: text.rotate === undefined ? undefined : `rotate(${text.rotate} ${text.x} ${text.y})`,
  })),
);

const grid = computed(() => scene.value.lines.filter((line) => line.role === 'grid'));
const baselines = computed(() => scene.value.lines.filter((line) => line.role === 'baseline'));
</script>
