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
