<template>
  <section class="panel" aria-labelledby="book-title">
    <div class="section-heading">
      <h2 id="book-title">Книга</h2>
      <span class="tag">NuiSpreadsheet · @numior/spreadsheet</span>
    </div>
    <NuiSpreadsheet
      v-bind="opened"
      v-model:sheet="sheetIndex"
      file-bar
      label="Книга"
      data-testid="book"
      @change="changes += 1"
      @open="onOpen"
    />
    <p role="status" data-testid="book-changes">Правок: {{ changes }}</p>
  </section>
</template>

<script setup lang="ts">
import { NuiSpreadsheet, type NuiSpreadsheetFile } from '@numior/spreadsheet';
import { markRaw, ref, shallowRef } from 'vue';
import { sampleBook, type SampleBook } from './book-sample';

type OpenedBook = NuiSpreadsheetFile | (SampleBook & { readonly fileName: string });

const opened = shallowRef<OpenedBook>(markRaw({ ...sampleBook(), fileName: 'Образец' }));
const sheetIndex = ref(0);
const changes = ref(0);

const onOpen = (file: NuiSpreadsheetFile): void => {
  opened.value = markRaw(file);
  changes.value = 0;
};
</script>
