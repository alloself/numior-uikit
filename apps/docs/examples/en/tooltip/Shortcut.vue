<template>
  <NuiTooltip shortcut="mod+shift+c" placement="bottom">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        variant="ghost"
        tone="neutral"
        icon="copy"
        aria-label="Copy the link"
      />
    </template>
    Copy the link
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/vue';
</script>
