<template>
  <NuiAvatar name="Anna Titova" size="lg">
    <template #badge>
      <NuiBadge tone="error" :count="3" size="sm" label="New messages" />
    </template>
  </NuiAvatar>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiBadge } from '@numior/vue';
</script>
