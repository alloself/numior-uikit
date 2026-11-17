<template>
  <NuiTooltip>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Send invoice</NuiButton>
    </template>
    The customer gets a PDF by email
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/kit';
</script>
