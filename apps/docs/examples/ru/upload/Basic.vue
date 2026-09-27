<template>
  <NuiUpload
    v-model="documents"
    :upload="upload"
    label="Документы"
    description="PDF до 5 МБ, не больше трёх файлов"
    accept=".pdf"
    :max-size="5 * 1024 * 1024"
    :max-files="3"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const documents = ref<NuiUploadItem<string>[]>([]);

const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Загрузка отменена'));
    });
  });

const upload: NuiUploadAdapter<string> = async (file, { onProgress, signal }) => {
  for (let step = 1; step <= 5; step += 1) {
    await wait(300, signal);
    onProgress(step / 5);
  }
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
