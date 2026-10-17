<template>
  <div class="nui-editor-upload" :class="`nui-editor-upload--status-${item.status}`">
    <img v-if="preview" class="nui-editor-upload__preview" :src="preview" alt="" />
    <span v-else class="nui-editor-upload__icon">
      <NuiIcon :alias="image ? 'image' : 'file'" />
    </span>
    <div class="nui-editor-upload__body">
      <span class="nui-editor-upload__name">{{ item.name }}</span>
      <span class="nui-editor-upload__status">{{ status }}</span>
      <NuiProgress
        v-if="item.status === 'uploading' || item.status === 'queued'"
        class="nui-editor-upload__progress"
        size="sm"
        :value="percent"
        :label="item.name"
      />
    </div>
    <div class="nui-editor-upload__actions">
      <template v-if="item.status === 'error'">
        <NuiButton
          v-if="retryable"
          variant="ghost"
          tone="neutral"
          size="sm"
          icon="refresh"
          @click="emit('retry')"
          >{{ texts.uploadRetry }}</NuiButton
        >
        <NuiButton variant="ghost" tone="neutral" size="sm" @click="emit('cancel')">{{
          texts.uploadDismiss
        }}</NuiButton>
      </template>
      <NuiButton
        v-else
        variant="ghost"
        tone="neutral"
        size="sm"
        icon="x"
        :aria-label="texts.uploadCancel({ name: item.name })"
        @click="emit('cancel')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatFileSize, useLocale, useMessages } from '@numior/primitives';
import { NuiButton, NuiIcon, NuiProgress } from '@numior/vue';
import { computed } from 'vue';
import { editorMessages } from '../editor/editor.messages';
import type { NuiEditorUploadItem } from './uploads.types';

const { item, preview } = defineProps<{
  item: NuiEditorUploadItem;
  preview: string | undefined;
}>();

const emit = defineEmits<{ cancel: []; retry: [] }>();

const texts = useMessages(editorMessages);
const locale = useLocale();

const image = computed(() => item.type.startsWith('image/'));
const percent = computed(() => (item.status === 'uploading' ? Math.round(item.progress * 100) : 0));

const retryable = computed(
  () => item.status === 'error' && item.error.reason === 'upload' && item.file !== undefined,
);

const status = computed(() => {
  if (item.status === 'error') {
    return item.error.message ?? texts.value.uploadFailed({ name: item.name });
  }
  return item.status === 'done'
    ? formatFileSize(item.size, locale.value)
    : texts.value.uploading({ percent: percent.value });
});
</script>
