<template>
  <NuiAvatarUpload
    v-model="avatar"
    :upload="upload"
    name="Ann Smith"
    label="Profile photo"
    description="PNG or JPEG up to 2 MB"
    :max-size="2 * 1024 * 1024"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiAvatarUpload, type NuiUploadAdapter, type NuiUploadItem } from '@numior/vue';

const avatar = ref<NuiUploadItem<string> | null>(null);

const upload: NuiUploadAdapter<string> = async (file, { onProgress }) => {
  onProgress(1);
  return `https://files.example/${encodeURIComponent(file.name)}`;
};
</script>
