import { ContentNodeKind, type Doc, type ElementNode, type Transaction } from '@numior/editor-core';

interface Arrival {
  readonly id: string;
  readonly parent: ElementNode;
  readonly index: number;
}

const arrivalsIn = (
  parent: ElementNode,
  moved: ReadonlySet<string>,
  arrivals: Arrival[],
): Arrival[] => {
  parent.content.forEach((child, index) => {
    if (child.kind !== ContentNodeKind.Element) {
      return;
    }
    if (moved.has(child.id)) {
      arrivals.push({ id: child.id, parent, index });
    }
    arrivalsIn(child, moved, arrivals);
  });

  return arrivals;
};

const contentStart = (doc: Doc, parent: ElementNode): number | undefined => {
  if (parent.id === doc.root.id) {
    return 0;
  }

  const at = doc.positionOf(parent.id);

  return at === undefined ? undefined : at + 1;
};

const siblingEnd = (doc: Doc, parent: ElementNode, index: number): number | undefined => {
  for (let at = index - 1; at >= 0; at -= 1) {
    const sibling = parent.content[at];

    const start =
      sibling?.kind === ContentNodeKind.Element ? doc.positionOf(sibling.id) : undefined;

    const node = sibling?.kind === ContentNodeKind.Element ? doc.byId(sibling.id) : undefined;

    if (start === undefined || node === undefined || doc.resolve(start).parent.id !== parent.id) {
      continue;
    }
    return start + node.size;
  }
  return undefined;
};

const carry = (tr: Transaction, arrival: Arrival): void => {
  const { doc } = tr;
  const from = doc.positionOf(arrival.id);
  const node = doc.byId(arrival.id);

  if (from === undefined || node === undefined) {
    return;
  }

  const target =
    siblingEnd(doc, arrival.parent, arrival.index) ?? contentStart(doc, arrival.parent);

  if (target === undefined || (target >= from && target <= from + node.size)) {
    return;
  }
  tr.maybeStep({ kind: 'move', from, to: from + node.size, target });
};

export const carryMoves = (
  tr: Transaction,
  root: ElementNode,
  moved: ReadonlySet<string>,
): Transaction => {
  if (moved.size === 0) {
    return tr;
  }
  for (const arrival of arrivalsIn(root, moved, [])) {
    carry(tr, arrival);
  }
  return tr;
};
