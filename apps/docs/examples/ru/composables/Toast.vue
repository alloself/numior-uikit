<template>
  <div class="flex flex-wrap gap-2">
    <NuiButton
      @click="toast.success('Заказ оформлен', { description: 'Номер 4812, доставка в среду' })"
      >Успех</NuiButton
    >
    <NuiButton
      tone="error"
      variant="outline"
      @click="toast.error('Оплата не прошла', { action: { label: 'Повторить', onClick: retry } })"
      >Ошибка</NuiButton
    >
    <NuiButton tone="neutral" variant="ghost" @click="toast.clear()">Убрать все</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, useToast } from '@numior/kit';

const toast = useToast();

const retry = (): void => {
  toast.info('Пробуем ещё раз');
};
</script>
