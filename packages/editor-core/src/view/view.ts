import { inputSource } from '../commands/input';
import type { InputSource } from '../state/input.types';
import type { ElementNode } from '../model/node.types';
import type { EditorState, Transaction } from '../state/state.types';
import { coordsAtPos, posAtCoords } from './coords';
import { blockDecorations, changedBlocks, decorationSets, sameSets } from './decorate';
import {
  createRootDesc,
  freshen,
  redrawContent,
  syncElement,
  syncRootPrefix,
  widgetAround,
  type RootFill,
  type ViewContext,
} from './desc';
import { createDomWatch } from './dom-change';
import type { ViewHost } from './host.types';
import { attachInput, runIntent } from './input';
import { domAtPos, posAtDOM } from './positions';
import { ALL_CLASS, createSelectionSync } from './selection-sync';
import type { ChunkSet } from './chunks';
import { DescKind, type ChunkWatch, type EditorView, type EditorViewOptions } from './view.types';
import { placeWidgets } from './widgets';

interface Sight {
  observe(chunk: HTMLElement): void;
  unobserve(chunk: HTMLElement): void;
  visible(chunk: Node | null): boolean;
  disconnect(): void;
}

interface Filling {
  complete(): void;
  stop(): void;
  covers(index: number): boolean;
  prefix(node: ElementNode): number | undefined;
}

interface CatchUp {
  schedule(): void;
  all(): void;
  stop(): void;
}

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

const chunkSet = (watch: ChunkWatch | undefined, sight: Sight): ChunkSet => {
  const known = new WeakSet<Node>();

  return {
    has: (node) => known.has(node),
    add: (chunk) => {
      known.add(chunk);
      sight.observe(chunk);
      watch?.added(chunk);
    },
    drop: (chunk) => {
      known.delete(chunk);
      sight.unobserve(chunk);
      watch?.removed(chunk);
    },
  };
};

const SIGHT_MARGIN = '200% 0px';

const createSight = (shown: (chunk: Element) => void): Sight => {
  const hidden = new WeakSet<Node>();

  if (typeof IntersectionObserver !== 'function') {
    return {
      observe: () => undefined,
      unobserve: () => undefined,
      visible: () => true,
      disconnect: () => undefined,
    };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          hidden.delete(entry.target);
          shown(entry.target);
        } else {
          hidden.add(entry.target);
        }
      }
    },
    { rootMargin: SIGHT_MARGIN },
  );

  return {
    observe: (chunk) => {
      observer.observe(chunk);
    },
    unobserve: (chunk) => {
      observer.unobserve(chunk);
      hidden.delete(chunk);
    },
    visible: (chunk) => chunk === null || !hidden.has(chunk),
    disconnect: () => {
      observer.disconnect();
    },
  };
};

const FIRST_BLOCKS = 128;

const SLICE_BLOCKS = 32;

const SLICE_MS = 8;

const IDLE_TIMEOUT = 100;

const nextTask = (run: () => void): (() => void) => {
  if (typeof MessageChannel === 'undefined') {
    const id = setTimeout(run, 0);

    return () => clearTimeout(id);
  }

  const channel = new MessageChannel();
  let live = true;

  channel.port1.addEventListener(
    'message',
    () => {
      channel.port1.close();
      if (live) {
        run();
      }
    },
    { once: true },
  );

  channel.port1.start();
  channel.port2.postMessage(null);
  return () => {
    live = false;
    channel.port1.close();
  };
};

const idle = (run: (deadline?: IdleDeadline) => void): (() => void) => {
  if (typeof requestIdleCallback !== 'function') {
    return nextTask(run);
  }

  const id = requestIdleCallback(run, { timeout: IDLE_TIMEOUT });

  return () => cancelIdleCallback(id);
};

const createFilling = (
  root: HTMLElement,
  rest: RootFill | undefined,
  settle: () => void,
): Filling => {
  const spacer = root.ownerDocument.createElement('div');
  let cancel: (() => void) | undefined;

  const pending = (): boolean => rest !== undefined && rest.remaining > 0;

  const track = (): void => {
    spacer.style.setProperty('block-size', `${String(rest?.height ?? 0)}px`);
  };

  const finish = (): void => {
    cancel?.();
    cancel = undefined;
    spacer.remove();
  };

  const complete = (): void => {
    if (rest !== undefined && pending()) {
      rest.fill(rest.remaining);
      settle();
    }
    finish();
  };

  const slice = (deadline?: IdleDeadline): void => {
    const started = performance.now();

    const left = (): number =>
      Math.min(SLICE_MS - (performance.now() - started), deadline?.timeRemaining() ?? SLICE_MS);

    const continues = (): boolean => pending() && left() > 0;

    while (continues()) {
      rest?.fill(SLICE_BLOCKS);
    }
    track();
    settle();
    if (pending()) {
      cancel = idle(slice);
    } else {
      finish();
    }
  };

  if (pending()) {
    spacer.setAttribute('aria-hidden', 'true');
    root.after(spacer);
    track();
    cancel = idle(slice);
  }

  return {
    complete,
    stop: finish,
    covers: (index) => !pending() || index < (rest?.covered ?? 0),
    prefix: (node) => {
      if (rest === undefined || !pending()) {
        return undefined;
      }

      const end = rest.resume(node);

      if (end === undefined) {
        complete();
      }
      return end;
    },
  };
};

const JUMPS = new Set(['Home', 'End']);

