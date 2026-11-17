<template>
  <NuiMenu :items="actions">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Order actions</NuiButton>
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/kit';

const actions: NuiMenuEntry[] = [
  { label: 'Open the order', icon: 'eye' },
  { label: 'Duplicate', icon: 'copy' },
  { label: 'Assign a manager', icon: 'user' },
  { type: 'separator' },
  { label: 'Cancel the order', icon: 'trash', tone: 'error' },
];
</script>
