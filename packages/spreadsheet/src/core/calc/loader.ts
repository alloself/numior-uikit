import type { CellValue } from '../cell.types';
import { EN_FORMULAS } from '../formula/locale';
import type { FormulaFailure, FormulaLocale } from '../formula/formula.types';
import type { Sheet } from '../workbook';
import type { Calculator } from './calculator';
import { nextTask } from './tasks';

export type LoadEntry =
  | { readonly row: number; readonly col: number; readonly value: CellValue }
  | { readonly row: number; readonly col: number; readonly formula: string };

export interface LoadOptions {
  readonly budgetMs?: number | undefined;
  readonly yieldTo?: (() => Promise<void>) | undefined;
  readonly syntax?: FormulaLocale | undefined;
}

export interface LoadFailure extends FormulaFailure {
  readonly row: number;
  readonly col: number;
}

export interface Loading {
  readonly total: number;
  readonly done: number;
  readonly busyMs: number;
  readonly longestMs: number;
  readonly failures: readonly LoadFailure[];
  readonly settled: Promise<void>;
  cancel(): void;
}

const DEFAULT_BUDGET = 6;

const CHECK_EVERY = 16;

export const loadCells = (
  calculator: Calculator,
  sheet: Sheet,
  entries: readonly LoadEntry[],
  { budgetMs = DEFAULT_BUDGET, yieldTo = nextTask, syntax = EN_FORMULAS }: LoadOptions = {},
): Loading => {
  const failures: LoadFailure[] = [];
  let index = 0;
  let busy = 0;
  let longest = 0;
  let cancelled = false;

  const enter = (entry: LoadEntry): void => {
    if ('value' in entry) {
      calculator.setValue(sheet, entry.row, entry.col, entry.value);
      return;
    }

    const parsed = calculator.setFormula(sheet, entry.row, entry.col, entry.formula, syntax);

    if (parsed.ok) {
      return;
    }

    failures.push({ ...parsed.error, row: entry.row, col: entry.col });
  };

  const pending = (): boolean => !cancelled && index < entries.length;

  const step = (): boolean => {
    const started = performance.now();

    while (pending()) {
      const entry = entries[index];

      if (entry !== undefined) {
        enter(entry);
      }
      index += 1;
      if (index % CHECK_EVERY === 0 && performance.now() - started > budgetMs) {
        break;
      }
    }

    const spent = performance.now() - started;

    busy += spent;
    longest = Math.max(longest, spent);
    return cancelled || index >= entries.length;
  };

  const proceed = (): Promise<void> => yieldTo().then(() => (step() ? undefined : proceed()));
  const settled = step() ? Promise.resolve() : proceed();

  return {
    total: entries.length,
    get done() {
      return index;
    },
    get busyMs() {
      return busy;
    },
    get longestMs() {
      return longest;
    },
    failures,
    settled,
    cancel: () => {
      cancelled = true;
    },
  };
};
