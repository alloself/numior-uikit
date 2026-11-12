import { MAX_COLS, MAX_ROWS } from '../address';
import { CellValueKind, type CellRange, type CellValue } from '../cell.types';
import {
  BinaryOperator,
  FormulaNodeKind,
  UnaryOperator,
  type FormulaNode,
  type SheetPlace,
} from '../formula/formula.types';
import { colOf, referenceRange, rowOf } from '../formula/origin';
import { EN_FORMULAS } from '../formula/locale';
import { parseFormula } from '../formula/parser';
import { a1FromR1c1 } from '../formula/r1c1';
import { structuredRange, tableData } from '../tables';
import { EMPTY, errorValue, numberValue, textValue } from '../values';
import { bookNames, tableFor, type DefinedName, type Sheet, type Workbook } from '../workbook';
import {
  blankAsZero,
  broadcastShape,
  buildArray,
  elementAt,
  isMultiCell,
  matrixOf,
  shapeOf,
} from './array';
import {
  EvalValueKind,
  type ArrayValue,
  type EvalValue,
  type FormulaPlace,
  type FormulaResult,
  type FunctionArgs,
  type FunctionRegistry,
  type FunctionSpec,
} from './calc.types';
import type { NumberLocale } from '../format/format.types';
import { CellErrorSignal, compareValues, raise, toLogical, toNumber, toText } from './coerce';

export interface EvalContext {
  readonly workbook: Workbook;
  readonly sheet: Sheet;
  readonly functions: FunctionRegistry;
  readonly locale: NumberLocale;
  unknown(name: string): void;
  lookup(sheet: Sheet, range: CellRange, wanted: CellValue): number | undefined;
  spillRange(sheet: Sheet, row: number, col: number): CellRange | undefined;
  now(): number;
  random(): number;
  here(): FormulaPlace;
  track(sheet: Sheet, range: CellRange): void;
  definedName(node: NameNode): DefinedName | undefined;
  subtotalAt(sheet: Sheet, row: number, col: number): boolean;
}

type Binary = Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Binary }>;

type Call = Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Call }>;

type NameNode = Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Name }>;

type Operand = CellValue | ArrayValue;

type Operator = Extract<
  FormulaNode,
  {
    readonly kind:
      | typeof FormulaNodeKind.Unary
      | typeof FormulaNodeKind.Percent
      | typeof FormulaNodeKind.Binary;
  }
>;

interface OperatorFrame {
  readonly node: Operator;
  readonly operands: readonly FormulaNode[];
  readonly values: EvalValue[];
}

const resolving = new Set<DefinedName>();

const externalNamed = (node: NameNode, book: number, context: EvalContext): EvalValue => {
  const ast = context.workbook.externals[book - 1]?.name(node.name, node.sheet)?.ast;

  return ast === undefined ? raise('#REF!') : evaluate(ast, context);
};

const named = (node: NameNode, context: EvalContext): EvalValue => {
  if (node.book !== undefined) {
    return externalNamed(node, node.book, context);
  }

  const defined = context.definedName(node);

  if (defined === undefined) {
    const table = node.sheet === undefined ? context.workbook.tables.get(node.name) : undefined;

    return table === undefined
      ? raise('#NAME?')
      : { kind: 'reference', sheet: table.sheet, range: tableData(table) };
  }
  if (resolving.has(defined)) {
    return raise('#REF!');
  }
  resolving.add(defined);
  try {
    return evaluate(defined.ast, context);
  } finally {
    resolving.delete(defined);
  }
};

const VALUE_ERROR = errorValue('#VALUE!');

const sheetOf = ({ book, sheet }: SheetPlace, context: EvalContext): Sheet => {
  if (book !== undefined) {
    return context.workbook.externals[book - 1]?.sheet(sheet ?? '') ?? raise('#REF!');
  }
  return sheet === undefined ? context.sheet : (context.workbook.sheet(sheet) ?? raise('#REF!'));
};

const single = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

export const scalarOf = (value: EvalValue): CellValue => {
  switch (value.kind) {
    case EvalValueKind.Reference:
      return single(value.range)
        ? value.sheet.cells.get(value.range.top, value.range.left)
        : VALUE_ERROR;
    case EvalValueKind.Array:
      return value.rows[0]?.[0] ?? VALUE_ERROR;
    default:
      return value;
  }
};

const arithmetic = (op: Binary['op'], left: number, right: number): CellValue => {
  switch (op) {
    case BinaryOperator.Add:
      return numberValue(left + right);
    case BinaryOperator.Subtract:
      return numberValue(left - right);
    case BinaryOperator.Multiply:
      return numberValue(left * right);
    case BinaryOperator.Divide:
      return right === 0 ? errorValue('#DIV/0!') : numberValue(left / right);
    default:
      return left === 0 && right === 0 ? errorValue('#NUM!') : numberValue(left ** right);
  }
};

