import {
  ContentNodeKind,
  DocIssueKind,
  definePlugin,
  remoteChange,
  type DocIssue,
  type ElementNode,
} from '@numior/editor-core';
import {
  XmlElement,
  XmlFragment,
  type AbstractType,
  type Doc as YDoc,
  type Map as YMap,
  type YEvent,
} from 'yjs';
import { applyDocChange } from './doc-change';
import { documentOf, ID_ATTRIBUTE } from './from-yjs';
import { clientTag } from './order-key';
import { carryMoves } from './remote-moves';
import { isEntry, isInlineType, placeFrom, rootOf } from './read-tree';
import { createTreeIndex, ROOT_PARENT } from './tree-index';
import { writeTree } from './write-tree';
import {
  EntryField,
  RepairKind,
  type Place,
  type RepairTarget,
  type TreeStore,
  type YjsBinding,
  type YjsBindingOptions,
} from './yjs.types';

const NO_ROOT_ID = 'root';

const isRepairable = (issue: DocIssue): boolean =>
  issue.path.length > 0 &&
  (issue.kind === DocIssueKind.Content ||
    (issue.kind === DocIssueKind.Id && issue.reason === 'duplicate'));

const childById = (parent: XmlFragment, id: string): XmlElement | undefined =>
  parent
    .toArray()
    .findLast(
      (child): child is XmlElement =>
        child instanceof XmlElement && child.getAttribute(ID_ATTRIBUTE) === id,
    );

const forget = (store: TreeStore, element: XmlElement): void => {
  let current: unknown = element;

  while (current instanceof XmlElement) {
    store.known.delete(current);
    current = current.parent;
  }
};

const forgetInline = (store: TreeStore, target: AbstractType<unknown>): void => {
  if (target instanceof XmlElement) {
    forget(store, target);
    return;
  }
  if (!(target.parent instanceof XmlElement)) {
    return;
  }
  forget(store, target.parent);
};

const entryTarget = (store: TreeStore, child: ElementNode): RepairTarget | undefined =>
  isEntry(store.blocks.get(child.id)) ? { kind: RepairKind.Entry, node: child } : undefined;

const inlineTarget = (
  fragment: XmlFragment,
  child: ElementNode,
  owner: string,
): RepairTarget | undefined => {
  const element = childById(fragment, child.id);

  return element === undefined ? undefined : { kind: RepairKind.Inline, element, owner };
};

const fragmentAfter = (
  store: TreeStore,
  found: RepairTarget,
  child: ElementNode,
): XmlFragment | undefined => {
  if (found.kind === RepairKind.Inline) {
    return found.element;
  }

  const entry = store.blocks.get(child.id);

  return isEntry(entry) && isInlineType(store, child.type) ? entry : undefined;
};

