<template>
  <div class="w-full">
    <NuiEditor
      v-model="document"
      :upload="upload"
      accept="image/png,image/jpeg,application/pdf"
      :max-size="5 * 1024 * 1024"
      label="Инструкция к комоду «Фьорд»"
      description="Картинки PNG и JPEG, файлы PDF до 5 МБ"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout, useBase64 } from '@vueuse/core';
import { NuiEditor, type NuiEditorUploadAdapter } from '@numior/editor-vue';

const STEPS = [0.25, 0.5, 0.75, 1];

const document = ref('<p>Схема сборки и фото готового комода.</p>');

const addressOf = (file: File): Promise<string> =>
  file.type.startsWith('image/')
    ? useBase64(file).promise.value
    : Promise.resolve(`https://files.example/${encodeURIComponent(file.name)}`);

const upload: NuiEditorUploadAdapter = async (file, { onProgress, signal }) => {
  for (const share of STEPS) {
    await promiseTimeout(250);
    signal.throwIfAborted();
    onProgress(share);
  }
  return { url: await addressOf(file) };
};
</script>
