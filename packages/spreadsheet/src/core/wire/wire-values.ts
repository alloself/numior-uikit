import {
  isBoolean,
  isNumber,
  isRecord,
  isString,
  listOf,
  oneOf,
  optional,
  shapeOf,
  type Guard,
  type Guarded,
} from '@numior/primitives/guards';
import { MAX_COLS, MAX_ROWS } from '../address';
import type { CellContent } from '../calc/calc.types';
import {
  CellError,
  CellInputKind,
  CellValueKind,
  type CellAddress,
  type CellRange,
  type CellRef,
  type CellValue,
} from '../cell.types';
import {
  AreaOperator,
  BinaryOperator,
  FormulaNodeKind,
  StructuredArea,
  UnaryOperator,
  type FormulaNode,
} from '../formula/formula.types';
import { MAX_FORMULA_DEPTH } from '../formula/excel-limits';
import { childrenOf } from '../formula/walk';

type KindGuards = Readonly<Record<string, Guard<unknown>>>;

interface Waiting {
  readonly value: unknown;
  readonly depth: number;
}

export const lazy =
  <T>(get: () => Guard<T>): Guard<T> =>
  (value): value is T =>
    get()(value);

export const byKind =
  <G extends KindGuards>(guards: G): Guard<Guarded<G[keyof G]>> =>
  (value): value is Guarded<G[keyof G]> =>
    isRecord(value) &&
    typeof value.kind === 'string' &&
    Object.hasOwn(guards, value.kind) &&
    guards[value.kind]?.(value) === true;

export const isCount: Guard<number> = (value): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

export const isRow: Guard<number> = (value): value is number => isCount(value) && value < MAX_ROWS;

export const isCol: Guard<number> = (value): value is number => isCount(value) && value < MAX_COLS;

export const isAddress: Guard<CellAddress> = shapeOf({ row: isRow, col: isCol });

export const isRange: Guard<CellRange> = shapeOf({
  top: isRow,
  left: isCol,
  bottom: isRow,
  right: isCol,
});

const isCellError = oneOf(...Object.values(CellError));

export const isCellValue: Guard<CellValue> = byKind({
  [CellValueKind.Empty]: shapeOf({ kind: oneOf(CellValueKind.Empty) }),
  [CellValueKind.Number]: shapeOf({ kind: oneOf(CellValueKind.Number), value: isNumber }),
  [CellValueKind.String]: shapeOf({ kind: oneOf(CellValueKind.String), value: isString }),
  [CellValueKind.Boolean]: shapeOf({ kind: oneOf(CellValueKind.Boolean), value: isBoolean }),
  [CellValueKind.Error]: shapeOf({ kind: oneOf(CellValueKind.Error), code: isCellError }),
});

const offsetWithin =
  (limit: number): Guard<number> =>
  (value): value is number =>
    typeof value === 'number' && Number.isInteger(value) && Math.abs(value) < limit;

const isRowOffset = offsetWithin(MAX_ROWS);

const isColOffset = offsetWithin(MAX_COLS);

const isCellRef: Guard<CellRef> = shapeOf({
  row: isRowOffset,
  col: isColOffset,
  rowAbsolute: isBoolean,
  colAbsolute: isBoolean,
});

const isLineRef = shapeOf({ index: isRowOffset, absolute: isBoolean });

const PLACE = { book: optional(isCount), sheet: optional(isString) };

const operand = (value: unknown): value is FormulaNode => isRecord(value);

const isAreaList = (value: unknown): value is FormulaNode[] =>
  listOf(operand)(value) && value.length > 1;

