<template>
  <NuiCommand :items="commands" class="w-full max-w-md" />
</template>

<script setup lang="ts">
import { NuiCommand, type NuiCommandSource } from '@numior/kit';

const commands: NuiCommandSource = [
  {
    label: 'Заказы',
    items: [
      { value: 'order', label: 'Создать заказ', icon: 'plus' },
      { value: 'refund', label: 'Оформить возврат', icon: 'refresh' },
    ],
  },
  {
    label: 'Каталог',
    items: [
      { value: 'product', label: 'Добавить товар', icon: 'plus' },
      { value: 'prices', label: 'Загрузить цены', icon: 'upload' },
    ],
  },
];
</script>
