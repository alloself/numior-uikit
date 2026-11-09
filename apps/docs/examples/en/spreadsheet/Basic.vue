<template>
  <NuiSpreadsheet
    class="w-full"
    :book="book"
    :calculator="calculator"
    label="Sales by city"
    height="18rem"
  />
</template>

<script setup lang="ts">
import { NuiSpreadsheet } from '@numior/spreadsheet';
import { createCalculator, createWorkbook, numberValue, textValue } from '@numior/spreadsheet/core';

const HEADER = ['City', 'January', 'February', 'Total'];

const CITIES = [
  { city: 'London', january: 1240, february: 1315 },
  { city: 'Leeds', january: 640, february: 702 },
  { city: 'York', january: 410, february: 388 },
  { city: 'Bath', january: 275, february: 310 },
];

const book = createWorkbook();
const calculator = createCalculator(book);
const sheet = book.addSheet('Sales');

HEADER.forEach((title, col) => {
  sheet.cells.set(0, col, textValue(title));
});

CITIES.forEach(({ city, january, february }, index) => {
  const row = index + 1;
  const line = String(row + 1);

  sheet.cells.set(row, 0, textValue(city));
  sheet.cells.set(row, 1, numberValue(january));
  sheet.cells.set(row, 2, numberValue(february));
  calculator.setFormula(sheet, row, 3, `=SUM(B${line}:C${line})`);
});

calculator.recalculate();
</script>
