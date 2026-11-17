<template>
  <NuiSpreadsheet
    v-bind="opened"
    class="w-full"
    file-bar
    label="Бюджет отдела"
    height="16rem"
    @open="onOpen"
  />
</template>

<script setup lang="ts">
import { NuiSpreadsheet, type NuiSpreadsheetFile } from '@numior/kit/spreadsheet';
import {
  createWorkbook,
  numberValue,
  textValue,
  type Workbook,
} from '@numior/kit/spreadsheet/core';
import { markRaw, shallowRef } from 'vue';

interface FirstBook {
  readonly book: Workbook;
  readonly fileName: string;
}

const createBudget = (): FirstBook => {
  const book = createWorkbook();
  const sheet = book.addSheet('Бюджет');

  sheet.cells.set(0, 0, textValue('Статья'));
  sheet.cells.set(0, 1, textValue('Сумма, ₽'));
  sheet.cells.set(1, 0, textValue('Аренда'));
  sheet.cells.set(1, 1, numberValue(95000));
  sheet.cells.set(2, 0, textValue('Зарплаты'));
  sheet.cells.set(2, 1, numberValue(310000));

  return { book, fileName: 'Бюджет.xlsx' };
};

const opened = shallowRef<FirstBook | NuiSpreadsheetFile>(markRaw(createBudget()));

const onOpen = (file: NuiSpreadsheetFile): void => {
  opened.value = markRaw(file);
};
</script>
