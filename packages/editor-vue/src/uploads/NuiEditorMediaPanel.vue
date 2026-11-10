<template>
  <NuiPopover
    v-model:open="open"
    lazy
    :anchor="anchor"
    placement="bottom-start"
    :offset="8"
    role="dialog"
    :aria-label="title"
  >
    <div class="nui-editor-media">
      <NuiTabs v-if="uploadable" :key="session" v-model="tab" size="sm" :tabs="tabs" :label="title">
        <template #panel="{ tab: shown }">
          <div v-if="shown.value === MediaTab.Upload" class="nui-editor-media__upload">
            <NuiButton
              class="nui-editor-media__choose"
              size="sm"
              icon="upload"
              autofocus
              @click="choose"
              >{{
                kind === NuiContentNodeType.Image ? texts.chooseImage : texts.chooseFile
              }}</NuiButton
            >
            <p class="nui-editor-media__hint">{{ texts.mediaDropHint }}</p>
          </div>
          <NuiEditorMediaLink
            v-else
            class="nui-editor-media__form--tabbed"
            :valid="valid"
            :invalid-text="invalidText"
            @link="emit('link', $event)"
            @cancel="emit('cancel')"
          />
        </template>
      </NuiTabs>
      <NuiEditorMediaLink
        v-else
        :key="session"
        :valid="valid"
        :invalid-text="invalidText"
        @link="emit('link', $event)"
        @cancel="emit('cancel')"
      />
      <input
        ref="picker"
        class="nui-editor-media__picker"
        type="file"
        tabindex="-1"
        aria-hidden="true"
        :accept="accept === '' ? undefined : accept"
        :multiple="kind === NuiContentNodeType.File"
        @change="onPick"
      />
    </div>
  </NuiPopover>
</template>

<script setup lang="ts">
import { useMessages } from '@numior/primitives';
import { NuiButton, NuiPopover, NuiTabs } from '@numior/vue';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import NuiEditorMediaLink from './NuiEditorMediaLink.vue';
import { MediaTab, type MediaKind } from './uploads.types';
import { NuiContentNodeType } from '@numior/content';

const { anchor, kind, uploadable, accept, valid, invalidText } = defineProps<{
  anchor: HTMLElement | null;
  kind: MediaKind;
  uploadable: boolean;
  accept: string | undefined;
  valid: (url: string) => boolean;
  invalidText: string;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  files: [files: readonly File[]];
  link: [url: string];
  cancel: [];
}>();

const texts = useMessages(editorMessages);
const picker = useTemplateRef<HTMLInputElement>('picker');
const tab = ref('upload');
const session = ref(0);

const title = computed(() => texts.value[kind]);

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

watch(open, (value) => {
  if (!value) {
    return;
  }

  tab.value = 'upload';
  session.value += 1;
});
</script>
