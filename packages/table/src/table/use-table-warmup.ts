import { defaultDocument, useEventListener } from '@vueuse/core';
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
const INPUTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

const wishesOf = <T>(columns: readonly NuiTableColumn<T>[]): TableStoreWish[] => {
  const texts = columns.filter((column) => column.type === 'text');
  const sortable = columns.filter((column) => column.sortable !== false);

  return [
    ...texts.map((column): TableStoreWish => ({ key: column.key, need: 'codes' })),
    ...sortable
      .filter((column) => column.type !== 'text')
      .map((column): TableStoreWish => ({ key: column.key, need: 'codes' })),
    ...sortable
      .filter((column) => column.type === 'text')
      .map((column): TableStoreWish => ({ key: column.key, need: 'ranks' })),
  ];
};

const later = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const nextIdle = (): Promise<IdleDeadline | undefined> =>
  new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(resolve, { timeout: IDLE_TIMEOUT });
    } else {
      setTimeout(resolve, FALLBACK_DELAY);
    }
  });

export const useTableWarmup = <T>(options: TableWarmupOptions<T>): TableWarmup => {
  let running: AbortController | undefined;
  let mounted = false;
  let lastInput = 0;

  const quietFor = (): number => QUIET_MS - (performance.now() - lastInput);

  const createYield = (): (() => Promise<void>) => {
    let deadline: IdleDeadline | undefined;

    return async () => {
      for (;;) {
        if (quietFor() > 0) {
          deadline = undefined;
          await later(quietFor());
        } else if (deadline !== undefined && deadline.timeRemaining() > SLICE_MS) {
          return;
        } else {
          deadline = await nextIdle();

          if (quietFor() <= 0) {
            return;
          }
        }
      }
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

  useEventListener(
    defaultDocument,
    [...INPUTS],
    () => {
      lastInput = performance.now();
    },
    { capture: true, passive: true },
  );

  onMounted(() => {
    mounted = true;
    restart();
  });

  onScopeDispose(() => {
    running?.abort();
  });

  return { restart };
};
