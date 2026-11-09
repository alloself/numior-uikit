import type { ViewHost } from './host.types';
import { domAtPos, posAtDOM } from './positions';
import { Direction, type CaretRect } from './view.types';

const rectOf = (rect: DOMRect, edge: number): CaretRect => ({
  left: edge,
  right: edge,
  top: rect.top,
  bottom: rect.bottom,
});

const firstRect = (range: Range): DOMRect | undefined => {
  const rect = range.getClientRects()[0];

  return rect !== undefined && rect.height > 0 ? rect : undefined;
};

const STRONG_RIGHT_TO_LEFT =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;

const STRONG_LETTER = /\p{L}/u;

const runsRightToLeft = (doc: Document, text: Text, index: number): boolean => {
  const character = text.data.charAt(index);

  if (STRONG_RIGHT_TO_LEFT.test(character)) {
    return true;
  }
  if (STRONG_LETTER.test(character) || text.parentElement === null) {
    return false;
  }
  return doc.defaultView?.getComputedStyle(text.parentElement).direction === Direction.Rtl;
};

const besideCharacter = (doc: Document, text: Text, offset: number): CaretRect | undefined => {
  const range = doc.createRange();
  const before = offset > 0;

  range.setStart(text, before ? offset - 1 : offset);
  range.setEnd(text, before ? offset : offset + 1);
  const rect = firstRect(range);

  if (rect === undefined) {
    return undefined;
  }
  const atRightEdge = before !== runsRightToLeft(doc, text, before ? offset - 1 : offset);

  return rectOf(rect, atRightEdge ? rect.right : rect.left);
};

const elementEdge = (node: Node, offset: number): CaretRect | undefined => {
  const element =
    node instanceof Element
      ? (node.children[Math.min(offset, node.children.length - 1)] ?? node)
      : node.parentElement;

  if (element === null) {
    return undefined;
  }
  const rect = element.getBoundingClientRect();

  return rectOf(rect, rect.left);
};

export const coordsAtPos = (host: ViewHost, pos: number): CaretRect | undefined => {
  const doc = host.root.ownerDocument;
  const point = domAtPos(host.rootDesc, host.state().doc, pos, host.fresh);
  const range = doc.createRange();

  range.setStart(point.node, point.offset);
  range.collapse(true);
  const direct = firstRect(range);

  if (direct !== undefined) {
    return rectOf(direct, direct.left);
  }
  return point.node instanceof Text && point.node.data.length > 0
    ? (besideCharacter(doc, point.node, point.offset) ?? elementEdge(point.node, point.offset))
    : elementEdge(point.node, point.offset);
};

const caretAt = (
  doc: Document,
  x: number,
  y: number,
): { node: Node; offset: number } | undefined => {
  if (typeof doc.caretPositionFromPoint === 'function') {
    const caret = doc.caretPositionFromPoint(x, y);

    return caret === null ? undefined : { node: caret.offsetNode, offset: caret.offset };
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);

    return range === null ? undefined : { node: range.startContainer, offset: range.startOffset };
  }
  return undefined;
};

export const posAtCoords = (host: ViewHost, x: number, y: number): number | undefined => {
  const caret = caretAt(host.root.ownerDocument, x, y);

  return caret === undefined || !host.root.contains(caret.node)
    ? undefined
    : posAtDOM(host.context, caret.node, caret.offset);
};
