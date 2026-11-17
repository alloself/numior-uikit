<template>
  <div class="w-full max-w-md">
    <NuiUpload
      v-model="photos"
      :upload="upload"
      label="Фото товара"
      description="JPEG или PNG до 5 МБ, не больше пяти фото"
      accept="image/jpeg,image/png"
      :max-size="5 * 1024 * 1024"
      :max-files="5"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/kit';

const STEPS = [0.2, 0.4, 0.6, 0.8, 1];

const photos = ref<NuiUploadItem<string>[]>([]);

const upload: NuiUploadAdapter<string> = async (file, { onProgress, signal }) => {
  for (const share of STEPS) {
    await promiseTimeout(300);
    signal.throwIfAborted();
    onProgress(share);
  }
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
