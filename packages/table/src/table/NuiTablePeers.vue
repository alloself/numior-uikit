<template>
  <span class="nui-table-peers" aria-hidden="true">
    <span
      v-for="peer in shown"
      :key="peer.key"
      class="nui-table-peers__peer"
      :class="`nui-table-peers__peer--tone-${peer.tone}`"
    >
      <span
        v-for="area in peer.areas"
        :key="area.key"
        class="nui-table-peers__area"
        :style="tableRectStyle(area.rect)"
      ></span>
      <span
        v-if="peer.rect !== undefined"
        class="nui-table-peers__cell"
        :class="{ 'nui-table-peers__cell--flag-below': peer.flagBelow }"
        :style="tableRectStyle(peer.rect)"
      >
        <span class="nui-table-peers__name" dir="auto">{{ peer.name }}</span>
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { shownPeers } from './table-peers';
import { tableRectStyle } from './table-rect';
import type { NuiTablePeersProps } from './table.types';

const { peers, rectOf } = defineProps<NuiTablePeersProps>();

const shown = computed(() => shownPeers(peers, rectOf));
</script>
