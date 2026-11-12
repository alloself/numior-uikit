<template>
  <NuiTablePeers :peers="PEERS" :rect-of="rectOf" />
</template>

<script setup lang="ts">
import { NuiTablePeers, type NuiTableOverlaySlot, type NuiTablePeer } from '../../src';

const { rectOf } = defineProps<NuiTableOverlaySlot>();

const PEERS: readonly NuiTablePeer[] = [
  {
    key: 'anna',
    name: 'Anna',
    colour: 2,
    cell: { from: { row: 3, col: 1 }, to: { row: 3, col: 1 } },
  },
  {
    key: 'boris',
    name: 'Boris',
    colour: 9,
    cell: { from: { row: 0, col: 0 }, to: { row: 0, col: 0 } },
    areas: [{ from: { row: 0, col: 0 }, to: { row: 2, col: 2 } }],
  },
];
</script>
