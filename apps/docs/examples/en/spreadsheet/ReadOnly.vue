<template>
  <NuiSpreadsheet
    class="w-full"
    :book="book"
    :formula-bar="false"
    :sheet-tabs="false"
    readonly
    label="Plans"
    height="12rem"
  />
</template>

<script setup lang="ts">
import { NuiSpreadsheet } from '@numior/kit/spreadsheet';
import { createWorkbook, numberValue, textValue } from '@numior/kit/spreadsheet/core';

const PLANS = [
  { plan: 'Starter', price: 490 },
  { plan: 'Team', price: 1290 },
  { plan: 'Business', price: 3900 },
];

const book = createWorkbook();
const sheet = book.addSheet('Plans');

sheet.cells.set(0, 0, textValue('Plan'));
sheet.cells.set(0, 1, textValue('Price per month, $'));

PLANS.forEach(({ plan, price }, index) => {
  sheet.cells.set(index + 1, 0, textValue(plan));
  sheet.cells.set(index + 1, 1, numberValue(price));
});
</script>
