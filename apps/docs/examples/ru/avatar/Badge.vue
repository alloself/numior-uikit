<template>
  <NuiAvatar name="Мария Ким" size="lg">
    <template #badge>
      <NuiBadge tone="error" :count="3" size="sm" />
    </template>
  </NuiAvatar>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiBadge } from '@numior/kit';
</script>