const comparison = (op: Binary['op'], order: number): boolean => {
  switch (op) {
    case BinaryOperator.Equal:
      return order === 0;
    case BinaryOperator.NotEqual:
      return order !== 0;
    case BinaryOperator.Less:
      return order < 0;
    case BinaryOperator.Greater:
      return order > 0;
    case BinaryOperator.LessOrEqual:
      return order <= 0;
    default:
      return order >= 0;
  }
};

const operate = (
  op: Binary['op'],
  left: CellValue,
  right: CellValue,
  locale: NumberLocale,
): CellValue => {
  if (left.kind === CellValueKind.Error) {
    return raise(left.code);
  }
  if (right.kind === CellValueKind.Error) {
    return raise(right.code);
  }
  switch (op) {
    case BinaryOperator.Concat:
      return textValue(toText(left, locale) + toText(right, locale));
    case BinaryOperator.Add:
    case BinaryOperator.Subtract:
    case BinaryOperator.Multiply:
    case BinaryOperator.Divide:
    case BinaryOperator.Power:
      return arithmetic(op, toNumber(left, locale), toNumber(right, locale));
    default:
      return { kind: 'boolean', value: comparison(op, compareValues(left, right)) };
  }
};

const constantOf = (node: FormulaNode): CellValue => {
  switch (node.kind) {
    case FormulaNodeKind.Number:
      return numberValue(node.value);
    case FormulaNodeKind.String:
      return textValue(node.value);
    case FormulaNodeKind.Boolean:
      return { kind: 'boolean', value: node.value };
    case FormulaNodeKind.Error:
      return errorValue(node.code);
    case FormulaNodeKind.Opaque:
      return errorValue('#NAME?');
    default:
      return EMPTY;
  }
};

const attempt = <T extends EvalValue>(run: () => T): T | CellValue => {
  try {
    return run();
  } catch (error) {
    if (error instanceof CellErrorSignal) {
      return errorValue(error.code);
    }
    throw error;
  }
};

const safely = (node: FormulaNode, context: EvalContext): EvalValue =>
  attempt(() => evaluate(node, context));

const operandOf = (node: FormulaNode, context: EvalContext): Operand => {
  if (node.kind === FormulaNodeKind.Cell) {
    const here = context.here();
    const row = rowOf(node.ref, here);
    const col = colOf(node.ref, here);

    return row < 0 || col < 0 || row >= MAX_ROWS || col >= MAX_COLS
      ? errorValue('#REF!')
      : sheetOf(node, context).cells.get(row, col);
  }
  return asOperand(safely(node, context));
};

const lifted = (operands: readonly Operand[], item: (cells: CellValue[]) => CellValue) => {
  const matrices = operands.map((operand) => matrixOf(operand));
  const shape = broadcastShape(operands.map(shapeOf));

  return buildArray(shape, (row, col) =>
    attempt(() => item(matrices.map((matrix) => elementAt(matrix, row, col)))),
  );
};

const applied = (operands: readonly Operand[], item: (cells: CellValue[]) => CellValue) =>
  operands.some((operand) => operand.kind === EvalValueKind.Array)
    ? lifted(operands, item)
    : item(
        operands.filter((operand): operand is CellValue => operand.kind !== EvalValueKind.Array),
      );

const visitValues = (
  value: EvalValue,
  visit: (value: CellValue, direct: boolean) => void,
): void => {
  switch (value.kind) {
    case EvalValueKind.Reference:
      value.sheet.cells.forEachInRange(value.range, (_row, _col, cell) => {
        visit(cell, false);
      });

      return;
    case EvalValueKind.Array:
      value.rows.forEach((row) => {
        row.forEach((item) => {
          visit(item, false);
        });
      });

      return;
    default:
      visit(value, true);
  }
};

