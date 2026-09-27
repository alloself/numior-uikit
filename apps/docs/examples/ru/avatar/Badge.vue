<template>
  <NuiAvatar name="Анна Титова" size="lg">
    <template #badge>
      <NuiBadge tone="error" :count="3" size="sm" label="Новых сообщений" />
    </template>
  </NuiAvatar>
</template>

<script setup lang="ts">
import { NuiAvatar, NuiBadge } from '@numior/vue';
</script>
