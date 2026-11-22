import {
  ContentNodeKind,
  DocIssueKind,
  defaultTextblock,
  definePlugin,
  remoteChange,
  type DocIssue,
  type ElementNode,
} from '@numior/editor-core';
import {
  Array as YArray,
  XmlElement,
  XmlText,
  YMapEvent,
  type AbstractType,
  type Doc as YDoc,
  type Transaction as YTransaction,
  type YEvent,
} from 'yjs';
import { applyDocChange } from './doc-change';
import { isEntry, isLine, ROOT_PARENT } from './entries';
import { embedsOf } from './line';
import { rootOf } from './read-tree';
import { carryMoves } from './remote-moves';
import { documentOf, ID_ATTRIBUTE } from './values';
import { dropCopies, writeTree } from './write-tree';
import {
  RepairKind,
  type RepairTarget,
  type TreeStore,
  type YjsBinding,
  type YjsBindingOptions,
} from './yjs.types';

const NO_ROOT_ID = 'root';

const ORDER_SUFFIX = ':order';

const isRepairable = (issue: DocIssue): boolean =>
  issue.path.length > 0 &&
  (issue.kind === DocIssueKind.Content ||
    (issue.kind === DocIssueKind.Id && issue.reason === 'duplicate'));

const forget = (store: TreeStore, element: XmlElement): void => {
  let current: unknown = element;

  while (current instanceof XmlElement || current instanceof XmlText) {
    if (current instanceof XmlElement) {
      store.known.delete(current);
    }
    current = current.parent;
  }
};

const ownerOf = (event: YEvent<AbstractType<unknown>>): string | undefined => {
  const [head] = event.path;

  return typeof head === 'string' ? head : undefined;
};

const arrivalsOf = (
  store: TreeStore,
  event: { readonly changes: { readonly delta: readonly { readonly insert?: unknown }[] } },
  arrived: Set<string>,
): void => {
  if (store.cache.size === 0) {
    return;
  }
  for (const change of event.changes.delta) {
    const { insert } = change;

    if (!Array.isArray(insert)) {
      continue;
    }
    for (const item of insert) {
      if (typeof item !== 'string' || !store.cache.has(item)) {
        continue;
      }
      arrived.add(item);
    }
  }
};

const knownOf = (store: TreeStore, ids: ReadonlySet<string>): ReadonlySet<string> => {
  const known = new Set<string>();

  for (const id of ids) {
    if (!store.cache.has(id)) {
      continue;
    }
    known.add(id);
  }
  return known;
};

const entryTarget = (store: TreeStore, child: ElementNode): RepairTarget | undefined =>
  isEntry(store.blocks.get(child.id)) ? { kind: RepairKind.Entry, node: child } : undefined;

const inlineTarget = (
  line: XmlText,
  child: ElementNode,
  owner: string,
): RepairTarget | undefined => {
  const found = embedsOf(line).findLast(
    ({ element }) =>
      element.nodeName === child.type && element.getAttribute(ID_ATTRIBUTE) === child.id,
  );

  return found === undefined
    ? undefined
    : { kind: RepairKind.Inline, element: found.element, line, owner };
};

const lineAfter = (
  store: TreeStore,
  found: RepairTarget,
  child: ElementNode,
): XmlText | undefined => {
  if (found.kind === RepairKind.Inline) {
    const [first] = found.element.toArray();

    return first instanceof XmlText ? first : undefined;
  }

  const entry = store.blocks.get(child.id);

  return isLine(entry) ? entry : undefined;
};

const targetAt = (
  store: TreeStore,
  root: ElementNode,
  path: readonly number[],
): RepairTarget | undefined => {
  let model = root;
  let line: XmlText | undefined;
  let owner = ROOT_PARENT;
  let found: RepairTarget | undefined;

  for (const index of path) {
    const child = model.content[index];

    if (child?.kind !== ContentNodeKind.Element) {
      return undefined;
    }

    found = line === undefined ? entryTarget(store, child) : inlineTarget(line, child, owner);

    if (found === undefined) {
      return undefined;
    }
    owner = found.kind === RepairKind.Entry ? child.id : owner;
    line = lineAfter(store, found, child);
    model = child;
  }
  return found;
};

const entryIds = (node: ElementNode): readonly string[] =>
  node.content.reduce<string[]>(
    (ids, child) => {
      if (child.kind === ContentNodeKind.Element) {
        for (const id of entryIds(child)) {
          ids.push(id);
        }
      }
      return ids;
    },
    [node.id],
  );