const argumentsFrom = (
  nodes: readonly FormulaNode[],
  value: (index: number) => EvalValue,
  context: EvalContext,
): FunctionArgs => {
  const missing = (index: number): boolean =>
    (nodes[index]?.kind ?? 'missing') === FormulaNodeKind.Missing;

  return {
    count: nodes.length,
    missing,
    value,
    scalar: (index) => scalarOf(value(index)),
    locale: context.locale,
    number: (index, fallback) =>
      missing(index) && fallback !== undefined
        ? fallback
        : toNumber(scalarOf(value(index)), context.locale),
    text: (index) => toText(scalarOf(value(index)), context.locale),
    logical: (index, fallback) =>
      missing(index) && fallback !== undefined
        ? fallback
        : toLogical(scalarOf(value(index)), context.locale),
    forEachValue: (from, visit, to = nodes.length) => {
      for (let index = from; index < Math.min(to, nodes.length); index += 1) {
        visitValues(value(index), visit);
      }
    },
    lookup: (table, column, wanted) =>
      table.kind === EvalValueKind.Reference
        ? context.lookup(
            table.sheet,
            { ...table.range, left: table.range.left + column, right: table.range.left + column },
            wanted,
          )
        : undefined,
    matrix: (index) => matrixOf(value(index)),
    now: () => context.now(),
    random: () => context.random(),
    here: () => context.here(),
    refer: (sheet, range) => {
      context.track(sheet, range);
      return { kind: 'reference', sheet, range };
    },
    indirect: (text, a1) => indirect(text, a1, context),
    subtotalAt: (sheet, row, col) => context.subtotalAt(sheet, row, col),
  };
};

const REFERENCE_KINDS = new Set(['cell', 'range', 'columns', 'rows']);

const indirect = (text: string, a1: boolean, context: EvalContext): EvalValue => {
  const here = context.here();
  const address = a1 ? text : (a1FromR1c1(text, here) ?? raise('#REF!'));
  const parsed = parseFormula(address, EN_FORMULAS, here, bookNames(context.workbook));

  if (!parsed.ok || !REFERENCE_KINDS.has(parsed.ast.kind)) {
    return raise('#REF!');
  }
  const value = evaluate(parsed.ast, context);

  if (value.kind !== EvalValueKind.Reference) {
    return raise('#REF!');
  }
  context.track(value.sheet, value.range);
  return value;
};

const lazyValues = (
  nodes: readonly FormulaNode[],
  context: EvalContext,
): ((index: number) => EvalValue) => {
  const cache = new Map<number, EvalValue>();

  return (index) => {
    const node = nodes[index];
    const known = cache.get(index);

    if (known !== undefined || node === undefined) {
      return known ?? EMPTY;
    }
    const computed = safely(node, context);

    cache.set(index, computed);
    return computed;
  };
};

const liftCall = (
  spec: FunctionSpec,
  nodes: readonly FormulaNode[],
  value: (index: number) => EvalValue,
  context: EvalContext,
): ArrayValue => {
  const spread = (spec.broadcast ?? spec.lift ?? []).filter((index) => isMultiCell(value(index)));
  const matrices = new Map(spread.map((index) => [index, matrixOf(value(index))]));
  const shape = broadcastShape(spread.map((index) => shapeOf(value(index))));

  return buildArray(shape, (row, col) => {
    const at = (index: number): EvalValue => {
      const matrix = matrices.get(index);

      return matrix === undefined ? value(index) : elementAt(matrix, row, col);
    };

    return scalarOf(attempt(() => spec.evaluate(argumentsFrom(nodes, at, context))));
  });
};

const call = (node: Call, context: EvalContext): EvalValue => {
  const spec = context.functions.get(node.name);

  if (spec === undefined) {
    context.unknown(node.name);
    return raise('#NAME?');
  }
  if (node.args.length < spec.min || node.args.length > spec.max) {
    return raise('#VALUE!');
  }
  const value = lazyValues(node.args, context);

  return spec.lift?.some((index) => isMultiCell(value(index))) === true
    ? liftCall(spec, node.args, value, context)
    : spec.evaluate(argumentsFrom(node.args, value, context));
};

const reference = (place: SheetPlace, range: CellRange, context: EvalContext): EvalValue => ({
  kind: 'reference',
  sheet: sheetOf(place, context),
  range,
});

const structured = (
  node: Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Structured }>,
  context: EvalContext,
): EvalValue => {
  const here = context.here();

  const table =
    node.book === undefined
      ? tableFor(context.workbook, node.table, here.sheet, here.row, here.col)
      : undefined;

  if (table === undefined) {
    return raise('#REF!');
  }

  const range = structuredRange(table, node, here.row);

  return typeof range === 'string'
    ? raise(range)
    : { kind: 'reference', sheet: table.sheet, range };
};

const spilled = (
  node: Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Spill }>,
  context: EvalContext,
): EvalValue => {
  const sheet = sheetOf(node, context);
  const here = context.here();
  const range = context.spillRange(sheet, rowOf(node.ref, here), colOf(node.ref, here));

  return range === undefined ? raise('#REF!') : { kind: 'reference', sheet, range };
};

const intersection = (range: CellRange, here: FormulaPlace): CellRange | undefined => {
  if (single(range)) {
    return range;
  }
  if (range.left === range.right && here.row >= range.top && here.row <= range.bottom) {
    return { top: here.row, bottom: here.row, left: range.left, right: range.left };
  }
  if (range.top === range.bottom && here.col >= range.left && here.col <= range.right) {
    return { top: range.top, bottom: range.top, left: here.col, right: here.col };
  }
  return undefined;
};

