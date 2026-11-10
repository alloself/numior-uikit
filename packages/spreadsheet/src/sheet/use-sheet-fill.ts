import { computed, shallowRef } from 'vue';
import {
  CellValueKind,
  FillMode,
  createCellClips,
  type CellAddress,
  type CellRange,
  type Sheet,
  type WorkbookStep,
} from '../core';
import { inGrid, isKey } from './sheet-keys';
import {
  FillKey,
  FillTargetKind,
  type SheetFill,
  type SheetFillOptions,
  type SheetFillSession,
  type SheetFillTarget,
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

const inside = (source: CellRange, line: CellAddress): boolean =>
  line.row >= source.top &&
  line.row <= source.bottom &&
  line.col >= source.left &&
  line.col <= source.right;

const shrinkOf = (source: CellRange, line: CellAddress): SheetFillTarget | undefined => {
  const rows = source.bottom - line.row;
  const cols = source.right - line.col;

  if (!inside(source, line) || Math.max(rows, cols) <= 0) {
    return undefined;
  }

  return rows >= cols
    ? {
        kind: FillTargetKind.Clear,
        range: { ...source, top: line.row + 1 },
        kept: { ...source, bottom: line.row },
      }
    : {
        kind: FillTargetKind.Clear,
        range: { ...source, left: line.col + 1 },
        kept: { ...source, right: line.col },
      };
};

const fillTarget = (source: CellRange, line: CellAddress): SheetFillTarget | undefined => {
  const range = fillExtension(source, line);

  return range === undefined ? shrinkOf(source, line) : { kind: FillTargetKind.Extend, range };
};

const shownOf = (source: CellRange, target: SheetFillTarget): CellRange => {
  switch (target.kind) {
    case FillTargetKind.Extend:
      return unionOf(source, target.range);
    case FillTargetKind.Clear:
      return target.kept;
  }
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

const activeWithin = (kept: CellRange, active: CellAddress | undefined): CellAddress =>
  active !== undefined && inside(kept, active) ? active : { row: kept.top, col: kept.left };

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
      : tableRangeOf(cells, shownOf(current.source, current.target));
  });

  const clearing = computed(() => {
    const cells = options.cells();
    const target = session.value?.target;

    return cells === undefined || target?.kind !== FillTargetKind.Clear
      ? undefined
      : tableRangeOf(cells, target.range);
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

  const dragTo = (x: number, y: number, copy: boolean): void => {
    const current = session.value;
    const cells = options.cells();
    const cell = options.table.value?.cellNear(x, y);

    if (current === undefined || cells === undefined || cell === undefined) {
      return;
    }

    const line = { row: cells.rowAt(cell.row), col: cells.colAt(cell.col) };

    session.value = {
      ...current,
      target: fillTarget(current.source, line),
      copy,
    };
  };

  const onMove = (event: PointerEvent): void => {
    const { clientX: x, clientY: y } = event;
    const copy = withCtrl(event);

    if (session.value === undefined) {
      return;
    }
    dragTo(x, y, copy);

    options.table.value?.followEdge(x, y, () => {
      dragTo(x, y, copy);
    });
  };

  const stop = (): SheetFillSession | undefined => {
    const current = session.value;

    if (current !== undefined) {
      session.value = undefined;
      options.table.value?.stopEdge();
    }
    return current;
  };

  const clearStep = (target: CellRange): WorkbookStep | undefined => {
    const sheet = options.sheet();

    return sheet === undefined ? undefined : clips.value.clear(sheet.name, [target]);
  };

  const clearTo = (target: CellRange, kept: CellRange): void => {
    const step = clearStep(target);

    if (step !== undefined && !options.editing.apply([step])) {
      return;
    }

    options.selection.select({
      active: activeWithin(kept, options.selection.current.value?.active),
      ranges: [kept],
    });
  };

  const onUp = (): void => {
    const current = stop();
    const target = current?.target;

    if (current === undefined || target === undefined) {
      return;
    }

    switch (target.kind) {
      case FillTargetKind.Extend:
        fillWith(
          current.source,
          target.range,
          current.copy ? FillMode.Copy : FillMode.Series,
          unionOf(current.source, target.range),
        );

        break;
      case FillTargetKind.Clear:
        clearTo(target.range, target.kept);
        break;
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
    const editing = options.editing.draft.value !== undefined;
    const owned = !options.readonly() && (editing || inGrid(event.target));
    const key = owned ? fillKey(event) : undefined;

    if (key === undefined) {
      return;
    }

    event.preventDefault();

    const range = editing ? undefined : source();
    const plan = range === undefined ? undefined : keyFill(range, key === FillKey.Down);

    if (plan === undefined || range === undefined) {
      return;
    }

    event.stopPropagation();

    if (Math.min(plan.from.top, plan.from.left) >= 0) {
      fillWith(plan.from, plan.to, FillMode.Copy, range);
    }
  };

  const onCancel = (): void => {
    stop();
  };

  return { handle, preview, clearing, onDown, onMove, onUp, onCancel, onDblclick, onKeydown };
};
