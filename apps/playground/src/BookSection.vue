<template>
  <section class="panel" aria-labelledby="book-title">
    <div class="section-heading">
      <h2 id="book-title">Книга</h2>
      <span class="tag">NuiSpreadsheet · @numior/spreadsheet</span>
    </div>
    <div class="data-row">
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
    <NuiSpreadsheet
      :book="opened.book"
      :calculator="opened.calculator"
      v-model:sheet="sheetIndex"
      label="Книга"
      data-testid="book"
      @change="changes += 1"
    />
    <p role="status" data-testid="book-changes">Правок: {{ changes }}</p>
  </section>
</template>

<script setup lang="ts">
import { NuiSpreadsheet } from '@numior/spreadsheet';
import { readWorkbook } from '@numior/spreadsheet/xlsx';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';
import { computed, markRaw, ref, watch } from 'vue';
import { sampleBook, type SampleBook } from './book-sample';

const sample = markRaw(sampleBook());
const sheetIndex = ref(0);
const changes = ref(0);
const files = ref<NuiUploadItem<SampleBook>[]>([]);

const openedOf = (item: NuiUploadItem<SampleBook> | undefined): SampleBook | undefined =>
  item?.status === 'done' ? item.result : undefined;

const opened = computed(() => openedOf(files.value.at(-1)) ?? sample);

const openBook: NuiUploadAdapter<SampleBook> = async (file) => {
  const read = await readWorkbook(new Uint8Array(await file.arrayBuffer()));

  if (read.kind === 'rejected') {
    throw new Error(`Книга не открылась: ${read.reason}`);
  }
  return markRaw({ book: read.book, calculator: read.calculator });
};

watch(opened, () => {
  sheetIndex.value = 0;
  changes.value = 0;
});
</script>
