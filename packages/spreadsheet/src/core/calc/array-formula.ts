import type { CellRef } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import type { Sheet, Workbook } from '../workbook';
import type { FunctionRegistry, FunctionSpec } from './calc.types';

type NameNode = Extract<FormulaNode, { readonly kind: 'name' }>;

type Call = Extract<FormulaNode, { readonly kind: 'call' }>;

export interface ArrayFormulaContext {
  readonly functions: FunctionRegistry;
  readonly name: (node: NameNode) => FormulaNode | undefined;
}

interface Walk extends ArrayFormulaContext {
  readonly seen: Map<string, boolean>;
}

export const bookArrays = (
  book: Workbook,
  functions: FunctionRegistry,
  sheet: Sheet,
): ArrayFormulaContext => ({
  functions,
  name: (node) =>
    node.sheet === undefined
      ? book.names.resolve(node.name, sheet)?.ast
      : book.names.get(node.name, book.sheet(node.sheet))?.ast,
});

const sameCell = (from: CellRef, to: CellRef): boolean =>
  from.row === to.row &&
  from.col === to.col &&
  from.rowAbsolute === to.rowAbsolute &&
  from.colAbsolute === to.colAbsolute;

const scalarArgs = (spec: FunctionSpec | undefined, node: Call): FormulaNode[] =>
  [...(spec?.lift ?? []), ...(spec?.broadcast ?? [])].reduce<FormulaNode[]>((found, index) => {
    const arg = node.args[index];

    if (arg !== undefined) {
      found.push(arg);
    }
    return found;
  }, []);

const namedCells = (node: NameNode, walk: Walk): boolean => {
  const key = `${node.sheet ?? ''}!${node.name.toLowerCase()}`;
  const known = walk.seen.get(key);

  if (known !== undefined) {
    return known;
  }
  walk.seen.set(key, false);

  const ast = walk.name(node);
  const result = ast !== undefined && manyCells(ast, walk);

  walk.seen.set(key, result);
  return result;
};

const referenceCells = (node: FormulaNode): boolean | undefined => {
  switch (node.kind) {
    case 'range':
      return !sameCell(node.from, node.to);
    case 'columns':
    case 'rows':
    case 'spill':
    case 'array':
      return true;
    case 'structured':
      return (
        node.area !== 'row' || node.columns === undefined || node.columns.from !== node.columns.to
      );
    default:
      return undefined;
  }
};

const manyCells = (node: FormulaNode, walk: Walk): boolean => {
  const reference = referenceCells(node);

  if (reference !== undefined) {
    return reference;
  }
  switch (node.kind) {
    case 'name':
      return node.book === undefined && namedCells(node, walk);
    case 'call': {
      const spec = walk.functions.get(node.name);

      return spec?.array === true || scalarArgs(spec, node).some((arg) => manyCells(arg, walk));
    }
    case 'unary':
      return node.op !== '@' && manyCells(node.operand, walk);
    case 'percent':
      return manyCells(node.operand, walk);
    case 'binary':
      return manyCells(node.left, walk) || manyCells(node.right, walk);
    default:
      return false;
  }
};

const spreads = (node: FormulaNode, walk: Walk): boolean => {
  switch (node.kind) {
    case 'unary':
      return (node.op !== '@' && manyCells(node.operand, walk)) || spreads(node.operand, walk);
    case 'percent':
      return manyCells(node.operand, walk) || spreads(node.operand, walk);
    case 'binary':
      return (
        manyCells(node.left, walk) ||
        manyCells(node.right, walk) ||
        spreads(node.left, walk) ||
        spreads(node.right, walk)
      );
    case 'call':
      return (
        scalarArgs(walk.functions.get(node.name), node).some((arg) => manyCells(arg, walk)) ||
        node.args.some((arg) => spreads(arg, walk))
      );
    default:
      return false;
  }
};

export const needsArrayEvaluation = (ast: FormulaNode, context: ArrayFormulaContext): boolean => {
  const walk: Walk = { ...context, seen: new Map() };

  return manyCells(ast, walk) || spreads(ast, walk);
};

const pinned = (node: FormulaNode, walk: Walk): FormulaNode =>
  manyCells(node, walk) ? { kind: 'unary', op: '@', operand: node } : node;

const sameArgs = (left: readonly FormulaNode[], right: readonly FormulaNode[]): boolean =>
  left.every((arg, index) => arg === right[index]);

const intersectedCall = (node: Call, walk: Walk): FormulaNode => {
  const spec = walk.functions.get(node.name);
  const scalar = new Set([...(spec?.lift ?? []), ...(spec?.broadcast ?? [])]);

  const arrays = spec?.arrays;

  const args = node.args.map((arg, index) => {
    if (arrays === 'all' || arrays?.includes(index) === true) {
      return arg;
    }
    return scalar.has(index)
      ? pinned(intersectedTree(arg, walk), walk)
      : intersectedTree(arg, walk);
  });

  return sameArgs(args, node.args) ? node : { ...node, args };
};

const intersectedTree = (node: FormulaNode, walk: Walk): FormulaNode => {
  switch (node.kind) {
    case 'unary':
    case 'percent': {
      const operand =
        node.kind === 'unary' && node.op === '@'
          ? node.operand
          : pinned(intersectedTree(node.operand, walk), walk);

      return operand === node.operand ? node : { ...node, operand };
    }
    case 'binary': {
      const left = pinned(intersectedTree(node.left, walk), walk);
      const right = pinned(intersectedTree(node.right, walk), walk);

      return left === node.left && right === node.right ? node : { ...node, left, right };
    }
    case 'call':
      return intersectedCall(node, walk);
    default:
      return node;
  }
};

export const withImplicitIntersections = (
  ast: FormulaNode,
  context: ArrayFormulaContext,
): FormulaNode => {
  const walk: Walk = { ...context, seen: new Map() };

  return pinned(intersectedTree(ast, walk), walk);
};

export const withoutIntersections = (node: FormulaNode): FormulaNode => {
  switch (node.kind) {
    case 'unary':
    case 'percent': {
      const operand = withoutIntersections(node.operand);

      if (node.kind === 'unary' && node.op === '@') {
        return operand;
      }
      return operand === node.operand ? node : { ...node, operand };
    }
    case 'binary': {
      const left = withoutIntersections(node.left);
      const right = withoutIntersections(node.right);

      return left === node.left && right === node.right ? node : { ...node, left, right };
    }
    case 'call': {
      const args = node.args.map(withoutIntersections);

      return sameArgs(args, node.args) ? node : { ...node, args };
    }
    default:
      return node;
  }
};
