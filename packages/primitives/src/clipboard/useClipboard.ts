import { useTimeoutFn } from '@vueuse/core';
import { computed, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';

export interface ClipboardOptions {
  readonly copiedDuration?: MaybeRefOrGetter<number | undefined>;
}

export interface ClipboardControl {
  readonly supported: Readonly<Ref<boolean>>;
  readonly copied: Readonly<Ref<boolean>>;
  copy(text: string): Promise<boolean>;
}

const DEFAULT_COPIED_DURATION = 2000;

const hasApi = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

const hasCommand = (): boolean =>
  typeof document !== 'undefined' && typeof document.execCommand === 'function';

const legacyCopy = (text: string): boolean => {
  const area = document.createElement('textarea');

  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'absolute';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();

  try {
    return document.execCommand('copy');
  } finally {
    area.remove();
  }
};

const write = async (text: string): Promise<boolean> => {
  if (hasApi()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return hasCommand() && legacyCopy(text);
    }
  }
  return hasCommand() && legacyCopy(text);
};

export const useClipboard = (options: ClipboardOptions = {}): ClipboardControl => {
  const copied = ref(false);
  const supported = computed(() => hasApi() || hasCommand());

  const reset = useTimeoutFn(
    () => {
      copied.value = false;
    },
    () => toValue(options.copiedDuration) ?? DEFAULT_COPIED_DURATION,
    { immediate: false },
  );

  const copy = async (text: string): Promise<boolean> => {
    let done = false;

    try {
      done = await write(text);
    } catch {
      done = false;
    }
    reset.stop();
    copied.value = done;
    if (done) {
      reset.start();
    }
    return done;
  };

  return { supported, copied, copy };
};
