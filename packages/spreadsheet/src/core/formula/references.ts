import { FormulaNodeKind, FormulaReferenceKind, type FormulaNode } from './formula.types';
import { childrenOf, eachNode, foldFormula, withChildren } from './walk';

export type FormulaReference = Extract<
  FormulaNode,
  {
    readonly kind:
      | typeof FormulaNodeKind.Cell
      | typeof FormulaNodeKind.Range
      | typeof FormulaNodeKind.Columns
      | typeof FormulaNodeKind.Rows
      | typeof FormulaNodeKind.Spill
      | typeof FormulaNodeKind.Name
      | typeof FormulaNodeKind.Structured;
  }
>;

export type SymbolicReference = Extract<
  FormulaReference,
  { readonly kind: typeof FormulaReferenceKind.Name | typeof FormulaReferenceKind.Structured }
>;

export type SheetReference = Exclude<
  FormulaReference,
  { readonly kind: typeof FormulaReferenceKind.Structured }
>;

type Visitor = (reference: FormulaReference) => FormulaNode;

export const onSheetNamed = (
  reference: FormulaReference,
  name: string,
): reference is SheetReference =>
  reference.kind !== FormulaReferenceKind.Structured &&
  reference.book === undefined &&
  reference.sheet !== undefined &&
  reference.sheet.toLowerCase() === name.toLowerCase();

export const isSymbolic = (reference: FormulaReference): reference is SymbolicReference =>
  reference.kind === FormulaReferenceKind.Name ||
  reference.kind === FormulaReferenceKind.Structured;

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

const descendPast = (node: FormulaNode): readonly FormulaNode[] =>
  isReference(node) ? [] : childrenOf(node);

export const formulaReferences = (node: FormulaNode): FormulaReference[] => {
  const found: FormulaReference[] = [];

  eachNode(
    node,
    (item) => {
      if (!isReference(item)) {
        return;
      }

      found.push(item);
    },
    descendPast,
  );

  return found;
};

export const mapReferences = (node: FormulaNode, visit: Visitor): FormulaNode =>
  foldFormula<FormulaNode>(
    node,
    (item, children) => (isReference(item) ? visit(item) : withChildren(item, children)),
    descendPast,
  );
