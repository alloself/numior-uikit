import { MAX_COLS, MAX_ROWS, rangeOf } from '../address';
import type { CellRange, CellValue } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import { EMPTY, errorValue, numberValue, textValue } from '../values';
import type { Sheet, Workbook } from '../workbook';
import type { EvalValue, FunctionArgs, FunctionRegistry } from './calc.types';
import { CellErrorSignal, compareValues, raise, toLogical, toNumber, toText } from './coerce';

export interface EvalContext {
  readonly workbook: Workbook;
  readonly sheet: Sheet;
  readonly functions: FunctionRegistry;
  unknown(name: string): void;
  lookup(sheet: Sheet, range: CellRange, wanted: CellValue): number | undefined;
}

type Binary = Extract<FormulaNode, { readonly kind: 'binary' }>;

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

const operate = (op: Binary['op'], left: CellValue, right: CellValue): CellValue => {
  if (left.kind === 'error') {
    return raise(left.code);
  }
  if (right.kind === 'error') {
    return raise(right.code);
  }
  switch (op) {
    case '&':
      return textValue(toText(left) + toText(right));
    case '+':
    case '-':
    case '*':
    case '/':
    case '^':
      return arithmetic(op, toNumber(left), toNumber(right));
    default:
      return { kind: 'boolean', value: comparison(op, compareValues(left, right)) };
  }
};

export const lineRange = (
  node: Extract<FormulaNode, { readonly kind: 'columns' | 'rows' }>,
): CellRange => {
  const low = Math.min(node.from.index, node.to.index);
  const high = Math.max(node.from.index, node.to.index);

  return node.kind === 'columns'
    ? { top: 0, bottom: MAX_ROWS - 1, left: low, right: high }
    : { top: low, bottom: high, left: 0, right: MAX_COLS - 1 };
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

const safely = (node: FormulaNode, context: EvalContext): EvalValue => {
  try {
    return evaluate(node, context);
  } catch (error) {
    if (error instanceof CellErrorSignal) {
      return errorValue(error.code);
    }
    throw error;
  }
};

const scalar = (node: FormulaNode, context: EvalContext): CellValue =>
  node.kind === 'cell'
    ? sheetOf(node.sheet, context).cells.get(node.ref.row, node.ref.col)
    : scalarOf(evaluate(node, context));

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

const argumentsOf = (nodes: readonly FormulaNode[], context: EvalContext): FunctionArgs => {
  const cache = new Map<number, EvalValue>();

  const value = (index: number): EvalValue => {
    const node = nodes[index];
    const known = cache.get(index);

    if (known !== undefined || node === undefined) {
      return known ?? EMPTY;
    }
    const computed = safely(node, context);

    cache.set(index, computed);
    return computed;
  };

  return {
    count: nodes.length,
    missing: (index) => (nodes[index]?.kind ?? 'missing') === 'missing',
    value,
    scalar: (index) => scalarOf(value(index)),
    number: (index, fallback) =>
      index >= nodes.length && fallback !== undefined ? fallback : toNumber(scalarOf(value(index))),
    text: (index) => toText(scalarOf(value(index))),
    logical: (index, fallback) =>
      index >= nodes.length && fallback !== undefined
        ? fallback
        : toLogical(scalarOf(value(index))),
    forEachValue: (from, visit) => {
      for (let index = from; index < nodes.length; index += 1) {
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
  };
};

const call = (
  node: Extract<FormulaNode, { readonly kind: 'call' }>,
  context: EvalContext,
): EvalValue => {
  const spec = context.functions.get(node.name);

  if (spec === undefined) {
    context.unknown(node.name);
    return raise('#NAME?');
  }
  return node.args.length < spec.min || node.args.length > spec.max
    ? raise('#VALUE!')
    : spec.evaluate(argumentsOf(node.args, context));
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

const operation = (node: FormulaNode, context: EvalContext): EvalValue => {
  switch (node.kind) {
    case 'call':
      return call(node, context);
    case 'unary': {
      const operand = scalar(node.operand, context);

      return node.op === '-' ? numberValue(-toNumber(operand)) : operand;
    }
    case 'percent':
      return numberValue(toNumber(scalar(node.operand, context)) / 100);
    case 'binary':
      return operate(node.op, scalar(node.left, context), scalar(node.right, context));
    case 'array':
      return { kind: 'array', rows: node.rows.map((row) => row.map(constantOf)) };
    default:
      return constantOf(node);
  }
};

const evaluate = (node: FormulaNode, context: EvalContext): EvalValue => {
  switch (node.kind) {
    case 'cell':
      return reference(node.sheet, rangeOf(node.ref, node.ref), context);
    case 'range':
      return reference(node.sheet, rangeOf(node.from, node.to), context);
    case 'columns':
    case 'rows':
      return reference(node.sheet, lineRange(node), context);
    case 'spill':
      return raise('#REF!');
    case 'name':
      return raise('#NAME?');
    default:
      return operation(node, context);
  }
};

export const evaluateFormula = (node: FormulaNode, context: EvalContext): CellValue => {
  const result = scalarOf(safely(node, context));

  return result.kind === 'empty' ? numberValue(0) : result;
};
