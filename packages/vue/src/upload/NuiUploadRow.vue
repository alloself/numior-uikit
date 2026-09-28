<template>
  <li
    class="nui-upload-item"
    :class="[
      `nui-upload-item--status-${item.status}`,
      { 'nui-upload-item--preview': preview !== undefined },
    ]"
  >
    <slot :item="item" :preview="preview" :cancel="cancel" :retry="retry" :remove="remove">
      <NuiRow :title="item.name" nowrap>
        <template #description
          ><bdi>{{ description }}</bdi></template
        >
        <template #leading>
          <img v-if="preview" class="nui-upload-item__thumb" :src="preview" alt="" />
          <NuiIcon v-else :alias="isImage ? 'image' : 'file'" class="nui-upload-item__icon" />
        </template>
        <template #trailing>
          <span class="nui-upload-item__actions">
            <NuiButton
              v-if="item.status === 'uploading'"
              variant="ghost"
              tone="neutral"
              size="sm"
              icon-only
              :aria-label="cancelLabel"
              :disabled="disabled"
              @click="cancel"
            >
              <NuiIcon alias="x" />
            </NuiButton>
            <template v-else>
              <NuiButton
                v-if="canRetry"
                variant="ghost"
                tone="neutral"
                size="sm"
                icon-only
                :aria-label="retryLabel"
                :disabled="disabled"
                @click="retry"
              >
                <NuiIcon alias="refresh" />
              </NuiButton>
              <NuiButton
                variant="ghost"
                tone="neutral"
                size="sm"
                icon-only
                :aria-label="removeLabel"
                :disabled="disabled"
                @click="remove"
              >
                <NuiIcon alias="x" />
              </NuiButton>
            </template>
          </span>
        </template>
      </NuiRow>
      <NuiProgress
        v-if="item.status === 'uploading'"
        class="nui-upload-item__progress"
        size="sm"
        :value="percent"
        :label="item.name"
      />
    </slot>
  </li>
</template>

<script setup lang="ts" generic="R">
import { computed } from 'vue';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiProgress from '../progress/NuiProgress.vue';
import NuiRow from '../row/NuiRow.vue';
import type { NuiUploadRowProps } from './upload.types';

const {
  item,
  preview,
  description,
  cancelLabel,
  retryLabel,
  removeLabel,
  disabled = false,
} = defineProps<NuiUploadRowProps<R>>();

const emit = defineEmits<{ cancel: []; retry: []; remove: [] }>();

const isImage = computed(() => item.type.startsWith('image/'));
const percent = computed(() => (item.status === 'uploading' ? Math.round(item.progress * 100) : 0));

const canRetry = computed(
  () => item.status === 'error' && item.error.reason === 'upload' && item.file !== undefined,
);

const cancel = (): void => emit('cancel');
const retry = (): void => emit('retry');
const remove = (): void => emit('remove');
</script>
