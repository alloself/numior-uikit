<template>
  <NuiTooltip placement="right">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        variant="ghost"
        tone="error"
        aria-label="Delete the draft"
        icon="trash"
      />
    </template>
    Delete the draft without confirmation
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/vue';
</script>
