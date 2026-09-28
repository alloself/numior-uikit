<template>
  <div class="flex flex-col gap-3">
    <NuiToggleGroup v-model="scheme" :items="schemes" variant="segmented" required label="Scheme" />
    <p class="m-0 text-sm text-muted-foreground">Selected: {{ scheme }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';

const scheme = ref<string | null>('system');

const schemes: readonly NuiToggleItem[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];
</script>
