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

export type UnreadAt = (name: string, index: number) => boolean;

interface Placed {
  readonly node: FormulaNode;
  readonly read: boolean;
}

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

const ADDRESSES = new Set<FormulaNode['kind']>(['cell', 'range', 'columns', 'rows']);

const NOTHING_UNREAD: UnreadAt = () => false;

const unread = (node: FormulaNode): Placed => ({ node, read: false });

const placedChildren = (node: FormulaNode, unreadAt: UnreadAt): readonly Placed[] => {
  switch (node.kind) {
    case FormulaNodeKind.Areas:
      return [unread(node.left), unread(node.right)];
    case FormulaNodeKind.Union:
      return node.areas.map(unread);
    case FormulaNodeKind.Call:
      return node.args.map((arg, index) => ({ node: arg, read: !unreadAt(node.name, index) }));
    default:
      return childrenOf(node).map((child) => ({ node: child, read: true }));
  }
};

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

export const readReferences = (
  root: FormulaNode,
  unreadAt: UnreadAt = NOTHING_UNREAD,
): FormulaReference[] => {
  const found: FormulaReference[] = [];
  const waiting: Placed[] = [{ node: root, read: true }];

  for (let item = waiting.pop(); item !== undefined; item = waiting.pop()) {
    if (isReference(item.node)) {
      if (!item.read && ADDRESSES.has(item.node.kind)) {
        continue;
      }

      found.push(item.node);
      continue;
    }

    const children = placedChildren(item.node, unreadAt);

    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];

      if (child === undefined) {
        continue;
      }

      waiting.push(child);
    }
  }
  return found;
};

export const mapReferences = (node: FormulaNode, visit: Visitor): FormulaNode =>
  foldFormula<FormulaNode>(
    node,
    (item, children) => (isReference(item) ? visit(item) : withChildren(item, children)),
    descendPast,
  );
