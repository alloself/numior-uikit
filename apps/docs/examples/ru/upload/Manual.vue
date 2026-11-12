<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <NuiUpload
      ref="uploader"
      v-model="invoices"
      :upload="upload"
      :auto="false"
      label="Накладные поставщика"
      description="Проверьте список и нажмите «Загрузить»"
      accept=".pdf"
    />
    <NuiButton class="self-start" :disabled="queued === 0" @click="uploader?.start()">
      Загрузить
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiButton, NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const STEPS = [0.2, 0.4, 0.6, 0.8, 1];

const uploader = useTemplateRef<{ start: () => void }>('uploader');
const invoices = ref<NuiUploadItem<string>[]>([]);

const queued = computed(() =>
  invoices.value.reduce((count, item) => count + Number(item.status === 'queued'), 0),
);

const upload: NuiUploadAdapter<string> = async (file, { onProgress, signal }) => {
  for (const share of STEPS) {
    await promiseTimeout(300);
    signal.throwIfAborted();
    onProgress(share);
  }
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
