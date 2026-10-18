<template>
  <NuiAvatarUpload
    v-bind="avatar"
    v-model="model"
    :upload="upload"
    @reject="events.push(`reject:${$event.reason}`)"
    @done="events.push(`done:${$event.name}`)"
    @error="events.push(`error:${$event.name}`)"
    @remove="events.push(`remove:${$event.name}`)"
  />
</template>

<script setup lang="ts">
import { NuiAvatarUpload, type NuiAvatarUploadProps, type NuiUploadItem } from '../../src';

const { avatar = {}, upload } = defineProps<{
  avatar?: Omit<NuiAvatarUploadProps<string>, 'upload'> | undefined;
  upload: NuiAvatarUploadProps<string>['upload'];
}>();

const model = defineModel<NuiUploadItem<string> | null>({ required: true });

const events: string[] = [];

defineExpose({ model, events });
</script>
