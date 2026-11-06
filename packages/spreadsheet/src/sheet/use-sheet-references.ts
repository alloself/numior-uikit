import { Key } from '@numior/primitives';
import type { NuiTableDraft, NuiTableRange, TableCellPosition } from '@numior/table';
import { computed } from 'vue';
import {
  formatRange,
  referenceSpans,
  retarget,
  toggleAnchors,
  type CellRange,
  type ReferenceSpan,
  type Sheet,
} from '../core';
import {
  FrameGrip,
  type FormulaSegment,
  type ReferenceFrame,
  type SheetCells,
  type SheetReferences,
  type SheetReferencesOptions,
} from './sheet.types';
import { caretFieldIn, placeCaretIn, type CaretField } from './sheet-caret';

interface LastPick {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

interface GripSession {
  readonly grip: FrameGrip;
  readonly origin: NuiTableRange;
  readonly grab: TableCellPosition;
  readonly text: string;
  readonly span: ReferenceSpan;
}

const TONES = 8;

const PRIMARY_BUTTON = 0;

const CORNERS = new Set<FrameGrip>([
  FrameGrip.TopStart,
  FrameGrip.TopEnd,
  FrameGrip.BottomStart,
  FrameGrip.BottomEnd,
]);

const FORMULA_START = '=';

const OPERAND_BEFORE = new Set(['=', '(', '+', '-', '*', '/', '^', '&', '<', '>', ',', ';', ':']);

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const spanKey = (span: ReferenceSpan): string =>
  `${(span.sheet ?? '').toLowerCase()}!${formatRange(span.range)}`;

const tonesOf = (spans: readonly ReferenceSpan[]): number[] => {
  const known = new Map<string, number>();

  return spans.map((span) => {
    const key = spanKey(span);
    const tone = known.get(key) ?? (known.size % TONES) + 1;

    known.set(key, tone);
    return tone;
  });
};

const segmentsOf = (text: string, spans: readonly ReferenceSpan[]): FormulaSegment[] => {
  const tones = tonesOf(spans);

  const { parts, at } = spans.reduce<{ parts: FormulaSegment[]; at: number }>(
    (built, span, index) => ({
      parts: [
        ...built.parts,
        { key: `t${String(built.at)}`, text: text.slice(built.at, span.start), tone: undefined },
        {
          key: `r${String(span.start)}`,
          text: text.slice(span.start, span.end),
          tone: tones[index],
        },
      ],
      at: span.end,
    }),
    { parts: [], at: 0 },
  );

  return [...parts, { key: `t${String(at)}`, text: text.slice(at), tone: undefined }].filter(
    (part) => part.text !== '',
  );
};

const onThisSheet = (span: ReferenceSpan, sheet: Sheet): boolean =>
  !span.external &&
  (span.sheet === undefined || span.sheet.toLowerCase() === sheet.name.toLowerCase());

const tableRange = (cells: SheetCells, span: ReferenceSpan): NuiTableRange => ({
  from: { row: cells.rowNear(span.range.top), col: cells.colNear(span.range.left) },
  to: { row: cells.rowNear(span.range.bottom), col: cells.colNear(span.range.right) },
});

const sheetRange = (cells: SheetCells, range: NuiTableRange): CellRange => ({
  top: cells.rowAt(Math.min(range.from.row, range.to.row)),
  left: cells.colAt(Math.min(range.from.col, range.to.col)),
  bottom: cells.rowAt(Math.max(range.from.row, range.to.row)),
  right: cells.colAt(Math.max(range.from.col, range.to.col)),
});

const referenceText = (cells: SheetCells, range: NuiTableRange): string =>
  formatRange(sheetRange(cells, range));

const clampShift = (shift: number, low: number, high: number, last: number): number =>
  Math.min(Math.max(shift, -low), last - high);

const moved = (session: GripSession, cell: TableCellPosition, cells: SheetCells): NuiTableRange => {
  const { origin, grab } = session;

  const rows = clampShift(
    cell.row - grab.row,
    origin.from.row,
    origin.to.row,
    cells.source.rows - 1,
  );

  const cols = clampShift(
    cell.col - grab.col,
    origin.from.col,
    origin.to.col,
    cells.source.cols - 1,
  );

  return {
    from: { row: origin.from.row + rows, col: origin.from.col + cols },
    to: { row: origin.to.row + rows, col: origin.to.col + cols },
  };
};

const fixedCorner = (origin: NuiTableRange, grip: FrameGrip): TableCellPosition => {
  switch (grip) {
    case FrameGrip.TopStart: {
      return origin.to;
    }
    case FrameGrip.TopEnd: {
      return { row: origin.to.row, col: origin.from.col };
    }
    case FrameGrip.BottomStart: {
      return { row: origin.from.row, col: origin.to.col };
    }
    default: {
      return origin.from;
    }
  }
};

const draggedRange = (
  session: GripSession,
  cell: TableCellPosition,
  cells: SheetCells,
): NuiTableRange =>
  CORNERS.has(session.grip)
    ? { from: fixedCorner(session.origin, session.grip), to: cell }
    : moved(session, cell, cells);

const spanAtCaret = (spans: readonly ReferenceSpan[], caret: number): ReferenceSpan | undefined =>
  spans.find((span) => span.start <= caret && caret <= span.end) ??
  spans.findLast((span) => span.end <= caret);

export const useSheetReferences = (options: SheetReferencesOptions): SheetReferences => {
  const { editing } = options;

  let lastPick: LastPick | undefined;

  let session: GripSession | undefined;

  const draftText = computed(() => textOf(editing.draft.value?.value));

  const shownText = computed(() => options.text());

  const spans = computed(() =>
    shownText.value.startsWith(FORMULA_START)
      ? referenceSpans(shownText.value, options.locale().formulas)
      : [],
  );

  const segments = computed(() => segmentsOf(shownText.value, spans.value));

  const frames = computed((): ReferenceFrame[] => {
    const cells = options.cells();
    const sheet = options.sheet();
    const tones = tonesOf(spans.value);

    if (cells === undefined || sheet === undefined) {
      return [];
    }
    return spans.value.flatMap((span, index) =>
      onThisSheet(span, sheet)
        ? [
            {
              key: String(span.start),
              span,
              range: tableRange(cells, span),
              tone: tones[index] ?? 1,
            },
          ]
        : [],
    );
  });

  const caretField = (): CaretField | undefined =>
    caretFieldIn(options.root.value, options.nameField.value);

  const caretOf = (text: string): number =>
    Math.min(caretField()?.selectionEnd ?? text.length, text.length);

  const continuesPick = (text: string, caret: number): boolean =>
    lastPick !== undefined && lastPick.text === text && lastPick.end === caret;

  const write = (draft: NuiTableDraft, text: string, caret: number): void => {
    editing.setDraft({ ...draft, value: text });
    void placeCaretIn(options.root.value, options.nameField.value, caret);
  };

  const picking = (draft: NuiTableDraft): boolean => {
    const text = textOf(draft.value);
    const caret = caretOf(text);
    const before = text.slice(0, caret).trimEnd().at(-1);

    return (
      text.startsWith(FORMULA_START) &&
      (continuesPick(text, caret) || (before !== undefined && OPERAND_BEFORE.has(before)))
    );
  };

  const onPick = (range: NuiTableRange): void => {
    const draft = editing.draft.value;
    const cells = options.cells();

    if (draft === undefined || cells === undefined) {
      return;
    }

    const text = textOf(draft.value);
    const caret = caretOf(text);
    const from = continuesPick(text, caret) && lastPick !== undefined ? lastPick.start : caret;
    const reference = referenceText(cells, range);
    const next = `${text.slice(0, from)}${reference}${text.slice(caret)}`;

    lastPick = { text: next, start: from, end: from + reference.length };
    write(draft, next, lastPick.end);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    const draft = editing.draft.value;
    const text = draftText.value;
    const span = spanAtCaret(spans.value, caretOf(text));

    if (
      event.key !== Key.F4 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      draft === undefined ||
      caretField() === undefined ||
      span === undefined
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const toggled = toggleAnchors(text, span);

    lastPick = { text: toggled.text, start: span.start, end: toggled.end };
    write(draft, toggled.text, toggled.end);
  };

  const onGripDown = (event: PointerEvent, frame: ReferenceFrame, grip: FrameGrip): void => {
    const draft = editing.draft.value;
    const grab = options.table.value?.cellFromPoint(event.clientX, event.clientY);

    if (event.button !== PRIMARY_BUTTON || draft === undefined || grab === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    options.root.value?.setPointerCapture(event.pointerId);
    session = { grip, origin: frame.range, grab, text: textOf(draft.value), span: frame.span };
  };

  const onGripMove = (event: PointerEvent): void => {
    const current = session;
    const cells = options.cells();
    const draft = editing.draft.value;

    if (current === undefined || cells === undefined || draft === undefined) {
      return;
    }

    const cell = options.table.value?.cellFromPoint(event.clientX, event.clientY);

    if (cell === undefined) {
      return;
    }

    const result = retarget(
      current.text,
      current.span,
      sheetRange(cells, draggedRange(current, cell, cells)),
    );

    if (result.text !== textOf(draft.value)) {
      lastPick = { text: result.text, start: current.span.start, end: result.end };
      write(draft, result.text, result.end);
    }
  };

  const onGripUp = (): void => {
    session = undefined;
  };

  return { segments, frames, picking, onPick, onKeydown, onGripDown, onGripMove, onGripUp };
};
