import type { FormulaNode } from './formula.types';

export type FormulaReference = Extract<
  FormulaNode,
  { readonly kind: 'cell' | 'range' | 'columns' | 'rows' | 'spill' | 'name' }
>;

const collect = (node: FormulaNode, found: FormulaReference[]): void => {
  switch (node.kind) {
    case 'cell':
    case 'range':
    case 'columns':
    case 'rows':
    case 'spill':
    case 'name':
      found.push(node);
      return;
    case 'call':
      node.args.forEach((arg) => collect(arg, found));
      return;
    case 'unary':
    case 'percent':
      collect(node.operand, found);
      return;
    case 'binary':
      collect(node.left, found);
      collect(node.right, found);
      return;
    default:
      return;
  }
};

export const formulaReferences = (node: FormulaNode): FormulaReference[] => {
  const found: FormulaReference[] = [];

  collect(node, found);
  return found;
};

const mapNodes = (
  nodes: readonly FormulaNode[],
  visit: (node: FormulaNode) => FormulaNode,
): readonly FormulaNode[] => {
  const mapped = nodes.map(visit);

  return mapped.every((node, index) => node === nodes[index]) ? nodes : mapped;
};

type Visitor = (reference: FormulaReference) => FormulaNode;

const walk = (current: FormulaNode, visit: Visitor): FormulaNode => {
  switch (current.kind) {
    case 'cell':
    case 'range':
    case 'columns':
    case 'rows':
    case 'spill':
    case 'name':
      return visit(current);
    case 'call': {
      const args = mapNodes(current.args, (arg) => walk(arg, visit));

      return args === current.args ? current : { ...current, args };
    }
    case 'unary':
    case 'percent': {
      const operand = walk(current.operand, visit);

      return operand === current.operand ? current : { ...current, operand };
    }
    case 'binary': {
      const left = walk(current.left, visit);
      const right = walk(current.right, visit);

      return left === current.left && right === current.right
        ? current
        : { ...current, left, right };
    }
    default:
      return current;
  }
};

export const mapReferences = (node: FormulaNode, visit: Visitor): FormulaNode => walk(node, visit);
