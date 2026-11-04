import {
  childNode,
  containerSlot,
  ContentNodeKind,
  moveBlock,
  NodeSlots,
  placeBeside,
  slotAt,
  slotRule,
  type BesideSide,
  type BlockTarget,
  type ChildSlot,
  type EditorState,
  type NodeId,
} from '@numior/editor-core';
import type { EditorView } from '@numior/editor-core/view';
import { COLUMN_TYPES, hasColumns } from '../blocks/columns/columns';
import { BLOCK, deepestSlot, elementOf, indexAtY } from './block-geometry';
import { DropEdge, DropTargetKind } from './handle.types';

export type DropTarget =
  | {
      readonly kind: typeof DropTargetKind.Between;
      readonly to: BlockTarget;
      readonly anchor: Element;
      readonly edge: DropEdge;
    }
  | {
      readonly kind: typeof DropTargetKind.Beside;
      readonly id: NodeId;
      readonly anchor: Element;
      readonly side: BesideSide;
    };

export interface DropPointer {
  readonly x: number;
  readonly y: number;
  readonly originX: number;
  readonly rtl: boolean;
}

const SIDE = 48;

const DELIBERATE = 16;

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
  const head = first?.kind === ContentNodeKind.Element ? view.nodeDOM(first.id) : undefined;
  const box = element?.getBoundingClientRect();
  const line = head?.getBoundingClientRect();

  return node === undefined ||
    head === undefined ||
    box === undefined ||
    line === undefined ||
    slotRule(view.state.doc, node) !== NodeSlots.Rest ||
    y < line.top + line.height / 2 ||
    y > line.bottom ||
    box.bottom - line.bottom <= ROOM
    ? undefined
    : { kind: 'between', to: { parent: node.id, index: 1 }, anchor: head, edge: 'bottom' };
};

const beside = (view: EditorView, slot: ChildSlot, y: number): DropTarget | undefined => {
  const element = elementOf(view, slot);
  const rect = element?.getBoundingClientRect();

  if (element === undefined || rect === undefined) {
    return undefined;
  }
  const edge: DropEdge = y < rect.top + rect.height / 2 ? 'top' : 'bottom';

  return {
    kind: 'between',
    to: { parent: slot.parent, index: slot.index + (edge === DropEdge.Bottom ? 1 : 0) },
    anchor: element,
    edge,
  };
};

const betweenAt = (
  view: EditorView,
  from: ChildSlot,
  pointed: ChildSlot,
  y: number,
): DropTarget | undefined => {
  const { state } = view;

  for (
    let slot: ChildSlot | undefined = pointed;
    slot !== undefined;
    slot = containerSlot(state.doc, slot)
  ) {
    const target = [intoContainer(view, slot, y), beside(view, slot, y)].find(
      (candidate) =>
        candidate?.kind === DropTargetKind.Between && allowed(state, from, candidate.to),
    );

    if (target !== undefined) {
      return target;
    }
  }
  return undefined;
};

const sideOf = (rect: DOMRect, pointer: DropPointer): BesideSide | undefined => {
  const zone = Math.min(SIDE, rect.width / 5);
  const left = pointer.x < rect.left + zone;
  const right = pointer.x > rect.right - zone;

  const start = pointer.rtl
    ? right && pointer.x > pointer.originX + DELIBERATE
    : left && pointer.x < pointer.originX - DELIBERATE;

  const end = pointer.rtl ? left : right;

  return start ? 'start' : end ? 'end' : undefined;
};

const columnLevel = (state: EditorState, slot: ChildSlot): ChildSlot | undefined => {
  for (let current: ChildSlot | undefined = slot; current !== undefined;) {
    const parent =
      current.parent === state.doc.root.id ? state.doc.root : state.doc.byId(current.parent);

    if (parent === state.doc.root || parent?.type === COLUMN_TYPES.column) {
      return current;
    }
    current = containerSlot(state.doc, current);
  }
  return undefined;
};

const besideAt = (
  view: EditorView,
  from: ChildSlot,
  pointed: ChildSlot,
  pointer: DropPointer,
): DropTarget | undefined => {
  const { state } = view;
  const level = hasColumns(state.doc.schema) ? columnLevel(state, pointed) : undefined;
  const node = level === undefined ? undefined : childNode(state.doc, level);
  const anchor = level === undefined ? undefined : elementOf(view, level);
  const rect = anchor?.getBoundingClientRect();
  const side = rect === undefined ? undefined : sideOf(rect, pointer);

  return node === undefined ||
    anchor === undefined ||
    side === undefined ||
    !placeBeside(from, node.id, side, COLUMN_TYPES)(state)
    ? undefined
    : { kind: 'beside', id: node.id, anchor, side };
};

export const dropTargetAt = (
  view: EditorView,
  content: HTMLElement,
  from: ChildSlot,
  pointer: DropPointer,
): DropTarget | undefined => {
  const pointed = pointedSlot(view, content, pointer.x, pointer.y);

  return besideAt(view, from, pointed, pointer) ?? betweenAt(view, from, pointed, pointer.y);
};