const isFormulaNode: Guard<FormulaNode> = byKind({
  [FormulaNodeKind.Number]: shapeOf({ kind: oneOf(FormulaNodeKind.Number), value: isNumber }),
  [FormulaNodeKind.String]: shapeOf({ kind: oneOf(FormulaNodeKind.String), value: isString }),
  [FormulaNodeKind.Boolean]: shapeOf({ kind: oneOf(FormulaNodeKind.Boolean), value: isBoolean }),
  [FormulaNodeKind.Error]: shapeOf({
    kind: oneOf(FormulaNodeKind.Error),
    code: isCellError,
    ...PLACE,
  }),
  [FormulaNodeKind.Cell]: shapeOf({
    kind: oneOf(FormulaNodeKind.Cell),
    ...PLACE,
    ref: isCellRef,
  }),
  [FormulaNodeKind.Range]: shapeOf({
    kind: oneOf(FormulaNodeKind.Range),
    ...PLACE,
    from: isCellRef,
    to: isCellRef,
  }),
  [FormulaNodeKind.Columns]: shapeOf({
    kind: oneOf(FormulaNodeKind.Columns),
    ...PLACE,
    from: isLineRef,
    to: isLineRef,
  }),
  [FormulaNodeKind.Rows]: shapeOf({
    kind: oneOf(FormulaNodeKind.Rows),
    ...PLACE,
    from: isLineRef,
    to: isLineRef,
  }),
  [FormulaNodeKind.Spill]: shapeOf({
    kind: oneOf(FormulaNodeKind.Spill),
    ...PLACE,
    ref: isCellRef,
  }),
  [FormulaNodeKind.Name]: shapeOf({
    kind: oneOf(FormulaNodeKind.Name),
    ...PLACE,
    name: isString,
  }),
  [FormulaNodeKind.Structured]: shapeOf({
    kind: oneOf(FormulaNodeKind.Structured),
    book: optional(isCount),
    table: optional(isString),
    area: oneOf(...Object.values(StructuredArea)),
    columns: optional(shapeOf({ from: isString, to: isString })),
  }),
  [FormulaNodeKind.Call]: shapeOf({
    kind: oneOf(FormulaNodeKind.Call),
    name: isString,
    args: listOf(operand),
  }),
  [FormulaNodeKind.Unary]: shapeOf({
    kind: oneOf(FormulaNodeKind.Unary),
    op: oneOf(...Object.values(UnaryOperator)),
    operand,
  }),
  [FormulaNodeKind.Percent]: shapeOf({ kind: oneOf(FormulaNodeKind.Percent), operand }),
  [FormulaNodeKind.Binary]: shapeOf({
    kind: oneOf(FormulaNodeKind.Binary),
    op: oneOf(...Object.values(BinaryOperator)),
    left: operand,
    right: operand,
  }),
  [FormulaNodeKind.Areas]: shapeOf({
    kind: oneOf(FormulaNodeKind.Areas),
    op: oneOf(...Object.values(AreaOperator)),
    left: operand,
    right: operand,
  }),
  [FormulaNodeKind.Union]: shapeOf({ kind: oneOf(FormulaNodeKind.Union), areas: isAreaList }),
  [FormulaNodeKind.Apply]: shapeOf({
    kind: oneOf(FormulaNodeKind.Apply),
    callee: operand,
    args: listOf(operand),
  }),
  [FormulaNodeKind.Array]: shapeOf({
    kind: oneOf(FormulaNodeKind.Array),
    rows: listOf(listOf(operand)),
  }),
  [FormulaNodeKind.Missing]: shapeOf({ kind: oneOf(FormulaNodeKind.Missing) }),
  [FormulaNodeKind.Opaque]: shapeOf({ kind: oneOf(FormulaNodeKind.Opaque), text: isString }),
});

export const isFormula: Guard<FormulaNode> = (value): value is FormulaNode => {
  const waiting: Waiting[] = [{ value, depth: 1 }];

  for (let item = waiting.pop(); item !== undefined; item = waiting.pop()) {
    if (item.depth > MAX_FORMULA_DEPTH || !isFormulaNode(item.value)) {
      return false;
    }
    for (const child of childrenOf(item.value)) {
      waiting.push({ value: child, depth: item.depth + 1 });
    }
  }
  return true;
};

export const isCellContent: Guard<CellContent> = byKind({
  [CellInputKind.Empty]: shapeOf({ kind: oneOf(CellInputKind.Empty) }),
  [CellInputKind.Value]: shapeOf({ kind: oneOf(CellInputKind.Value), value: isCellValue }),
  [CellInputKind.Formula]: shapeOf({ kind: oneOf(CellInputKind.Formula), ast: isFormula }),
});
