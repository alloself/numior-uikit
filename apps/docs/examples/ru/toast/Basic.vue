<template>
  <NuiButton
    @click="toast.info('Счёт отправлен', { description: 'Алина Юсупова получит его на почту' })"
  >
    Информация
  </NuiButton>
  <NuiButton variant="soft" tone="success" @click="toast.success('Заказ 20409 оплачен')">
    Успех
  </NuiButton>
  <NuiButton variant="outline" tone="error" @click="fail">Ошибка с действием</NuiButton>
</template>

<script setup lang="ts">
import { useToast } from '@numior/primitives';
import { NuiButton } from '@numior/vue';

const toast = useToast();

const fail = (): void => {
  const id = toast.error('Не удалось сохранить', {
    duration: 0,
    action: {
      label: 'Повторить',
      onClick: () => toast.show({ id, title: 'Сохранено', tone: 'success' }),
    },
  });
};
</script>
