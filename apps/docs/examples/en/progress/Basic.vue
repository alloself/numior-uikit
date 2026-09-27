<template>
  <NuiProgress
    :value="uploaded"
    :max="total"
    label="Uploading files"
    :value-text="`${uploaded} of ${total}`"
  />
  <NuiProgress :value="72" tone="success" size="lg" label="Release readiness" />
  <NuiProgress label="Preparing" size="sm" tone="info" />
</template>

<script setup lang="ts">
import { NuiProgress } from '@numior/vue';

const uploaded = 3;
const total = 8;
</script>
