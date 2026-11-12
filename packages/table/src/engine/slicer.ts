export interface SliceJob {
  total(): number;
  done(): number;
  work(deadline: number): boolean;
  waiting?(): Promise<unknown> | undefined;
  cancel?(): void;
}

export interface SliceOptions {
  readonly sliceMs: number;
  readonly yieldTo: () => Promise<void>;
  readonly signal?: AbortSignal | undefined;
  readonly isStale?: (() => boolean) | undefined;
  readonly onProgress?: ((done: number, total: number) => void) | undefined;
}

interface YieldingScheduler {
  yield(): Promise<void>;
}

const hasYield = (value: object): value is YieldingScheduler =>
  'yield' in value && typeof value.yield === 'function';

const schedulerOf = (): YieldingScheduler | null => {
  const candidate: unknown = Reflect.get(globalThis, 'scheduler');
  return typeof candidate === 'object' && candidate !== null && hasYield(candidate)
    ? candidate
    : null;
};

const channelYield = (): (() => Promise<void>) => {
  const waiting: Array<() => void> = [];
  const channel = new MessageChannel();

  channel.port1.addEventListener('message', () => {
    waiting.shift()?.();
  });

  channel.port1.start();

  return () =>
    new Promise((resolve) => {
      waiting.push(resolve);
      channel.port2.postMessage(undefined);
    });
};

let fallbackYield: (() => Promise<void>) | null = null;

export const yieldInLine = (): Promise<void> => {
  fallbackYield ??= channelYield();
  return fallbackYield();
};

export const yieldToHost = (): Promise<void> => {
  const scheduler = schedulerOf();

  return scheduler === null ? yieldInLine() : scheduler.yield();
};

const interrupted = (options: SliceOptions): boolean =>
  options.signal?.aborted === true || options.isStale?.() === true;

export const runSliced = async (job: SliceJob, options: SliceOptions): Promise<boolean> => {
  if (interrupted(options)) {
    return false;
  }
  let finished = job.work(performance.now() + options.sliceMs);

  while (!finished) {
    options.onProgress?.(job.done(), job.total());
    await (job.waiting?.() ?? options.yieldTo());

    if (interrupted(options)) {
      return false;
    }
    finished = job.work(performance.now() + options.sliceMs);
  }
  options.onProgress?.(job.total(), job.total());
  return true;
};

export const CHECK_INTERVAL = 2048;
