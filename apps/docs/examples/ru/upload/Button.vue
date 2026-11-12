<template>
  <div class="w-full max-w-md">
    <NuiUpload
      v-model="stock"
      :upload="upload"
      variant="button"
      label="Остатки склада"
      description="Таблица CSV с артикулами и количеством"
      accept=".csv,text/csv"
      :multiple="false"
      browse-label="Выбрать CSV"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const stock = ref<NuiUploadItem<string>[]>([]);

const upload: NuiUploadAdapter<string> = async (file, { onProgress }) => {
  onProgress(1);
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
