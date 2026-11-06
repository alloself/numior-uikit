import { Key } from '@numior/primitives';
import type { NuiTableDraft, NuiTableRange } from '@numior/table';
import { computed, nextTick } from 'vue';
import {
  formatRange,
  referenceSpans,
  toggleAnchors,
  type ReferenceSpan,
  type Sheet,
} from '../core';
import type {
  FormulaSegment,
  ReferenceFrame,
  SheetCells,
  SheetReferences,
  SheetReferencesOptions,
} from './sheet.types';

interface LastPick {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const TONES = 8;

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

const referenceText = (cells: SheetCells, range: NuiTableRange): string =>
  formatRange({
    top: cells.rowAt(Math.min(range.from.row, range.to.row)),
    left: cells.colAt(Math.min(range.from.col, range.to.col)),
    bottom: cells.rowAt(Math.max(range.from.row, range.to.row)),
    right: cells.colAt(Math.max(range.from.col, range.to.col)),
  });

const spanAtCaret = (spans: readonly ReferenceSpan[], caret: number): ReferenceSpan | undefined =>
  spans.find((span) => span.start <= caret && caret <= span.end) ??
  spans.findLast((span) => span.end <= caret);

export const useSheetReferences = (options: SheetReferencesOptions): SheetReferences => {
  const { editing } = options;

  let lastPick: LastPick | undefined;

  const draftText = computed(() => textOf(editing.draft.value?.value));

  const spans = computed(() =>
    draftText.value.startsWith(FORMULA_START)
      ? referenceSpans(draftText.value, options.locale().formulas)
      : [],
  );

  const segments = computed(() => segmentsOf(draftText.value, spans.value));

  const frames = computed((): ReferenceFrame[] => {
    const cells = options.cells();
    const sheet = options.sheet();
    const tones = tonesOf(spans.value);

    if (cells === undefined || sheet === undefined) {
      return [];
    }
    return spans.value.flatMap((span, index) =>
      onThisSheet(span, sheet)
        ? [{ key: String(span.start), range: tableRange(cells, span), tone: tones[index] ?? 1 }]
        : [],
    );
  });

  const caretField = (): HTMLInputElement | HTMLTextAreaElement | undefined => {
    const field = document.activeElement;

    return (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) &&
      field !== options.nameField.value &&
      options.root.value?.contains(field) === true
      ? field
      : undefined;
  };

  const caretOf = (text: string): number =>
    Math.min(caretField()?.selectionEnd ?? text.length, text.length);

  const continuesPick = (text: string, caret: number): boolean =>
    lastPick !== undefined && lastPick.text === text && lastPick.end === caret;

  const placeCaret = async (at: number): Promise<void> => {
    await nextTick();
    caretField()?.setSelectionRange(at, at);
  };

  const write = (draft: NuiTableDraft, text: string, caret: number): void => {
    editing.setDraft({ ...draft, value: text });
    void placeCaret(caret);
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

  return { segments, frames, picking, onPick, onKeydown };
};
