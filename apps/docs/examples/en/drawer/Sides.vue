<template>
  <NuiToggleGroup v-model="side" :items="sides" label="Side" variant="segmented" />
  <NuiButton variant="outline" @click="open = true">Open drawer</NuiButton>
  <NuiDrawer v-model:open="open" :side="side ?? 'end'" title="Notifications" size="sm">
    <p>No new notifications.</p>
  </NuiDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiDrawer, NuiToggleGroup, type NuiDrawerSide } from '@numior/vue';

const open = ref(false);
const side = ref<NuiDrawerSide | null>('end');

const sides = [
  { value: 'start', label: 'Left' },
  { value: 'end', label: 'Right' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
];
</script>
