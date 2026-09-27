<template>
  <NuiUpload
    ref="uploader"
    v-model="attachments"
    :upload="upload"
    :auto="false"
    label="Вложения"
    :description="`В очереди: ${queued}`"
  />
  <NuiButton :disabled="queued === 0" @click="uploader?.start()">Загрузить</NuiButton>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { NuiButton, NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const uploader = useTemplateRef<{ start: () => void }>('uploader');
const attachments = ref<NuiUploadItem<string>[]>([]);
const queued = computed(() => attachments.value.filter((item) => item.status === 'queued').length);

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
