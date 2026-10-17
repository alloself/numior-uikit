<template>
  <Teleport v-for="card in uploads.cards.value" :key="card.item.id" :to="card.element">
    <NuiEditorUploadCard
      :item="card.item"
      :preview="card.preview"
      @cancel="uploads.cancel(card.item.id)"
      @retry="uploads.retry(card.item.id)"
    />
  </Teleport>
  <span class="nui-editor__live" aria-live="polite" aria-atomic="true">{{
    uploads.announcement.value
  }}</span>
  <NuiEditorMediaPanel
    v-if="media"
    v-model:open="open"
    :anchor="anchor"
    :kind="kind"
    :uploadable="uploads.enabled.value && picked !== undefined"
    :accept="picked"
    :valid="valid"
    @files="onFiles"
    @link="onLink"
    @cancel="close"
  />
</template>

<script setup lang="ts">
import type { Schema } from '@numior/editor-core';
import { computed } from 'vue';
import NuiEditorMediaPanel from './NuiEditorMediaPanel.vue';
import NuiEditorUploadCard from './NuiEditorUploadCard.vue';
import type { MediaKind } from './uploads.types';
import type { EditorUploads } from './use-editor-uploads';

const { uploads, schema, anchor, kind, accept } = defineProps<{
  uploads: EditorUploads;
  schema: Schema;
  anchor: HTMLElement | null;
  kind: MediaKind;
  accept: string | undefined;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{ done: [] }>();

const media = schema.nodes.has('image') || schema.nodes.has('file');

const picked = computed(() => (kind === 'image' ? uploads.images.value : (accept ?? '')));

const valid = (url: string): boolean =>
  schema.nodes.get(kind)?.attrs[kind === 'image' ? 'src' : 'url']?.verify?.(url) ?? true;

const close = (): void => {
  open.value = false;
  emit('done');
};

const onFiles = (files: readonly File[]): void => {
  close();
  uploads.add(files, undefined, picked.value);
};

const onLink = (url: string): void => {
  close();
  uploads.insertLink(kind, url);
};
</script>
