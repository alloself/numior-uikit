import type { Doc } from '../doc/doc.types';
import { emptyTextblock } from '../doc/empty';
import { contentSize, nodeSize } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type NodeId,
} from '../model/node.types';
import { nearestCursor, selectionRange, textSelection } from '../state/selection';
import type { Selection } from '../state/selection.types';
import { SlotRule } from '../schema/schema.types';
import { SelectionKind, type Command, type EditorState } from '../state/state.types';
import { StepKind } from '../transform/step.types';

export interface ChildSlot {
  readonly parent: NodeId;
  readonly index: number;
}

interface Parent {
  readonly node: ElementNode;
  readonly start: number;
}

const startOf = (content: readonly ContentNode[], index: number): number =>
  contentSize(content.slice(0, index));

const parentOf = (doc: Doc, id: NodeId): Parent | undefined => {
  if (id === doc.root.id) {
    return { node: doc.root, start: 0 };
  }
  const node = doc.byId(id);
  const pos = doc.positionOf(id);

  return node === undefined || pos === undefined ? undefined : { node, start: pos + 1 };
};

export const slotRule = (doc: Doc, node: ElementNode): SlotRule =>
  node.id === doc.root.id
    ? SlotRule.All
    : (doc.schema.nodes.get(node.type)?.slots ?? SlotRule.None);

export const holdsSlots = (doc: Doc, node: ElementNode): boolean =>
  slotRule(doc, node) !== SlotRule.None;

export const isSlot = (doc: Doc, parent: ElementNode, index: number): boolean => {
  const rule = slotRule(doc, parent);

  return rule === SlotRule.All || (rule === SlotRule.Rest && index > 0);
};

export const slotAt = (doc: Doc, pos: number): ChildSlot | undefined => {
  const $pos = doc.resolve(pos);

  for (let depth = $pos.depth; depth >= 1; depth -= 1) {
    const parent = $pos.node(depth - 1);

    if (isSlot(doc, parent, $pos.indexAt(depth - 1))) {
      return { parent: parent.id, index: $pos.indexAt(depth - 1) };
    }
  }
  return doc.root.content[$pos.index] === undefined
    ? undefined
    : { parent: doc.root.id, index: $pos.index };
};

export const selectionSlot = (state: EditorState): ChildSlot | undefined =>
  slotAt(state.doc, selectionRange(state.doc, state.selection).from);

export const childStart = (doc: Doc, slot: ChildSlot): number | undefined => {
  const parent = parentOf(doc, slot.parent);

  return parent === undefined || parent.node.content[slot.index] === undefined
    ? undefined
    : parent.start + startOf(parent.node.content, slot.index);
};

export const slotStart = (doc: Doc, slot: ChildSlot): number | undefined => {
  const parent = parentOf(doc, slot.parent);

  return parent === undefined || slot.index > parent.node.content.length
    ? undefined
    : parent.start + startOf(parent.node.content, slot.index);
};

export const childNode = (doc: Doc, slot: ChildSlot): ElementNode | undefined => {
  const child = parentOf(doc, slot.parent)?.node.content[slot.index];

  return child?.kind === ContentNodeKind.Element ? child : undefined;
};

export const containerSlot = (doc: Doc, slot: ChildSlot): ChildSlot | undefined => {
  const pos = slot.parent === doc.root.id ? undefined : doc.positionOf(slot.parent);

  return pos === undefined ? undefined : slotAt(doc, pos);
};

const followed = (state: EditorState, slot: ChildSlot, delta: number): Selection | undefined => {
  const { selection } = state;
  const range = selectionRange(state.doc, selection);
  const start = childStart(state.doc, slot) ?? 0;
  const end = start + nodeSize(childNode(state.doc, slot) ?? state.doc.root);

  return selection.kind === SelectionKind.Text && range.from >= start && range.to <= end
    ? textSelection(selection.anchor + delta, selection.head + delta)
    : undefined;
};

export const moveChild =
  (parentId: NodeId, from: number, to: number): Command =>
  (state, dispatch) => {
    const parent = parentOf(state.doc, parentId);
    const content = parent?.node.content ?? [];

    if (
      parent === undefined ||
      from === to ||
      content[from] === undefined ||
      content[to] === undefined
    ) {
      return false;
    }
    const start = parent.start + startOf(content, from);
    const end = parent.start + startOf(content, from + 1);
    const target = parent.start + startOf(content, to > from ? to + 1 : to);
    const delta = target < start ? target - start : target - end;
    const selection = followed(state, { parent: parentId, index: from }, delta);
    const tr = state.tr;

    if (!tr.maybeStep({ kind: StepKind.Move, from: start, to: end, target }).ok) {
      return false;
    }
    if (selection !== undefined) {
      tr.setSelection(selection);
    }
    dispatch?.(tr);
    return true;
  };

export const moveCurrent =
  (direction: -1 | 1): Command =>
  (state, dispatch) => {
    const slot = selectionSlot(state);

    return (
      slot !== undefined &&
      moveChild(slot.parent, slot.index, slot.index + direction)(state, dispatch)
    );
  };

export const duplicateChild =
  (slot: ChildSlot): Command =>
  (state, dispatch) => {
    const node = childNode(state.doc, slot);
    const start = childStart(state.doc, slot);

    if (node === undefined || start === undefined) {
      return false;
    }
    dispatch?.(state.tr.insert(start + node.size, [node]));
    return true;
  };

const parentSlot = (doc: Doc, slot: ChildSlot): ChildSlot | undefined => {
  const pos = doc.positionOf(slot.parent);

  return pos === undefined ? undefined : slotAt(doc, pos + 1);
};

export const deleteChild =
  (slot: ChildSlot): Command =>
  (state, dispatch) => {
    const { doc } = state;
    const node = childNode(doc, slot);
    const start = childStart(doc, slot);
    const lone = slot.parent === doc.root.id && doc.root.content.length === 1;
    const tr = state.tr;

    if (node === undefined || start === undefined) {
      return false;
    }
    const filler = lone ? emptyTextblock(doc.schema, tr.newId()) : undefined;

    const removed = tr.maybeStep({
      kind: 'replace',
      from: start,
      to: start + node.size,
      slice: { content: filler === undefined ? [] : [filler], openStart: 0, openEnd: 0 },
    });

    if (!removed.ok) {
      const outer = parentSlot(doc, slot);

      return outer !== undefined && deleteChild(outer)(state, dispatch);
    }
    tr.setSelection(nearestCursor(tr.doc, Math.min(start, tr.doc.size), lone ? 1 : -1));
    dispatch?.(tr);
    return true;
  };

export const focusChild =
  (slot: ChildSlot): Command =>
  (state, dispatch) => {
    const start = childStart(state.doc, slot);

    if (start === undefined) {
      return false;
    }
    dispatch?.(state.tr.setSelection(nearestCursor(state.doc, start + 1)));
    return true;
  };
