import type { FormulaNode } from './formula.types';

export type FormulaReference = Extract<
  FormulaNode,
  { readonly kind: 'cell' | 'range' | 'columns' | 'rows' | 'spill' | 'name' | 'structured' }
>;

export type SymbolicReference = Extract<FormulaReference, { readonly kind: 'name' | 'structured' }>;

export type SheetReference = Exclude<FormulaReference, { readonly kind: 'structured' }>;

type Visitor = (reference: FormulaReference) => FormulaNode;

export const onSheetNamed = (
  reference: FormulaReference,
  name: string,
): reference is SheetReference =>
  reference.kind !== 'structured' &&
  reference.book === undefined &&
  reference.sheet !== undefined &&
  reference.sheet.toLowerCase() === name.toLowerCase();

export const isSymbolic = (reference: FormulaReference): reference is SymbolicReference =>
  reference.kind === 'name' || reference.kind === 'structured';

const REFERENCE_KINDS = new Set<FormulaNode['kind']>([
  'cell',
  'range',
  'columns',
  'rows',
  'spill',
  'name',
  'structured',
]);

const isReference = (node: FormulaNode): node is FormulaReference => REFERENCE_KINDS.has(node.kind);

const collect = (node: FormulaNode, found: FormulaReference[]): void => {
  if (isReference(node)) {
    found.push(node);
    return;
  }
  switch (node.kind) {
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

const walk = (current: FormulaNode, visit: Visitor): FormulaNode => {
  if (isReference(current)) {
    return visit(current);
  }
  switch (current.kind) {
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
