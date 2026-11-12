<template>
  <div class="flex flex-col gap-4 p-6">
    <div class="flex flex-col gap-1">
      <h1 class="m-0 text-xl font-semibold tracking-tight">Price list</h1>
      <p class="m-0 text-sm text-muted-foreground">
        Change a cost or a markup, and the price and the stock value recalculate
      </p>
    </div>
    <NuiSpreadsheet
      class="w-full"
      :book="book"
      :calculator="calculator"
      label="Price list"
      height="28rem"
    />
  </div>
</template>

<script setup lang="ts">
import { NuiSpreadsheet } from '@numior/spreadsheet';
import {
  createCalculator,
  createWorkbook,
  lineLayoutsOf,
  numberValue,
  textValue,
  type LineLayout,
} from '@numior/spreadsheet/core';
import { products } from '#demo/products';

const HEADER = ['SKU', 'Name', 'Cost', 'Markup, %', 'Price', 'In stock', 'Value'];
const MARGIN = 60;
const TOTAL_LABEL = 'Total';

const WIDTHS = [10, 30, 12, 12, 12, 12, 14];
const MONEY_COLUMNS = [2, 4, 6];

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
const sheet = book.addSheet('Prices');
const money = book.formats.id('#,##0');
const bold = book.decorations.id({ font: { bold: true } });

sheet.layout = {
  ...sheet.layout,
  cols: lineLayoutsOf(WIDTHS.map((size, col) => [col, columnOf(size)])),
  view: { ...sheet.layout.view, frozenRows: 1 },
};

HEADER.forEach((title, col) => {
  sheet.cells.set(0, col, textValue(title));
  sheet.decorations.set(0, col, bold);
});

products.forEach((product, index) => {
  const row = index + 1;
  const line = String(row + 1);

  sheet.cells.set(row, 0, textValue(product.sku));
  sheet.cells.set(row, 1, textValue(product.name));
  sheet.cells.set(row, 2, numberValue(product.price / (1 + MARGIN / 100)));
  sheet.cells.set(row, 3, numberValue(MARGIN));
  calculator.setFormula(sheet, row, 4, `=C${line}*(1+D${line}/100)`);
  sheet.cells.set(row, 5, numberValue(product.stock));
  calculator.setFormula(sheet, row, 6, `=E${line}*F${line}`);

  MONEY_COLUMNS.forEach((col) => {
    sheet.formats.set(row, col, money);
  });
});

const last = String(products.length + 1);
const totalRow = products.length + 1;

sheet.cells.set(totalRow, 1, textValue(TOTAL_LABEL));
sheet.decorations.set(totalRow, 1, bold);
sheet.decorations.set(totalRow, 5, bold);
sheet.decorations.set(totalRow, 6, bold);
sheet.formats.set(totalRow, 6, money);
calculator.setFormula(sheet, totalRow, 5, `=SUM(F2:F${last})`);
calculator.setFormula(sheet, totalRow, 6, `=SUM(G2:G${last})`);
calculator.recalculate();
</script>
