<template>
  <div class="flex flex-col gap-3">
    <NuiToggleGroup
      v-model:values="panels"
      :items="items"
      multiple
      icon-only
      size="sm"
      label="Panels"
    />
    <p class="m-0 text-sm text-muted-foreground">Open: {{ panels.join(', ') || 'nothing' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/vue';

const panels = ref(['preview']);

const items: readonly NuiToggleItem[] = [
  { value: 'preview', label: 'Preview', icon: 'eye' },
  { value: 'code', label: 'Code', icon: 'code' },
  { value: 'terminal', label: 'Terminal', icon: 'terminal', disabled: true },
];
</script>
