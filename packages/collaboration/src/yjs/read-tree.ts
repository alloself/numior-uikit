import {
  ContentNodeKind,
  nodeSize,
  sameAttrs,
  type Attrs,
  type ContentNode,
  type ElementNode,
} from '@numior/editor-core';
import { Array as YArray } from 'yjs';
import {
  entryType,
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
import {
  EntryField,
  Skipped,
  type Entry,
  type Fields,
  type ReadBlock,
  type TreeStore,
} from './yjs.types';

interface Reading {
  readonly store: TreeStore;
  readonly full: boolean;
  readonly kids: ReadonlyMap<string, readonly string[]>;
}

interface Block {
  readonly id: string;
  readonly entry: Entry;
  readonly type: string;
  readonly fields: Fields;
}

const WIDE = 64;

const NEAR = 4;

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
  block: Block,
  cached: ElementNode | undefined,
): readonly ContentNode[] | undefined => {
  const { id, entry, type, fields } = block;

  if (isLine(entry)) {
    return lineContent(reading.store, entry);
  }
  if (!holdsChildren(reading.store.schema, type)) {
    return [];
  }

  const list = fields[EntryField.Children];

  return childrenOf(reading, id, list instanceof YArray ? list : undefined, cached);
};

const idOf = (node: ContentNode | undefined): string | undefined =>
  node?.kind === ContentNodeKind.Element ? node.id : undefined;

const placeOf = (store: TreeStore, parent: string, cached: ElementNode, id: string): number => {
  const hint = store.places.get(parent);

  if (hint !== undefined && idOf(cached.content[hint]) === id) {
    return hint;
  }
  return cached.content.findIndex((child) => idOf(child) === id);
};

const patchedNode = (
  reading: Reading,
  parent: string,
  cached: ElementNode,
): ElementNode | undefined => {
  const kids = reading.kids.get(parent) ?? [];

  if (cached.content.length < WIDE || kids.length === 0 || kids.length > NEAR) {
    return undefined;
  }

  const content = cached.content.slice();
  let size = cached.size;

  for (const id of kids) {
    const at = placeOf(reading.store, parent, cached, id);
    const old = content[at];
    const node = old === undefined ? undefined : readBlock(reading, id, parent);

    if (old === undefined || node === undefined || node === Skipped) {
      return undefined;
    }
    content[at] = node;
    size += node.size - nodeSize(old);
    reading.store.places.set(parent, at);
  }
  return { ...cached, content, size };
};

const patchedHolder = (
  reading: Reading,
  block: Block,
  cached: ElementNode | undefined,
  attrs: Attrs,
): ElementNode | undefined =>
  cached === undefined ||
  reading.full ||
  cached.type !== block.type ||
  !sameAttrs(cached.attrs, attrs) ||
  !holdsChildren(reading.store.schema, block.type)
    ? undefined
    : patchedNode(reading, block.id, cached);

const kept = (store: TreeStore, id: string, node: ElementNode): ElementNode => {
  store.cache.set(id, node);
  store.stale.delete(id);
  return node;
};

const blockOf = (store: TreeStore, id: string, entry: Entry): Block | undefined => {
  const fields = fieldsOf(entry);
  const type = entryType(store, entry, fields);

  return typeof type === 'string' &&
    store.schema.nodes.has(type) &&
    fits(entry, kindOf(store.schema, type))
    ? { id, entry, type, fields }
    : undefined;
};

const nodeOf = (reading: Reading, id: string, entry: Entry): ElementNode | undefined => {
  const { store } = reading;
  const cached = store.cache.get(id);
  const fresh = cached !== undefined && !store.stale.has(id);

  if (fresh && !(reading.full && isHolder(entry))) {
    return cached;
  }

  const block = blockOf(store, id, entry);
  const attrs = block === undefined ? undefined : encodedAttrs(block.fields);

  if (block === undefined || attrs === undefined) {
    return undefined;
  }

  const patched = patchedHolder(reading, block, cached, attrs);

  if (patched !== undefined) {
    return kept(store, id, patched);
  }

  const content = contentOf(reading, block, cached);

  if (content === undefined) {
    return undefined;
  }
  if (fresh && sameChildren(cached.content, content)) {
    return cached;
  }
  return kept(store, id, store.schema.element(block.type, { id, attrs, content }));
};

const freshLeaf = (store: TreeStore, id: string): ElementNode | undefined => {
  const cached = store.cache.get(id);

  return cached === undefined || store.stale.has(id) || holdsChildren(store.schema, cached.type)
    ? undefined
    : cached;
};

const skipped = (
  store: TreeStore,
  parent: string,
  repeated: boolean,
  id: string | undefined,
): typeof Skipped => {
  if (id !== undefined && !repeated) {
    store.shifted.add(parent);
    return Skipped;
  }
  store.loose.add(parent);

  if (repeated) {
    store.copies.add(parent);
  }
  return Skipped;
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
    return skipped(store, parent, repeated, id);
  }
  if (!isEntry(entry)) {
    return undefined;
  }
  store.parents.set(id, parent);
  return nodeOf(reading, id, entry);
};

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

  if (unreached.size === 0) {
    return true;
  }

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

  if (content === undefined || !reading.full) {
    return content;
  }
  return rescued(reading, content) ? content : undefined;
};

const kidsOf = (store: TreeStore): ReadonlyMap<string, readonly string[]> => {
  const kids = new Map<string, string[]>();

  for (const id of store.stale) {
    if (id === ROOT_PARENT) {
      continue;
    }

    const parent = store.parents.get(id) ?? ROOT_PARENT;
    const listed = kids.get(parent);

    if (listed === undefined) {
      kids.set(parent, [id]);
      continue;
    }
    listed.push(id);
  }
  return kids;
};

const cleared = (store: TreeStore): ReadonlyMap<string, readonly string[]> => {
  store.parents.clear();
  store.loose.clear();
  store.shifted.clear();
  store.copies.clear();
  store.places.clear();
  return new Map();
};

const patchedRoot = (reading: Reading, shell: ElementNode): ElementNode | undefined => {
  const cached = reading.store.cache.get(ROOT_PARENT);

  return reading.full ||
    cached === undefined ||
    cached.id !== shell.id ||
    cached.type !== shell.type ||
    !reading.store.stale.has(ROOT_PARENT)
    ? undefined
    : patchedNode(reading, ROOT_PARENT, cached);
};

export const rootOf = (
  store: TreeStore,
  shell: ElementNode,
  full: boolean,
): ElementNode | undefined => {
  const reading: Reading = { store, full, kids: full ? cleared(store) : kidsOf(store) };
  const patched = patchedRoot(reading, shell);

  if (patched !== undefined) {
    return kept(store, ROOT_PARENT, patched);
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

  return kept(store, ROOT_PARENT, root);
};
