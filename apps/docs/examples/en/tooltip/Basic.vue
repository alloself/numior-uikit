<template>
  <NuiTooltip>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Save</NuiButton>
    </template>
    Saves the document and the change history
  </NuiTooltip>
  <NuiTooltip placement="bottom" :open-delay="0">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral">Publish</NuiButton>
    </template>
    Shown without a delay
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/vue';
</script>
