<template>
  <NuiTooltip>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Отправить счёт</NuiButton>
    </template>
    Покупатель получит PDF на почту
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/kit';
</script>
