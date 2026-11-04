<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      class="nui-avatar-upload"
      :class="[
        `nui-avatar-upload--size-${size}`,
        `nui-avatar-upload--shape-${shape}`,
        {
          'nui-avatar-upload--dragging': drop.dragging.value,
          'nui-avatar-upload--busy': uploading,
          'nui-avatar-upload--disabled': isDisabled,
          'nui-avatar-upload--readonly': isReadonly,
          'nui-avatar-upload--invalid': isInvalid,
        },
      ]"
      v-bind="split.rootAttrs()"
    >
      <input
        ref="input"
        class="nui-avatar-upload__input"
        type="file"
        tabindex="-1"
        aria-hidden="true"
        :accept="accept"
        :disabled="isInert"
        @click.stop
        @change="onChange"
      />
      <button
        :id="controlAttrs.id"
        type="button"
        class="nui-avatar-upload__trigger"
        :aria-label="triggerText"
        :aria-describedby="controlAttrs['aria-describedby']"
        :aria-invalid="controlAttrs['aria-invalid']"
        :disabled="isInert"
        v-bind="{ ...split.controlAttrs(), ...drop.attrs }"
        @click="open"
      >
        <NuiAvatar
          :src="preview"
          :name="name"
          :shape="shape"
          :size="size"
          :alt="preview ? triggerText : undefined"
          class="nui-avatar-upload__avatar"
        />
        <span
          v-if="uploading"
          class="nui-avatar-upload__ring"
          aria-hidden="true"
          :style="{ '--_progress': percent / 100 }"
        />
        <span class="nui-avatar-upload__badge" aria-hidden="true">
          <NuiIcon icon="upload" />
        </span>
      </button>
      <span class="nui-avatar-upload__aside">
        <span v-if="canRemove || canRetry" class="nui-avatar-upload__actions">
          <NuiButton
            v-if="canRetry"
            variant="ghost"
            tone="neutral"
            size="sm"
            icon-only
            class="nui-avatar-upload__retry"
            :aria-label="texts.retry"
            icon="refresh"
            @click="retry"
          />
          <NuiButton
            v-if="canRemove"
            variant="ghost"
            tone="neutral"
            size="sm"
            icon-only
            class="nui-avatar-upload__remove"
            :aria-label="texts.remove"
            icon="x"
            @click="remove"
          />
        </span>
        <NuiProgress
          v-if="uploading && model"
          class="nui-avatar-upload__progress"
          size="sm"
          :value="percent"
          :label="model.name"
        />
        <span
          class="nui-avatar-upload__status"
          :class="{
            'nui-avatar-upload__status--failure': notice.kind === AvatarNoticeKind.Failure,
          }"
          role="status"
          aria-live="polite"
        >
          {{ noticeText }}
        </span>
      </span>
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts" generic="R = unknown">
import { computed, ref, useTemplateRef } from 'vue';
import {
  UploadReason,
  UploadStatus,
  useFileDrop,
  useUploadQueue,
  validateFiles,
  type UploadEntry,
} from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import NuiAvatar from '../avatar/NuiAvatar.vue';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import NuiProgress from '../progress/NuiProgress.vue';
import { useUploadField, useUploadPicker, useUploadPreviews } from './use-upload-field';
import {
  AvatarNoticeKind,
  type AvatarNotice,
  type NuiAvatarUploadProps,
  type NuiUploadError,
  type NuiUploadItem,
} from './upload.types';
import { NuiAvatarShape, NuiAvatarSize } from '../avatar/avatar.types';

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
  accept = 'image/*',
  maxSize,
  validate,
  name,
  shape = NuiAvatarShape.Circle,
  size = NuiAvatarSize.Xl,
  chooseLabel,
  changeLabel,
  retryLabel,
  removeLabel,
  errorLabel,
} = defineProps<NuiAvatarUploadProps<R>>();

