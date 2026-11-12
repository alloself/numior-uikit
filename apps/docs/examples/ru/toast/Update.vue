<template>
  <NuiButton variant="outline" @click="publish">Опубликовать отчёт</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, useToast } from '@numior/vue';

const toast = useToast();

const publish = (): void => {
  const id = toast.info('Публикуем отчёт…', { duration: 0, closable: false });

  setTimeout(() => {
    toast.show({ id, title: 'Отчёт опубликован', tone: 'success', duration: 4000 });
  }, 1500);
};
</script>
