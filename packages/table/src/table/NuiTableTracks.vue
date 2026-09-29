<template>
  <colgroup>
    <col v-for="track in tracks" :key="track.key" :style="styleOf(track)" />
  </colgroup>
</template>

<script setup lang="ts">
import type { NuiTableTracksProps, TableTrack } from './table.types';

const { tracks } = defineProps<NuiTableTracksProps>();

const styleOf = (track: TableTrack): Readonly<Record<string, string>> | undefined =>
  track.width === undefined ? undefined : { inlineSize: `${track.width}px` };
</script>
