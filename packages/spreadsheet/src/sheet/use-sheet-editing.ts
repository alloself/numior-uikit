import {
  NuiTableColumnType,
  columnIndex,
  tableEditor,
  type NuiTableColumn,
  type NuiTableDraft,
  type NuiTableEdit,
  type NuiTableEditEvent,
  type TableCellPosition,
} from '@numior/table';
import { computed, ref, shallowRef, watch } from 'vue';
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
import NuiSpreadsheetCellEditor from './NuiSpreadsheetCellEditor.vue';
import type { SheetCells, SheetEditing, SheetEditingOptions } from './sheet.types';

interface SheetLine {
  readonly row: number;
  readonly col: number;
}

const CHANGED_ONE = 1;

const isText = (value: unknown): value is string => typeof value === 'string';

const CELL_EDITOR = tableEditor(NuiSpreadsheetCellEditor, isText);

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
    const stepper =
      options.collaboration()?.stepper ?? createStepper(options.book(), options.calculator());

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

  watch(
    history,
    (next) => {
      options.collaboration()?.follow(next);
    },
    { immediate: true },
  );

  const redraw = (): void => {
    revision.value += 1;
    options.recalc.run();
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
    redraw();
    return CHANGED_ONE;
  };

  const stepOf = (
    sheet: Sheet,
    cells: SheetCells,
    change: NuiTableEdit<number>,
    col: number,
  ): WorkbookStep => {
    const line = lineOf(cells, change.row, col);
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

    const steps = command.changes.reduce<WorkbookStep[]>((found, change) => {
      const col = columnIndex(change.key);

      if (col !== undefined) {
        found.push(stepOf(sheet, cells, change, col));
      }
      return found;
    }, []);

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
        ? { ...column, editable: true, editor: CELL_EDITOR, rules: [formulaRule(col)] }
        : column,
    );

  const apply = (steps: readonly WorkbookStep[]): boolean =>
    follow(() => history.value.commit(steps)) > 0;

  return {
    draft,
    revision,
    setDraft,
    apply,
    redraw,
    inputAt: inputAtPosition,
    editableColumns,
    commands: {
      push,
      undo: () => follow(() => history.value.undo()),
      redo: () => follow(() => history.value.redo()),
    },
  };
};
