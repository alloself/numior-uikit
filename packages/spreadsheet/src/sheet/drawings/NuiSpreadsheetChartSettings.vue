<template>
  <div ref="panel" class="nui-spreadsheet-chart-settings">
    <div class="nui-spreadsheet-chart-settings__header">
      <h2 :id="titleId" class="nui-spreadsheet-chart-settings__title">{{ texts.chartSettings }}</h2>
      <NuiButton
        variant="ghost"
        tone="neutral"
        size="xs"
        icon-only
        :aria-label="texts.chartSettingsClose"
        @click="emit('close')"
      >
        <NuiIcon icon="x" />
      </NuiButton>
    </div>
    <NuiSelect
      :model-value="chart.kind"
      :options="kinds"
      :label="texts.chartKind"
      size="sm"
      @update:model-value="setKind"
    />
    <NuiInput v-model.lazy="title" :label="texts.chartTitleField" size="sm" autocomplete="off" />
    <NuiSwitch
      v-if="hasLegend"
      :model-value="chart.legend"
      :label="texts.chartLegend"
      size="sm"
      @update:model-value="setLegend"
    />
    <NuiSelect
      v-if="stacks"
      :model-value="chart.stacking"
      :options="stackings"
      :label="texts.chartStacking"
      size="sm"
      @update:model-value="setStacking"
    />
    <NuiSwitch
      v-if="bridges"
      :model-value="chart.gaps === SheetChartGaps.Connect"
      :label="texts.chartConnectGaps"
      size="sm"
      @update:model-value="setGaps"
    />
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, NuiInput, NuiSelect, NuiSwitch, type NuiOption } from '@numior/vue';
import { computed, useTemplateRef } from 'vue';
import { SheetChartGaps, SheetChartKind, SheetChartStacking, type SheetChart } from '../../core';
import { CHART_CHOICES } from './chart-choices';
import type { ChartSettingsPanelProps } from './drawings.types';

const STACKED_KINDS: ReadonlySet<SheetChartKind> = new Set([
  SheetChartKind.Column,
  SheetChartKind.Bar,
  SheetChartKind.Line,
  SheetChartKind.Area,
]);

const ROUND_KINDS: ReadonlySet<SheetChartKind> = new Set([
  SheetChartKind.Pie,
  SheetChartKind.Doughnut,
]);

const { chart, titleId, texts } = defineProps<ChartSettingsPanelProps>();

const emit = defineEmits<{
  change: [chart: SheetChart];
  close: [];
}>();

const panel = useTemplateRef<HTMLElement>('panel');

const change = (patch: Partial<SheetChart>): void => {
  emit('change', { ...chart, ...patch });
};

const kinds = computed((): NuiOption<SheetChartKind>[] =>
  CHART_CHOICES.map((choice) => ({ value: choice.kind, label: choice.label(texts) })),
);

const stackings = computed((): NuiOption<SheetChartStacking>[] => [
  { value: SheetChartStacking.None, label: texts.chartStackingNone },
  { value: SheetChartStacking.Stacked, label: texts.chartStackingStacked },
  { value: SheetChartStacking.Percent, label: texts.chartStackingPercent },
]);

const title = computed({
  get: () => chart.title ?? '',
  set: (text: string) => {
    const trimmed = text.trim();

    change({ title: trimmed === '' ? undefined : trimmed });
  },
});

const hasLegend = computed(() => ROUND_KINDS.has(chart.kind) || chart.series.length > 1);

const stacks = computed(() => STACKED_KINDS.has(chart.kind));

const bridges = computed(() => chart.kind === SheetChartKind.Line);

const setKind = (kind: SheetChartKind | null): void => {
  if (kind === null) {
    return;
  }

  change({ kind });
};

const setLegend = (legend: boolean): void => {
  change({ legend });
};

const setStacking = (stacking: SheetChartStacking | null): void => {
  if (stacking === null) {
    return;
  }

  change({ stacking });
};

const setGaps = (connect: boolean): void => {
  change({ gaps: connect ? SheetChartGaps.Connect : SheetChartGaps.Break });
};

const focusStart = (): void => {
  panel.value?.querySelector<HTMLElement>('[role="combobox"]')?.focus();
};

defineExpose({ focusStart });
</script>
