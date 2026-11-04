import type { CellRef } from '../cell.types';
import {
  FormulaNodeKind,
  StructuredArea,
  UnaryOperator,
  type FormulaNode,
} from '../formula/formula.types';
import type { Sheet, Workbook } from '../workbook';
import { ArrayScope, type FunctionRegistry, type FunctionSpec } from './calc.types';

type NameNode = Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Name }>;

type Call = Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Call }>;

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
    case FormulaNodeKind.Range:
      return !sameCell(node.from, node.to);
    case FormulaNodeKind.Columns:
    case FormulaNodeKind.Rows:
    case FormulaNodeKind.Spill:
    case FormulaNodeKind.Array:
      return true;
    case FormulaNodeKind.Structured:
      return (
        node.area !== StructuredArea.Row ||
        node.columns === undefined ||
        node.columns.from !== node.columns.to
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
    case FormulaNodeKind.Name:
      return node.book === undefined && namedCells(node, walk);
    case FormulaNodeKind.Call: {
      const spec = walk.functions.get(node.name);

      return spec?.array === true || scalarArgs(spec, node).some((arg) => manyCells(arg, walk));
    }
    case FormulaNodeKind.Unary:
      return node.op !== UnaryOperator.Intersect && manyCells(node.operand, walk);
    case FormulaNodeKind.Percent:
      return manyCells(node.operand, walk);
    case FormulaNodeKind.Binary:
      return manyCells(node.left, walk) || manyCells(node.right, walk);
    default:
      return false;
  }
};

const spreads = (node: FormulaNode, walk: Walk): boolean => {
  switch (node.kind) {
    case FormulaNodeKind.Unary:
      return (
        (node.op !== UnaryOperator.Intersect && manyCells(node.operand, walk)) ||
        spreads(node.operand, walk)
      );
    case FormulaNodeKind.Percent:
      return manyCells(node.operand, walk) || spreads(node.operand, walk);
    case FormulaNodeKind.Binary:
      return (
        manyCells(node.left, walk) ||
        manyCells(node.right, walk) ||
        spreads(node.left, walk) ||
        spreads(node.right, walk)
      );
    case FormulaNodeKind.Call:
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
    if (arrays === ArrayScope.All || arrays?.includes(index) === true) {
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
    case FormulaNodeKind.Unary:
    case FormulaNodeKind.Percent: {
      const operand =
        node.kind === FormulaNodeKind.Unary && node.op === UnaryOperator.Intersect
          ? node.operand
          : pinned(intersectedTree(node.operand, walk), walk);

      return operand === node.operand ? node : { ...node, operand };
    }
    case FormulaNodeKind.Binary: {
      const left = pinned(intersectedTree(node.left, walk), walk);
      const right = pinned(intersectedTree(node.right, walk), walk);

      return left === node.left && right === node.right ? node : { ...node, left, right };
    }
    case FormulaNodeKind.Call:
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
    case FormulaNodeKind.Unary:
    case FormulaNodeKind.Percent: {
      const operand = withoutIntersections(node.operand);

      if (node.kind === FormulaNodeKind.Unary && node.op === UnaryOperator.Intersect) {
        return operand;
      }
      return operand === node.operand ? node : { ...node, operand };
    }
    case FormulaNodeKind.Binary: {
      const left = withoutIntersections(node.left);
      const right = withoutIntersections(node.right);

      return left === node.left && right === node.right ? node : { ...node, left, right };
    }
    case FormulaNodeKind.Call: {
      const args = node.args.map(withoutIntersections);

      return sameArgs(args, node.args) ? node : { ...node, args };
    }
    default:
      return node;
  }
};
