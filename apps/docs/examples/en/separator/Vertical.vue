<template>
  <div class="flex items-center gap-1">
    <NuiButton variant="ghost" tone="neutral" size="sm">Export</NuiButton>
    <NuiSeparator orientation="vertical" />
    <NuiButton variant="ghost" tone="neutral" size="sm">Filter</NuiButton>
    <NuiButton variant="ghost" tone="neutral" size="sm">Sort</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiSeparator } from '@numior/kit';
</script>