const model = defineModel<NuiUploadItem<R> | null>({ default: null });

const emit = defineEmits<{
  reject: [error: NuiUploadError];
  done: [item: NuiUploadItem<R>];
  error: [item: NuiUploadItem<R>];
  remove: [item: NuiUploadItem<R>];
}>();

const {
  split,
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
  () => ({ maxSize, maxFiles: 1 }),
);

const { remember, forget, previewOf } = useUploadPreviews<R>();
const inputElement = useTemplateRef<HTMLInputElement>('input');
const notice = ref<AvatarNotice>({ kind: AvatarNoticeKind.Silent });

const noticeText = computed(() =>
  notice.value.kind === AvatarNoticeKind.Silent ? '' : notice.value.text,
);

const texts = computed(() => ({
  choose: chooseLabel ?? messages.value.chooseImage,
  change: changeLabel ?? messages.value.changeImage,
  retry: retryLabel ?? messages.value.retry,
  remove: removeLabel ?? messages.value.removeImage,
}));

const describe = (failure: NuiUploadError, item: NuiUploadItem<R> | undefined): string =>
  errorLabel && item ? errorLabel(failure, item) : describeFailure(failure);

const items = computed({
  get: (): NuiUploadItem<R>[] => (model.value ? [model.value] : []),
  set: (next: NuiUploadItem<R>[]) => {
    model.value = next[0] ?? null;
  },
});

const queue = useUploadQueue<R>({
  items,
  upload: (file, context) => upload(file, context),
  concurrency: () => 1,
  auto: () => true,
  onDone: (item) => {
    notice.value = { kind: AvatarNoticeKind.Done, text: `${item.name}: ${messages.value.done}` };
    emit('done', item);
  },
  onError: (item) => {
    notice.value =
      item.status === UploadStatus.Error
        ? { kind: AvatarNoticeKind.Failure, text: describe(item.error, item) }
        : { kind: AvatarNoticeKind.Silent };

    emit('error', item);
  },
});

const uploading = computed(() => model.value?.status === UploadStatus.Uploading);

const percent = computed(() =>
  model.value?.status === UploadStatus.Uploading ? Math.round(model.value.progress * 100) : 0,
);

const canRemove = computed(() => model.value !== null && !uploading.value && !isInert.value);

const canRetry = computed(
  () =>
    model.value?.status === UploadStatus.Error &&
    model.value.error.reason === UploadReason.Upload &&
    model.value.file !== undefined &&
    !isInert.value,
);

const triggerText = computed(() => (model.value ? texts.value.change : texts.value.choose));

const preview = computed(() => (model.value ? previewOf(model.value) : undefined));

const receive = (files: File[]): void => {
  const [file] = files;

  if (isInert.value || file === undefined) {
    return;
  }
  const outcome = validateFiles([file], { accept, maxSize, maxFiles: 1, existing: 0, validate });
  const rejection = outcome.rejected[0];

  if (rejection) {
    notice.value = { kind: AvatarNoticeKind.Failure, text: describe(rejection.error, undefined) };
    emit('reject', rejection.error);
    return;
  }
  const previous = model.value;

  if (previous) {
    forget(previous.id);
    queue.remove(previous.id);
  }
  const entry: UploadEntry = { file };

  remember(queue.add([entry]));
  notice.value = { kind: AvatarNoticeKind.Silent };
};

const drop = useFileDrop({ disabled: isInert, onFiles: receive });

const { open, onChange } = useUploadPicker({
  input: inputElement,
  inert: isInert,
  onFiles: receive,
});

const retry = (): void => {
  if (model.value) {
    queue.retry(model.value.id);
  }
};

const remove = (): void => {
  const item = model.value;

  if (!item || isInert.value) {
    return;
  }
  forget(item.id);
  queue.remove(item.id);
  notice.value = { kind: AvatarNoticeKind.Silent };
  emit('remove', item);
};

defineExpose({ open });
</script>
