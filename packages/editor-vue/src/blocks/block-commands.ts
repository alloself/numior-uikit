import { selectionRange, textSelection, type Command } from '@numior/editor-core';
import type { NuiEditorBlockEditor } from './block.types';
import { OPEN_CLASS } from './toggle/toggle-state';

export const toggleTodo: Command = (state, dispatch) => {
  const $pos = state.doc.resolve(selectionRange(state.doc, state.selection).from);

  for (let depth = $pos.depth; depth >= 1; depth -= 1) {
    const node = $pos.node(depth);

    if (node.type === 'todo_item') {
      dispatch?.(
        state.tr.setNodeAttrs($pos.before(depth), { checked: node.attrs.checked !== true }),
      );

      return true;
    }
  }
  return false;
};

export const leaveClosedToggle =
  (editor: NuiEditorBlockEditor): Command =>
  (state, dispatch) => {
    const { selection } = state;

    if (selection.kind !== 'text' || selection.anchor !== selection.head) {
      return false;
    }
    const $pos = state.doc.resolve(selection.head);
    const depth = $pos.depth - 1;
    const toggle = depth >= 1 ? $pos.node(depth) : undefined;

    if (
      toggle?.type !== 'toggle' ||
      $pos.indexAt(depth) !== 0 ||
      $pos.pos !== $pos.end($pos.depth) ||
      editor.element(toggle.id)?.classList.contains(OPEN_CLASS) !== false
    ) {
      return false;
    }
    const at = $pos.after(depth);
    const tr = state.tr;

    tr.insert(at, [state.doc.schema.element('paragraph', { id: tr.newId() })]);
    tr.setSelection(textSelection(at + 1));
    dispatch?.(tr);
    return true;
  };
