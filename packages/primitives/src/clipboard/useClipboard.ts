import { useClipboard as useClipboardApi } from '@vueuse/core';
import { toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export interface ClipboardOptions {
  readonly copiedDuration?: MaybeRefOrGetter<number | undefined>;
}

export interface ClipboardControl {
  readonly supported: Readonly<Ref<boolean>>;
  readonly copied: Readonly<Ref<boolean>>;
  copy(text: string): Promise<boolean>;
}

const DEFAULT_COPIED_DURATION = 2000;

export const useClipboard = (options: ClipboardOptions = {}): ClipboardControl => {
  const clipboard = useClipboardApi({
    legacy: true,
    copiedDuring: toValue(options.copiedDuration) ?? DEFAULT_COPIED_DURATION,
  });

  const copy = async (text: string): Promise<boolean> => {
    try {
      await clipboard.copy(text);
    } catch {
      return false;
    }
    return clipboard.copied.value;
  };

  return { supported: clipboard.isSupported, copied: clipboard.copied, copy };
};
