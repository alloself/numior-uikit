<template>
  <div class="w-full grid-auto gap-6">
    <div ref="article" class="h-80 overflow-auto border rounded-md p-4" tabindex="0">
      <h2 id="toc-returns-terms" class="mt-0 text-lg font-semibold">Условия возврата</h2>
      <p>Покупатель возвращает товар в течение 14 дней после получения заказа.</p>
      <p>Упаковка и ярлыки должны остаться на месте.</p>
      <h2 id="toc-returns-request" class="text-lg font-semibold">Как оформить</h2>
      <p>Заявка создаётся в карточке заказа кнопкой «Оформить возврат».</p>
      <h3 id="toc-returns-courier" class="font-semibold">Курьером</h3>
      <p>Курьер забирает посылку по адресу доставки заказа.</p>
      <p>Время приезда покупатель выбирает в письме с подтверждением.</p>
      <h3 id="toc-returns-pickup" class="font-semibold">Через пункт выдачи</h3>
      <p>Покупатель приносит посылку в любой пункт выдачи и называет номер заявки.</p>
      <p>Пункт передаёт её на склад в течение двух дней.</p>
      <h2 id="toc-returns-refund" class="text-lg font-semibold">Возврат денег</h2>
      <p>Деньги уходят на карту, которой оплачен заказ.</p>
      <p>Банк зачисляет их за три–пять рабочих дней.</p>
      <p>Статус возврата виден в разделе «Оплаты».</p>
    </div>
    <NuiToc :items="items" :root="article" />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { NuiToc, type NuiTocItem } from '@numior/vue';

const article = useTemplateRef<HTMLElement>('article');

const items: readonly NuiTocItem[] = [
  { id: 'toc-returns-terms', label: 'Условия возврата' },
  {
    id: 'toc-returns-request',
    label: 'Как оформить',
    children: [
      { id: 'toc-returns-courier', label: 'Курьером' },
      { id: 'toc-returns-pickup', label: 'Через пункт выдачи' },
    ],
  },
  { id: 'toc-returns-refund', label: 'Возврат денег' },
];
</script>
