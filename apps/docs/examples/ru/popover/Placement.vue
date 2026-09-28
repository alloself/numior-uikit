<template>
  <NuiPopover v-for="side in sides" :key="side.value" :placement="side.value" :offset="12">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral">{{ side.label }}</NuiButton>
    </template>
    <p class="p-1">Слой со стороны {{ side.label.toLowerCase() }}</p>
  </NuiPopover>
</template>

<script setup lang="ts">
import { NuiButton, NuiPopover, type FloatingPlacement } from '@numior/vue';

const sides: { value: FloatingPlacement; label: string }[] = [
  { value: 'top', label: 'Сверху' },
  { value: 'right', label: 'Справа' },
  { value: 'bottom-end', label: 'Снизу у края' },
  { value: 'left', label: 'Слева' },
];
</script>
