import { ref, watch, type Ref, type ShallowRef } from 'vue';
import type { TableEngine, TableProgress, TableQuery } from '../engine';

export interface TableQueryOptions<T> {
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly query: () => TableQuery;
  readonly onSettled: (rows: number, query: TableQuery) => void;
  readonly onProgress: (progress: TableProgress) => void;
}

export interface TableQueryRunner {
  readonly busy: Readonly<Ref<boolean>>;
  runNow(): TableQuery;
}

const BUSY_DELAY = 120;

const hasWork = (query: TableQuery): boolean =>
  (query.sort?.length ?? 0) > 0 ||
  (query.filters?.length ?? 0) > 0 ||
  (query.groupBy?.length ?? 0) > 0 ||
  query.totals === true;

export const useTableQuery = <T>(options: TableQueryOptions<T>): TableQueryRunner => {
  const busy = ref(false);
  let running: AbortController | null = null;

  const stop = (): void => {
    running?.abort();
    running = null;
    busy.value = false;
  };

  const runNow = (): TableQuery => {
    stop();
    const query = options.query();

    if (hasWork(query)) {
      options.engine.value.runSync(query);
    }
    return query;
  };

  const run = async (query: TableQuery): Promise<void> => {
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
        options.onSettled(result.rows, query);
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
