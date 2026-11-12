import {
  isAtom,
  leaveBlockSpot,
  nearestCursor,
  nodeSize,
  selectionRange,
  setBlockSpot,
  type Command,
  type NodeId,
} from '@numior/editor-core';
import type { NuiEditorBlockContext, NuiEditorBlockHost } from './block.types';

const atNode =
  (id: NodeId, change: (from: number, to: number) => Command): Command =>
  (state, dispatch) => {
    const node = state.doc.byId(id);
    const from = state.doc.positionOf(id);

    return (
      node !== undefined &&
      from !== undefined &&
      change(from, from + nodeSize(node))(state, dispatch)
    );
  };

const enter =
  (id: NodeId) =>
  (from: number, to: number): Command =>
  (state, dispatch) => {
    const range = selectionRange(state.doc, state.selection);
    const node = state.doc.byId(id);

    if (node === undefined || (range.from >= from && range.to <= to)) {
      return false;
    }

    dispatch?.(
      state.tr.setSelection(
        isAtom(state.doc.schema, node)
          ? { kind: 'node', id }
          : nearestCursor(state.doc, to - 1, -1),
      ),
    );

    return true;
  };

export const blockContext = (
  id: NodeId,
  { run, focus, peers }: NuiEditorBlockHost,
  element: () => HTMLElement | undefined,
): NuiEditorBlockContext => ({
  setAttrs: (attrs) =>
    run(
      atNode(id, (from) => (state, dispatch) => {
        dispatch?.(state.tr.setNodeAttrs(from, attrs));
        return true;
      }),
    ),
  remove: () =>
    run(
      atNode(id, (from, to) => (state, dispatch) => {
        dispatch?.(state.tr.delete(from, to));
        return true;
      }),
    ),
  run,
  focus,
  enter: () => {
    run(atNode(id, enter(id)));
    focus();
  },
  element,
  peers: () => peers(id),
  setSpot: (part) => {
    run(setBlockSpot({ block: id, part }));
  },
  leaveSpot: () => {
    run(leaveBlockSpot(id));
  },
  setStyle: (property, value) => {
    if (value === null) {
      element()?.style.removeProperty(property);
    } else {
      element()?.style.setProperty(property, value);
    }
  },
});
