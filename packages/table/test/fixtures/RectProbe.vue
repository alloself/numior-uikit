<template>
  <i v-if="rect !== undefined" class="mark" :data-rect="JSON.stringify(rect)" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NuiTableOverlaySlot } from '../../src';

const { rectOf } = defineProps<NuiTableOverlaySlot>();

const rect = computed(() => rectOf({ from: { row: 2, col: 1 }, to: { row: 3, col: 2 } }));
</script>
