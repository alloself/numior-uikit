<template>
  <figure class="nui-chart" :aria-label="label" :style="{ '--_height': `${height}px` }">
    <NuiChartLegend v-if="legend.length > 1" :items="legend" :label="texts.legend" />
    <div ref="frame" class="nui-chart__frame">
      <p v-if="empty" class="nui-chart__empty">{{ texts.empty }}</p>
      <NuiChartScene v-else :scene="scene" />
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
import { layoutChart } from '../core';
import NuiChartLegend from './NuiChartLegend.vue';
import NuiChartScene from './NuiChartScene.vue';
import NuiChartTable from './NuiChartTable.vue';
import { categoryTexts } from './chart-table';
import { chartMessages } from './chart.messages';
import type { NuiChartLegendItem, NuiChartProps } from './chart.types';
import { useChartFrame } from './use-chart-frame';

const { spec, label, height = 300, locale, showTable = false } = defineProps<NuiChartProps>();

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
</script>
