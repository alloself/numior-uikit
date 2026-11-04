<template>
  <form class="nui-editor-link-form" @submit.prevent="save" @keydown="onKeydown">
    <NuiField :label="texts.mediaAddress" :error="invalid ? edit.invalidText : undefined">
      <NuiInput
        v-model="address"
        size="sm"
        placeholder="https://"
        autocomplete="url"
        autofocus
        @update:model-value="invalid = false"
      />
    </NuiField>
    <template v-if="edit.details !== undefined">
      <NuiField :label="texts.linkTitle">
        <NuiInput v-model="title" size="sm" />
      </NuiField>
      <NuiField :label="texts.linkDescription">
        <NuiTextarea v-model="description" size="sm" :rows="2" />
      </NuiField>
    </template>
    <div class="nui-editor-link-form__actions">
      <NuiButton type="submit" size="sm">{{ texts.linkSave }}</NuiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { Key, useMessages } from '@numior/primitives';
import { NuiButton, NuiField, NuiInput, NuiTextarea } from '@numior/vue';
import { ref } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { LinkChange, LinkEdit } from './links.types';

const { edit } = defineProps<{ edit: LinkEdit }>();

const emit = defineEmits<{ save: [change: LinkChange]; cancel: [] }>();

const texts = useMessages(editorMessages);
const address = ref(edit.url);
const title = ref(edit.details?.title ?? '');
const description = ref(edit.details?.description ?? '');
const invalid = ref(false);

const changed = (next: string, before: string | undefined): string | undefined =>
  before === undefined || next.trim() === before ? undefined : next.trim();

const save = (): void => {
  const url = address.value.trim();

  if (url === '' || !edit.valid(url)) {
    invalid.value = true;
    return;
  }

  emit('save', {
    url,
    title: changed(title.value, edit.details?.title),
    description: changed(description.value, edit.details?.description),
  });
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Escape) {
    event.preventDefault();
    emit('cancel');
  }
};
</script>
