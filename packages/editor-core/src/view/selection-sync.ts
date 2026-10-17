import { isAtom } from '../commands/input';
import type { Doc } from '../doc/doc.types';
import { nearestCursor, selectionRange, textPosition, textSelection } from '../state/selection';
import type { Selection } from '../state/selection.types';
import type { ViewHost } from './host.types';
import { domAtPos, posAtDOM } from './positions';
import type { DomPoint } from './view.types';

const SELECTED_CLASS = 'nui-editor__selected';

export const ALL_CLASS = 'nui-editor__all';

interface Span {
  readonly anchor: number;
  readonly head: number;
}

export interface SelectionSync {
  read(): void;
  write(): void;
  mark(): void;
}

const spanOf = (doc: Doc, selection: Selection): Span => {
  if (selection.kind === 'text') {
    return { anchor: selection.anchor, head: selection.head };
  }
  const range = selectionRange(doc, selection);

  return { anchor: range.from, head: range.to };
};

const sameSelection = (left: Selection, right: Selection): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const indexIn = (node: Node): number => {
  let index = 0;

  for (let sibling = node.previousSibling; sibling !== null; sibling = sibling.previousSibling) {
    index += 1;
  }
  return index;
};

const nodePoints = (host: ViewHost, id: string): readonly [DomPoint, DomPoint] | undefined => {
  const dom = host.context.byId.get(id)?.dom;
  const parent = dom?.parentNode;

  if (dom === undefined || parent === null || parent === undefined) {
    return undefined;
  }
  const index = indexIn(dom);

  return [
    { node: parent, offset: index },
    { node: parent, offset: index + 1 },
  ];
};

const pointsOf = (
  host: ViewHost,
  selection: Selection,
): readonly [DomPoint, DomPoint] | undefined => {
  if (selection.kind === 'node') {
    return nodePoints(host, selection.id);
  }
  if (selection.kind === 'all') {
    const doc = host.state().doc;
    const point = domAtPos(host.rootDesc, doc, textPosition(doc, 0, 1) ?? 0);

    return [point, point];
  }
  const doc = host.state().doc;
  const span = spanOf(doc, selection);

  return [domAtPos(host.rootDesc, doc, span.anchor), domAtPos(host.rootDesc, doc, span.head)];
};

const domSpan = (host: ViewHost): Span | undefined => {
  const selection = host.root.ownerDocument.getSelection();
  const { anchorNode, focusNode } = selection ?? {};

  if (
    selection === null ||
    anchorNode === null ||
    focusNode === null ||
    anchorNode === undefined ||
    focusNode === undefined ||
    !host.root.contains(anchorNode) ||
    !host.root.contains(focusNode)
  ) {
    return undefined;
  }
  return {
    anchor: posAtDOM(host.context, anchorNode, selection.anchorOffset),
    head: posAtDOM(host.context, focusNode, selection.focusOffset),
  };
};

const allCaret = (doc: Doc): number => textPosition(doc, 0, 1) ?? 0;

const coversAll = (doc: Doc, span: Span): boolean =>
  Math.min(span.anchor, span.head) <= allCaret(doc) &&
  Math.max(span.anchor, span.head) >= (textPosition(doc, doc.size, -1) ?? doc.size) &&
  span.anchor !== span.head;

const selectionOfSpan = (doc: Doc, span: Span): Selection => {
  const low = Math.min(span.anchor, span.head);
  const high = Math.max(span.anchor, span.head);
  const node = doc.nodeAt(low);

  if (high - low === 1 && isAtom(doc.schema, node)) {
    return { kind: 'node', id: node.id };
  }
  if (span.anchor === span.head) {
    return nearestCursor(doc, span.anchor);
  }
  if (coversAll(doc, span)) {
    return { kind: 'all' };
  }
  const forward = span.anchor <= span.head;
  const anchor = textPosition(doc, span.anchor, forward ? 1 : -1);
  const head = textPosition(doc, span.head, forward ? -1 : 1);

  return anchor === undefined || head === undefined
    ? nearestCursor(doc, span.head)
    : textSelection(anchor, head);
};

const focused = (host: ViewHost): boolean => {
  const active = host.root.ownerDocument.activeElement;

  return active !== null && (active === host.root || host.root.contains(active));
};

export const createSelectionSync = (host: ViewHost): SelectionSync => {
  let marked: HTMLElement | undefined;

  const matches = (span: Span): boolean => {
    const state = host.state();

    if (state.selection.kind === 'all') {
      return (
        coversAll(state.doc, span) ||
        (span.anchor === span.head && span.head === allCaret(state.doc))
      );
    }
    const expected = spanOf(state.doc, state.selection);

    return expected.anchor === span.anchor && expected.head === span.head;
  };

  return {
    read: () => {
      const span = host.composing() ? undefined : domSpan(host);

      if (span === undefined || matches(span)) {
        return;
      }
      const state = host.state();
      const next = selectionOfSpan(state.doc, span);

      if (!sameSelection(next, state.selection)) {
        host.dispatch(state.tr.setSelection(next), 'pointer');
      }
    },
    write: () => {
      const span = domSpan(host);
      const state = host.state();
      const points = pointsOf(host, state.selection);
      const selection = host.root.ownerDocument.getSelection();

      if (
        host.composing() ||
        host.holding() ||
        !focused(host) ||
        selection === null ||
        points === undefined ||
        (span !== undefined && matches(span))
      ) {
        return;
      }

      selection.setBaseAndExtent(
        points[0].node,
        points[0].offset,
        points[1].node,
        points[1].offset,
      );
    },
    mark: () => {
      const selection = host.state().selection;
      const next = selection.kind === 'node' ? host.context.byId.get(selection.id)?.dom : undefined;

      host.root.classList.toggle(ALL_CLASS, selection.kind === 'all');

      if (next === marked) {
        return;
      }
      marked?.classList.remove(SELECTED_CLASS);
      next?.classList.add(SELECTED_CLASS);
      marked = next;
    },
  };
};
