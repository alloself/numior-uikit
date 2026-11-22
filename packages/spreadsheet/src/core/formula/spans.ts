import {
  columnIndex,
  columnName,
  formatCell,
  parseCell,
  rangeOf,
  MAX_COLS,
  MAX_ROWS,
} from '../address';
import { CellError, LineAxis, type CellRange, type CellRef } from '../cell.types';
import { shiftRange } from '../layout/shift-ranges';
import { EN_FORMULAS } from './locale';
import { EndpointKind, FormulaChar, TokenKind, type FormulaLocale } from './formula.types';
import { tokenize, type Token } from './lexer';
import { sameName, type LineChange } from './rewrite';

export interface TextEdit {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

export interface TextShift {
  readonly text: string;
  readonly edits: readonly TextEdit[];
}

export interface ReferenceSpan {
  readonly start: number;
  readonly address: number;
  readonly end: number;
  readonly sheet: string | undefined;
  readonly external: boolean;
  readonly range: CellRange;
}

export interface AnchoredText {
  readonly text: string;
  readonly end: number;
}

type Endpoint =
  | { readonly kind: typeof EndpointKind.Cell; readonly ref: CellRef }
  | {
      readonly kind: typeof EndpointKind.Column;
      readonly index: number;
      readonly absolute: boolean;
    }
  | { readonly kind: typeof EndpointKind.Row; readonly index: number; readonly absolute: boolean };

interface Extent {
  readonly range: CellRange;
  readonly end: number;
  readonly next: number;
}

interface Found {
  readonly span: ReferenceSpan;
  readonly next: number;
}

const FORMULA_START = '=';

const COLUMN = /^(\$?)([A-Za-z]{1,3})$/u;

const ROW = /^(\$?)(\d{1,7})$/u;

const lineEndpoint = (text: string): Endpoint | undefined => {
  const column = COLUMN.exec(text);
  const col = column?.[2] === undefined ? undefined : columnIndex(column[2]);

  if (col !== undefined) {
    return { kind: EndpointKind.Column, index: col, absolute: column?.[1] === FormulaChar.Dollar };
  }

  const row = ROW.exec(text);
  const index = row?.[2] === undefined ? 0 : Number.parseInt(row[2], 10);

  return index >= 1 && index <= MAX_ROWS
    ? { kind: EndpointKind.Row, index: index - 1, absolute: row?.[1] === FormulaChar.Dollar }
    : undefined;
};

const endpointText = (text: string): Endpoint | undefined => {
  const ref = parseCell(text);

  return ref === undefined ? lineEndpoint(text) : { kind: EndpointKind.Cell, ref };
};

const endpointOf = (token: Token | undefined): Endpoint | undefined =>
  token?.kind === TokenKind.Word || token?.kind === TokenKind.Number
    ? endpointText(token.text)
    : undefined;

const rangeOfEnds = (first: Endpoint, last: Endpoint): CellRange | undefined => {
  if (first.kind === EndpointKind.Cell && last.kind === EndpointKind.Cell) {
    return rangeOf(first.ref, last.ref);
  }
  if (first.kind === EndpointKind.Column && last.kind === EndpointKind.Column) {
    return rangeOf({ row: 0, col: first.index }, { row: MAX_ROWS - 1, col: last.index });
  }
  if (first.kind === EndpointKind.Row && last.kind === EndpointKind.Row) {
    return rangeOf({ row: first.index, col: 0 }, { row: last.index, col: MAX_COLS - 1 });
  }
  return undefined;
};

const isCall = (token: Token | undefined): boolean =>
  token?.kind === TokenKind.Punct && token.text === FormulaChar.OpenParen;

const isColon = (token: Token | undefined): boolean =>
  token?.kind === TokenKind.Op && token.text === FormulaChar.Colon;

const endOf = (token: Token): number => token.start + token.text.length;

const extentOf = (tokens: readonly Token[], at: number, start: Endpoint): Extent | undefined => {
  const first = tokens[at];
  const last = isColon(tokens[at + 1]) ? tokens[at + 2] : undefined;
  const finish = endpointOf(last);
  const range = finish === undefined ? undefined : rangeOfEnds(start, finish);

  if (first === undefined) {
    return undefined;
  }
  if (range !== undefined && last !== undefined) {
    return { range, end: endOf(last), next: at + 3 };
  }
  return start.kind === EndpointKind.Cell
    ? { range: rangeOf(start.ref, start.ref), end: endOf(first), next: at + 1 }
    : undefined;
};

const spanAt = (tokens: readonly Token[], index: number): Found | undefined => {
  const head = tokens[index];
  const sheet = head?.kind === TokenKind.Sheet ? head : undefined;
  const at = sheet === undefined ? index : index + 1;
  const first = tokens[at];
  const start = endpointOf(first);

  if (head === undefined || first === undefined || start === undefined || isCall(tokens[at + 1])) {
    return undefined;
  }

  const extent = extentOf(tokens, at, start);

  return extent === undefined
    ? undefined
    : {
        span: {
          start: head.start,
          address: first.start,
          end: extent.end,
          sheet: sheet?.text,
          external: sheet !== undefined && (sheet.book !== undefined || sheet.value !== 0),
          range: extent.range,
        },
        next: extent.next,
      };
};

const shifted = (span: ReferenceSpan, by: number): ReferenceSpan => ({
  ...span,
  start: span.start + by,
  address: span.address + by,
  end: span.end + by,
});

export const referenceSpans = (
  text: string,
  locale: FormulaLocale = EN_FORMULAS,
): ReferenceSpan[] => {
  const tokens = text.startsWith(FORMULA_START) ? tokenize(text.slice(1), locale) : [];
  const spans: ReferenceSpan[] = [];

  if (!Array.isArray(tokens)) {
    return spans;
  }
  for (let index = 0; index < tokens.length;) {
    const found = spanAt(tokens, index);

    if (found === undefined) {
      index += 1;
    } else {
      spans.push(shifted(found.span, FORMULA_START.length));
      index = found.next;
    }
  }
  return spans;
};

const nextAnchors = (col: boolean, row: boolean): readonly [boolean, boolean] => {
  if (!col && !row) {
    return [true, true];
  }
  if (col && row) {
    return [false, true];
  }
  return row ? [true, false] : [false, false];
};

const anchored = (endpoint: Endpoint, col: boolean, row: boolean): string => {
  switch (endpoint.kind) {
    case EndpointKind.Cell: {
      return formatCell({ ...endpoint.ref, colAbsolute: col, rowAbsolute: row });
    }
    case EndpointKind.Column: {
      return `${col ? FormulaChar.Dollar : ''}${columnName(endpoint.index)}`;
    }
    default: {
      return `${row ? FormulaChar.Dollar : ''}${String(endpoint.index + 1)}`;
    }
  }
};

const anchorsOf = (endpoint: Endpoint): readonly [boolean, boolean] => {
  switch (endpoint.kind) {
    case EndpointKind.Cell: {
      return nextAnchors(endpoint.ref.colAbsolute, endpoint.ref.rowAbsolute);
    }
    case EndpointKind.Column: {
      return [!endpoint.absolute, false];
    }
    default: {
      return [false, !endpoint.absolute];
    }
  }
};

export const toggleAnchors = (text: string, span: ReferenceSpan): AnchoredText => {
  const parts = text.slice(span.address, span.end).split(FormulaChar.Colon);

  const ends = parts.flatMap((part) => {
    const endpoint = endpointText(part);

    return endpoint === undefined ? [] : [endpoint];
  });

  const [first] = ends;

  if (first === undefined || ends.length !== parts.length) {
    return { text, end: span.end };
  }

  const [col, row] = anchorsOf(first);
  const address = ends.map((endpoint) => anchored(endpoint, col, row)).join(FormulaChar.Colon);

  return {
    text: `${text.slice(0, span.address)}${address}${text.slice(span.end)}`,
    end: span.address + address.length,
  };
};

const placed = (endpoint: Endpoint, row: number, col: number): string => {
  switch (endpoint.kind) {
    case EndpointKind.Cell: {
      return formatCell({ ...endpoint.ref, row, col });
    }
    case EndpointKind.Column: {
      return `${endpoint.absolute ? FormulaChar.Dollar : ''}${columnName(col)}`;
    }
    default: {
      return `${endpoint.absolute ? FormulaChar.Dollar : ''}${String(row + 1)}`;
    }
  }
};

const addressOf = (first: Endpoint, last: Endpoint, range: CellRange): string => {
  const head = placed(first, range.top, range.left);

  const single =
    first.kind === EndpointKind.Cell && range.top === range.bottom && range.left === range.right;

  return single ? head : `${head}${FormulaChar.Colon}${placed(last, range.bottom, range.right)}`;
};

export const retarget = (text: string, span: ReferenceSpan, range: CellRange): AnchoredText => {
  const ends = text
    .slice(span.address, span.end)
    .split(FormulaChar.Colon)
    .map((part) => endpointText(part));

  const [first] = ends;
  const last = ends.at(-1);

  if (first === undefined || last === undefined || ends.includes(undefined)) {
    return { text, end: span.end };
  }

  const address = addressOf(first, last.kind === first.kind ? last : first, range);

  return {
    text: `${text.slice(0, span.address)}${address}${text.slice(span.end)}`,
    end: span.address + address.length,
  };
};

const acrossAxis = (endpoint: Endpoint, change: LineChange): boolean =>
  (endpoint.kind === EndpointKind.Column && change.axis === LineAxis.Rows) ||
  (endpoint.kind === EndpointKind.Row && change.axis === LineAxis.Cols);

const sameRange = (left: CellRange, right: CellRange): boolean =>
  left.top === right.top &&
  left.left === right.left &&
  left.bottom === right.bottom &&
  left.right === right.right;

const followedRange = (
  range: CellRange,
  first: Endpoint,
  changes: readonly LineChange[],
  sheet: string,
): CellRange | undefined =>
  changes.reduce<CellRange | undefined>(
    (current, change) =>
      current === undefined || !sameName(change.sheet, sheet) || acrossAxis(first, change)
        ? current
        : shiftRange(current, change),
    range,
  );

const editOf = (
  text: string,
  span: ReferenceSpan,
  changes: readonly LineChange[],
  sheet: string,
): TextEdit | undefined => {
  const ends = text
    .slice(span.address, span.end)
    .split(FormulaChar.Colon)
    .map((part) => endpointText(part));

  const [first] = ends;
  const last = ends.at(-1);

  if (span.external || first === undefined || last === undefined || ends.includes(undefined)) {
    return undefined;
  }

  const range = followedRange(span.range, first, changes, span.sheet ?? sheet);

  if (range === undefined) {
    return { from: span.address, to: span.end, text: CellError.Ref };
  }

  const head = placed(first, range.top, range.left);

  const address =
    ends.length > 1
      ? `${head}${FormulaChar.Colon}${placed(last, range.bottom, range.right)}`
      : head;

  return sameRange(range, span.range)
    ? undefined
    : { from: span.address, to: span.end, text: address };
};

const editedText = (text: string, edits: readonly TextEdit[]): string => {
  const built = edits.reduce(
    (joined, edit) => ({
      text: `${joined.text}${text.slice(joined.at, edit.from)}${edit.text}`,
      at: edit.to,
    }),
    { text: '', at: 0 },
  );

  return `${built.text}${text.slice(built.at)}`;
};

const editsOf = (
  spans: readonly ReferenceSpan[],
  edit: (span: ReferenceSpan) => TextEdit | undefined,
): TextEdit[] =>
  spans.reduce<TextEdit[]>((found, span) => {
    const made = edit(span);

    if (made !== undefined) {
      found.push(made);
    }
    return found;
  }, []);

export const followLines = (
  text: string,
  changes: readonly LineChange[],
  sheet: string,
  locale: FormulaLocale = EN_FORMULAS,
): TextShift | undefined => {
  const spans = changes.length === 0 ? [] : referenceSpans(text, locale);
  const edits = editsOf(spans, (span) => editOf(text, span, changes, sheet));

  return edits.length === 0 ? undefined : { text: editedText(text, edits), edits };
};

const inSheet = (index: number, size: number): boolean => index >= 0 && index < size;

const shiftedIndex = (index: number, absolute: boolean, by: number): number =>
  absolute ? index : index + by;

const movedEndpoint = (endpoint: Endpoint, rows: number, cols: number): string | undefined => {
  switch (endpoint.kind) {
    case EndpointKind.Cell: {
      const row = shiftedIndex(endpoint.ref.row, endpoint.ref.rowAbsolute, rows);
      const col = shiftedIndex(endpoint.ref.col, endpoint.ref.colAbsolute, cols);

      return inSheet(row, MAX_ROWS) && inSheet(col, MAX_COLS)
        ? placed(endpoint, row, col)
        : undefined;
    }
    case EndpointKind.Column: {
      const col = shiftedIndex(endpoint.index, endpoint.absolute, cols);

      return inSheet(col, MAX_COLS) ? placed(endpoint, 0, col) : undefined;
    }
    default: {
      const row = shiftedIndex(endpoint.index, endpoint.absolute, rows);

      return inSheet(row, MAX_ROWS) ? placed(endpoint, row, 0) : undefined;
    }
  }
};

const movedSpan = (text: string, span: ReferenceSpan, rows: number, cols: number): TextEdit => {
  const moved = text
    .slice(span.address, span.end)
    .split(FormulaChar.Colon)
    .reduce<string[] | undefined>((parts, part) => {
      const endpoint = endpointText(part);
      const place = endpoint === undefined ? undefined : movedEndpoint(endpoint, rows, cols);

      if (parts === undefined || place === undefined) {
        return undefined;
      }
      parts.push(place);
      return parts;
    }, []);

  return {
    from: span.address,
    to: span.end,
    text: moved === undefined ? CellError.Ref : moved.join(FormulaChar.Colon),
  };
};

export const offsetText = (
  text: string,
  rows: number,
  cols: number,
  locale: FormulaLocale = EN_FORMULAS,
): string => {
  const source = `${FORMULA_START}${text}`;
  const spans = rows === 0 && cols === 0 ? [] : referenceSpans(source, locale);
  const edits = editsOf(spans, (span) => movedSpan(source, span, rows, cols));

  return editedText(source, edits).slice(FORMULA_START.length);
};

export const shiftOffset = (shift: TextShift, offset: number): number =>
  shift.edits.reduce((moved, edit) => {
    if (offset <= edit.from) {
      return moved;
    }

    const length = edit.text.length;

    return offset >= edit.to
      ? moved + length - (edit.to - edit.from)
      : moved - (offset - edit.from) + Math.min(offset - edit.from, length);
  }, offset);
