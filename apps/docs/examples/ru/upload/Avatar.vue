<template>
  <NuiAvatarUpload
    v-model="avatar"
    :upload="upload"
    name="Анна Титова"
    label="Фото сотрудника"
    description="PNG или JPEG до 2 МБ"
    :max-size="2 * 1024 * 1024"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAvatarUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/kit';

const avatar = ref<NuiUploadItem<string> | null>(null);

const upload: NuiUploadAdapter<string> = async (file, { onProgress }) => {
  onProgress(1);
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
