import { computed, onMounted, ref, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useEventListener, useResizeObserver, type MaybeElementRef } from '@vueuse/core';

interface BlockHeightMessage {
  readonly type: typeof BLOCK_HEIGHT;
  readonly height: number;
}

const BLOCK_HEIGHT = 'nui-docs-block-height';

const isBlockHeight = (data: unknown): data is BlockHeightMessage =>
  typeof data === 'object' &&
  data !== null &&
  'type' in data &&
  data.type === BLOCK_HEIGHT &&
  'height' in data &&
  typeof data.height === 'number';

const isFramed = (): boolean => globalThis.window !== undefined && window.parent !== window;

export const blockHeightMessage = (height: number): BlockHeightMessage => ({
  type: BLOCK_HEIGHT,
  height,
});

export const useBlockHeightReport = (stage: MaybeElementRef): void => {
  onMounted(() => {
    if (!isFramed()) {
      return;
    }
    document.documentElement.style.overflowY = 'hidden';
  });

  useResizeObserver(stage, ([entry]) => {
    const height = entry?.borderBoxSize[0]?.blockSize;

    if (height === undefined || !isFramed()) {
      return;
    }
    window.parent.postMessage(blockHeightMessage(Math.ceil(height)), location.origin);
  });
};

export const useFramedHeight = (
  frame: MaybeRefOrGetter<HTMLIFrameElement | null | undefined>,
  least: MaybeRefOrGetter<number>,
): ComputedRef<number> => {
  const reported = ref(0);

  useEventListener('message', (event: MessageEvent<unknown>) => {
    const fromFrame =
      event.origin === location.origin && event.source === toValue(frame)?.contentWindow;

    if (!fromFrame || !isBlockHeight(event.data)) {
      return;
    }
    reported.value = event.data.height;
  });

  return computed(() => Math.max(toValue(least), reported.value));
};
