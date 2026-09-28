<template>
  <NuiUpload
    v-model="report"
    :upload="upload"
    variant="button"
    label="Отчёт"
    description="Одна таблица CSV"
    accept=".csv,text/csv"
    :multiple="false"
    browse-label="Выбрать CSV"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const report = ref<NuiUploadItem<string>[]>([]);

const upload: NuiUploadAdapter<string> = async (file, { onProgress }) => {
  onProgress(1);
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
