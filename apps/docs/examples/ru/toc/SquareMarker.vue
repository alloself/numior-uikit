<template>
  <div class="w-full grid-auto gap-6">
    <div ref="article" class="h-80 overflow-auto border rounded-md p-4" tabindex="0">
      <h2 id="toc-square-terms" class="mt-0 text-lg font-semibold">Условия возврата</h2>
      <p>Покупатель возвращает товар в течение 14 дней после получения заказа.</p>
      <p>Упаковка и ярлыки должны остаться на месте.</p>
      <h2 id="toc-square-request" class="text-lg font-semibold">Как оформить</h2>
      <p>Заявка создаётся в карточке заказа кнопкой «Оформить возврат».</p>
      <h3 id="toc-square-courier" class="font-semibold">Курьером</h3>
      <p>Курьер забирает посылку по адресу доставки заказа.</p>
      <p>Время приезда покупатель выбирает в письме с подтверждением.</p>
      <h3 id="toc-square-pickup" class="font-semibold">Через пункт выдачи</h3>
      <p>Покупатель приносит посылку в любой пункт выдачи и называет номер заявки.</p>
      <p>Пункт передаёт её на склад в течение двух дней.</p>
      <h2 id="toc-square-refund" class="text-lg font-semibold">Возврат денег</h2>
      <p>Деньги уходят на карту, которой оплачен заказ.</p>
      <p>Банк зачисляет их за три–пять рабочих дней.</p>
      <p>Статус возврата виден в разделе «Оплаты».</p>
    </div>
    <NuiToc :items="items" :root="article" marker="square" />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { NuiToc, type NuiTocItem } from '@numior/vue';

const article = useTemplateRef<HTMLElement>('article');

const items: readonly NuiTocItem[] = [
  { id: 'toc-square-terms', label: 'Условия возврата' },
  {
    id: 'toc-square-request',
    label: 'Как оформить',
    children: [
      { id: 'toc-square-courier', label: 'Курьером' },
      { id: 'toc-square-pickup', label: 'Через пункт выдачи' },
    ],
  },
  { id: 'toc-square-refund', label: 'Возврат денег' },
];
</script>
