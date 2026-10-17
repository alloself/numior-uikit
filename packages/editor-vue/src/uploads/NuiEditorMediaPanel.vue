<template>
  <NuiPopover
    v-model:open="open"
    class="nui-editor-media"
    :anchor="anchor"
    placement="bottom-start"
    :offset="8"
    role="dialog"
    :aria-label="title"
    @toggle="onToggle"
  >
    <div ref="body" class="nui-editor-media__body">
      <NuiTabs v-if="uploadable" v-model="tab" size="sm" :tabs="tabs" :label="title">
        <template #panel="{ tab: shown }">
          <div v-if="shown.value === 'upload'" class="nui-editor-media__upload">
            <NuiButton class="nui-editor-media__choose" size="sm" icon="upload" @click="choose">{{
              kind === 'image' ? texts.chooseImage : texts.chooseFile
            }}</NuiButton>
            <p class="nui-editor-media__hint">{{ texts.mediaDropHint }}</p>
          </div>
          <form v-else class="nui-editor-media__form" @submit.prevent="insert">
            <NuiField :label="texts.mediaAddress" :error="invalid ? texts.mediaInvalid : undefined">
              <NuiInput
                v-model="address"
                size="sm"
                placeholder="https://"
                autocomplete="url"
                @keydown="onKeydown"
                @update:model-value="invalid = false"
              />
            </NuiField>
            <NuiButton type="submit" size="sm">{{ texts.mediaInsert }}</NuiButton>
          </form>
        </template>
      </NuiTabs>
      <form v-else class="nui-editor-media__form" @submit.prevent="insert">
        <NuiField :label="texts.mediaAddress" :error="invalid ? texts.mediaInvalid : undefined">
          <NuiInput
            v-model="address"
            size="sm"
            placeholder="https://"
            autocomplete="url"
            @keydown="onKeydown"
            @update:model-value="invalid = false"
          />
        </NuiField>
        <NuiButton type="submit" size="sm">{{ texts.mediaInsert }}</NuiButton>
      </form>
      <input
        ref="picker"
        class="nui-editor-media__picker"
        type="file"
        tabindex="-1"
        aria-hidden="true"
        :accept="kind === 'image' ? 'image/*' : accept"
        :multiple="kind === 'file'"
        @change="onPick"
      />
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiField, NuiInput, NuiPopover, NuiTabs } from '@numior/vue';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { MediaKind } from './uploads.types';

const { anchor, kind, uploadable, accept, valid } = defineProps<{
  anchor: HTMLElement | null;
  kind: MediaKind;
  uploadable: boolean;
  accept: string | undefined;
  valid: (url: string) => boolean;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  files: [files: readonly File[]];
  link: [url: string];
  cancel: [];
}>();

const texts = useMessages(editorMessages);
const body = useTemplateRef<HTMLElement>('body');
const picker = useTemplateRef<HTMLInputElement>('picker');
const tab = ref('upload');
const address = ref('');
const invalid = ref(false);

const title = computed(() => (kind === 'image' ? texts.value.image : texts.value.file));

const tabs = computed(() => [
  { value: 'upload', label: texts.value.mediaUpload },
  { value: 'link', label: texts.value.mediaLink },
]);

const choose = (): void => {
  picker.value?.click();
};

const onPick = (): void => {
  const files = [...(picker.value?.files ?? [])];

  if (picker.value !== null) {
    picker.value.value = '';
  }
  if (files.length > 0) {
    emit('files', files);
  }
};

const insert = (): void => {
  const url = address.value.trim();

  if (url !== '' && valid(url)) {
    emit('link', url);
  } else {
    invalid.value = true;
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('cancel');
  }
};

watch(open, (value) => {
  if (value) {
    tab.value = uploadable ? 'upload' : 'link';
    address.value = '';
    invalid.value = false;
  }
});

const onToggle = (event: Event): void => {
  if ('newState' in event && event.newState === 'open') {
    body.value?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"], input')?.focus();
  }
};
</script>