export const yjsBinding = (ydoc: YDoc, name: string, options: YjsBindingOptions): YjsBinding => {
  const { schema, getState, dispatch, onInvalid } = options;
  const origin = Symbol('nui-yjs');
  const blocks = ydoc.getMap<unknown>(name);
  const order = ydoc.getArray<unknown>(`${name}${ORDER_SUFFIX}`);

  const store: TreeStore = {
    schema,
    blocks,
    plain: defaultTextblock(schema),
    root: order,
    known: new WeakMap(),
    cache: new Map(),
    stale: new Set(),
    parents: new Map(),
    loose: new Set(),
    copies: new Set(),
  };

  const arrived = new Set<string>();
  let pending = false;
  let structural = false;
  let applying = false;
  let unread = false;

  const mark = (id: string | undefined): void => {
    let current = id;

    while (current !== undefined && !store.stale.has(current)) {
      store.stale.add(current);
      current = current === ROOT_PARENT ? undefined : (store.parents.get(current) ?? ROOT_PARENT);
    }
  };

  const noteEntries = (ids: Iterable<string>): void => {
    if (store.cache.size === 0) {
      return;
    }
    for (const id of ids) {
      if (!store.cache.has(id)) {
        continue;
      }
      store.cache.delete(id);
      store.stale.delete(id);
      mark(store.parents.get(id) ?? ROOT_PARENT);
    }
  };

  const noteBlocks = (
    events: readonly YEvent<AbstractType<unknown>>[],
    transaction: YTransaction,
  ): void => {
    if (transaction.origin === origin) {
      return;
    }
    pending = true;

    for (const event of events) {
      const { target } = event;

      if (target === blocks) {
        structural = true;
        noteEntries(event instanceof YMapEvent ? event.keysChanged : event.keys.keys());
        continue;
      }
      if (target instanceof XmlElement) {
        forget(store, target);
      }
      if (target.parent instanceof XmlElement) {
        forget(store, target.parent);
      }

      const id = ownerOf(event);

      if (id === undefined) {
        continue;
      }
      if (target instanceof YArray) {
        structural = true;
        arrivalsOf(store, event, arrived);
      }
      mark(id);
    }
  };

  const noteOrder = (event: YEvent<YArray<unknown>>, transaction: YTransaction): void => {
    if (transaction.origin === origin) {
      return;
    }
    pending = true;
    structural = true;
    arrivalsOf(store, event, arrived);
    mark(ROOT_PARENT);
  };

  const removeTarget = (target: RepairTarget): void => {
    if (target.kind === RepairKind.Inline) {
      const at = embedsOf(target.line).find(({ element }) => element === target.element)?.at;

      forget(store, target.element);
      mark(target.owner);

      if (at === undefined) {
        return;
      }
      target.line.delete(at, 1);
      return;
    }

    for (const id of entryIds(target.node)) {
      blocks.delete(id);
      store.cache.delete(id);
      store.stale.delete(id);
    }
    mark(store.parents.get(target.node.id) ?? ROOT_PARENT);
  };

  const repaired = (root: ElementNode): boolean => {
    const check = schema.check(root);

    if (check.ok || !check.issues.every(isRepairable)) {
      return false;
    }

    const targets = check.issues.map((issue) => targetAt(store, root, issue.path));

    ydoc.transact(() => {
      for (const target of targets) {
        if (target === undefined) {
          continue;
        }
        removeTarget(target);
      }
    }, origin);

    return targets.some((target) => target !== undefined);
  };

  const validRoot = (shell: ElementNode, full: boolean): ElementNode | undefined => {
    let root = rootOf(store, shell, full);

    while (root !== undefined && !schema.check(root).ok) {
      root = repaired(root) ? rootOf(store, shell, true) : undefined;
    }
    return root;
  };

  const pull = (): void => {
    const state = getState();
    const full = structural;
    const moved = knownOf(store, arrived);

    structural = false;
    arrived.clear();

    if (state === undefined) {
      return;
    }

    const root = validRoot(state.doc.root, full || unread);

    unread = root === undefined;

    if (root === undefined) {
      onInvalid?.();
      return;
    }

    const carried = carryMoves(state.tr, root, moved);

    const tr = applyDocChange(carried, carried.doc.root, root, (text, marks) =>
      schema.text(text, marks),
    ).setMeta(remoteChange, true);

    if (tr.changed) {
      applying = true;
      dispatch(tr);
      applying = false;
    }
    if (store.copies.size === 0) {
      return;
    }

    ydoc.transact(() => {
      dropCopies(store);
    }, origin);
  };

  const flush = (transaction: YTransaction): void => {
    if (!pending) {
      return;
    }
    pending = false;

    if (transaction.origin === origin) {
      return;
    }
    pull();
  };

  const write = (root: ElementNode): void => {
    ydoc.transact(() => {
      writeTree(store, root);
    }, origin);
  };

  blocks.observeDeep(noteBlocks);
  order.observe(noteOrder);
  ydoc.on('afterTransaction', flush);

  return {
    plugin: definePlugin({
      name: 'yjsBinding',
      props: {
        stateChanged: (state, before) => {
          if (state.doc === before.doc || applying || unread) {
            return;
          }

          write(state.doc.root);
        },
      },
    }),
    read: () => {
      if (blocks.size === 0 && order.length === 0) {
        return undefined;
      }

      const root = validRoot(schema.element(schema.top.name, { id: NO_ROOT_ID }), true);

      return root === undefined ? undefined : documentOf(schema, root);
    },
    seed: (doc) => {
      write(doc.root);
    },
    destroy: () => {
      blocks.unobserveDeep(noteBlocks);
      order.unobserve(noteOrder);
      ydoc.off('afterTransaction', flush);
    },
  };
};
