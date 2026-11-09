<template>
  <div class="flex w-full flex-col gap-3">
    <NuiSpreadsheet :book="book" :context-menu="menu" label="Sprint tasks" height="12rem" />
    <p class="text-muted-foreground">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import { NuiSpreadsheet, type NuiSpreadsheetContextMenu } from '@numior/spreadsheet';
import { columnName, createWorkbook, textValue } from '@numior/spreadsheet/core';
import { ref } from 'vue';

const TASKS = ['Card payments', 'Report export', 'Email sign-in'];

const book = createWorkbook();
const sheet = book.addSheet('Sprint');

TASKS.forEach((task, row) => {
  sheet.cells.set(row, 0, textValue(task));
});

const note = ref('Right-click a cell to open the menu.');

const menu: NuiSpreadsheetContextMenu = ({ selection }) => {
  const address = `${columnName(selection.active.col)}${String(selection.active.row + 1)}`;

  return [
    {
      key: 'ticket',
      label: 'Create a task from the cell',
      onSelect: () => {
        note.value = `Task created from cell ${address}.`;
      },
    },
  ];
};
</script>
