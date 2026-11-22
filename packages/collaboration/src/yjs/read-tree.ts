import { ContentNodeKind, type ContentNode, type ElementNode } from '@numior/editor-core';
import type { Array as YArray } from 'yjs';
import {
  fieldsOf,
  fits,
  holdsChildren,
  isEntry,
  isHolder,
  isLine,
  kindOf,
  listIn,
  ROOT_PARENT,
} from './entries';
import { lineContent } from './line';
import { encodedAttrs } from './values';
import { EntryField, Skipped, type Entry, type ReadBlock, type TreeStore } from './yjs.types';

interface Reading {
  readonly store: TreeStore;
  readonly full: boolean;
}

const sameChildren = (content: readonly ContentNode[], children: readonly ContentNode[]): boolean =>
  content.length === children.length && content.every((node, at) => node === children[at]);

const elementsOf = (content: readonly ContentNode[]): readonly ElementNode[] =>
  content.reduce<ElementNode[]>((elements, node) => {
    if (node.kind === ContentNodeKind.Element) {
      elements.push(node);
    }
    return elements;
  }, []);

const listedChildren = (
  reading: Reading,
  parent: string,
  list: YArray<unknown>,
): ElementNode[] | undefined => {
  const children: ElementNode[] = [];

  for (const item of list.toArray()) {
    const node = readBlock(reading, item, parent);

    if (node === undefined) {
      return undefined;
    }
    if (node === Skipped) {
      continue;
    }
    children.push(node);
  }
  return children;
};

const knownChildren = (
  reading: Reading,
  parent: string,
  cached: ElementNode,
): ElementNode[] | undefined => {
  const children: ElementNode[] = [];

  for (const child of elementsOf(cached.content)) {
    const node = reading.store.stale.has(child.id) ? readBlock(reading, child.id, parent) : child;

    if (node === undefined) {
      return undefined;
    }
    if (node === Skipped) {
      continue;
    }
    children.push(node);
  }
  return children;
};

const childrenOf = (
  reading: Reading,
  parent: string,
  list: YArray<unknown> | undefined,
  cached: ElementNode | undefined,
): ElementNode[] | undefined => {
  if (!reading.full && cached !== undefined) {
    return knownChildren(reading, parent, cached);
  }
  return list === undefined ? undefined : listedChildren(reading, parent, list);
};

const contentOf = (
  reading: Reading,
  id: string,
  entry: Entry,
  type: string,
  cached: ElementNode | undefined,
): readonly ContentNode[] | undefined => {
  if (isLine(entry)) {
    return lineContent(reading.store, entry);
  }
  return holdsChildren(reading.store.schema, type)
    ? childrenOf(reading, id, listIn(entry), cached)
    : [];
};

const nodeOf = (reading: Reading, id: string, entry: Entry): ElementNode | undefined => {
  const { store } = reading;
  const cached = store.cache.get(id);
  const fresh = cached !== undefined && !store.stale.has(id);

  if (fresh && !(reading.full && isHolder(entry))) {
    return cached;
  }

  const fields = fieldsOf(entry);
  const type = fields[EntryField.Type];

  if (
    typeof type !== 'string' ||
    !store.schema.nodes.has(type) ||
    !fits(entry, kindOf(store.schema, type))
  ) {
    return undefined;
  }

  const attrs = encodedAttrs(fields);
  const content = contentOf(reading, id, entry, type, cached);

  if (attrs === undefined || content === undefined) {
    return undefined;
  }
  if (fresh && sameChildren(cached.content, content)) {
    return cached;
  }

  const node = store.schema.element(type, { id, attrs, content });

  store.cache.set(id, node);
  store.stale.delete(id);
  return node;
};

const freshLeaf = (store: TreeStore, id: string): ElementNode | undefined => {
  const cached = store.cache.get(id);

  return cached === undefined || store.stale.has(id) || holdsChildren(store.schema, cached.type)
    ? undefined
    : cached;
};

const readBlock = (reading: Reading, item: unknown, parent: string): ReadBlock => {
  const { store } = reading;
  const id = typeof item === 'string' ? item : undefined;
  const repeated = reading.full && id !== undefined && store.parents.has(id);
  const leaf = id === undefined || repeated ? undefined : freshLeaf(store, id);

  if (id !== undefined && leaf !== undefined) {
    store.parents.set(id, parent);
    return leaf;
  }

  const entry = id === undefined || repeated ? undefined : store.blocks.get(id);

  if (id === undefined || entry === undefined) {
    store.loose.add(parent);

    if (repeated) {
      store.copies.add(parent);
    }
    return Skipped;
  }
  if (!isEntry(entry)) {
    return undefined;
  }
  store.parents.set(id, parent);
  return nodeOf(reading, id, entry);
};

const entryCount = (store: TreeStore): number => Array.from(store.blocks.keys()).length;

const unreachedOf = (store: TreeStore): ReadonlyMap<string, unknown> => {
  const unreached = new Map<string, unknown>();

  store.blocks.forEach((entry, id) => {
    if (store.parents.has(id)) {
      return;
    }
    unreached.set(id, entry);
  });

  return unreached;
};

const listedBy = (entries: ReadonlyMap<string, unknown>): ReadonlySet<string> => {
  const listed = new Set<string>();

  for (const entry of entries.values()) {
    for (const item of listIn(entry)?.toArray() ?? []) {
      if (typeof item !== 'string') {
        continue;
      }
      listed.add(item);
    }
  }
  return listed;
};

const rescued = (reading: Reading, content: ElementNode[]): boolean => {
  const { store } = reading;
  const unreached = unreachedOf(store);
  const listed = listedBy(unreached);
  const order = Array.from(unreached.keys()).toSorted();
  const tops = order.filter((id) => !listed.has(id));
  const holders = order.filter((id) => listIn(unreached.get(id)) !== undefined);

  for (const id of [...tops, ...holders, ...order]) {
    if (store.parents.has(id)) {
      continue;
    }

    const node = readBlock(reading, id, ROOT_PARENT);

    if (node === undefined) {
      return false;
    }
    if (node === Skipped) {
      continue;
    }
    content.push(node);
    store.loose.add(ROOT_PARENT);
  }
  return true;
};

const rootContent = (reading: Reading): ElementNode[] | undefined => {
  const { store } = reading;
  const cached = store.cache.get(ROOT_PARENT);
  const known = cached !== undefined && !store.stale.has(ROOT_PARENT);

  const content =
    known && !reading.full
      ? elementsOf(cached.content).slice()
      : childrenOf(reading, ROOT_PARENT, store.root, cached);

  if (content === undefined || !reading.full || store.parents.size === entryCount(store)) {
    return content;
  }
  return rescued(reading, content) ? content : undefined;
};

export const rootOf = (
  store: TreeStore,
  shell: ElementNode,
  full: boolean,
): ElementNode | undefined => {
  const reading: Reading = { store, full };

  if (full) {
    store.parents.clear();
    store.loose.clear();
    store.copies.clear();
  }

  const content = rootContent(reading);

  if (content === undefined) {
    return undefined;
  }

  const cached = store.cache.get(ROOT_PARENT);

  const root =
    cached !== undefined &&
    cached.id === shell.id &&
    cached.type === shell.type &&
    sameChildren(cached.content, content)
      ? cached
      : store.schema.element(shell.type, { id: shell.id, attrs: shell.attrs, content });

  store.cache.set(ROOT_PARENT, root);
  store.stale.delete(ROOT_PARENT);
  return root;
};