const targetAt = (
  store: TreeStore,
  root: ElementNode,
  path: readonly number[],
): RepairTarget | undefined => {
  let model = root;
  let fragment: XmlFragment | undefined;
  let owner = ROOT_PARENT;
  let found: RepairTarget | undefined;

  for (const index of path) {
    const child = model.content[index];

    if (child?.kind !== ContentNodeKind.Element) {
      return undefined;
    }

    found =
      fragment === undefined ? entryTarget(store, child) : inlineTarget(fragment, child, owner);

    if (found === undefined) {
      return undefined;
    }
    owner = found.kind === RepairKind.Entry ? child.id : owner;
    fragment = fragmentAfter(store, found, child);
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

export const yjsBinding = (
  ydoc: YDoc,
  blocks: YMap<unknown>,
  options: YjsBindingOptions,
): YjsBinding => {
  const { schema, getState, dispatch, onInvalid } = options;
  const tag = clientTag(ydoc.clientID);
  const origin = Symbol('nui-yjs');
  const broken = new Set<string>();

  const store: TreeStore = {
    schema,
    blocks,
    index: createTreeIndex(),
    cache: new Map(),
    stale: new Set(),
    known: new WeakMap(),
    owners: new WeakMap(),
  };

  let applying = false;
  let unread = false;

  const mark = (id: string | undefined): void => {
    let current = id;

    while (current !== undefined && !store.stale.has(current)) {
      store.stale.add(current);
      current = current === ROOT_PARENT ? undefined : store.index.placeOf(current)?.parent;
    }
  };

  const placeOfEntry = (id: string, entry: unknown): Place | undefined => {
    const place = isEntry(entry) ? placeFrom(entry.getAttribute(EntryField.Place)) : undefined;

    if (isEntry(entry) && place === undefined) {
      broken.add(id);
      return undefined;
    }
    broken.delete(id);
    return place;
  };

  const ownerOf = (target: AbstractType<unknown>): string | undefined => {
    let current: AbstractType<unknown> | null = target;

    while (current !== null && current.parent !== blocks) {
      current = current.parent;
    }
    return current === null ? undefined : store.owners.get(current);
  };

  const noteEntries = (
    ids: Iterable<string>,
    places: Map<string, Place | undefined>,
    changed: Set<string>,
  ): void => {
    for (const id of ids) {
      const entry = blocks.get(id);

      places.set(id, placeOfEntry(id, entry));

      if (!isEntry(entry)) {
        store.cache.delete(id);
        store.stale.delete(id);
        continue;
      }
      store.owners.set(entry, id);
      changed.add(id);
    }
  };

  const settle = (
    places: ReadonlyMap<string, Place | undefined>,
    changed: Iterable<string>,
  ): void => {
    for (const parent of store.index.update(places)) {
      mark(parent);
    }
    for (const id of changed) {
      mark(id);
    }
  };

  const note = (events: readonly YEvent<AbstractType<unknown>>[]): ReadonlySet<string> => {
    const places = new Map<string, Place | undefined>();
    const changed = new Set<string>();

    for (const event of events) {
      const { target } = event;

      if (target === blocks) {
        noteEntries(event.keys.keys(), places, changed);
        continue;
      }
      forgetInline(store, target);

      const id = ownerOf(target);

      if (id === undefined) {
        continue;
      }
      changed.add(id);

      if (target.parent !== blocks || !event.keys.has(EntryField.Place)) {
        continue;
      }
      places.set(id, placeOfEntry(id, target));
    }
    settle(places, changed);
    return new Set(Array.from(places.keys()).filter((id) => places.get(id) !== undefined));
  };

  const removeTarget = (target: RepairTarget): void => {
    if (target.kind === RepairKind.Inline) {
      const parent = target.element.parent;

      forget(store, target.element);
      mark(target.owner);

      if (!(parent instanceof XmlFragment)) {
        return;
      }
      parent.delete(parent.toArray().indexOf(target.element), 1);
      return;
    }

    const removed = new Map<string, Place | undefined>();

    for (const id of entryIds(target.node)) {
      blocks.delete(id);
      store.cache.delete(id);
      store.stale.delete(id);
      removed.set(id, undefined);
    }
    settle(removed, []);
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

  const validRoot = (shell: ElementNode): ElementNode | undefined => {
    let root = broken.size > 0 ? undefined : rootOf(store, shell);

    while (root !== undefined && !schema.check(root).ok) {
      root = repaired(root) ? rootOf(store, shell) : undefined;
    }
    return root;
  };

  const pull = (moved: ReadonlySet<string>): void => {
    const state = getState();

    if (state === undefined) {
      return;
    }

    const root = validRoot(state.doc.root);

    unread = root === undefined;

    if (root === undefined) {
      onInvalid?.();
      return;
    }

    const carried = carryMoves(state.tr, root, moved);

    const tr = applyDocChange(carried, carried.doc.root, root, (text, marks) =>
      schema.text(text, marks),
    ).setMeta(remoteChange, true);

    if (!tr.changed) {
      return;
    }

    applying = true;
    dispatch(tr);
    applying = false;
  };

  const observer: Parameters<YMap<unknown>['observeDeep']>[0] = (events, transaction) => {
    if (transaction.origin === origin) {
      return;
    }
    pull(note(events));
  };

  const write = (root: ElementNode): void => {
    ydoc.transact(() => {
      writeTree(store, root, tag);
    }, origin);
  };

  const scan = (): void => {
    const places = new Map<string, Place | undefined>();

    noteEntries(Array.from(blocks.keys()), places, new Set());
    store.index.update(places);
  };

  scan();
  blocks.observeDeep(observer);

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
      if (blocks.size === 0) {
        return undefined;
      }

      const root = validRoot(schema.element(schema.top.name, { id: NO_ROOT_ID }));

      return root === undefined ? undefined : documentOf(schema, root);
    },
    seed: (doc) => {
      write(doc.root);
    },
    destroy: () => {
      blocks.unobserveDeep(observer);
    },
  };
};
