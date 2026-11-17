<template>
  <div class="flex flex-col gap-3 text-sm">
    <p class="m-0 flex items-center gap-2">
      <NuiBadge tone="success" dot label="В сети" />
      Анна Титова, менеджер заказов
    </p>
    <p class="m-0 flex items-center gap-2">
      <NuiBadge dot label="Не в сети" />
      Игорь Белов, кладовщик
    </p>
  </div>
</template>

<script setup lang="ts">
import { NuiBadge } from '@numior/kit';
</script>
