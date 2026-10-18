<template>
  <OptionalField :field="field">
    <NuiUpload ref="upload" v-bind="props" v-model="model" :upload="adapter" v-on="listeners" />
  </OptionalField>
</template>

<script setup lang="ts">
import type { FileRejection } from '@numior/primitives';
import { ref, useTemplateRef } from 'vue';
import {
  NuiUpload,
  type NuiFieldProps,
  type NuiUploadAdapter,
  type NuiUploadItem,
  type NuiUploadProps,
} from '../../src';
import OptionalField from './OptionalField.vue';

const {
  props = {},
  initialItems = [],
  field = undefined,
  adapter,
} = defineProps<{
  props?: Omit<NuiUploadProps<string>, 'upload'> | undefined;
  initialItems?: NuiUploadItem<string>[] | undefined;
  field?: NuiFieldProps | undefined;
  adapter: NuiUploadAdapter<string>;
}>();

const model = ref(initialItems);
const events: string[] = [];
const upload = useTemplateRef('upload');

const listeners = {
  reject: (rejections: readonly FileRejection[]) => {
    events.push(`reject:${rejections.map((entry) => entry.file.name).join(',')}`);
  },
  done: (item: NuiUploadItem<string>) => {
    events.push(`done:${item.name}`);
  },
  error: (item: NuiUploadItem<string>) => {
    events.push(`error:${item.name}`);
  },
  remove: (item: NuiUploadItem<string>) => {
    events.push(`remove:${item.name}`);
  },
};

const open = (): void => {
  upload.value?.open();
};

const start = (): void => {
  upload.value?.start();
};

const remove = (id: string): void => {
  upload.value?.remove(id);
};

defineExpose({ model, events, open, start, remove });
</script>
