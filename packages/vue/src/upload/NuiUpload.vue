<template>
  <div
    class="nui-upload"
    :class="[
      `nui-upload--layout-${layout}`,
      `nui-upload--size-${size}`,
      {
        'nui-upload--dragging': drop.dragging.value,
        'nui-upload--disabled': isDisabled,
        'nui-upload--invalid': isInvalid,
        'nui-upload--busy': queue.busy.value,
      },
    ]"
    v-bind="split.rootAttrs()"
  >
    <div class="nui-upload__zone" v-bind="drop.attrs" @click="onZoneClick">
      <input
        ref="input"
        class="nui-upload__input"
        type="file"
        tabindex="-1"
        aria-hidden="true"
        :accept="accept"
        :multiple="multiple"
        :disabled="isDisabled"
        @click.stop
        @change="onChange"
      />
      <slot :open="open" :dragging="drop.dragging.value">
        <NuiIcon alias="upload" class="nui-upload__icon" />
        <span class="nui-upload__text">{{ dropLabel }}</span>
        <NuiButton
          :id="controlAttrs.id"
          variant="outline"
          tone="neutral"
          size="sm"
          class="nui-upload__browse"
          :aria-describedby="controlAttrs['aria-describedby']"
          :aria-invalid="controlAttrs['aria-invalid']"
          :disabled="isDisabled"
          v-bind="split.controlAttrs()"
          @click="open"
        >
          {{ browseLabel }}
        </NuiButton>
        <span v-if="hint" class="nui-upload__hint">{{ hint }}</span>
      </slot>
    </div>
    <ul v-if="model.length > 0" class="nui-upload__items">
      <NuiUploadRow
        v-for="item in model"
        :key="item.id"
        :item="item"
        :preview="previewOf(item)"
        :description="describe(item)"
        :cancel-label="cancelLabel"
        :retry-label="retryLabel"
        :remove-label="removeLabel"
        @cancel="discard(item)"
        @retry="queue.retry(item.id)"
        @remove="discard(item)"
      >
        <template v-if="$slots.item" #default="slot"><slot name="item" v-bind="slot" /></template>
      </NuiUploadRow>
    </ul>
    <span class="nui-upload__live" aria-live="polite" aria-atomic="true">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts" generic="R = unknown">
import { onScopeDispose, ref, useTemplateRef } from 'vue';
import {
  formatFileSize,
  useFieldControl,
  useFileDrop,
  useLocale,
  useSplitAttrs,
  useUploadQueue,
  validateFiles,
  type FileRejection,
  type UploadEntry,
} from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiUploadRow from './NuiUploadRow.vue';
import type { NuiUploadError, NuiUploadItem, NuiUploadProps } from './upload.types';

interface ErrorLabelContext {
  readonly maxSize: number | undefined;
  readonly maxFiles: number | undefined;
  readonly locale: string;
}

const defaultErrorLabel = (error: NuiUploadError, context: ErrorLabelContext): string => {
  if (error.reason === 'type') {
    return 'Unsupported file type';
  }

  if (error.reason === 'size') {
    return context.maxSize === undefined
      ? 'File is too large'
      : `Larger than ${formatFileSize(context.maxSize, context.locale)}`;
  }

  if (error.reason === 'count') {
    return context.maxFiles === undefined
      ? 'Too many files'
      : `More than ${context.maxFiles} files`;
  }

  return error.message ?? (error.reason === 'custom' ? 'File rejected' : 'Upload failed');
};

const canPreview = (item: NuiUploadItem<unknown>): boolean =>
  item.type.startsWith('image/') && typeof URL.createObjectURL === 'function';

const isRejectionOf =
  (file: File) =>
  (rejection: FileRejection): boolean =>
    rejection.file === file;

defineOptions({ inheritAttrs: false });

