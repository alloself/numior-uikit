import {
  NuiTableColumnType,
  columnIndex,
  tableEditor,
  type NuiTableColumn,
  type NuiTableDraft,
  type NuiTableEdit,
  type NuiTableEditEvent,
  type NuiTableCellPosition,
  type NuiTableRange,
} from '@numior/table';
import { computed, ref, shallowRef, watch } from 'vue';
import {
  createCellEditor,
  createStepper,
  createWorkbookHistory,
  mergesApartStep,
  mergesMeeting,
  outsideCovered,
  textValue,
  type CellEditor,
  type CellRange,
  type Sheet,
  type StepOutcome,
  type StepRefusal,
  type Stepper,
  type WorkbookStep,
} from '../core';
import NuiSpreadsheetCellEditor from './NuiSpreadsheetCellEditor.vue';
import { formulaFailureText } from './formula-failure';
import type { RefusalText, SheetCells, SheetEditing, SheetEditingOptions } from './sheet.types';

interface SheetLine {
  readonly row: number;
  readonly col: number;
}

interface PlacedChange extends SheetLine {
  readonly change: NuiTableEdit<number>;
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

const lineOf = (cells: SheetCells, row: number, col: number): SheetLine => cells.cellOf(row, col);

const isBlock = (range: NuiTableRange): boolean =>
  range.from.row !== range.to.row || range.from.col !== range.to.col;

const blockOf = (cells: SheetCells, command: NuiTableEditEvent<number>): CellRange | undefined =>
  command.area !== undefined && isBlock(command.area) ? cells.rangeOf(command.area) : undefined;

const placesOf = (
  cells: SheetCells,
  changes: readonly NuiTableEdit<number>[],
  raw: boolean,
): PlacedChange[] =>
  changes.reduce<PlacedChange[]>((found, change) => {
    const col = columnIndex(change.key);

    if (col !== undefined) {
      const line = raw
        ? { row: cells.rowAt(change.row), col: cells.colAt(col) }
        : lineOf(cells, change.row, col);

      found.push({ change, row: line.row, col: line.col });
    }
    return found;
  }, []);

const boundsOf = (places: readonly SheetLine[]): CellRange | undefined => {
  const [first] = places;

  return first === undefined
    ? undefined
    : places.reduce<CellRange>(
        (box, place) => ({
          top: Math.min(box.top, place.row),
          left: Math.min(box.left, place.col),
          bottom: Math.max(box.bottom, place.row),
          right: Math.max(box.right, place.col),
        }),
        { top: first.row, left: first.col, bottom: first.row, right: first.col },
      );
};

const outsideMerges = (sheet: Sheet, places: readonly PlacedChange[]): readonly PlacedChange[] => {
  const area = boundsOf(places);

  return area === undefined ? places : outsideCovered(mergesMeeting(sheet, area), places);
};

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

  const follow = (run: () => StepOutcome | undefined, say?: RefusalText): number => {
    applied = [];
    const outcome = run();
    const steps = applied;

    applied = [];

    if (outcome?.ok === false) {
      options.refused(outcome.reason, say?.(outcome.reason));
    }

    if (outcome === undefined || !outcome.ok || steps.length === 0) {
      return 0;
    }
    options.changed({ steps });
    redraw();
    return CHANGED_ONE;
  };

  const stepOf = (sheet: Sheet, place: PlacedChange): WorkbookStep => {
    const text = textOf(place.change.value);
    const result = editor.value.input(sheet, place.row, place.col, text, options.locale());

    return result.ok ? result.step : plainStep(sheet, place, text);
  };

  const push = (command: NuiTableEditEvent<number>): void => {
    const sheet = options.sheet();
    const cells = options.cells();

    if (sheet === undefined || cells === undefined || command.changes.length === 0) {
      return;
    }

    const area = blockOf(cells, command);
    const apart = area === undefined ? undefined : mergesApartStep(sheet, area);

    const places = placesOf(cells, command.changes, area !== undefined);

    const writes = (area === undefined ? outsideMerges(sheet, places) : places).map((place) =>
      stepOf(sheet, place),
    );

    const steps = apart === undefined ? writes : [apart, ...writes];

    if (steps.length === 0) {
      return;
    }

    follow(() => history.value.commit(steps));
  };

  const inputAt = (sheet: Sheet, cells: SheetCells, next: NuiTableCellPosition): string => {
    const line = lineOf(cells, next.row, next.col);

    return editor.value.inputText(sheet, line.row, line.col, options.locale());
  };

  const inputAtPosition = (position: NuiTableCellPosition): string => {
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

  const moveDraft = (position: NuiTableCellPosition): void => {
    const current = draft.value;

    if (current === undefined) {
      return;
    }

    draft.value = { ...current, row: position.row, col: position.col };
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
      const locale = options.locale();
      const result = editor.value.input(sheet, line.row, line.col, value, locale);

      return result.ok
        ? true
        : formulaFailureText(result.error, options.messages.value, locale.formulas);
    };

  const editableColumns = (columns: readonly NuiTableColumn<number>[]): NuiTableColumn<number>[] =>
    columns.map((column, col) =>
      column.type === NuiTableColumnType.Text && !options.readonly()
        ? { ...column, editable: true, editor: CELL_EDITOR, rules: [formulaRule(col)] }
        : column,
    );

  const apply = (steps: readonly WorkbookStep[], say?: RefusalText): boolean =>
    steps.length > 0 && follow(() => history.value.commit(steps), say) > 0;

  const attempt = (steps: readonly WorkbookStep[]): StepRefusal | undefined => {
    const tried: { refusal?: StepRefusal } = {};

    follow(() => {
      const outcome = history.value.commit(steps);

      if (outcome.ok) {
        return outcome;
      }

      tried.refusal = outcome.reason;
      return undefined;
    });

    return tried.refusal;
  };

  return {
    draft,
    revision,
    setDraft,
    moveDraft,
    apply,
    attempt,
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
