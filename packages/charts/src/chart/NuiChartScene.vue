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
      :class="sliceClass(slice)"
      :d="slice.path"
    />
    <path
      v-for="bar in scene.bars"
      :key="`${bar.series}-${bar.index}`"
      class="nui-chart__bar"
      :class="barClass(bar)"
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
    <path
      v-for="(bridge, index) in bridges"
      :key="`gap-${bridge.series}-${index}`"
      class="nui-chart__stroke nui-chart__stroke--gap"
      :class="`nui-chart__stroke--slot-${bridge.slot}`"
      :d="bridge.d"
    />
    <line
      v-if="crosshair !== undefined"
      class="nui-chart__crosshair"
      :x1="crosshair"
      :y1="scene.plot.y"
      :x2="crosshair"
      :y2="scene.plot.y + scene.plot.height"
    />
    <circle
      v-for="point in markers"
      :key="`point-${point.series}-${point.index}`"
      class="nui-chart__point"
      :class="pointClass(point)"
      :cx="point.x"
      :cy="point.y"
      :r="active(point) ? 5 : 4"
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
import type { SceneBar, ScenePoint, SceneSlice, SceneText } from '../core';
import type { NuiChartSceneProps } from './chart.types';
import { SceneLineRole, ScenePathRole } from '../core/chart.types';

const { scene, focus } = defineProps<NuiChartSceneProps>();

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

const areas = computed(() => scene.paths.filter((path) => path.role === ScenePathRole.Area));
const strokes = computed(() => scene.paths.filter((path) => path.role === ScenePathRole.Line));
const bridges = computed(() => scene.paths.filter((path) => path.role === ScenePathRole.Gap));
const lined = computed(() => scene.axis !== undefined && scene.bars.length === 0);

const active = (point: ScenePoint): boolean =>
  focus !== undefined &&
  point.index === focus.index &&
  (focus.series === undefined ? lined.value : point.series === focus.series);

const markers = computed(() => scene.points.filter((point) => point.marker || active(point)));

const crosshair = computed(() =>
  lined.value && focus !== undefined ? scene.axis?.positions[focus.index] : undefined,
);

const barClass = (bar: SceneBar): string[] =>
  focus === undefined || bar.index === focus.index
    ? [`nui-chart__bar--slot-${bar.slot}`]
    : [`nui-chart__bar--slot-${bar.slot}`, 'nui-chart__bar--muted'];

const sliceClass = (slice: SceneSlice): string[] =>
  focus === undefined || (slice.index === focus.index && slice.series === focus.series)
    ? [`nui-chart__slice--slot-${slice.slot}`]
    : [`nui-chart__slice--slot-${slice.slot}`, 'nui-chart__slice--muted'];

const pointClass = (point: ScenePoint): Record<string, boolean> => ({
  [`nui-chart__point--slot-${point.slot}`]: true,
  'nui-chart__point--active': active(point),
  'nui-chart__point--muted':
    focus?.series !== undefined && scene.axis === undefined && !active(point),
});

const grid = computed(() => scene.lines.filter((line) => line.role === SceneLineRole.Grid));

const baselines = computed(() =>
  scene.lines.filter((line) => line.role === SceneLineRole.Baseline),
);
</script>
