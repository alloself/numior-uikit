import {
  NuiTableColumnType,
  columnIndex,
  type NuiTableColumn,
  type NuiTableDraft,
  type NuiTableEdit,
  type NuiTableEditEvent,
  type TableCellPosition,
} from '@numior/table';
import { computed, ref, shallowRef } from 'vue';
import {
  createCellEditor,
  createStepper,
  createWorkbookHistory,
  textValue,
  type CellEditor,
  type Sheet,
  type StepOutcome,
  type Stepper,
  type WorkbookStep,
} from '../core';
import type { SheetCells, SheetEditing, SheetEditingOptions } from './sheet.types';

interface SheetLine {
  readonly row: number;
  readonly col: number;
}

const CHANGED_ONE = 1;

const textOf = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
};

const lineOf = (cells: SheetCells, row: number, col: number): SheetLine => ({
  row: cells.rowAt(row),
  col: cells.colAt(col),
});

const plainStep = (sheet: Sheet, line: SheetLine, text: string): WorkbookStep => ({
  kind: 'setCells',
  sheet: sheet.name,
  cells: [{ row: line.row, col: line.col, content: { kind: 'value', value: textValue(text) } }],
});

const shownAt = (cells: SheetCells, next: NuiTableDraft): string =>
  cells.source.cellAt(next.row, next.col)?.text ?? '';

const sameCell = (a: NuiTableDraft | undefined, b: NuiTableDraft): boolean =>
  a !== undefined && a.row === b.row && a.col === b.col;

export const useSheetEditing = (options: SheetEditingOptions): SheetEditing => {
  const draft = shallowRef<NuiTableDraft>();
  const revision = ref(0);

  let applied: WorkbookStep[] = [];

  const editor = computed((): CellEditor => createCellEditor(options.book(), options.calculator()));

  const history = computed(() => {
    const stepper = createStepper(options.book(), options.calculator());

    const tracked: Stepper = {
      apply: (step) => {
        const result = stepper.apply(step);

        if (result.ok) {
          applied.push(step);
        }
        return result;
      },
    };

    return createWorkbookHistory(tracked);
  });

  const redrawWhenSettled = async (settled: Promise<void>): Promise<void> => {
    await settled;
    options.table.value?.invalidate();
  };

  const refresh = (): void => {
    const run = options.calculator().recalculate();

    options.table.value?.invalidate();

    if (!run.finished) {
      void redrawWhenSettled(run.settled);
    }
  };

  const follow = (run: () => StepOutcome | undefined): number => {
    applied = [];
    const outcome = run();
    const steps = applied;

    applied = [];

    if (outcome === undefined || !outcome.ok || steps.length === 0) {
      return 0;
    }
    options.changed({ steps });
    revision.value += 1;
    refresh();
    return CHANGED_ONE;
  };

  const stepOf = (sheet: Sheet, cells: SheetCells, change: NuiTableEdit<number>): WorkbookStep => {
    const line = lineOf(cells, change.row, columnIndex(change.key));
    const text = textOf(change.value);
    const result = editor.value.input(sheet, line.row, line.col, text, options.locale());

    return result.ok ? result.step : plainStep(sheet, line, text);
  };

  const push = (command: NuiTableEditEvent<number>): void => {
    const sheet = options.sheet();
    const cells = options.cells();

    if (sheet === undefined || cells === undefined || command.changes.length === 0) {
      return;
    }

    const steps = command.changes.map((change) => stepOf(sheet, cells, change));

    follow(() => history.value.commit(steps));
  };

  const inputAt = (sheet: Sheet, cells: SheetCells, next: TableCellPosition): string => {
    const line = lineOf(cells, next.row, next.col);

    return editor.value.inputText(sheet, line.row, line.col, options.locale());
  };

  const inputAtPosition = (position: TableCellPosition): string => {
    const sheet = options.sheet();
    const cells = options.cells();

    if (revision.value < 0 || sheet === undefined || cells === undefined) {
      return '';
    }
    return inputAt(sheet, cells, position);
  };

  const opened = (next: NuiTableDraft): NuiTableDraft => {
    const sheet = options.sheet();
    const cells = options.cells();

    if (sheet === undefined || cells === undefined || next.value !== shownAt(cells, next)) {
      return next;
    }
    return { ...next, value: inputAt(sheet, cells, next) };
  };

  const setDraft = (next: NuiTableDraft | undefined): void => {
    draft.value = next === undefined || sameCell(draft.value, next) ? next : opened(next);
  };

  const formulaRule =
    (col: number) =>
    (value: string | null, context: { readonly values: number }): true | string => {
      const sheet = options.sheet();
      const cells = options.cells();

      if (sheet === undefined || cells === undefined || value === null) {
        return true;
      }

      const line = lineOf(cells, context.values, col);
      const result = editor.value.input(sheet, line.row, line.col, value, options.locale());

      return result.ok
        ? true
        : options.messages.value.formulaError({ position: result.error.position + 1 });
    };

  const editableColumns = (columns: readonly NuiTableColumn<number>[]): NuiTableColumn<number>[] =>
    columns.map((column, col) =>
      column.type === NuiTableColumnType.Text && !options.readonly()
        ? { ...column, editable: true, rules: [formulaRule(col)] }
        : column,
    );

  const apply = (steps: readonly WorkbookStep[]): boolean =>
    follow(() => history.value.commit(steps)) > 0;

  return {
    draft,
    setDraft,
    apply,
    inputAt: inputAtPosition,
    editableColumns,
    commands: {
      push,
      undo: () => follow(() => history.value.undo()),
      redo: () => follow(() => history.value.redo()),
    },
  };
};
