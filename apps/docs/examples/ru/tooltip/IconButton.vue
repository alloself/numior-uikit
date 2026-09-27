<template>
  <NuiTooltip placement="right">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="error" aria-label="Удалить черновик">
        <NuiIcon alias="trash" />
      </NuiButton>
    </template>
    Удалить черновик без подтверждения
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon, NuiTooltip } from '@numior/vue';
</script>
