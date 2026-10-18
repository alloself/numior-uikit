import { isBlockAtom } from '../commands/atoms';
import type { Doc } from '../doc/doc.types';
import { nodeSize } from '../model/node';
import { nearestCursor } from '../state/selection';
import type { Selection } from '../state/selection.types';
import { coordsAtPos, posAtCoords } from './coords';
import { gapX, sideNearest } from './gap';
import type { ViewHost } from './host.types';

const atomFrom = (doc: Doc, edge: number, forward: boolean): string | undefined => {
  let place = doc.resolve(edge);

  for (;;) {
    const beside = forward ? place.nodeAfter : place.nodeBefore;

    if (beside !== undefined) {
      return isBlockAtom(doc.schema, beside) ? beside.id : undefined;
    }
    if (place.depth === 0) {
      return undefined;
    }
    place = doc.resolve(forward ? place.after(place.depth) : place.before(place.depth));
  }
};

const onEdgeLine = (host: ViewHost, head: number, forward: boolean): boolean => {
  const caret = coordsAtPos(host, head);

  const block = host.context.byId
    .get(host.state().doc.resolve(head).parent.id)
    ?.dom.getBoundingClientRect();

  if (caret === undefined || block === undefined) {
    return true;
  }
  const line = Math.max(caret.bottom - caret.top, 1);

  return forward ? block.bottom - caret.bottom < line : caret.top - block.top < line;
};

const edgeOf = (doc: Doc, selection: Selection, forward: boolean): number | undefined => {
  if (selection.kind === 'node' || selection.kind === 'gap') {
    const node = doc.byId(selection.id);
    const at = doc.positionOf(selection.id);

    if (
      node === undefined ||
      at === undefined ||
      doc.schema.nodes.get(node.type)?.inline === true
    ) {
      return undefined;
    }
    return forward ? at + nodeSize(node) : at;
  }
  if (selection.kind !== 'text' || selection.anchor !== selection.head) {
    return undefined;
  }
  const cursor = doc.resolve(selection.head);

  return forward ? cursor.after(cursor.depth) : cursor.before(cursor.depth);
};

const caretX = (host: ViewHost, selection: Selection): number | undefined => {
  if (selection.kind === 'text') {
    return coordsAtPos(host, selection.head)?.left;
  }
  return gapX(host, selection);
};

const textAcross = (host: ViewHost, edge: number, forward: boolean, x: number): Selection => {
  const { doc } = host.state();
  const fallback = nearestCursor(doc, edge, forward ? 1 : -1);
  const head = fallback.kind === 'text' ? fallback.head : undefined;

  const block =
    head === undefined
      ? undefined
      : host.context.byId.get(doc.resolve(head).parent.id)?.dom.getBoundingClientRect();

  const pos =
    block === undefined
      ? undefined
      : posAtCoords(host, x, forward ? block.top + 1 : block.bottom - 1);

  return pos === undefined ? fallback : nearestCursor(doc, pos, forward ? 1 : -1);
};

export const verticalTarget = (host: ViewHost, forward: boolean): Selection | undefined => {
  const { doc, selection } = host.state();
  const edge = edgeOf(doc, selection, forward);
  const x = caretX(host, selection);

  if (
    edge === undefined ||
    x === undefined ||
    (selection.kind === 'text' && !onEdgeLine(host, selection.head, forward))
  ) {
    return undefined;
  }
  const id = atomFrom(doc, edge, forward);

  if (id !== undefined) {
    return { kind: 'gap', id, side: sideNearest(host, id, x) };
  }
  return selection.kind === 'text' ? undefined : textAcross(host, edge, forward, x);
};
