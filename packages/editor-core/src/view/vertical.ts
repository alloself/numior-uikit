import { isAtom } from '../commands/atoms';
import type { Doc } from '../doc/doc.types';
import { nodeSize } from '../model/node';
import type { Selection } from '../state/selection.types';
import { coordsAtPos } from './coords';
import type { ViewHost } from './host.types';

const atomFrom = (doc: Doc, edge: number, forward: boolean): string | undefined => {
  let place = doc.resolve(edge);

  for (;;) {
    const beside = forward ? place.nodeAfter : place.nodeBefore;

    if (beside !== undefined) {
      return isAtom(doc.schema, beside) ? beside.id : undefined;
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
  if (selection.kind === 'node') {
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

export const atomAcross = (host: ViewHost, forward: boolean): string | undefined => {
  const { doc, selection } = host.state();
  const edge = edgeOf(doc, selection, forward);
  const id = edge === undefined ? undefined : atomFrom(doc, edge, forward);

  return id !== undefined &&
    (selection.kind === 'node' ||
      onEdgeLine(host, selection.kind === 'text' ? selection.head : 0, forward))
    ? id
    : undefined;
};
