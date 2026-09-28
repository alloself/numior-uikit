<template>
  <NuiBadge tone="error" :count="120" label="Непрочитанных" />
  <NuiBadge tone="info" :count="7" :max="5" label="Черновиков" />
  <NuiBadge tone="success" dot label="В сети" />
  <NuiButton variant="outline" tone="neutral" class="relative">
    Уведомления
    <NuiBadge tone="error" :count="3" floating label="Новых уведомлений" />
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiBadge, NuiButton } from '@numior/vue';
</script>
