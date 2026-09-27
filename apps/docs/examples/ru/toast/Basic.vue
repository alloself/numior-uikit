<template>
  <NuiButton
    @click="toast.info('Черновик сохранён', { description: 'Синхронизация через минуту' })"
  >
    Информация
  </NuiButton>
  <NuiButton variant="soft" tone="success" @click="toast.success('Проект опубликован')">
    Успех
  </NuiButton>
  <NuiButton variant="outline" tone="error" @click="fail">Ошибка с действием</NuiButton>
</template>

<script setup lang="ts">
import { NuiButton, useToast } from '@numior/vue';

const toast = useToast();

const fail = (): void => {
  toast.error('Не удалось сохранить', {
    duration: 0,
    action: { label: 'Повторить', onClick: () => toast.success('Сохранено') },
  });
};
</script>
