<template>
  <NuiButton variant="outline" tone="neutral" icon="inbox">
    Заказы
    <NuiBadge tone="error" :count="2" floating />
  </NuiButton>
</template>

<script setup lang="ts">
import { NuiBadge, NuiButton } from '@numior/kit';
</script>
