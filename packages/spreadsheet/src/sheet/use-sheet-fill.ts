import { computed, shallowRef } from 'vue';
import {
  CellValueKind,
  FillMode,
  createCellClips,
  type CellAddress,
  type CellRange,
  type Sheet,
} from '../core';
import { isKey } from './sheet-keys';
import {
  FillKey,
  type SheetFill,
  type SheetFillOptions,
  type SheetFillSession,
} from './sheet.types';
import { tableRangeOf } from './use-sheet-selection';

const PRIMARY_BUTTON = 0;

const unionOf = (a: CellRange, b: CellRange): CellRange => ({
  top: Math.min(a.top, b.top),
  left: Math.min(a.left, b.left),
  bottom: Math.max(a.bottom, b.bottom),
  right: Math.max(a.right, b.right),
});

const verticalExtension = (source: CellRange, line: CellAddress): CellRange =>
  line.row > source.bottom
    ? { ...source, top: source.bottom + 1, bottom: line.row }
    : { ...source, top: line.row, bottom: source.top - 1 };

const horizontalExtension = (source: CellRange, line: CellAddress): CellRange =>
  line.col > source.right
    ? { ...source, left: source.right + 1, right: line.col }
    : { ...source, left: line.col, right: source.left - 1 };

const fillExtension = (source: CellRange, line: CellAddress): CellRange | undefined => {
  const vertical = Math.max(line.row - source.bottom, source.top - line.row);
  const horizontal = Math.max(line.col - source.right, source.left - line.col);

  if (Math.max(vertical, horizontal) <= 0) {
    return undefined;
  }

  return vertical >= horizontal
    ? verticalExtension(source, line)
    : horizontalExtension(source, line);
};

const filled = (sheet: Sheet, row: number, col: number): boolean =>
  col >= 0 && sheet.cells.get(row, col).kind !== CellValueKind.Empty;

const runEnd = (sheet: Sheet, row: number, col: number): number =>
  filled(sheet, row + 1, col) ? sheet.cells.nextEdge(row, col, 1, 0) : row;

const downTarget = (sheet: Sheet, source: CellRange): CellRange | undefined => {
  const row = source.bottom + 1;
  const col = filled(sheet, row, source.left - 1) ? source.left - 1 : source.right + 1;

  return filled(sheet, row, col)
    ? { ...source, top: row, bottom: runEnd(sheet, row, col) }
    : undefined;
};

const keyFill = (
  source: CellRange,
  down: boolean,
): { readonly from: CellRange; readonly to: CellRange } | undefined => {
  const single = down ? source.top === source.bottom : source.left === source.right;

  if (down) {
    return single
      ? { from: { ...source, top: source.top - 1, bottom: source.top - 1 }, to: source }
      : { from: { ...source, bottom: source.top }, to: { ...source, top: source.top + 1 } };
  }

  return single
    ? { from: { ...source, left: source.left - 1, right: source.left - 1 }, to: source }
    : { from: { ...source, right: source.left }, to: { ...source, left: source.left + 1 } };
};

const fillKey = (event: KeyboardEvent): FillKey | undefined => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
    return undefined;
  }

  if (isKey(event, 'KeyD', 'd')) {
    return FillKey.Down;
  }

  return isKey(event, 'KeyR', 'r') ? FillKey.Right : undefined;
};

const withCtrl = (event: MouseEvent): boolean => event.ctrlKey || event.metaKey;

const inGrid = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('[role="grid"]') !== null;

export const useSheetFill = (options: SheetFillOptions): SheetFill => {
  const session = shallowRef<SheetFillSession>();

  const clips = computed(() => createCellClips(options.book(), options.calculator()));

  const source = (): CellRange | undefined => {
    const ranges = options.selection.current.value?.ranges ?? [];

    return ranges.length === 1 ? ranges[0] : undefined;
  };

  const idle = (): boolean => options.readonly() || options.editing.draft.value !== undefined;

  const handle = computed(() => {
    const cells = options.cells();
    const range = idle() ? undefined : source();

    return cells === undefined || range === undefined ? undefined : tableRangeOf(cells, range);
  });

  const preview = computed(() => {
    const cells = options.cells();
    const current = session.value;

    return cells === undefined || current?.target === undefined
      ? undefined
      : tableRangeOf(cells, unionOf(current.source, current.target));
  });

  const fillWith = (from: CellRange, to: CellRange, mode: FillMode, shown: CellRange): void => {
    const sheet = options.sheet();
    const active = options.selection.current.value?.active;

    const step =
      sheet === undefined ? undefined : clips.value.fill(sheet.name, from, unionOf(from, to), mode);

    if (step !== undefined && options.editing.apply([step])) {
      options.selection.select({
        active: active ?? { row: shown.top, col: shown.left },
        ranges: [shown],
      });
    }
  };

  const onDown = (event: PointerEvent): void => {
    const range = idle() ? undefined : source();

    if (event.button !== PRIMARY_BUTTON || range === undefined) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    options.root.value?.setPointerCapture(event.pointerId);
    session.value = { source: range, target: undefined, copy: withCtrl(event) };
  };

  const onMove = (event: PointerEvent): void => {
    const current = session.value;
    const cells = options.cells();
    const cell = options.table.value?.cellFromPoint(event.clientX, event.clientY);

    if (current === undefined || cells === undefined || cell === undefined) {
      return;
    }

    const line = { row: cells.rowAt(cell.row), col: cells.colAt(cell.col) };

    session.value = {
      ...current,
      target: fillExtension(current.source, line),
      copy: withCtrl(event),
    };
  };

  const onUp = (): void => {
    const current = session.value;

    session.value = undefined;

    if (current?.target !== undefined) {
      const mode = current.copy ? FillMode.Copy : FillMode.Series;

      fillWith(current.source, current.target, mode, unionOf(current.source, current.target));
    }
  };

  const onDblclick = (): void => {
    const sheet = options.sheet();
    const range = source();

    const target =
      sheet === undefined || range === undefined ? undefined : downTarget(sheet, range);

    if (range !== undefined && target !== undefined) {
      fillWith(range, target, FillMode.Series, unionOf(range, target));
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const key = idle() || !inGrid(event.target) ? undefined : fillKey(event);
    const range = source();

    const plan =
      key === undefined || range === undefined ? undefined : keyFill(range, key === FillKey.Down);

    if (plan === undefined || range === undefined) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (Math.min(plan.from.top, plan.from.left) >= 0) {
      fillWith(plan.from, plan.to, FillMode.Copy, range);
    }
  };

  const onCancel = (): void => {
    session.value = undefined;
  };

  return { handle, preview, onDown, onMove, onUp, onCancel, onDblclick, onKeydown };
};
