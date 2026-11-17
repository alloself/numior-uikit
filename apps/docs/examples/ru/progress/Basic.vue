<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <div class="flex justify-between text-sm">
        <span>Сборка заказа 20410</span>
        <span class="text-muted-foreground">5 из 7 товаров</span>
      </div>
      <NuiProgress :value="5" :max="7" label="Сборка заказа 20410" value-text="5 из 7 товаров" />
    </div>
    <div class="flex flex-col gap-2">
      <span class="text-sm">Ждём ответа банка по заказу 20411</span>
      <NuiProgress label="Ждём ответа банка по заказу 20411" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuiProgress } from '@numior/kit';
</script>
