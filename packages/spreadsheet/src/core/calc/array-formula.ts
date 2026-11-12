import type { CellRef } from '../cell.types';
import {
  AreaOperator,
  FormulaNodeKind,
  StructuredArea,
  UnaryOperator,
  type FormulaNode,
} from '../formula/formula.types';
import type { Sheet, Workbook } from '../workbook';
import { foldFormula, operandsOf, withChildren } from '../formula/walk';
import { ArrayScope, type FunctionRegistry, type FunctionSpec } from './calc.types';
import { ARRAY_RESULTS } from './excel-signatures';

type NameNode = Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Name }>;

type Call = Extract<FormulaNode, { readonly kind: typeof FormulaNodeKind.Call }>;

export interface ArrayFormulaContext {
  readonly functions: FunctionRegistry;
  readonly name: (node: NameNode) => FormulaNode | undefined;
}

interface Walk extends ArrayFormulaContext {
  readonly seen: Map<string, boolean>;
}

interface Shape {
  readonly many: boolean;
  readonly spreads: boolean;
}

interface Rewritten {
  readonly node: FormulaNode;
  readonly many: boolean;
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

const NO_SHAPE: Shape = { many: false, spreads: false };

const scalarIndexes = (spec: FunctionSpec | undefined): readonly number[] => [
  ...(spec?.lift ?? []),
  ...(spec?.broadcast ?? []),
];

const arrayScoped = (spec: FunctionSpec | undefined, index: number): boolean =>
  spec?.arrays === ArrayScope.All || spec?.arrays?.includes(index) === true;

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

const returnsMany = (spec: FunctionSpec | undefined, name: string): boolean =>
  spec?.array === true || ARRAY_RESULTS.has(name.toUpperCase());

const callShape = (node: Call, parts: readonly Shape[], walk: Walk): Shape => {
  const spec = walk.functions.get(node.name);
  const lifted = scalarIndexes(spec).some((index) => parts[index]?.many === true);

  return {
    many: returnsMany(spec, node.name) || lifted,
    spreads: lifted || parts.some((part) => part.spreads),
  };
};

const nodeShape = (node: FormulaNode, parts: readonly Shape[], walk: Walk): Shape => {
  const [first = NO_SHAPE, second = NO_SHAPE] = parts;

  switch (node.kind) {
    case FormulaNodeKind.Name:
      return { many: node.book === undefined && namedCells(node, walk), spreads: false };
    case FormulaNodeKind.Call:
      return callShape(node, parts, walk);
    case FormulaNodeKind.Unary: {
      const many = node.op !== UnaryOperator.Intersect && first.many;

      return { many, spreads: many || first.spreads };
    }
    case FormulaNodeKind.Percent:
      return { many: first.many, spreads: first.many || first.spreads };
    case FormulaNodeKind.Binary: {
      const many = first.many || second.many;

      return { many, spreads: many || first.spreads || second.spreads };
    }
    case FormulaNodeKind.Areas:
      return {
        many: node.op === AreaOperator.Range || (first.many && second.many),
        spreads: first.spreads || second.spreads,
      };
    default:
      return { many: referenceCells(node) ?? false, spreads: false };
  }
};

const formulaShape = (ast: FormulaNode, walk: Walk): Shape =>
  foldFormula<Shape>(ast, (node, parts) => nodeShape(node, parts, walk), operandsOf);

const namedCells = (node: NameNode, walk: Walk): boolean => {
  const key = `${node.sheet ?? ''}!${node.name.toLowerCase()}`;
  const known = walk.seen.get(key);

  if (known !== undefined) {
    return known;
  }
  walk.seen.set(key, false);

  const ast = walk.name(node);
  const result = ast !== undefined && formulaShape(ast, walk).many;

  walk.seen.set(key, result);
  return result;
};

export const needsArrayEvaluation = (ast: FormulaNode, context: ArrayFormulaContext): boolean => {
  const shape = formulaShape(ast, { ...context, seen: new Map() });

  return shape.many || shape.spreads;
};

const pinned = (item: Rewritten): FormulaNode =>
  item.many ? { kind: 'unary', op: UnaryOperator.Intersect, operand: item.node } : item.node;

const rewrittenParts = (node: FormulaNode, walk: Walk): readonly FormulaNode[] => {
  switch (node.kind) {
    case FormulaNodeKind.Call: {
      const spec = walk.functions.get(node.name);

      return node.args.filter((_arg, index) => !arrayScoped(spec, index));
    }
    case FormulaNodeKind.Unary:
      return node.op === UnaryOperator.Intersect ? [] : [node.operand];
    case FormulaNodeKind.Percent:
      return [node.operand];
    case FormulaNodeKind.Binary:
      return [node.left, node.right];
    default:
      return [];
  }
};

const intersectedCall = (node: Call, parts: readonly Rewritten[], walk: Walk): Rewritten => {
  const spec = walk.functions.get(node.name);
  const scalar = new Set(scalarIndexes(spec));
  let next = 0;

  const args = node.args.map((arg, index) => {
    if (arrayScoped(spec, index)) {
      return arg;
    }

    const part = parts[next] ?? { node: arg, many: false };

    next += 1;
    return scalar.has(index) ? pinned(part) : part.node;
  });

  const many =
    returnsMany(spec, node.name) ||
    scalarIndexes(spec).some((index) => {
      const arg = node.args[index];

      return arg !== undefined && arrayScoped(spec, index) && formulaShape(arg, walk).many;
    });

  return { node: withChildren(node, args), many };
};

const intersectedNode = (node: FormulaNode, parts: readonly Rewritten[], walk: Walk): Rewritten => {
  switch (node.kind) {
    case FormulaNodeKind.Call:
      return intersectedCall(node, parts, walk);
    case FormulaNodeKind.Unary:
      return node.op === UnaryOperator.Intersect
        ? { node, many: false }
        : { node: withChildren(node, parts.map(pinned)), many: false };
    case FormulaNodeKind.Percent:
    case FormulaNodeKind.Binary:
      return { node: withChildren(node, parts.map(pinned)), many: false };
    default:
      return { node, many: formulaShape(node, walk).many };
  }
};

export const withImplicitIntersections = (
  ast: FormulaNode,
  context: ArrayFormulaContext,
): FormulaNode => {
  const walk: Walk = { ...context, seen: new Map() };

  return pinned(
    foldFormula<Rewritten>(
      ast,
      (node, parts) => intersectedNode(node, parts, walk),
      (node) => rewrittenParts(node, walk),
    ),
  );
};

export const withoutIntersections = (ast: FormulaNode): FormulaNode =>
  foldFormula<FormulaNode>(
    ast,
    (node, parts) =>
      node.kind === FormulaNodeKind.Unary && node.op === UnaryOperator.Intersect
        ? (parts[0] ?? node.operand)
        : withChildren(node, parts),
    operandsOf,
  );