const {
  id,
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  upload,
  accept,
  multiple = true,
  maxSize,
  maxFiles,
  validate,
  rejected = 'list',
  auto = true,
  concurrency = 3,
  layout = 'list',
  size = 'md',
  dropLabel = 'Drop files here',
  browseLabel = 'Choose files',
  hint,
  cancelLabel = 'Cancel upload',
  retryLabel = 'Retry',
  removeLabel = 'Remove',
  doneLabel = 'Uploaded',
  errorLabel,
} = defineProps<NuiUploadProps<R>>();

const model = defineModel<NuiUploadItem<R>[]>({ default: () => [] });

const emit = defineEmits<{
  reject: [rejections: FileRejection[]];
  done: [item: NuiUploadItem<R>];
  error: [item: NuiUploadItem<R>];
  remove: [item: NuiUploadItem<R>];
}>();

const split = useSplitAttrs();
const locale = useLocale();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));

const inputElement = useTemplateRef<HTMLInputElement>('input');
const announcement = ref('');
const previews = new Map<string, string>();

const describeError = (error: NuiUploadError, item: NuiUploadItem<R>): string =>
  errorLabel
    ? errorLabel(error, item)
    : defaultErrorLabel(error, { maxSize, maxFiles, locale: locale.value });

const describe = (item: NuiUploadItem<R>): string =>
  item.error ? describeError(item.error, item) : formatFileSize(item.size, locale.value);

const queue = useUploadQueue<R>({
  items: model,
  upload: (file, context) => upload(file, context),
  concurrency: () => concurrency,
  auto: () => auto,
  onDone: (item) => {
    announcement.value = `${item.name}: ${doneLabel}`;
    emit('done', item);
  },
  onError: (item) => {
    announcement.value = item.error ? `${item.name}: ${describeError(item.error, item)}` : '';
    emit('error', item);
  },
});

const remember = (items: readonly NuiUploadItem<R>[]): void => {
  for (const item of items) {
    if (item.file && canPreview(item)) {
      previews.set(item.id, URL.createObjectURL(item.file));
    }
  }
};

const forget = (itemId: string): void => {
  const url = previews.get(itemId);

  if (url !== undefined) {
    URL.revokeObjectURL(url);
    previews.delete(itemId);
  }
};

const previewOf = (item: NuiUploadItem<R>): string | undefined =>
  previews.get(item.id) ?? (item.type.startsWith('image/') ? item.url : undefined);

const discard = (item: NuiUploadItem<R>): void => {
  forget(item.id);
  queue.remove(item.id);
  emit('remove', item);
};

const receive = (files: File[]): void => {
  if (isDisabled.value || files.length === 0) {
    return;
  }

  if (!multiple) {
    for (const item of model.value) {
      forget(item.id);
      queue.remove(item.id);
    }
  }

  const outcome = validateFiles(files, {
    accept,
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    existing: multiple ? model.value.length : 0,
    validate,
  });

  const entries = files
    .map((file): UploadEntry => ({
      file,
      error: outcome.rejected.find(isRejectionOf(file))?.error,
    }))
    .filter((entry) => rejected === 'list' || entry.error === undefined);

  remember(queue.add(entries));

  if (outcome.rejected.length > 0) {
    emit('reject', outcome.rejected);
  }
};

const drop = useFileDrop({ disabled: isDisabled, onFiles: receive });

const open = (): void => {
  if (!isDisabled.value) {
    inputElement.value?.click();
  }
};

const onChange = (): void => {
  const input = inputElement.value;

  if (input) {
    receive(Array.from(input.files ?? []));
    input.value = '';
  }
};

const onZoneClick = (event: MouseEvent): void => {
  if (event.target instanceof Element && event.target.closest('.nui-upload__browse')) {
    return;
  }

  open();
};

onScopeDispose(() => {
  for (const url of previews.values()) {
    URL.revokeObjectURL(url);
  }

  previews.clear();
});

defineExpose({
  open,
  start: queue.start,
  retry: queue.retry,
  remove: (itemId: string) => {
    const item = model.value.find((entry) => entry.id === itemId);

    if (item) {
      discard(item);
    }
  },
});
</script>
