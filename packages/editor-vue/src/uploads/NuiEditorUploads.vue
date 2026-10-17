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
    :invalid-text="kind === 'embed' ? texts.embedInvalid : texts.mediaInvalid"
    @files="onFiles"
    @link="onLink"
    @cancel="close"
  />
</template>

<script setup lang="ts">
import { webAddress } from '@numior/content';
import type { Schema } from '@numior/editor-core';
import { useMessages } from '@numior/primitives';
import { computed } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { EditorLinks } from '../links/use-editor-links';
import NuiEditorMediaPanel from './NuiEditorMediaPanel.vue';
import NuiEditorUploadCard from './NuiEditorUploadCard.vue';
import type { MediaKind } from './uploads.types';
import type { EditorUploads } from './use-editor-uploads';

const { uploads, links, schema, anchor, kind, accept } = defineProps<{
  uploads: EditorUploads;
  links: EditorLinks;
  schema: Schema;
  anchor: HTMLElement | null;
  kind: MediaKind;
  accept: string | undefined;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{ done: [] }>();

const texts = useMessages(editorMessages);

const media = ['image', 'file', 'embed', 'bookmark'].some((name) => schema.nodes.has(name));

const picked = computed(() => {
  switch (kind) {
    case 'image':
      return uploads.images.value;
    case 'file':
      return accept ?? '';
    default:
      return undefined;
  }
});

const valid = (url: string): boolean => {
  switch (kind) {
    case 'embed':
      return links.embedOf(url) !== undefined;
    case 'bookmark':
      return webAddress(url) !== undefined;
    case 'image':
      return schema.nodes.get('image')?.attrs.src?.verify?.(url) ?? true;
    case 'file':
      return schema.nodes.get('file')?.attrs.url?.verify?.(url) ?? true;
  }
};

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
  if (kind === 'embed' || kind === 'bookmark') {
    links.insert(kind, url);
  } else {
    uploads.insertLink(kind, url);
  }
};
</script>
