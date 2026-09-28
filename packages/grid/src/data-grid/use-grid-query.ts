import { ref, watch, type Ref, type ShallowRef } from 'vue';
import type { GridEngine, GridProgress, GridQuery } from '../engine';

export interface GridQueryOptions<T> {
  readonly engine: Readonly<ShallowRef<GridEngine<T>>>;
  readonly query: () => GridQuery;
  readonly onSettled: (rows: number) => void;
  readonly onProgress: (progress: GridProgress) => void;
}

export interface GridQueryRunner {
  readonly busy: Readonly<Ref<boolean>>;
  runNow(): void;
}

const BUSY_DELAY = 120;

const hasWork = (query: GridQuery): boolean =>
  (query.sort?.length ?? 0) > 0 ||
  (query.filters?.length ?? 0) > 0 ||
  (query.groupBy?.length ?? 0) > 0 ||
  query.totals === true;

export const useGridQuery = <T>(options: GridQueryOptions<T>): GridQueryRunner => {
  const busy = ref(false);
  let running: AbortController | null = null;

  const stop = (): void => {
    running?.abort();
    running = null;
    busy.value = false;
  };

  const runNow = (): void => {
    stop();
    const query = options.query();

    if (hasWork(query)) {
      options.engine.value.runSync(query);
    }
  };

  const run = async (query: GridQuery): Promise<void> => {
    stop();
    const own = new AbortController();
    running = own;

    const timer = setTimeout(() => {
      busy.value = running === own;
    }, BUSY_DELAY);

    try {
      const result = await options.engine.value.run(query, {
        signal: own.signal,
        onProgress: options.onProgress,
      });

      if (running === own && result.kind === 'done') {
        running = null;
        busy.value = false;
        options.onSettled(result.rows);
      }
    } finally {
      clearTimeout(timer);

      if (running === own) {
        stop();
      }
    }
  };

  watch(options.query, (next) => {
    void run(next);
  });

  return { busy, runNow };
};
