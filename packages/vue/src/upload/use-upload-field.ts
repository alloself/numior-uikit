import { computed, onScopeDispose, type ComputedRef, type ShallowRef } from 'vue';
import {
  formatFileSize,
  useFieldControl,
  useLocale,
  useMessages,
  useSplitAttrs,
  type FieldControl,
  type FieldControlProps,
  type SplitAttrs,
} from '@numior/primitives';
import { uploadMessages, type NuiUploadMessages } from './upload.messages';
import type { NuiUploadError, NuiUploadItem } from './upload.types';

export interface UploadLimits {
  readonly maxSize: number | undefined;
  readonly maxFiles: number | undefined;
}

export interface UploadField {
  readonly split: SplitAttrs;
  readonly locale: ComputedRef<string>;
  readonly messages: ComputedRef<NuiUploadMessages>;
  readonly frame: FieldControl['frame'];
  readonly attrs: FieldControl['attrs'];
  readonly invalid: ComputedRef<boolean>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly inert: ComputedRef<boolean>;
  describe(failure: NuiUploadError): string;
}

export interface UploadPreviews<R> {
  remember(items: readonly NuiUploadItem<R>[]): void;
  forget(itemId: string): void;
  previewOf(item: NuiUploadItem<R>): string | undefined;
}

export interface UploadPickerOptions {
  readonly input: Readonly<ShallowRef<HTMLInputElement | null>>;
  readonly inert: ComputedRef<boolean>;
  onFiles(files: File[]): void;
}

export interface UploadPicker {
  open(): void;
  onChange(): void;
}

interface ErrorContext extends UploadLimits {
  readonly locale: string;
}

type ErrorLabel = (
  error: NuiUploadError,
  texts: NuiUploadMessages,
  context: ErrorContext,
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

const canPreview = (item: NuiUploadItem): boolean =>
  item.type.startsWith('image/') && typeof URL.createObjectURL === 'function';

export const useUploadField = (
  props: () => FieldControlProps,
  limits: () => UploadLimits,
): UploadField => {
  const split = useSplitAttrs();
  const locale = useLocale();
  const messages = useMessages(uploadMessages, locale);
  const control = useFieldControl(props);
  const inert = computed(() => control.disabled.value || control.readonly.value);

  return {
    split,
    locale,
    messages,
    frame: control.frame,
    attrs: control.attrs,
    invalid: control.invalid,
    disabled: control.disabled,
    readonly: control.readonly,
    inert,
    describe: (failure) =>
      ERROR_LABELS[failure.reason](failure, messages.value, {
        ...limits(),
        locale: locale.value,
      }),
  };
};

export const useUploadPreviews = <R>(): UploadPreviews<R> => {
  const previews = new Map<string, string>();

  onScopeDispose(() => {
    for (const url of previews.values()) {
      URL.revokeObjectURL(url);
    }

    previews.clear();
  });

  return {
    remember: (items) => {
      for (const item of items) {
        if (item.file && canPreview(item) && !previews.has(item.id)) {
          previews.set(item.id, URL.createObjectURL(item.file));
        }
      }
    },
    forget: (itemId) => {
      const url = previews.get(itemId);

      if (url === undefined) {
        return;
      }

      URL.revokeObjectURL(url);
      previews.delete(itemId);
    },
    previewOf: (item) =>
      previews.get(item.id) ?? (item.type.startsWith('image/') ? item.url : undefined),
  };
};

export const useUploadPicker = (options: UploadPickerOptions): UploadPicker => ({
  open: () => {
    if (!options.inert.value) {
      options.input.value?.click();
    }
  },
  onChange: () => {
    const input = options.input.value;

    if (!input) {
      return;
    }

    options.onFiles(Array.from(input.files ?? []));
    input.value = '';
  },
});
