import { clamp } from '@vueuse/core';
import {
  computed,
  onScopeDispose,
  toValue,
  useId,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import {
  UploadReason,
  UploadStatus,
  type UploadAdapter,
  type UploadEntry,
  type UploadFile,
  type UploadItem,
} from './upload.types';

export interface UploadQueueOptions<R> {
  readonly items: Ref<UploadItem<R>[]>;
  readonly upload: UploadAdapter<R>;
  readonly concurrency?: MaybeRefOrGetter<number | undefined>;
  readonly auto?: MaybeRefOrGetter<boolean | undefined>;
  readonly onDone?: ((item: UploadItem<R>) => void) | undefined;
  readonly onError?: ((item: UploadItem<R>) => void) | undefined;
}

export interface UploadQueue<R> {
  readonly busy: ComputedRef<boolean>;
  add(entries: readonly UploadEntry[]): UploadItem<R>[];
  start(): void;
  retry(id: string): void;
  remove(id: string): void;
}

interface QueueState<R> {
  items: UploadItem<R>[];
  positions: Map<string, number>;
  cursor: number;
  draining: boolean;
  seed: number;
  progress: Map<string, number>;
  cancelFrame: (() => void) | undefined;
}

const DEFAULT_CONCURRENCY = 3;

const positionsOf = (items: readonly UploadItem[]): Map<string, number> =>
  new Map(items.map((item, position) => [item.id, position] as const));

const nextFrame = (run: () => void): (() => void) => {
  if (typeof requestAnimationFrame === 'function') {
    const handle = requestAnimationFrame(run);

    return () => {
      cancelAnimationFrame(handle);
    };
  }

  const timer = setTimeout(run, 16);

  return () => {
    clearTimeout(timer);
  };
};

const clampFraction = (fraction: number): number =>
  Number.isFinite(fraction) ? clamp(fraction, 0, 1) : 0;

const messageOf = (error: unknown): string | undefined => {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : undefined;
};

const itemFor = <R>(id: string, entry: UploadEntry): UploadItem<R> => {
  const file: UploadFile = {
    id,
    name: entry.file.name,
    size: entry.file.size,
    type: entry.file.type,
    file: entry.file,
  };

  return entry.error
    ? { ...file, status: UploadStatus.Error, error: entry.error }
    : { ...file, status: UploadStatus.Queued };
};

const fileOf = <R>(item: UploadItem<R>): UploadFile => ({
  id: item.id,
  name: item.name,
  size: item.size,
  type: item.type,
  file: item.file,
  url: item.url,
});

const isPending = (item: UploadItem): boolean =>
  item.status === UploadStatus.Queued || item.status === UploadStatus.Uploading;

export const useUploadQueue = <R>(options: UploadQueueOptions<R>): UploadQueue<R> => {
  const base = useId();
  const controllers = new Map<string, AbortController>();

  const state: QueueState<R> = {
    items: options.items.value,
    positions: positionsOf(options.items.value),
    cursor: 0,
    draining: false,
    seed: 0,
    progress: new Map(),
    cancelFrame: undefined,
  };

  const write = (items: UploadItem<R>[], reindex: boolean): void => {
    state.items = items;

    if (reindex) {
      state.positions = positionsOf(items);
      state.cursor = 0;
    }
    options.items.value = items;
  };

  const find = (id: string): UploadItem<R> | undefined => {
    const position = state.positions.get(id);
    return position === undefined ? undefined : state.items[position];
  };

  const replace = (id: string, next: (item: UploadItem<R>) => UploadItem<R>): void => {
    const position = state.positions.get(id);
    const current = find(id);

    if (position === undefined || current === undefined) {
      return;
    }

    const items = state.items.slice();

    items[position] = next(current);
    write(items, false);
  };

  const applyProgress = (): void => {
    state.cancelFrame = undefined;

    const items = state.items.slice();

    for (const [id, progress] of state.progress) {
      const position = state.positions.get(id);
      const current = position === undefined ? undefined : items[position];

      if (position !== undefined && current?.status === UploadStatus.Uploading) {
        items[position] = { ...current, progress };
      }
    }
    state.progress.clear();
    write(items, false);
  };

  const reportProgress = (id: string, fraction: number): void => {
    state.progress.set(id, clampFraction(fraction));
    state.cancelFrame ??= nextFrame(applyProgress);
  };

  const nextId = (): string => {
    state.seed += 1;

    return `${base}-${state.seed}`;
  };

  const abort = (id: string): void => {
    controllers.get(id)?.abort();
    controllers.delete(id);
    state.progress.delete(id);
  };

  const finish = (
    id: string,
    next: (item: UploadItem<R>) => UploadItem<R>,
  ): UploadItem<R> | undefined => {
    controllers.delete(id);
    state.progress.delete(id);
    replace(id, next);

    return find(id);
  };

  const run = async (item: UploadItem<R>, file: File): Promise<void> => {
    const controller = new AbortController();

    controllers.set(item.id, controller);

    replace(item.id, (current) => ({
      ...fileOf(current),
      status: UploadStatus.Uploading,
      progress: 0,
    }));

    const settled = (next: (item: UploadItem<R>) => UploadItem<R>): UploadItem<R> | undefined =>
      controller.signal.aborted ? undefined : finish(item.id, next);

    const context = {
      onProgress: (fraction: number): void => {
        if (!controller.signal.aborted) {
          reportProgress(item.id, fraction);
        }
      },
      signal: controller.signal,
    };

    try {
      const result = await options.upload(file, context);

      const done = settled((current) => ({
        ...fileOf(current),
        status: UploadStatus.Done,
        result,
      }));

      if (done) {
        options.onDone?.(done);
        pump();
      }
    } catch (error: unknown) {
      const failed = settled((current) => ({
        ...fileOf(current),
        status: UploadStatus.Error,
        error: { reason: UploadReason.Upload, message: messageOf(error) },
      }));

      if (failed) {
        options.onError?.(failed);
        pump();
      }
    }
  };

  const firstQueued = (): number => {
    while (
      state.cursor < state.items.length &&
      state.items[state.cursor]?.status !== UploadStatus.Queued
    ) {
      state.cursor += 1;
    }
    return state.cursor;
  };

  const fill = (): void => {
    const limit = Math.max(1, toValue(options.concurrency) ?? DEFAULT_CONCURRENCY);

    for (let position = firstQueued(); position < state.items.length; position += 1) {
      if (controllers.size >= limit) {
        return;
      }

      const item = state.items[position];

      if (item?.status === UploadStatus.Queued && item.file && !controllers.has(item.id)) {
        void run(item, item.file);
      }
    }
  };

  const pump = (): void => {
    if (!(toValue(options.auto) ?? true) && !state.draining) {
      return;
    }

    fill();
    state.draining = firstQueued() < state.items.length;
  };

  const add = (entries: readonly UploadEntry[]): UploadItem<R>[] => {
    const created = entries.map((entry) => itemFor<R>(nextId(), entry));
    const start = state.items.length;
    const items = [...state.items, ...created];

    created.forEach((item, offset) => state.positions.set(item.id, start + offset));
    state.cursor = Math.min(state.cursor, start);
    write(items, false);
    pump();

    return created;
  };

  const start = (): void => {
    state.draining = true;
    pump();
  };

  const retry = (id: string): void => {
    const item = find(id);

    if (
      item?.status !== UploadStatus.Error ||
      item.error.reason !== UploadReason.Upload ||
      !item.file
    ) {
      return;
    }

    replace(id, (current) => ({ ...fileOf(current), status: UploadStatus.Queued }));
    state.cursor = Math.min(state.cursor, state.positions.get(id) ?? 0);
    fill();
  };

  const remove = (id: string): void => {
    abort(id);

    write(
      state.items.filter((item) => item.id !== id),
      true,
    );

    pump();
  };

  watch(options.items, (items) => {
    if (items === state.items) {
      return;
    }

    state.items = items;
    state.positions = positionsOf(items);
    state.cursor = 0;

    for (const id of controllers.keys()) {
      if (!state.positions.has(id)) {
        abort(id);
      }
    }
    pump();
  });

  onScopeDispose(() => {
    for (const controller of controllers.values()) {
      controller.abort();
    }

    controllers.clear();
    state.cancelFrame?.();
  });

  return {
    busy: computed(() => options.items.value.some(isPending)),
    add,
    start,
    retry,
    remove,
  };
};
