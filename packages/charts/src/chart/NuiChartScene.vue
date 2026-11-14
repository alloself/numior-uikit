<template>
  <div class="nui-chart__scene" :style="sceneStyle" aria-hidden="true">
    <svg
      class="nui-chart__svg"
      :width="scene.width"
      :height="scene.height"
      :viewBox="`0 0 ${scene.width} ${scene.height}`"
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
      <clipPath v-if="scene.clip" :id="clipId">
        <rect
          :x="scene.clip.x"
          :y="scene.clip.y"
          :width="scene.clip.width"
          :height="scene.clip.height"
        />
      </clipPath>
      <g :clip-path="clip">
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
      </g>
      <line
        v-for="(line, index) in baselines"
        :key="`baseline-${index}`"
        class="nui-chart__line nui-chart__line--baseline"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
      />
      <g :clip-path="clip">
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
      </g>
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
    </svg>
    <div class="nui-chart__labels">
      <span
        v-for="(text, index) in labels"
        :key="`text-${index}`"
        class="nui-chart__text"
        :class="text.classes"
        :style="text.style"
        >{{ text.text }}</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import type { Box, SceneBar, ScenePoint, SceneSlice } from '../core';
import type { NuiChartSceneProps } from './chart.types';
import { SceneLineRole, ScenePathRole } from '../core/chart.types';

const { scene, focus, fontSize } = defineProps<NuiChartSceneProps>();

const holds = (box: Box | undefined, point: ScenePoint): boolean =>
  box === undefined ||
  (point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height);

const clipId = useId();

const clip = computed(() => (scene.clip === undefined ? undefined : `url(#${clipId})`));

const sceneStyle = computed(() => ({
  '--_scene-width': String(scene.width),
  '--_font-size': String(fontSize),
}));

const labels = computed(() =>
  scene.texts.map((text) => ({
    text: text.text,
    classes: [
      `nui-chart__text--${text.role}`,
      `nui-chart__text--anchor-${text.anchor}`,
      `nui-chart__text--baseline-${text.baseline}`,
    ],
    style: {
      '--_x': String(text.x),
      '--_y': String(text.y),
      '--_rotate': text.rotate === undefined ? undefined : `${String(text.rotate)}deg`,
    },
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

const markers = computed(() =>
  scene.points.filter((point) => (point.marker || active(point)) && holds(scene.clip, point)),
);

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
