<template>
  <form class="nui-editor-media__form" @submit.prevent="insert">
    <NuiField :label="texts.mediaAddress" :error="invalid ? invalidText : undefined">
      <NuiInput
        v-model="address"
        size="sm"
        placeholder="https://"
        autocomplete="url"
        autofocus
        @keydown="onKeydown"
        @update:model-value="invalid = false"
      />
    </NuiField>
    <div class="nui-editor-media__actions">
      <NuiButton type="submit" size="sm">{{ texts.mediaInsert }}</NuiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { Key, useMessages } from '@numior/primitives';
import { NuiButton, NuiField, NuiInput } from '@numior/vue';
import { ref } from 'vue';
import { editorMessages } from '../editor/editor.messages';

const { valid, invalidText } = defineProps<{
  valid: (url: string) => boolean;
  invalidText: string;
}>();

const emit = defineEmits<{ link: [url: string]; cancel: [] }>();

const texts = useMessages(editorMessages);
const address = ref('');
const invalid = ref(false);

const insert = (): void => {
  const url = address.value.trim();

  if (url !== '' && valid(url)) {
    emit('link', url);
  } else {
    invalid.value = true;
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === Key.Escape) {
    event.preventDefault();
    emit('cancel');
  }
};
</script>
