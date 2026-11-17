<template>
  <div class="flex items-center gap-3">
    <NuiButton variant="ghost" tone="error" aria-label="Delete" icon="trash" />
    <NuiButton variant="outline" tone="neutral">
      <NuiIcon :icon="HeartIcon" /> Add to favorites
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiIcon } from '@numior/kit';
import HeartIcon from './HeartIcon.vue';
</script>
