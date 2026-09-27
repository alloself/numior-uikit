<template>
  <NuiPopover v-for="side in sides" :key="side.value" :placement="side.value" :offset="12">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral">{{ side.label }}</NuiButton>
    </template>
    <p class="nui-p-1">Layer on the {{ side.label.toLowerCase() }}</p>
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiButton, NuiPopover, type FloatingPlacement } from '@numior/vue';

const sides: { value: FloatingPlacement; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom-end', label: 'Bottom end' },
  { value: 'left', label: 'Left' },
];
</script>
