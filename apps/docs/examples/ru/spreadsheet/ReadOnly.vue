<template>
  <NuiSpreadsheet
    class="w-full"
    :book="book"
    :formula-bar="false"
    :sheet-tabs="false"
    readonly
    label="Тарифы"
    height="12rem"
  />
</template>

<script setup lang="ts">
import { NuiSpreadsheet } from '@numior/spreadsheet';
import { createWorkbook, numberValue, textValue } from '@numior/spreadsheet/core';

const PLANS = [
  { plan: 'Старт', price: 490 },
  { plan: 'Команда', price: 1290 },
  { plan: 'Бизнес', price: 3900 },
];

const book = createWorkbook();
const sheet = book.addSheet('Тарифы');

sheet.cells.set(0, 0, textValue('Тариф'));
sheet.cells.set(0, 1, textValue('Цена в месяц, ₽'));

PLANS.forEach(({ plan, price }, index) => {
  sheet.cells.set(index + 1, 0, textValue(plan));
  sheet.cells.set(index + 1, 1, numberValue(price));
});
</script>
