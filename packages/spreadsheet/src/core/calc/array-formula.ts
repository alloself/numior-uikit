import type { CellRef } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
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
