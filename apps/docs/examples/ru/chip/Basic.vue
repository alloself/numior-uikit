<template>
  <NuiChip tone="success">Оплачено</NuiChip>
  <NuiChip tone="warning" variant="outline">Ждёт склада</NuiChip>
  <NuiChip tone="error" variant="solid">Отменён</NuiChip>
  <NuiChip tone="info" icon="check">Доставлен</NuiChip>
</template>

<script setup lang="ts">
import { NuiChip } from '@numior/vue';
</script>
