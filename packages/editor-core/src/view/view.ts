import { createBlockSizes } from './block-sizes';
import { createRootDesc, syncElement, type ViewContext } from './desc';
import { domAtPos, posAtDOM } from './positions';
import type { EditorView, EditorViewOptions } from './view.types';

const ROOT_ATTRS = ['contenteditable', 'role', 'aria-multiline'] as const;

export const createEditorView = (root: HTMLElement, options: EditorViewOptions): EditorView => {
  let state = options.state;

  const context: ViewContext = {
    document: root.ownerDocument,
    schema: state.doc.schema,
    descs: new WeakMap(),
    byId: new Map(),
    blocks: createBlockSizes(),
  };

  const setEditable = (editable: boolean): void => {
    root.setAttribute('contenteditable', editable ? 'true' : 'false');
  };

  setEditable(options.editable ?? true);
  root.setAttribute('role', 'textbox');
  root.setAttribute('aria-multiline', 'true');
  root.style.setProperty('white-space', 'pre-wrap');
  root.style.setProperty('overflow-wrap', 'break-word');

  const rootDesc = createRootDesc(context, root, state.doc.root);

  return {
    dom: root,
    get state() {
      return state;
    },
    update: (next) => {
      if (next.doc.schema !== context.schema) {
        throw new RangeError('The view renders one schema; create a new view for another');
      }
      syncElement(context, rootDesc, next.doc.root);
      state = next;
    },
    setEditable,
    posAtDOM: (node, offset) => posAtDOM(context, node, offset),
    domAtPos: (pos) => domAtPos(rootDesc, state.doc, pos),
    nodeDOM: (id) => context.byId.get(id)?.dom,
    destroy: () => {
      context.blocks.destroy();
      context.byId.clear();
      root.replaceChildren();
      for (const name of ROOT_ATTRS) {
        root.removeAttribute(name);
      }
      root.style.removeProperty('white-space');
      root.style.removeProperty('overflow-wrap');
    },
  };
};
