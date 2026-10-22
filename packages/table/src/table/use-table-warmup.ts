import { promiseTimeout, until, useIdle } from '@vueuse/core';
import type { TableEngine, TableStoreWish } from '../engine';
import { onMounted, onScopeDispose, type ShallowRef } from 'vue';
import type { NuiTableColumn } from './table.types';

export interface TableWarmupOptions<T> {
  readonly engine: ShallowRef<TableEngine<T>>;
  readonly columns: () => readonly NuiTableColumn<T>[];
  readonly enabled: () => boolean;
}

export interface TableWarmup {
  restart(): void;
}

const SLICE_MS = 5;
const QUIET_MS = 500;
const IDLE_TIMEOUT = 2000;
const FALLBACK_DELAY = 16;
const INPUTS = ['pointerdown', 'keydown', 'input', 'wheel', 'touchstart'] as const;

interface WishGroups {
  readonly codes: TableStoreWish[];
  readonly numbers: TableStoreWish[];
  readonly ranks: TableStoreWish[];
}

const wishesOf = <T>(columns: readonly NuiTableColumn<T>[]): TableStoreWish[] => {
  const groups = columns.reduce<WishGroups>(
    (found, column) => {
      const sortable = column.sortable !== false;

      if (column.type === 'text') {
        found.codes.push({ key: column.key, need: 'codes' });

        if (sortable) {
          found.ranks.push({ key: column.key, need: 'ranks' });
        }
      } else if (sortable) {
        found.numbers.push({ key: column.key, need: 'codes' });
      }
      return found;
    },
    { codes: [], numbers: [], ranks: [] },
  );

  return [...groups.codes, ...groups.numbers, ...groups.ranks];
};

const nextIdle = async (): Promise<IdleDeadline | undefined> => {
  if (typeof requestIdleCallback !== 'function') {
    await promiseTimeout(FALLBACK_DELAY);
    return undefined;
  }
  return new Promise((resolve) => {
    requestIdleCallback(resolve, { timeout: IDLE_TIMEOUT });
  });
};

export const useTableWarmup = <T>(options: TableWarmupOptions<T>): TableWarmup => {
  const { idle } = useIdle(QUIET_MS, { events: [...INPUTS], listenForVisibilityChange: false });
  let running: AbortController | undefined;
  let mounted = false;

  const createYield = (): (() => Promise<void>) => {
    let deadline: IdleDeadline | undefined;

    return async () => {
      if (idle.value && deadline !== undefined && deadline.timeRemaining() > SLICE_MS) {
        return;
      }
      do {
        await until(idle).toBe(true);
        deadline = await nextIdle();
      } while (!idle.value);
    };
  };

  const restart = (): void => {
    running?.abort();
    running = undefined;

    if (!mounted || !options.enabled()) {
      return;
    }

    const own = new AbortController();
    const yieldTo = createYield();

    running = own;

    void yieldTo().then(() =>
      own.signal.aborted
        ? false
        : options.engine.value.prepare(wishesOf(options.columns()), {
            sliceMs: SLICE_MS,
            yieldTo,
            signal: own.signal,
          }),
    );
  };

  onMounted(() => {
    mounted = true;
    restart();
  });

  onScopeDispose(() => {
    running?.abort();
  });

  return { restart };
};
