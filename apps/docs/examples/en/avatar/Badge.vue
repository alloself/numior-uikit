<template>
  <NuiAvatar name="Maria Kim" size="lg">
    <template #badge>
      <NuiBadge tone="error" :count="3" size="sm" />
    </template>
  </NuiAvatar>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiBadge } from '@numior/vue';
</script>
