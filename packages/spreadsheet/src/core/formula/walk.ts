import { max } from 'lodash-es';
import { FormulaNodeKind, type FormulaNode } from './formula.types';

interface Frame<T> {
  readonly node: FormulaNode;
  readonly children: readonly FormulaNode[];
  readonly results: T[];
}

export type Descend = (node: FormulaNode) => readonly FormulaNode[];

export const childrenOf: Descend = (node) => {
  switch (node.kind) {
    case FormulaNodeKind.Call:
      return node.args;
    case FormulaNodeKind.Unary:
    case FormulaNodeKind.Percent:
      return [node.operand];
    case FormulaNodeKind.Binary:
      return [node.left, node.right];
    case FormulaNodeKind.Array:
      return node.rows.flat();
    default:
      return [];
  }
};

export const operandsOf: Descend = (node) =>
  node.kind === FormulaNodeKind.Array ? [] : childrenOf(node);

const sameNodes = (left: readonly FormulaNode[], right: readonly FormulaNode[]): boolean =>
  left.length === right.length && left.every((node, index) => node === right[index]);

const arrayRows = (
  rows: readonly (readonly FormulaNode[])[],
  children: readonly FormulaNode[],
): FormulaNode[][] =>
  rows.reduce<{ rows: FormulaNode[][]; at: number }>(
    (built, row) => {
      built.rows.push(row.map((item, index) => children[built.at + index] ?? item));
      return { rows: built.rows, at: built.at + row.length };
    },
    { rows: [], at: 0 },
  ).rows;

export const withChildren = (node: FormulaNode, children: readonly FormulaNode[]): FormulaNode => {
  if (sameNodes(children, childrenOf(node))) {
    return node;
  }
  switch (node.kind) {
    case FormulaNodeKind.Call:
      return { ...node, args: children };
    case FormulaNodeKind.Unary:
    case FormulaNodeKind.Percent:
      return { ...node, operand: children[0] ?? node.operand };
    case FormulaNodeKind.Binary:
      return { ...node, left: children[0] ?? node.left, right: children[1] ?? node.right };
    case FormulaNodeKind.Array:
      return { ...node, rows: arrayRows(node.rows, children) };
    default:
      return node;
  }
};

export const foldFormula = <T>(
  root: FormulaNode,
  leave: (node: FormulaNode, results: readonly T[]) => T,
  descend: Descend = childrenOf,
): T => {
  const top: Frame<T> = { node: root, children: descend(root), results: [] };
  const frames: Frame<T>[] = [top];

  for (let frame = frames.at(-1); frame !== undefined; frame = frames.at(-1)) {
    const child = frame.children[frame.results.length];

    if (child !== undefined) {
      frames.push({ node: child, children: descend(child), results: [] });
      continue;
    }

    frames.pop();

    const parent = frames.at(-1);

    if (parent === undefined) {
      continue;
    }

    parent.results.push(leave(frame.node, frame.results));
  }
  return leave(root, top.results);
};

const pushReversed = (target: FormulaNode[], nodes: readonly FormulaNode[]): void => {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];

    if (node === undefined) {
      continue;
    }

    target.push(node);
  }
};

export const findNode = (
  root: FormulaNode,
  test: (node: FormulaNode) => boolean,
  descend: Descend = childrenOf,
): FormulaNode | undefined => {
  const waiting: FormulaNode[] = [root];

  for (let node = waiting.pop(); node !== undefined; node = waiting.pop()) {
    if (test(node)) {
      return node;
    }

    pushReversed(waiting, descend(node));
  }
  return undefined;
};

export const eachNode = (
  root: FormulaNode,
  visit: (node: FormulaNode) => void,
  descend: Descend = childrenOf,
): void => {
  const waiting: FormulaNode[] = [root];

  for (let node = waiting.pop(); node !== undefined; node = waiting.pop()) {
    visit(node);
    pushReversed(waiting, descend(node));
  }
};

export const formulaDepth = (root: FormulaNode): number =>
  foldFormula<number>(root, (_node, depths) => (max(depths) ?? 0) + 1);
