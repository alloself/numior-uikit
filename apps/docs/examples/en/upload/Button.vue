<template>
  <div class="w-full max-w-md">
    <NuiUpload
      v-model="stock"
      :upload="upload"
      variant="button"
      label="Warehouse stock"
      description="A CSV table with SKUs and quantities"
      accept=".csv,text/csv"
      :multiple="false"
      browse-label="Choose a CSV"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/kit';

const stock = ref<NuiUploadItem<string>[]>([]);

const upload: NuiUploadAdapter<string> = async (file, { onProgress }) => {
  onProgress(1);
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
