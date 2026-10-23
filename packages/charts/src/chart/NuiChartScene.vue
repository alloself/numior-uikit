<template>
  <svg
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
      v-for="slice in scene.slices"
      :key="`slice-${slice.series}-${slice.index}`"
      class="nui-chart__slice"
      :class="`nui-chart__slice--slot-${slice.slot}`"
      :d="slice.path"
    />
    <path
      v-for="bar in scene.bars"
      :key="`${bar.series}-${bar.index}`"
      class="nui-chart__bar"
      :class="`nui-chart__bar--slot-${bar.slot}`"
      :d="bar.path"
    />
    <path
      v-for="(area, index) in areas"
      :key="`area-${area.series}-${index}`"
      class="nui-chart__area"
      :class="`nui-chart__area--slot-${area.slot}`"
      :d="area.d"
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
    <path
      v-for="(stroke, index) in strokes"
      :key="`stroke-${stroke.series}-${index}`"
      class="nui-chart__stroke"
      :class="`nui-chart__stroke--slot-${stroke.slot}`"
      :d="stroke.d"
    />
    <circle
      v-for="point in markers"
      :key="`point-${point.series}-${point.index}`"
      class="nui-chart__point"
      :class="`nui-chart__point--slot-${point.slot}`"
      :cx="point.x"
      :cy="point.y"
      r="4"
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SceneText } from '../core';
import type { NuiChartSceneProps } from './chart.types';

const { scene } = defineProps<NuiChartSceneProps>();

const BASELINES: Readonly<Record<SceneText['baseline'], string>> = {
  top: 'hanging',
  middle: 'central',
  bottom: 'text-after-edge',
};

const labels = computed(() =>
  scene.texts.map((text) => ({
    ...text,
    dominant: BASELINES[text.baseline],
    transform: text.rotate === undefined ? undefined : `rotate(${text.rotate} ${text.x} ${text.y})`,
  })),
);

const areas = computed(() => scene.paths.filter((path) => path.role === 'area'));
const strokes = computed(() => scene.paths.filter((path) => path.role === 'line'));
const markers = computed(() => scene.points.filter((point) => point.marker));
const grid = computed(() => scene.lines.filter((line) => line.role === 'grid'));
const baselines = computed(() => scene.lines.filter((line) => line.role === 'baseline'));
</script>
