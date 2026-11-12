import { isAtom } from '../commands/atoms';
import type { Doc } from '../doc/doc.types';
import { nearestCursor, selectionRange, textPosition, textSelection } from '../state/selection';
import type { Selection } from '../state/selection.types';
import { widgetAround } from './desc';
import { clearGap, paintGap } from './gap';
import type { ViewHost } from './host.types';
import { domAtPos, posAtDOM } from './positions';
import type { DomPoint } from './view.types';
import { SelectionKind } from '../state/state.types';

interface Span {
  readonly anchor: number;
  readonly head: number;
}

interface DomMark {
  readonly anchorNode: Node | null;
  readonly anchorOffset: number;
  readonly focusNode: Node | null;
  readonly focusOffset: number;
}

export interface SelectionSync {
  read(): void;
  write(): void;
  unread(): boolean;
  mark(): void;
}

const SELECTED_CLASS = 'nui-editor__selected';

export const ALL_CLASS = 'nui-editor__all';

const spanOf = (doc: Doc, selection: Selection): Span => {
  if (selection.kind === SelectionKind.Text) {
    return { anchor: selection.anchor, head: selection.head };
  }

  const range = selectionRange(
    doc,
    selection.kind === SelectionKind.Gap ? { kind: 'node', id: selection.id } : selection,
  );

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
  const desc = host.context.byId.get(id);
  const dom = desc?.dom;
  const parent = dom?.parentNode;

  if (dom === undefined || parent === null || parent === undefined) {
    return undefined;
  }
  if (desc?.view !== undefined && desc.contentDOM === null) {
    return [
      { node: dom, offset: 0 },
      { node: dom, offset: dom.childNodes.length },
    ];
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
  if (selection.kind === SelectionKind.Node || selection.kind === SelectionKind.Gap) {
    return nodePoints(host, selection.id);
  }
  if (selection.kind === SelectionKind.All) {
    const doc = host.state().doc;
    const point = domAtPos(host.rootDesc, doc, textPosition(doc, 0, 1) ?? 0, host.fresh);

    return [point, point];
  }
  const doc = host.state().doc;
  const span = spanOf(doc, selection);

  return [
    domAtPos(host.rootDesc, doc, span.anchor, host.fresh),
    domAtPos(host.rootDesc, doc, span.head, host.fresh),
  ];
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

const markOf = (host: ViewHost): DomMark | undefined => {
  const selection = host.root.ownerDocument.getSelection();

  return selection === null
    ? undefined
    : {
        anchorNode: selection.anchorNode,
        anchorOffset: selection.anchorOffset,
        focusNode: selection.focusNode,
        focusOffset: selection.focusOffset,
      };
};

const sameMark = (left: DomMark | undefined, right: DomMark | undefined): boolean =>
  left !== undefined &&
  right !== undefined &&
  left.anchorNode === right.anchorNode &&
  left.anchorOffset === right.anchorOffset &&
  left.focusNode === right.focusNode &&
  left.focusOffset === right.focusOffset;

const holds = (selection: globalThis.Selection, points: readonly [DomPoint, DomPoint]): boolean =>
  selection.anchorNode === points[0].node &&
  selection.anchorOffset === points[0].offset &&
  selection.focusNode === points[1].node &&
  selection.focusOffset === points[1].offset;

const inWidget = (host: ViewHost): boolean => {
  const selection = host.root.ownerDocument.getSelection();

  return (
    widgetAround(host.context, selection?.anchorNode ?? null) ||
    widgetAround(host.context, selection?.focusNode ?? null)
  );
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

  return (
    active !== null &&
    (active === host.root || host.root.contains(active)) &&
    !widgetAround(host.context, active)
  );
};

export const createSelectionSync = (host: ViewHost): SelectionSync => {
  let marked: HTMLElement | undefined;
  let gapped: HTMLElement | undefined;
  let seen: DomMark | undefined;

  const markGap = (selection: Selection): void => {
    const next =
      selection.kind === SelectionKind.Gap ? host.context.byId.get(selection.id)?.dom : undefined;

    if (gapped !== undefined && gapped !== next) {
      clearGap(gapped);
    }
    gapped = next;
    if (next === undefined || selection.kind !== SelectionKind.Gap) {
      return;
    }

    paintGap(host, next, selection.id, selection.side);
  };

  const matches = (span: Span): boolean => {
    const state = host.state();

    if (state.selection.kind === SelectionKind.All) {
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
      const span = host.composing() || inWidget(host) ? undefined : domSpan(host);

      if (span === undefined) {
        return;
      }
      seen = markOf(host);

      if (matches(span)) {
        return;
      }
      const state = host.state();
      const next = selectionOfSpan(state.doc, span);

      if (sameSelection(next, state.selection)) {
        return;
      }

      host.dispatch(state.tr.setSelection(next), 'pointer');
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
        points === undefined
      ) {
        return;
      }
      if (!holds(selection, points) && (span === undefined || !matches(span))) {
        selection.setBaseAndExtent(
          points[0].node,
          points[0].offset,
          points[1].node,
          points[1].offset,
        );
      }
      seen = markOf(host);
    },
    unread: () => {
      const span = host.composing() || !focused(host) ? undefined : domSpan(host);

      return span !== undefined && !matches(span) && !sameMark(markOf(host), seen);
    },
    mark: () => {
      const selection = host.state().selection;

      const next =
        selection.kind === SelectionKind.Node
          ? host.context.byId.get(selection.id)?.dom
          : undefined;

      host.root.classList.toggle(ALL_CLASS, selection.kind === SelectionKind.All);
      markGap(selection);

      if (next === marked) {
        return;
      }
      marked?.classList.remove(SELECTED_CLASS);
      next?.classList.add(SELECTED_CLASS);
      marked = next;
    },
  };
};
