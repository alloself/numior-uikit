<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Living room quote</NuiCardTitle>
      <NuiCardDescription>Change a quantity or the discount and the sums follow</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiSpreadsheet
        class="w-full"
        :book="book"
        :calculator="calculator"
        v-model:selection="selection"
        :sheet-tabs="false"
        label="Living room quote"
        height="15rem"
      />
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
} from '@numior/kit';
import { NuiSpreadsheet, type NuiSpreadsheetSelection } from '@numior/kit/spreadsheet';
import {
  createCalculator,
  createWorkbook,
  lineLayoutsOf,
  numberValue,
  textValue,
  type LineLayout,
} from '@numior/kit/spreadsheet/core';
import { ref } from 'vue';
import { products } from '#demo/products';

const HEADER = ['Item', 'Qty', 'Price', 'Amount'];
const WIDTHS = [15, 8, 10, 10];
const MONEY = '$#,##0';
const DISCOUNT = 5;

const PICKS = [
  { sku: 'S-101', quantity: 2 },
  { sku: 'L-408', quantity: 1 },
  { sku: 'X-501', quantity: 2 },
  { sku: 'X-507', quantity: 4 },
];

const TOTAL_ROW = PICKS.length + 1;
const DISCOUNT_ROW = TOTAL_ROW + 1;
const DUE_ROW = DISCOUNT_ROW + 1;
const AMOUNT_COL = 3;

const productOf = (sku: string): { name: string; price: number } =>
  products.find((item) => item.sku === sku) ?? { name: sku, price: 0 };

const columnOf = (size: number): LineLayout => ({
  size,
  custom: true,
  hidden: false,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
});

const book = createWorkbook();
const calculator = createCalculator(book);
const sheet = book.addSheet('Quote');
const money = book.formats.id(MONEY);
const bold = book.decorations.id({ font: { bold: true } });

sheet.layout = {
  ...sheet.layout,
  cols: lineLayoutsOf(WIDTHS.map((size, col) => [col, columnOf(size)])),
};

HEADER.forEach((title, col) => {
  sheet.cells.set(0, col, textValue(title));
  sheet.decorations.set(0, col, bold);
});

PICKS.forEach(({ sku, quantity }, index) => {
  const row = index + 1;
  const line = String(row + 1);
  const product = productOf(sku);

  sheet.cells.set(row, 0, textValue(product.name));
  sheet.cells.set(row, 1, numberValue(quantity));
  sheet.cells.set(row, 2, numberValue(product.price));
  sheet.formats.set(row, 2, money);
  calculator.setFormula(sheet, row, 3, `=B${line}*C${line}`);
  sheet.formats.set(row, 3, money);
});

const last = String(TOTAL_ROW);
const total = String(TOTAL_ROW + 1);
const discount = String(DISCOUNT_ROW + 1);

sheet.cells.set(TOTAL_ROW, 0, textValue('Subtotal'));
calculator.setFormula(sheet, TOTAL_ROW, 1, `=SUM(B2:B${last})`);
calculator.setFormula(sheet, TOTAL_ROW, 3, `=SUM(D2:D${last})`);
sheet.cells.set(DISCOUNT_ROW, 0, textValue('Discount, %'));
sheet.cells.set(DISCOUNT_ROW, 1, numberValue(DISCOUNT));
calculator.setFormula(sheet, DISCOUNT_ROW, 3, `=-D${total}*B${discount}/100`);
sheet.cells.set(DUE_ROW, 0, textValue('Due'));
calculator.setFormula(sheet, DUE_ROW, 3, `=D${total}+D${discount}`);

[TOTAL_ROW, DISCOUNT_ROW, DUE_ROW].forEach((row) => {
  sheet.formats.set(row, 3, money);
});

[0, 1, 3].forEach((col) => {
  sheet.decorations.set(DUE_ROW, col, bold);
});

calculator.recalculate();

const selection = ref<NuiSpreadsheetSelection>({
  active: { row: DUE_ROW, col: AMOUNT_COL },
  ranges: [{ top: DUE_ROW, left: AMOUNT_COL, bottom: DUE_ROW, right: AMOUNT_COL }],
});
</script>
