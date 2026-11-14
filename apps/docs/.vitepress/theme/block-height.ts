import { computed, onMounted, ref, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useEventListener, useResizeObserver, type MaybeElementRef } from '@vueuse/core';

interface BlockHeightMessage {
  readonly type: typeof BLOCK_HEIGHT;
  readonly height: number;
}

interface BlockHeightRequest {
  readonly type: typeof BLOCK_HEIGHT_REQUEST;
}

const BLOCK_HEIGHT = 'nui-docs-block-height';
const BLOCK_HEIGHT_REQUEST = 'nui-docs-block-height-request';

const isBlockHeight = (data: unknown): data is BlockHeightMessage =>
  typeof data === 'object' &&
  data !== null &&
  'type' in data &&
  data.type === BLOCK_HEIGHT &&
  'height' in data &&
  typeof data.height === 'number';

const isBlockHeightRequest = (data: unknown): data is BlockHeightRequest =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === BLOCK_HEIGHT_REQUEST;

const isFramed = (): boolean => globalThis.window !== undefined && window.parent !== window;

export const blockHeightMessage = (height: number): BlockHeightMessage => ({
  type: BLOCK_HEIGHT,
  height,
});

export const blockHeightRequest = (): BlockHeightRequest => ({ type: BLOCK_HEIGHT_REQUEST });

export const useBlockHeightReport = (stage: MaybeElementRef): void => {
  let height: number | undefined;

  const report = (): void => {
    if (height === undefined || !isFramed()) {
      return;
    }
    window.parent.postMessage(blockHeightMessage(height), location.origin);
  };

  onMounted(() => {
    if (!isFramed()) {
      return;
    }
    document.documentElement.style.overflowY = 'hidden';
  });

  useResizeObserver(stage, ([entry]) => {
    const size = entry?.borderBoxSize[0]?.blockSize;

    if (size === undefined) {
      return;
    }
    height = Math.ceil(size);
    report();
  });

  useEventListener('message', (event: MessageEvent<unknown>) => {
    const fromParent = event.origin === location.origin && event.source === window.parent;

    if (!fromParent || !isBlockHeightRequest(event.data)) {
      return;
    }
    report();
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

  onMounted(() => {
    toValue(frame)?.contentWindow?.postMessage(blockHeightRequest(), location.origin);
  });

  return computed(() => Math.max(toValue(least), reported.value));
};
