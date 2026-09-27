<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
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
          <span class="nui-upload__text">{{ texts.drop }}</span>
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
            {{ texts.browse }}
          </NuiButton>
        </slot>
      </div>
      <ul v-if="model.length > 0" class="nui-upload__items">
        <NuiUploadRow
          v-for="item in model"
          :key="item.id"
          :item="item"
          :preview="previewOf(item)"
          :description="describe(item)"
          :cancel-label="texts.cancel"
          :retry-label="texts.retry"
          :remove-label="texts.remove"
          @cancel="discard(item)"
          @retry="queue.retry(item.id)"
          @remove="discard(item)"
        >
          <template v-if="$slots.item" #default="slot"><slot name="item" v-bind="slot" /></template>
        </NuiUploadRow>
      </ul>
      <span class="nui-upload__live" aria-live="polite" aria-atomic="true">{{ announcement }}</span>
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts" generic="R = unknown">
import { computed, onScopeDispose, ref, useTemplateRef } from 'vue';
import {
  formatFileSize,
  useFieldControl,
  useFileDrop,
  useLocale,
  useMessages,
  useSplitAttrs,
  useUploadQueue,
  validateFiles,
  type FileRejection,
  type UploadEntry,
} from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiUploadRow from './NuiUploadRow.vue';
import { uploadMessages, type NuiUploadMessages } from './upload.messages';
import type { NuiUploadError, NuiUploadItem, NuiUploadProps } from './upload.types';

interface ErrorLabelContext {
  readonly maxSize: number | undefined;
  readonly maxFiles: number | undefined;
  readonly locale: string;
}

type ErrorLabel = (
  error: NuiUploadError,
  texts: NuiUploadMessages,
  context: ErrorLabelContext,
) => string;

const ERROR_LABELS: Readonly<Record<NuiUploadError['reason'], ErrorLabel>> = {
  type: (_error, texts) => texts.typeError,
  size: (_error, texts, { maxSize, locale }) =>
    maxSize === undefined
      ? texts.tooLarge
      : texts.largerThan({ size: formatFileSize(maxSize, locale) }),
  count: (_error, texts, { maxFiles }) =>
    maxFiles === undefined ? texts.tooMany : texts.moreThan({ count: maxFiles }),
  custom: (error, texts) => error.message ?? texts.rejected,
  upload: (error, texts) => error.message ?? texts.failed,
};

const defaultErrorLabel: ErrorLabel = (error, texts, context) =>
  ERROR_LABELS[error.reason](error, texts, context);

const canPreview = (item: NuiUploadItem<unknown>): boolean =>
  item.type.startsWith('image/') && typeof URL.createObjectURL === 'function';

defineOptions({ inheritAttrs: false });

const {
  id,
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
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
  dropLabel,
  browseLabel,
  cancelLabel,
  retryLabel,
  removeLabel,
  doneLabel,
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
const messages = useMessages(uploadMessages, locale);

const {
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid, label, description, error }));

const inputElement = useTemplateRef<HTMLInputElement>('input');
const announcement = ref('');
const previews = new Map<string, string>();

const texts = computed(() => ({
  drop: dropLabel ?? messages.value.drop,
  browse: browseLabel ?? messages.value.browse,
  cancel: cancelLabel ?? messages.value.cancel,
  retry: retryLabel ?? messages.value.retry,
  remove: removeLabel ?? messages.value.remove,
  done: doneLabel ?? messages.value.done,
}));

const describeError = (failure: NuiUploadError, item: NuiUploadItem<R>): string =>
  errorLabel
    ? errorLabel(failure, item)
    : defaultErrorLabel(failure, messages.value, { maxSize, maxFiles, locale: locale.value });

const describe = (item: NuiUploadItem<R>): string =>
  item.status === 'error'
    ? describeError(item.error, item)
    : formatFileSize(item.size, locale.value);

const queue = useUploadQueue<R>({
  items: model,
  upload: (file, context) => upload(file, context),
  concurrency: () => concurrency,
  auto: () => auto,
  onDone: (item) => {
    announcement.value = `${item.name}: ${texts.value.done}`;
    emit('done', item);
  },
  onError: (item) => {
    announcement.value =
      item.status === 'error' ? `${item.name}: ${describeError(item.error, item)}` : '';

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

  const reasons = new Map(outcome.rejected.map((rejection) => [rejection.file, rejection.error]));

  const entries = files
    .map((file): UploadEntry => ({ file, error: reasons.get(file) }))
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
