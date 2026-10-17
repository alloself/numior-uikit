import { inputSource } from '../commands/input';
import type { InputSource } from '../state/input.types';
import type { EditorState, Transaction } from '../state/state.types';
import { coordsAtPos, posAtCoords } from './coords';
import { blockDecorations, changedBlocks, decorationSets, sameSets } from './decorate';
import { createRootDesc, redrawContent, syncElement, widgetAround, type ViewContext } from './desc';
import { createDomWatch } from './dom-change';
import type { ViewHost } from './host.types';
import { attachInput, runIntent } from './input';
import { domAtPos, posAtDOM } from './positions';
import { ALL_CLASS, createSelectionSync } from './selection-sync';
import type { ChunkSet } from './chunks';
import type { ChunkWatch, EditorView, EditorViewOptions } from './view.types';
import { placeWidgets } from './widgets';

const ROOT_ATTRS = ['contenteditable', 'role', 'aria-multiline', 'translate'] as const;

const prepareRoot = (root: HTMLElement, editable: boolean): void => {
  root.setAttribute('contenteditable', editable ? 'true' : 'false');
  root.setAttribute('role', 'textbox');
  root.setAttribute('aria-multiline', 'true');
  root.setAttribute('translate', 'no');
  root.style.setProperty('white-space', 'pre-wrap');
  root.style.setProperty('overflow-wrap', 'break-word');
};

const noWidget = (): undefined => undefined;

const chunkSet = (watch: ChunkWatch | undefined): ChunkSet => {
  const known = new WeakSet<Node>();

  return {
    has: (node) => known.has(node),
    add: (chunk) => {
      known.add(chunk);
      watch?.added(chunk);
    },
    drop: (chunk) => {
      known.delete(chunk);
      watch?.removed(chunk);
    },
  };
};

const releaseRoot = (root: HTMLElement): void => {
  root.replaceChildren();
  for (const name of ROOT_ATTRS) {
    root.removeAttribute(name);
  }
  root.style.removeProperty('white-space');
  root.style.removeProperty('overflow-wrap');
};

export const createEditorView = (root: HTMLElement, options: EditorViewOptions): EditorView => {
  let state = options.state;
  let composing = false;

  let sets = decorationSets(state);

  const context: ViewContext = {
    document: root.ownerDocument,
    schema: state.doc.schema,
    descs: new WeakMap(),
    byId: new Map(),
    chunks: chunkSet(options.chunks),
    nodeViews: options.nodeViews ?? {},
    widget: options.widget ?? noWidget,
    widgets: new WeakSet(),
    placed: new Map(),
    redraw: new Set(),
    decorations: blockDecorations(state, sets),
  };

  prepareRoot(root, options.editable ?? true);

  const rootDesc = createRootDesc(context, root, state.doc.root);

  placeWidgets(context, state, sets);

  const dispatch = (tr: Transaction, source?: InputSource): void => {
    if (source !== undefined) {
      tr.setMeta(inputSource, source);
    }
    if (options.dispatch === undefined) {
      update(state.apply(tr));
    } else {
      options.dispatch(tr);
    }
  };

  const host: ViewHost = {
    root,
    context,
    rootDesc,
    state: () => state,
    dispatch,
    composing: () => composing,
  };

  const sync = createSelectionSync(host);

  const watch = createDomWatch(
    host,
    (intent) => {
      runIntent(host, intent);
    },
    () => {
      placeWidgets(context, state, sets);
    },
  );

  const update = (next: EditorState): void => {
    if (next.doc.schema !== context.schema) {
      throw new RangeError('The view renders one schema; create a new view for another');
    }
    const before = context.decorations;
    const nextSets = composing ? sets : decorationSets(next);
    const after = sameSets(nextSets, sets) ? before : blockDecorations(next, nextSets);

    sets = nextSets;
    context.decorations = after;
    for (const id of changedBlocks(before, after)) {
      context.redraw.add(id);
    }
    syncElement(context, rootDesc, next.doc.root);
    for (const id of context.redraw) {
      const desc = context.byId.get(id);

      if (desc !== undefined) {
        redrawContent(context, desc);
      }
    }
    context.redraw.clear();
    state = next;
    placeWidgets(context, next, sets);
    watch.ignoreOwn();
    sync.mark();
    sync.write();
  };

  const detach = attachInput(host, {
    sync,
    watch,
    setComposing: (value) => {
      composing = value;
    },
  });

  sync.mark();

  return {
    dom: root,
    get state() {
      return state;
    },
    get composing() {
      return composing;
    },
    update,
    dispatch: (tr) => {
      dispatch(tr);
    },
    setEditable: (editable) => {
      root.setAttribute('contenteditable', editable ? 'true' : 'false');
    },
    focus: () => {
      root.focus({ preventScroll: true });
      sync.write();
    },
    hasFocus: () => root.ownerDocument.activeElement === root,
    posAtDOM: (node, offset) => posAtDOM(context, node, offset),
    domAtPos: (pos) => domAtPos(rootDesc, state.doc, pos),
    coordsAtPos: (pos) => coordsAtPos(host, pos),
    posAtCoords: (x, y) => posAtCoords(host, x, y),
    nodeDOM: (id) => context.byId.get(id)?.dom,
    inWidget: (target) => widgetAround(context, target),
    destroy: () => {
      root.classList.remove(ALL_CLASS);
      detach();
      watch.destroy();
      for (const desc of context.byId.values()) {
        desc.view?.destroy();
      }
      context.byId.clear();
      context.placed.clear();
      releaseRoot(root);
    },
  };
};
