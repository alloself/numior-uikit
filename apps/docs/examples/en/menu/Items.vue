<template>
  <NuiMenu :items="entries" placement="bottom-end" label="Order actions">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral" aria-label="Actions">
        <NuiIcon alias="ellipsis" />
      </NuiButton>
    </template>
  </NuiMenu>
  <p class="text-sm text-muted-foreground">Action: {{ last || 'none yet' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiIcon, NuiMenu, type NuiMenuEntry } from '@numior/vue';

const last = ref('');

const entries: NuiMenuEntry[] = [
  { label: 'Open', icon: 'eye', onSelect: () => (last.value = 'Open') },
  { label: 'Copy link', icon: 'link', onSelect: () => (last.value = 'Link') },
  { type: 'separator' },
  {
    label: 'Cancel order',
    icon: 'trash',
    tone: 'error',
    onSelect: () => (last.value = 'Cancel'),
  },
];
</script>
