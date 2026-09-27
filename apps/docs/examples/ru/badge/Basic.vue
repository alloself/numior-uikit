<template>
  <NuiBadge>Черновик</NuiBadge>
  <NuiBadge tone="primary" icon="check">Готово</NuiBadge>
  <NuiBadge tone="success" variant="outline">Оплачен</NuiBadge>
  <NuiBadge tone="warning" variant="solid" size="sm">Beta</NuiBadge>
</template>

<script setup lang="ts">
import { NuiBadge } from '@numior/vue';
</script>
