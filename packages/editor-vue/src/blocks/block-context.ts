import { nodeSize, type Command, type NodeId } from '@numior/editor-core';
import type { NuiEditorBlockContext } from './block.types';

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

export const blockContext = (
  id: NodeId,
  run: (command: Command) => boolean,
  focus: () => void,
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
  element,
  setStyle: (property, value) => {
    if (value === null) {
      element()?.style.removeProperty(property);
    } else {
      element()?.style.setProperty(property, value);
    }
  },
});
