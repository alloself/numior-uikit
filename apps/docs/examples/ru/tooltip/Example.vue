<template>
  <NuiTooltip>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Отменить заказ</NuiButton>
    </template>
    Деньги вернутся покупателю на карту
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/vue';
</script>
