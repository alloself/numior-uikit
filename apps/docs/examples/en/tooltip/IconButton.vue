<template>
  <NuiTooltip placement="right">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="error" aria-label="Delete the draft">
        <NuiIcon alias="trash" />
      </NuiButton>
    </template>
    Delete the draft without confirmation
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, NuiTooltip } from '@numior/vue';
</script>
