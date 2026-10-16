import {
  childNode,
  containerSlot,
  moveBlock,
  slotAt,
  slotRule,
  type BlockTarget,
  type ChildSlot,
  type EditorState,
} from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { BLOCK, deepestSlot, elementOf, indexAtY } from './block-geometry';

export type DropEdge = 'top' | 'bottom';

export interface DropTarget {
  readonly to: BlockTarget;
  readonly anchor: Element;
  readonly edge: DropEdge;
}

const ROOM = 4;

const hitAt = (content: HTMLElement, x: number, y: number): Element | undefined => {
  const document = content.ownerDocument;

  const found =
    typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];

  return found.find(
    (element) =>
      element !== content && content.contains(element) && element.closest(BLOCK) !== null,
  );
};

const pointedSlot = (view: EditorView, content: HTMLElement, x: number, y: number): ChildSlot => {
  const hit = hitAt(content, x, y);
  const found = hit === undefined ? undefined : slotAt(view.state.doc, view.posAtDOM(hit, 0));
  const root = view.state.doc.root.id;

  return found === undefined
    ? { parent: root, index: indexAtY(view, root, y) }
    : deepestSlot(view, found, y);
};

const noOp = (from: ChildSlot, to: BlockTarget): boolean =>
  from.parent === to.parent && (to.index === from.index || to.index === from.index + 1);

const allowed = (state: EditorState, from: ChildSlot, to: BlockTarget): boolean =>
  !noOp(from, to) && moveBlock(from, to)(state);

const intoContainer = (view: EditorView, slot: ChildSlot, y: number): DropTarget | undefined => {
  const node = childNode(view.state.doc, slot);
  const element = node === undefined ? undefined : view.nodeDOM(node.id);
  const first = node?.content[0];
  const head = first?.kind === 'element' ? view.nodeDOM(first.id) : undefined;
  const box = element?.getBoundingClientRect();
  const line = head?.getBoundingClientRect();

  return node === undefined ||
    head === undefined ||
    box === undefined ||
    line === undefined ||
    slotRule(view.state.doc, node) !== 'rest' ||
    y < line.top + line.height / 2 ||
    y > line.bottom ||
    box.bottom - line.bottom <= ROOM
    ? undefined
    : { to: { parent: node.id, index: 1 }, anchor: head, edge: 'bottom' };
};

const beside = (view: EditorView, slot: ChildSlot, y: number): DropTarget | undefined => {
  const element = elementOf(view, slot);
  const rect = element?.getBoundingClientRect();

  if (element === undefined || rect === undefined) {
    return undefined;
  }
  const edge: DropEdge = y < rect.top + rect.height / 2 ? 'top' : 'bottom';

  return {
    to: { parent: slot.parent, index: slot.index + (edge === 'bottom' ? 1 : 0) },
    anchor: element,
    edge,
  };
};

export const dropTargetAt = (
  view: EditorView,
  content: HTMLElement,
  from: ChildSlot,
  x: number,
  y: number,
): DropTarget | undefined => {
  const { state } = view;

  for (
    let slot: ChildSlot | undefined = pointedSlot(view, content, x, y);
    slot !== undefined;
    slot = containerSlot(state.doc, slot)
  ) {
    const target = [intoContainer(view, slot, y), beside(view, slot, y)].find(
      (candidate) => candidate !== undefined && allowed(state, from, candidate.to),
    );

    if (target !== undefined) {
      return target;
    }
  }
  return undefined;
};
