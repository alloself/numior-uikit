<template>
  <NuiUpload
    v-model="photos"
    :upload="upload"
    label="Product photos"
    accept="image/*"
    layout="grid"
    drop-label="Drop images here"
    browse-label="Choose images"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const photos = ref<NuiUploadItem<string>[]>([]);

const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Upload cancelled'));
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
