import {
  getCurrentScope,
  onMounted,
  onScopeDispose,
  ref,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';

export interface ClipboardOptions {
  readonly copiedDuration?: MaybeRefOrGetter<number | undefined>;
}

export interface ClipboardControl {
  readonly supported: Readonly<Ref<boolean>>;
  readonly copied: Readonly<Ref<boolean>>;
  copy(text: string): Promise<boolean>;
}

const DEFAULT_COPIED_DURATION = 2000;

const clipboardOf = (): Clipboard | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.clipboard;

export const useClipboard = (options: ClipboardOptions = {}): ClipboardControl => {
  const supported = ref(false);
  const copied = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = (): void => {
    if (timer === undefined) {
      return;
    }
    clearTimeout(timer);
    timer = undefined;
  };

  const copy = async (text: string): Promise<boolean> => {
    const clipboard = clipboardOf();

    if (clipboard === undefined) {
      return false;
    }
    try {
      await clipboard.writeText(text);
    } catch {
      return false;
    }
    clear();
    copied.value = true;

    timer = setTimeout(
      () => {
        timer = undefined;
        copied.value = false;
      },
      toValue(options.copiedDuration) ?? DEFAULT_COPIED_DURATION,
    );

    return true;
  };

  onMounted(() => {
    supported.value = clipboardOf() !== undefined;
  });

  if (getCurrentScope()) {
    onScopeDispose(clear);
  }
  return { supported, copied, copy };
};
