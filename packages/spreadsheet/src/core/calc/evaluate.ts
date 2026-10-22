import { MAX_COLS, MAX_ROWS } from '../address';
import type { CellRange, CellValue } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import { colOf, referenceRange, rowOf } from '../formula/origin';
import { EN_FORMULAS } from '../formula/locale';
import { parseFormula } from '../formula/parser';
import { structuredRange, tableData } from '../tables';
import { EMPTY, errorValue, numberValue, textValue } from '../values';
import { tableFor, type DefinedName, type Sheet, type Workbook } from '../workbook';
import {
  blankAsZero,
  broadcastShape,
  buildArray,
  elementAt,
  isMultiCell,
  matrixOf,
  shapeOf,
} from './array';
import type {
  ArrayValue,
  EvalValue,
  FormulaResult,
  FormulaPlace,
  FunctionArgs,
  FunctionRegistry,
  FunctionSpec,
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
}

type Binary = Extract<FormulaNode, { readonly kind: 'binary' }>;

type Call = Extract<FormulaNode, { readonly kind: 'call' }>;

type NameNode = Extract<FormulaNode, { readonly kind: 'name' }>;

const resolving = new Set<DefinedName>();

const named = (node: NameNode, context: EvalContext): EvalValue => {
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

type Operand = CellValue | ArrayValue;

const VALUE_ERROR = errorValue('#VALUE!');

const sheetOf = (name: string | undefined, context: EvalContext): Sheet =>
  name === undefined ? context.sheet : (context.workbook.sheet(name) ?? raise('#REF!'));

const single = (range: CellRange): boolean =>
  range.top === range.bottom && range.left === range.right;

export const scalarOf = (value: EvalValue): CellValue => {
  switch (value.kind) {
    case 'reference':
      return single(value.range)
        ? value.sheet.cells.get(value.range.top, value.range.left)
        : VALUE_ERROR;
    case 'array':
      return value.rows[0]?.[0] ?? VALUE_ERROR;
    default:
      return value;
  }
};

const arithmetic = (op: Binary['op'], left: number, right: number): CellValue => {
  switch (op) {
    case '+':
      return numberValue(left + right);
    case '-':
      return numberValue(left - right);
    case '*':
      return numberValue(left * right);
    case '/':
      return right === 0 ? errorValue('#DIV/0!') : numberValue(left / right);
    default:
      return left === 0 && right === 0 ? errorValue('#NUM!') : numberValue(left ** right);
  }
};

const comparison = (op: Binary['op'], order: number): boolean => {
  switch (op) {
    case '=':
      return order === 0;
    case '<>':
      return order !== 0;
    case '<':
      return order < 0;
    case '>':
      return order > 0;
    case '<=':
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
  if (left.kind === 'error') {
    return raise(left.code);
  }
  if (right.kind === 'error') {
    return raise(right.code);
  }
  switch (op) {
    case '&':
      return textValue(toText(left, locale) + toText(right, locale));
    case '+':
    case '-':
    case '*':
    case '/':
    case '^':
      return arithmetic(op, toNumber(left, locale), toNumber(right, locale));
    default:
      return { kind: 'boolean', value: comparison(op, compareValues(left, right)) };
  }
};

const constantOf = (node: FormulaNode): CellValue => {
  switch (node.kind) {
    case 'number':
      return numberValue(node.value);
    case 'string':
      return textValue(node.value);
    case 'boolean':
      return { kind: 'boolean', value: node.value };
    case 'error':
      return errorValue(node.code);
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
  if (node.kind === 'cell') {
    const here = context.here();
    const row = rowOf(node.ref, here);
    const col = colOf(node.ref, here);

    return row < 0 || col < 0 || row >= MAX_ROWS || col >= MAX_COLS
      ? errorValue('#REF!')
      : sheetOf(node.sheet, context).cells.get(row, col);
  }
  const value = safely(node, context);

  return isMultiCell(value) ? { kind: 'array', rows: matrixOf(value) } : scalarOf(value);
};

const lifted = (operands: readonly Operand[], item: (cells: CellValue[]) => CellValue) => {
  const matrices = operands.map((operand) => matrixOf(operand));
  const shape = broadcastShape(operands.map(shapeOf));

  return buildArray(shape, (row, col) =>
    attempt(() => item(matrices.map((matrix) => elementAt(matrix, row, col)))),
  );
};

const applied = (operands: readonly Operand[], item: (cells: CellValue[]) => CellValue) =>
  operands.some((operand) => operand.kind === 'array')
    ? lifted(operands, item)
    : item(operands.filter((operand): operand is CellValue => operand.kind !== 'array'));

const visitValues = (
  value: EvalValue,
  visit: (value: CellValue, direct: boolean) => void,
): void => {
  switch (value.kind) {
    case 'reference':
      value.sheet.cells.forEachInRange(value.range, (_row, _col, cell) => {
        visit(cell, false);
      });

      return;
    case 'array':
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
  const missing = (index: number): boolean => (nodes[index]?.kind ?? 'missing') === 'missing';

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
      table.kind === 'reference'
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
    indirect: (text) => indirect(text, context),
  };
};

const REFERENCE_KINDS = new Set(['cell', 'range', 'columns', 'rows']);

const indirect = (text: string, context: EvalContext): EvalValue => {
  const here = context.here();
  const parsed = parseFormula(text, EN_FORMULAS, here);

  if (!parsed.ok || !REFERENCE_KINDS.has(parsed.ast.kind)) {
    return raise('#REF!');
  }
  const value = evaluate(parsed.ast, context);

  if (value.kind !== 'reference') {
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

const reference = (
  sheet: string | undefined,
  range: CellRange,
  context: EvalContext,
): EvalValue => ({
  kind: 'reference',
  sheet: sheetOf(sheet, context),
  range,
});

const structured = (
  node: Extract<FormulaNode, { readonly kind: 'structured' }>,
  context: EvalContext,
): EvalValue => {
  const here = context.here();
  const table = tableFor(context.workbook, node.table, here.sheet, here.row, here.col);

  if (table === undefined) {
    return raise('#REF!');
  }

  const range = structuredRange(table, node, here.row);

  return typeof range === 'string'
    ? raise(range)
    : { kind: 'reference', sheet: table.sheet, range };
};

const spilled = (
  node: Extract<FormulaNode, { readonly kind: 'spill' }>,
  context: EvalContext,
): EvalValue => {
  const sheet = sheetOf(node.sheet, context);
  const here = context.here();
  const range = context.spillRange(sheet, rowOf(node.ref, here), colOf(node.ref, here));

  return range === undefined ? raise('#REF!') : { kind: 'reference', sheet, range };
};

const operation = (node: FormulaNode, context: EvalContext): EvalValue => {
  switch (node.kind) {
    case 'call':
      return call(node, context);
    case 'unary':
      return applied([operandOf(node.operand, context)], ([operand = EMPTY]) =>
        node.op === '-' ? numberValue(-toNumber(operand, context.locale)) : operand,
      );
    case 'percent':
      return applied([operandOf(node.operand, context)], ([operand = EMPTY]) =>
        numberValue(toNumber(operand, context.locale) / 100),
      );
    case 'binary':
      return applied(
        [operandOf(node.left, context), operandOf(node.right, context)],
        ([left = EMPTY, right = EMPTY]) => operate(node.op, left, right, context.locale),
      );
    case 'array':
      return { kind: 'array', rows: node.rows.map((row) => row.map(constantOf)) };
    default:
      return constantOf(node);
  }
};

const evaluate = (node: FormulaNode, context: EvalContext): EvalValue => {
  switch (node.kind) {
    case 'cell':
    case 'range':
    case 'columns':
    case 'rows':
      return reference(node.sheet, referenceRange(node, context.here()) ?? raise('#REF!'), context);
    case 'spill':
      return spilled(node, context);
    case 'name':
      return named(node, context);
    case 'structured':
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
