<template>
  <NuiTooltip shortcut="mod+shift+c" placement="bottom">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        variant="ghost"
        tone="neutral"
        icon="copy"
        aria-label="Скопировать ссылку"
      />
    </template>
    Скопировать ссылку
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/kit';
</script>
