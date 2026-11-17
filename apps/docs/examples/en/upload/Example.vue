<template>
  <div class="w-full max-w-md">
    <NuiUpload v-model="photos" :upload="upload" accept="image/*" v-bind="$attrs" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/kit';

defineOptions({ inheritAttrs: false });

const photos = ref<NuiUploadItem<string>[]>([]);
const upload: NuiUploadAdapter<string> = (file) => Promise.resolve(URL.createObjectURL(file));
</script>
