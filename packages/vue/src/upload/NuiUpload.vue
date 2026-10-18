<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      class="nui-upload"
      :class="[
        `nui-upload--layout-${layout}`,
        `nui-upload--variant-${variant}`,
        `nui-upload--size-${size}`,
        {
          'nui-upload--dragging': drop.dragging.value,
          'nui-upload--disabled': isDisabled,
          'nui-upload--readonly': isReadonly,
          'nui-upload--invalid': isInvalid,
          'nui-upload--busy': queue.busy.value,
        },
      ]"
      v-bind="split.rootAttrs()"
    >
      <input
        ref="input"
        class="nui-upload__input"
        type="file"
        tabindex="-1"
        aria-hidden="true"
        :accept="accept"
        :multiple="multiple"
        :disabled="isInert"
        @click.stop
        @change="onChange"
      />
      <NuiButton
        v-if="variant === 'button'"
        :id="controlAttrs.id"
        variant="outline"
        tone="neutral"
        class="nui-upload__browse"
        :aria-describedby="controlAttrs['aria-describedby']"
        :aria-invalid="controlAttrs['aria-invalid']"
        :disabled="isInert"
        v-bind="split.controlAttrs()"
        @click="open"
      >
        <slot name="button">
          <NuiIcon icon="upload" />
          {{ texts.browse }}
        </slot>
      </NuiButton>
      <div v-else class="nui-upload__zone" v-bind="drop.attrs" @click="onZoneClick">
        <slot :open="open" :dragging="drop.dragging.value">
          <NuiIcon icon="upload" class="nui-upload__icon" />
          <span class="nui-upload__text">{{ texts.drop }}</span>
          <NuiButton
            :id="controlAttrs.id"
            variant="outline"
            tone="neutral"
            size="sm"
            class="nui-upload__browse"
            :aria-describedby="controlAttrs['aria-describedby']"
            :aria-invalid="controlAttrs['aria-invalid']"
            :disabled="isInert"
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
          :disabled="isInert"
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
import { computed, ref, useTemplateRef } from 'vue';
import {
  formatFileSize,
  useFileDrop,
  useUploadQueue,
  validateFiles,
  type FileRejection,
  type UploadEntry,
} from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiUploadRow from './NuiUploadRow.vue';
import { useUploadField, useUploadPicker, useUploadPreviews } from './use-upload-field';
import type { NuiUploadError, NuiUploadItem, NuiUploadProps } from './upload.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  disabled = undefined,
  readonly = undefined,
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
  variant = 'zone',
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

const {
  split,
  locale,
  messages,
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
  inert: isInert,
  describe: describeFailure,
} = useUploadField(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  () => ({ maxSize, maxFiles }),
);

const { remember, forget, previewOf } = useUploadPreviews<R>();
const inputElement = useTemplateRef<HTMLInputElement>('input');
const announcement = ref('');

const texts = computed(() => ({
  drop: dropLabel ?? messages.value.drop,
  browse: browseLabel ?? messages.value.browse,
  cancel: cancelLabel ?? messages.value.cancel,
  retry: retryLabel ?? messages.value.retry,
  remove: removeLabel ?? messages.value.remove,
  done: doneLabel ?? messages.value.done,
}));

const describeError = (failure: NuiUploadError, item: NuiUploadItem<R>): string =>
  errorLabel ? errorLabel(failure, item) : describeFailure(failure);

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

const discard = (item: NuiUploadItem<R>): void => {
  if (isInert.value) {
    return;
  }
  forget(item.id);
  queue.remove(item.id);
  emit('remove', item);
};

const receive = (files: File[]): void => {
  if (isInert.value || files.length === 0) {
    return;
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

  if (!multiple && entries.length > 0) {
    for (const item of model.value) {
      forget(item.id);
      queue.remove(item.id);
    }
  }

  remember(queue.add(entries));

  if (outcome.rejected.length > 0) {
    emit('reject', outcome.rejected);
  }
};

const drop = useFileDrop({ disabled: isInert, onFiles: receive });

const { open, onChange } = useUploadPicker({
  input: inputElement,
  inert: isInert,
  onFiles: receive,
});

const onZoneClick = (event: MouseEvent): void => {
  if (event.target instanceof Element && event.target.closest('.nui-upload__browse')) {
    return;
  }

  open();
};

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
