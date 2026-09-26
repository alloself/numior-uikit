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
import type { UploadAdapter, UploadEntry, UploadFile, UploadItem } from './upload-types';

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
  draining: boolean;
  seed: number;
}

const DEFAULT_CONCURRENCY = 3;

const clampFraction = (fraction: number): number =>
  Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;

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
    ? { ...file, status: 'error', error: entry.error }
    : { ...file, status: 'queued' };
};

const fileOf = <R>(item: UploadItem<R>): UploadFile => ({
  id: item.id,
  name: item.name,
  size: item.size,
  type: item.type,
  file: item.file,
  url: item.url,
});

const isPending = (item: UploadItem<unknown>): boolean =>
  item.status === 'queued' || item.status === 'uploading';

export const useUploadQueue = <R>(options: UploadQueueOptions<R>): UploadQueue<R> => {
  const base = useId();
  const state: QueueState<R> = { items: options.items.value, draining: false, seed: 0 };
  const controllers = new Map<string, AbortController>();

  const write = (items: UploadItem<R>[]): void => {
    state.items = items;
    options.items.value = items;
  };

  const replace = (id: string, next: (item: UploadItem<R>) => UploadItem<R>): void => {
    write(state.items.map((item) => (item.id === id ? next(item) : item)));
  };

  const find = (id: string): UploadItem<R> | undefined =>
    state.items.find((item) => item.id === id);

  const nextId = (): string => {
    state.seed += 1;

    return `${base}-${state.seed}`;
  };

  const abort = (id: string): void => {
    controllers.get(id)?.abort();
    controllers.delete(id);
  };

  const finish = (
    id: string,
    next: (item: UploadItem<R>) => UploadItem<R>,
  ): UploadItem<R> | undefined => {
    controllers.delete(id);
    replace(id, next);

    return find(id);
  };

  const run = async (item: UploadItem<R>, file: File): Promise<void> => {
    const controller = new AbortController();

    controllers.set(item.id, controller);
    replace(item.id, (current) => ({ ...fileOf(current), status: 'uploading', progress: 0 }));

    const settled = (next: (item: UploadItem<R>) => UploadItem<R>): UploadItem<R> | undefined =>
      controller.signal.aborted ? undefined : finish(item.id, next);

    const context = {
      onProgress: (fraction: number): void => {
        if (!controller.signal.aborted) {
          replace(item.id, (current) =>
            current.status === 'uploading'
              ? { ...current, progress: clampFraction(fraction) }
              : current,
          );
        }
      },
      signal: controller.signal,
    };

    try {
      const result = await options.upload(file, context);
      const done = settled((current) => ({ ...fileOf(current), status: 'done', result }));

      if (done) {
        options.onDone?.(done);
        pump();
      }
    } catch (error: unknown) {
      const failed = settled((current) => ({
        ...fileOf(current),
        status: 'error',
        error: { reason: 'upload', message: messageOf(error) },
      }));

      if (failed) {
        options.onError?.(failed);
        pump();
      }
    }
  };

  const fill = (): void => {
    const limit = Math.max(1, toValue(options.concurrency) ?? DEFAULT_CONCURRENCY);

    for (const item of state.items) {
      if (controllers.size >= limit) {
        return;
      }

      if (item.status === 'queued' && item.file && !controllers.has(item.id)) {
        void run(item, item.file);
      }
    }
  };

  const pump = (): void => {
    if (!(toValue(options.auto) ?? true) && !state.draining) {
      return;
    }

    fill();
    state.draining = state.items.some((item) => item.status === 'queued');
  };

  const add = (entries: readonly UploadEntry[]): UploadItem<R>[] => {
    const created = entries.map((entry) => itemFor<R>(nextId(), entry));

    write([...state.items, ...created]);
    pump();

    return created;
  };

  const start = (): void => {
    state.draining = true;
    pump();
  };

  const retry = (id: string): void => {
    const item = find(id);

    if (item?.status === 'error' && item.error.reason === 'upload' && item.file) {
      replace(id, (current) => ({ ...fileOf(current), status: 'queued' }));
      fill();
    }
  };

  const remove = (id: string): void => {
    abort(id);
    write(state.items.filter((item) => item.id !== id));
    pump();
  };

  watch(options.items, (items) => {
    if (items === state.items) {
      return;
    }

    for (const id of controllers.keys()) {
      if (!items.some((item) => item.id === id)) {
        abort(id);
      }
    }

    state.items = items;
    pump();
  });

  onScopeDispose(() => {
    for (const controller of controllers.values()) {
      controller.abort();
    }

    controllers.clear();
  });

  return {
    busy: computed(() => options.items.value.some(isPending)),
    add,
    start,
    retry,
    remove,
  };
};
