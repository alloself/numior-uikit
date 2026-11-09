<template>
  <NuiSpreadsheet
    v-bind="opened"
    class="w-full"
    file-bar
    label="Department budget"
    height="16rem"
    @open="onOpen"
  />
</template>

<script setup lang="ts">
import { NuiSpreadsheet, type NuiSpreadsheetFile } from '@numior/spreadsheet';
import { createWorkbook, numberValue, textValue, type Workbook } from '@numior/spreadsheet/core';
import { markRaw, shallowRef } from 'vue';

interface FirstBook {
  readonly book: Workbook;
  readonly fileName: string;
}

const createBudget = (): FirstBook => {
  const book = createWorkbook();
  const sheet = book.addSheet('Budget');

  sheet.cells.set(0, 0, textValue('Item'));
  sheet.cells.set(0, 1, textValue('Amount, $'));
  sheet.cells.set(1, 0, textValue('Rent'));
  sheet.cells.set(1, 1, numberValue(95000));
  sheet.cells.set(2, 0, textValue('Salaries'));
  sheet.cells.set(2, 1, numberValue(310000));

  return { book, fileName: 'Budget.xlsx' };
};

const opened = shallowRef<FirstBook | NuiSpreadsheetFile>(markRaw(createBudget()));

const onOpen = (file: NuiSpreadsheetFile): void => {
  opened.value = markRaw(file);
};
</script>
