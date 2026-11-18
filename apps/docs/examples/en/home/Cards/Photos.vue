<template>
  <NuiCard>
    <NuiCardHeader>
      <NuiCardTitle>Product photos</NuiCardTitle>
      <NuiCardDescription>Oslo armchair, up to five photos</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent>
      <NuiUpload
        v-model="photos"
        :upload="upload"
        label="Product photos"
        accept="image/jpeg,image/png"
        :max-files="5"
      />
    </NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardTitle,
  NuiUpload,
  type NuiUploadAdapter,
  type NuiUploadItem,
} from '@numior/kit';

const STEPS = [0.25, 0.5, 0.75, 1];

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