const createCatchUp = (context: ViewContext, settle: () => void): CatchUp => {
  let cancel: (() => void) | undefined;

  const run = (left: () => number): void => {
    for (const desc of context.stale.keys()) {
      if (left() <= 0) {
        break;
      }
      freshen(context, desc);
    }
    settle();
  };

  const slice = (deadline?: IdleDeadline): void => {
    const started = performance.now();

    cancel = undefined;

    run(() =>
      Math.min(SLICE_MS - (performance.now() - started), deadline?.timeRemaining() ?? SLICE_MS),
    );

    if (context.stale.size > 0) {
      cancel = idle(slice);
    }
  };

  return {
    schedule: () => {
      if (cancel === undefined && context.stale.size > 0) {
        cancel = idle(slice);
      }
    },
    all: () => {
      cancel?.();
      cancel = undefined;
      if (context.stale.size > 0) {
        run(() => Number.POSITIVE_INFINITY);
      }
    },
    stop: () => {
      cancel?.();
      cancel = undefined;
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
  let holding = false;
  let acting = false;
  let editable = options.editable ?? true;

  let sets = decorationSets(state);

  const sight = createSight((chunk) => {
    freshenChunk(chunk);
  });

  const context: ViewContext = {
    document: root.ownerDocument,
    schema: state.doc.schema,
    descs: new WeakMap(),
    byId: new Map(),
    chunks: chunkSet(options.chunks, sight),
    nodeViews: options.nodeViews ?? {},
    widget: options.widget ?? noWidget,
    widgets: new WeakSet(),
    placed: new Map(),
    redraw: new Set(),
    stale: new Map(),
    visible: (desc) => sight.visible(desc.dom.parentNode),
    decorations: blockDecorations(state, sets),
  };

  const settle = (): void => {
    watch.ignoreOwn();
    placeWidgets(context, state, sets);
  };

  const freshenChunk = (chunk: Element): void => {
    let changed = false;

    for (const block of chunk.children) {
      const desc = context.descs.get(block);

      if (desc?.kind === DescKind.Element && context.stale.has(desc)) {
        freshen(context, desc);
        changed = true;
      }
    }
    if (changed) {
      settle();
    }
  };

  const catchUp = createCatchUp(context, settle);

  const onJump = (event: KeyboardEvent): void => {
    if ((event.ctrlKey || event.metaKey) && JUMPS.has(event.key)) {
      attaching.complete();
      catchUp.all();
    }
  };

  root.addEventListener('keydown', onJump, { capture: true });

  prepareRoot(root, editable);

  const { desc: rootDesc, rest } = createRootDesc(context, root, state.doc.root, FIRST_BLOCKS);
  const attaching = createFilling(root, rest, settle);

  placeWidgets(context, state, sets);

  const dispatch = (tr: Transaction, source?: InputSource): void => {
    const nested = acting;

    if (source !== undefined) {
      tr.setMeta(inputSource, source);
    }
    acting = true;

    try {
      if (options.dispatch === undefined) {
        update(state.apply(tr));
      } else {
        options.dispatch(tr);
      }
    } finally {
      acting = nested;
    }
  };

  const host: ViewHost = {
    root,
    context,
    rootDesc,
    state: () => state,
    dispatch: (tr, source) => {
      if (editable || !tr.changed) {
        dispatch(tr, source);
      }
    },
    composing: () => composing,
    holding: () => holding,
    fresh: (parent, index) => {
      if (parent === rootDesc && !attaching.covers(index)) {
        attaching.complete();
      }

      const child = parent.children[index];

      if (child?.kind === DescKind.Element && context.stale.has(child)) {
        freshen(context, child);
        watch.ignoreOwn();
      }
    },
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
    const end = next.doc.root === state.doc.root ? undefined : attaching.prefix(next.doc.root);
    const kept = !acting && sync.unread();

    if (next.doc.schema !== context.schema) {
      throw new RangeError('The view renders one schema; create a new view for another');
    }
    const before = context.decorations;
    const nextSets = composing ? sets : decorationSets(next);
    const after = sameSets(nextSets, sets) ? before : blockDecorations(next, nextSets);

    sets = nextSets;
    context.decorations = after;
    if (after !== before) {
      for (const id of changedBlocks(before, after)) {
        context.redraw.add(id);
      }
    }
    if (end === undefined) {
      syncElement(context, rootDesc, next.doc.root);
    } else {
      syncRootPrefix(context, rootDesc, next.doc.root, end);
    }
    for (const id of context.redraw) {
      const desc = context.byId.get(id);

      if (desc !== undefined && !context.stale.has(desc)) {
        redrawContent(context, desc);
        context.redraw.delete(id);
      }
    }
    const previous = state;

    state = next;
    placeWidgets(context, next, sets);
    watch.ignoreOwn();
    sync.mark();

    if (!kept) {
      sync.write();
    }
    catchUp.schedule();

    for (const plugin of next.plugins) {
      plugin.props.stateChanged?.(next, previous);
    }
  };

  const detach = attachInput(host, {
    sync,
    watch,
    setComposing: (value) => {
      composing = value;
    },
    setHolding: (value) => {
      holding = value;
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
    setEditable: (value) => {
      editable = value;
      root.setAttribute('contenteditable', value ? 'true' : 'false');
    },
    focus: () => {
      root.focus({ preventScroll: true });
      sync.write();
    },
    hasFocus: () => root.ownerDocument.activeElement === root,
    posAtDOM: (node, offset) => posAtDOM(context, node, offset),
    domAtPos: (pos) => domAtPos(rootDesc, state.doc, pos, host.fresh),
    coordsAtPos: (pos) => coordsAtPos(host, pos),
    posAtCoords: (x, y) => posAtCoords(host, x, y),
    nodeDOM: (id) => context.byId.get(id)?.dom,
    inWidget: (target) => widgetAround(context, target),
    destroy: () => {
      attaching.stop();
      catchUp.stop();
      sight.disconnect();
      root.removeEventListener('keydown', onJump, { capture: true });
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
