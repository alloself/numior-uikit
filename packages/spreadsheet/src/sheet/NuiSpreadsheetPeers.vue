<template>
  <span
    v-for="frame in shown"
    :key="frame.key"
    class="nui-spreadsheet__peer"
    :class="`nui-spreadsheet__peer--tone-${frame.tone}`"
    aria-hidden="true"
    data-testid="sheet-peer"
  >
    <span
      v-for="area in frame.areas"
      :key="area.key"
      class="nui-spreadsheet__peer-area"
      :style="rectStyle(area.rect)"
    ></span>
    <span
      v-if="frame.rect !== undefined"
      class="nui-spreadsheet__peer-cell"
      :class="{ 'nui-spreadsheet__peer-cell--flag-below': frame.flagBelow }"
      :style="rectStyle(frame.rect)"
    >
      <span class="nui-spreadsheet__peer-name" dir="auto">{{ frame.name }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { peerFramesOf } from './sheet-peers';
import { rectStyle } from './sheet-rect';
import type { SheetPeersProps, ShownPeerArea, ShownPeerFrame } from './sheet.types';

const { peers, sheet, cells, rectOf } = defineProps<SheetPeersProps>();

const shown = computed((): readonly ShownPeerFrame[] =>
  peerFramesOf(peers, sheet, cells).map((frame) => ({
    key: frame.key,
    name: frame.name,
    tone: frame.tone,
    flagBelow: frame.flagBelow,
    rect: rectOf(frame.cell),
    areas: frame.areas.reduce<ShownPeerArea[]>((areas, range, at) => {
      const rect = rectOf(range);

      if (rect !== undefined) {
        areas.push({ key: String(at), rect });
      }

      return areas;
    }, []),
  })),
);
</script>
