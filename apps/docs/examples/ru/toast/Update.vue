<template>
  <NuiButton variant="outline" icon="file" @click="exportOrders">Выгрузить заказы</NuiButton>
</template>

<script setup lang="ts">
import { promiseTimeout } from '@vueuse/core';
import { useToast } from '@numior/primitives';
import { NuiButton } from '@numior/vue';
import { orders } from '#demo/orders';

const FILE = 'orders-september.csv';

const CSV = [
  'Заказ;Покупатель;Сумма',
  ...orders.map((order) => `${order.id};${order.customer};${order.total}`),
].join('\n');

const toast = useToast();

const saveFile = (): void => {
  const link = document.createElement('a');

  link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV)}`;
  link.download = FILE;
  link.click();
};

const exportOrders = async (): Promise<void> => {
  const id = toast.info('Готовим файл…', {
    description: 'Заказы за сентябрь',
    duration: 0,
    closable: false,
  });

  await promiseTimeout(1500);

  toast.show({
    id,
    title: 'Файл готов',
    description: FILE,
    tone: 'success',
    duration: 0,
    action: {
      label: 'Скачать',
      onClick: () => {
        saveFile();
        toast.show({ id, title: 'Файл скачан', description: FILE, tone: 'success' });
      },
    },
  });
};
</script>
