<template>
  <div class="w-full max-w-md">
    <NuiUpload
      v-model="photos"
      :upload="upload"
      label="Галерея товара"
      description="До восьми фото, первое станет обложкой карточки"
      accept="image/*"
      layout="grid"
      :max-files="8"
      drop-label="Перетащите фото"
      browse-label="Выбрать фото"
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
