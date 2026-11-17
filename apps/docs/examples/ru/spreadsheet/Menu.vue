<template>
  <div class="flex w-full flex-col gap-3">
    <NuiSpreadsheet :book="book" :context-menu="menu" label="Задачи спринта" height="12rem" />
    <p class="text-muted-foreground">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import { NuiSpreadsheet, type NuiSpreadsheetContextMenu } from '@numior/kit/spreadsheet';
import { columnName, createWorkbook, textValue } from '@numior/kit/spreadsheet/core';
import { ref } from 'vue';

const TASKS = ['Оплата картой', 'Экспорт отчёта', 'Вход по почте'];

const book = createWorkbook();
const sheet = book.addSheet('Спринт');

TASKS.forEach((task, row) => {
  sheet.cells.set(row, 0, textValue(task));
});

const note = ref('Откройте меню правой кнопкой на ячейке.');

const menu: NuiSpreadsheetContextMenu = ({ selection }) => {
  const address = `${columnName(selection.active.col)}${String(selection.active.row + 1)}`;

  return [
    {
      key: 'ticket',
      label: 'Создать задачу из ячейки',
      onSelect: () => {
        note.value = `Задача создана из ячейки ${address}.`;
      },
    },
  ];
};
</script>
