<template>
  <section class="panel" aria-labelledby="book-title">
    <div class="section-heading">
      <h2 id="book-title">Книга</h2>
      <span class="tag">NuiSpreadsheet · @numior/spreadsheet</span>
    </div>
    <div class="data-row">
      <NuiSelect
        v-model="sheetIndex"
        :options="sheetOptions"
        aria-label="Лист книги"
        data-testid="book-sheet"
      />
      <NuiUpload
        v-model="files"
        :upload="openBook"
        variant="button"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        :multiple="false"
        browse-label="Открыть XLSX"
        data-testid="book-open"
      />
    </div>
    <NuiSpreadsheet :book="book" :sheet="sheetIndex" label="Книга" data-testid="book" />
  </section>
</template>

<script setup lang="ts">
import { NuiSpreadsheet } from '@numior/spreadsheet';
import type { Workbook } from '@numior/spreadsheet/core';
import { readWorkbook } from '@numior/spreadsheet/xlsx';
import { NuiSelect, NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';
import { computed, markRaw, ref, watch } from 'vue';
import { sampleBook } from './book-sample';

const sample = markRaw(sampleBook());
const sheetIndex = ref(0);
const files = ref<NuiUploadItem<Workbook>[]>([]);

const openedOf = (item: NuiUploadItem<Workbook> | undefined): Workbook | undefined =>
  item?.status === 'done' ? item.result : undefined;

const book = computed(() => openedOf(files.value.at(-1)) ?? sample);

const sheetOptions = computed(() =>
  book.value.sheets.map((sheet, index) => ({ value: index, label: sheet.name })),
);

const openBook: NuiUploadAdapter<Workbook> = async (file) => {
  const read = await readWorkbook(new Uint8Array(await file.arrayBuffer()));

  if (read.kind === 'rejected') {
    throw new Error(`Книга не открылась: ${read.reason}`);
  }
  return markRaw(read.book);
};

watch(book, () => {
  sheetIndex.value = 0;
});
</script>
