import { isClient, promiseTimeout } from '@vueuse/core';
import { onScopeDispose, ref, watch, type Ref, type ShallowRef } from 'vue';
import {
  TableRunResultKind,
  yieldInLine,
  type TableEngine,
  type TableProgress,
  type TableQuery,
} from '../engine';
import { RunKind } from './table.types';

export interface TableQueryOptions<T> {
  readonly engine: Readonly<ShallowRef<TableEngine<T>>>;
  readonly query: () => TableQuery;
  readonly onSettled: (rows: number, query: TableQuery) => void;
  readonly onTotals: (query: TableQuery) => void;
  readonly deferTotals: () => boolean;
  readonly onProgress: (progress: TableProgress) => void;
}

export interface TableQueryRunner {
  readonly busy: Readonly<Ref<boolean>>;
  runNow(): TableQuery;
}

const BUSY_DELAY = 120;

const IDLE_TIMEOUT = 200;

const nextPaint = async (): Promise<void> => {
  if (typeof requestAnimationFrame === 'function') {
    await new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
  await promiseTimeout(0);
};

const afterIdle = async (): Promise<void> => {
  await nextPaint();
  if (typeof requestIdleCallback !== 'function') {
    return;
  }

  await new Promise((resolve) => {
    requestIdleCallback(resolve, { timeout: IDLE_TIMEOUT });
  });
};

const shapesRows = (query: TableQuery): boolean =>
  (query.sort?.length ?? 0) > 0 ||
  (query.filters?.length ?? 0) > 0 ||
  (query.groupBy?.length ?? 0) > 0;

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

    if (shapesRows(query) || (query.totals === true && !(isClient && options.deferTotals()))) {
      options.engine.value.runSync(query);
      return query;
    }
    if (query.totals === true) {
      void run(query, 'totals');
    }
    return { ...query, totals: false };
  };

  const run = async (query: TableQuery, kind: RunKind = 'query'): Promise<void> => {
    stop();
    const own = new AbortController();
    running = own;

    const timer = setTimeout(() => {
      busy.value = kind === RunKind.Query && running === own;
    }, BUSY_DELAY);

    try {
      if (kind === RunKind.Totals) {
        await afterIdle();
      }
      if (own.signal.aborted) {
        return;
      }

      const result = await options.engine.value.run(query, {
        signal: own.signal,
        onProgress: options.onProgress,
        yieldTo: kind === RunKind.Totals ? yieldInLine : undefined,
      });

      if (running === own && result.kind === TableRunResultKind.Done) {
        running = null;
        busy.value = false;

        if (kind === RunKind.Query) {
          options.onSettled(result.rows, query);
        } else {
          options.onTotals(query);
        }
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

  onScopeDispose(stop);

  return { busy, runNow };
};