const intersected = (value: EvalValue, context: EvalContext): EvalValue => {
  switch (value.kind) {
    case EvalValueKind.Reference:
      return { ...value, range: intersection(value.range, context.here()) ?? raise('#VALUE!') };
    case EvalValueKind.Array:
      return value.rows[0]?.[0] ?? VALUE_ERROR;
    default:
      return value;
  }
};

const isOperator = (node: FormulaNode): node is Operator =>
  node.kind === FormulaNodeKind.Unary ||
  node.kind === FormulaNodeKind.Percent ||
  node.kind === FormulaNodeKind.Binary;

const operandsOf = (node: Operator): readonly FormulaNode[] =>
  node.kind === FormulaNodeKind.Binary ? [node.left, node.right] : [node.operand];

const asOperand = (value: EvalValue): Operand =>
  isMultiCell(value) ? { kind: 'array', rows: matrixOf(value) } : scalarOf(value);

const intersects = (node: Operator): boolean =>
  node.kind === FormulaNodeKind.Unary && node.op === UnaryOperator.Intersect;

const leafValue = (parent: Operator, node: FormulaNode, context: EvalContext): EvalValue =>
  intersects(parent) ? safely(node, context) : operandOf(node, context);

const computed = (
  node: Operator,
  values: readonly EvalValue[],
  context: EvalContext,
): EvalValue => {
  const [first = EMPTY, second = EMPTY] = values;

  switch (node.kind) {
    case FormulaNodeKind.Unary:
      if (node.op === UnaryOperator.Intersect) {
        return intersected(first, context);
      }
      return applied([asOperand(first)], ([operand = EMPTY]) =>
        node.op === UnaryOperator.Minus ? numberValue(-toNumber(operand, context.locale)) : operand,
      );
    case FormulaNodeKind.Percent:
      return applied([asOperand(first)], ([operand = EMPTY]) =>
        numberValue(toNumber(operand, context.locale) / 100),
      );
    default:
      return applied([asOperand(first), asOperand(second)], ([left = EMPTY, right = EMPTY]) =>
        operate(node.op, left, right, context.locale),
      );
  }
};

const settled = (frame: OperatorFrame, context: EvalContext): EvalValue =>
  attempt(() => computed(frame.node, frame.values, context));

const operatorValue = (root: Operator, context: EvalContext): EvalValue => {
  const top: OperatorFrame = { node: root, operands: operandsOf(root), values: [] };
  const frames: OperatorFrame[] = [top];

  for (let frame = frames.at(-1); frame !== undefined; frame = frames.at(-1)) {
    const next = frame.operands[frame.values.length];

    if (next !== undefined && isOperator(next)) {
      frames.push({ node: next, operands: operandsOf(next), values: [] });
      continue;
    }
    if (next !== undefined) {
      frame.values.push(leafValue(frame.node, next, context));
      continue;
    }

    frames.pop();

    const parent = frames.at(-1);

    if (parent === undefined) {
      continue;
    }

    parent.values.push(settled(frame, context));
  }
  return computed(root, top.values, context);
};

const operation = (node: FormulaNode, context: EvalContext): EvalValue => {
  switch (node.kind) {
    case FormulaNodeKind.Call:
      return call(node, context);
    case FormulaNodeKind.Unary:
    case FormulaNodeKind.Percent:
    case FormulaNodeKind.Binary:
      return operatorValue(node, context);
    case FormulaNodeKind.Array:
      return { kind: 'array', rows: node.rows.map((row) => row.map(constantOf)) };
    default:
      return constantOf(node);
  }
};

const evaluate = (node: FormulaNode, context: EvalContext): EvalValue => {
  switch (node.kind) {
    case FormulaNodeKind.Cell:
    case FormulaNodeKind.Range:
    case FormulaNodeKind.Columns:
    case FormulaNodeKind.Rows:
      return reference(node, referenceRange(node, context.here()) ?? raise('#REF!'), context);
    case FormulaNodeKind.Spill:
      return spilled(node, context);
    case FormulaNodeKind.Name:
      return named(node, context);
    case FormulaNodeKind.Structured:
      return structured(node, context);
    default:
      return operation(node, context);
  }
};

export const evaluateFormula = (node: FormulaNode, context: EvalContext): FormulaResult => {
  const value = safely(node, context);

  return isMultiCell(value)
    ? { kind: 'array', rows: matrixOf(value).map((row) => row.map(blankAsZero)) }
    : blankAsZero(scalarOf(value));
};
