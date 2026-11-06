import {
  loadCells,
  numberValue,
  type LoadEntry,
  type Loading,
  type Recalculation,
  type Sheet,
} from '@numior/spreadsheet/core';
import { ref, shallowRef } from 'vue';
import type { SampleBook } from './book-sample';

interface LoadProgress {
  readonly done: number;
  readonly total: number;
}

interface Running {
  readonly done: number;
  readonly total: number;
  readonly settled: Promise<void>;
}

const LOAD_ROWS = 20_000;

const entryRow = (row: number): LoadEntry[] => {
  const at = String(row + 1);

  return [
    { row, col: 0, value: numberValue(row + 1) },
    { row, col: 1, formula: `=A${at}*2` },
    { row, col: 2, formula: row === 0 ? '=B1' : `=C${String(row)}+B${at}` },
  ];
};

const loadEntries = (): LoadEntry[] =>
  Array.from({ length: LOAD_ROWS }, (_, row) => entryRow(row)).flat();

const ms = (value: number): string => `${String(Math.round(value))} мс`;

export const useSheetLoad = (book: SampleBook, painted: () => void) => {
  const progress = shallowRef<LoadProgress>();
  const status = ref('');
  const busy = ref(false);

  const follow = async (running: Running): Promise<void> => {
    let settled = false;

    const tick = (): void => {
      if (!settled) {
        progress.value = { done: running.done, total: running.total };
        painted();
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
    await running.settled;
    settled = true;
    progress.value = undefined;
  };

  const unknown = (): string => {
    const names = book.calculator.limitations.map((item) => item.name);

    return names.length > 0 ? `неизвестные функции: ${names.join(', ')}` : '';
  };

  const report = (run: Recalculation, started: number, loading?: Loading): void => {
    status.value = [
      loading === undefined
        ? ''
        : `Введено ячеек: ${String(loading.total)}, работа ${ms(loading.busyMs)}`,
      `Пересчитано формул: ${String(run.done)}`,
      `работа ${ms(run.busyMs)}`,
      `самый длинный кусок ${ms(Math.max(run.longestMs, loading?.longestMs ?? 0))}`,
      `до конца ${ms(performance.now() - started)}`,
      unknown(),
    ]
      .filter((part) => part !== '')
      .join(' · ');
  };

  const recalculate = async (loading?: Loading, started = performance.now()): Promise<void> => {
    const run = book.calculator.recalculate();

    busy.value = true;
    await follow(run);
    report(run, started, loading);
    busy.value = false;
    painted();
  };

  const load = async (sheet: Sheet): Promise<void> => {
    const started = performance.now();
    const loading = loadCells(book.calculator, sheet, loadEntries());

    busy.value = true;
    status.value = 'Ввод формул…';
    await follow(loading);
    await recalculate(loading, started);
  };

  return { progress, status, busy, load, recalculate };
};
