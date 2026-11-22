import {
  ContentNodeKind,
  type Attrs,
  type ContentNode,
  type ElementNode,
} from '@numior/editor-core';
import { XmlElement } from 'yjs';
import { keysBetween } from './order-key';
import { isEntry, isInlineType, placeCode } from './read-tree';
import { risingRun } from './rising-run';
import { syncChildren } from './to-yjs';
import { ROOT_PARENT } from './tree-index';
import { EntryField, type Place, type TreeStore } from './yjs.types';

interface Writing {
  readonly store: TreeStore;
  readonly tag: string;
  readonly clock: number;
  readonly placed: Set<string>;
  readonly left: Map<string, ElementNode>;
  readonly changes: Map<string, Place | undefined>;
}

const BLOCK_NAME = 'block';

const elementsOf = (content: readonly ContentNode[]): readonly ElementNode[] =>
  content.reduce<ElementNode[]>((elements, node) => {
    if (node.kind === ContentNodeKind.Element) {
      elements.push(node);
    }
    return elements;
  }, []);

const keptKey = (store: TreeStore, id: string, parent: string): string | undefined => {
  const raw = store.index.rawOf(id);

  return raw?.parent === parent && !store.index.overrides().has(id) ? raw.key : undefined;
};

const writePlace = (
  writing: Writing,
  entry: XmlElement,
  id: string,
  parent: string,
  key: string,
): void => {
  const before = writing.store.index.placeOf(id);
  const { clock } = writing;

  const place: Place =
    before === undefined
      ? { parent, key, clock }
      : { parent, key, clock, from: { parent: before.parent, key: before.key } };

  entry.setAttribute(EntryField.Place, placeCode(place));
  writing.changes.set(id, place);
};

const isOwnField = (key: string): boolean => key.startsWith('nui:');

const syncAttrs = (entry: XmlElement, attrs: Attrs): void => {
  for (const key of Object.keys(entry.getAttributes())) {
    if (isOwnField(key) || Object.hasOwn(attrs, key)) {
      continue;
    }
    entry.removeAttribute(key);
  }
  for (const [key, value] of Object.entries(attrs)) {
    const encoded = JSON.stringify(value);

    if (entry.getAttribute(key) === encoded) {
      continue;
    }
    entry.setAttribute(key, encoded);
  }
};

const fillContent = (
  writing: Writing,
  entry: XmlElement,
  node: ElementNode,
  previous: readonly ContentNode[],
): void => {
  if (isInlineType(writing.store, node.type)) {
    syncChildren(writing.store.known, entry, node.content);
    return;
  }
  syncContainer(writing, node.id, node.content, previous);
};

const createEntry = (writing: Writing, node: ElementNode, parent: string, key: string): void => {
  const entry = new XmlElement(BLOCK_NAME);

  writing.store.blocks.set(node.id, entry);
  entry.setAttribute(EntryField.Type, node.type);
  syncAttrs(entry, node.attrs);
  writePlace(writing, entry, node.id, parent, key);
  fillContent(writing, entry, node, []);
  writing.store.cache.set(node.id, node);
};

const retyped = (
  writing: Writing,
  entry: XmlElement,
  node: ElementNode,
  previous: ElementNode | undefined,
): readonly ContentNode[] => {
  const type = entry.getAttribute(EntryField.Type);

  if (type === node.type) {
    return previous?.content ?? [];
  }

  const wasInline = typeof type === 'string' && isInlineType(writing.store, type);

  entry.setAttribute(EntryField.Type, node.type);

  if (wasInline === isInlineType(writing.store, node.type)) {
    return previous?.content ?? [];
  }
  if (wasInline) {
    entry.delete(0, entry.length);
    return [];
  }
  for (const kid of elementsOf(previous?.content ?? [])) {
    writing.left.set(kid.id, kid);
  }
  return [];
};

const syncEntry = (writing: Writing, node: ElementNode, parent: string, key: string): void => {
  const entry = writing.store.blocks.get(node.id);

  if (!isEntry(entry)) {
    createEntry(writing, node, parent, key);
    return;
  }
  if (keptKey(writing.store, node.id, parent) !== key) {
    writePlace(writing, entry, node.id, parent, key);
  }

  const previous = writing.store.cache.get(node.id);

  if (previous === node) {
    return;
  }

  const content = retyped(writing, entry, node, previous);

  syncAttrs(entry, node.attrs);
  fillContent(writing, entry, node, content);
  writing.store.cache.set(node.id, node);
};

const placeRun = (
  writing: Writing,
  parent: string,
  run: readonly ElementNode[],
  before: string | undefined,
  after: string | undefined,
): void => {
  const keys = keysBetween(before, after, run.length, writing.tag);

  run.forEach((node, at) => {
    const key = keys[at];

    if (key === undefined) {
      return;
    }
    writing.placed.add(node.id);
    syncEntry(writing, node, parent, key);
  });
};

const sameOrder = (
  next: readonly ElementNode[],
  previous: readonly ElementNode[],
  keys: readonly (string | undefined)[],
): boolean =>
  next.length === previous.length &&
  next.every((node, at) => node.id === previous[at]?.id && keys[at] !== undefined);

const anchorsOf = (
  writing: Writing,
  next: readonly ElementNode[],
  previous: readonly ElementNode[],
  keys: readonly (string | undefined)[],
): ReadonlyMap<string, string> => {
  const position = new Map(next.map((node, at) => [node.id, at]));

  const targets = previous.map((node, at) =>
    keys[at] === undefined ? -1 : (position.get(node.id) ?? -1),
  );

  const kept = risingRun(targets);
  const anchors = new Map<string, string>();

  previous.forEach((node, at) => {
    const key = keys[at];

    if (kept.has(at) && key !== undefined) {
      anchors.set(node.id, key);
      return;
    }
    if (position.has(node.id)) {
      return;
    }
    writing.left.set(node.id, node);
  });

  return anchors;
};

const syncContainer = (
  writing: Writing,
  parent: string,
  content: readonly ContentNode[],
  previousContent: readonly ContentNode[],
): void => {
  const next = elementsOf(content);
  const previous = elementsOf(previousContent);
  const keys = previous.map((node) => keptKey(writing.store, node.id, parent));

  if (sameOrder(next, previous, keys)) {
    next.forEach((node, at) => {
      const key = keys[at];

      if (key === undefined) {
        return;
      }
      syncEntry(writing, node, parent, key);
    });

    return;
  }

  const anchors = anchorsOf(writing, next, previous, keys);
  let run: ElementNode[] = [];
  let before: string | undefined;

  for (const node of next) {
    const anchor = anchors.get(node.id);

    if (anchor === undefined) {
      run.push(node);
      continue;
    }
    placeRun(writing, parent, run, before, anchor);
    run = [];
    before = anchor;
    syncEntry(writing, node, parent, anchor);
  }
  placeRun(writing, parent, run, before, undefined);
};

const dropLeft = (writing: Writing, node: ElementNode): void => {
  if (writing.placed.has(node.id)) {
    return;
  }

  const { store } = writing;

  store.blocks.delete(node.id);
  store.cache.delete(node.id);
  store.stale.delete(node.id);
  writing.changes.set(node.id, undefined);

  if (isInlineType(store, node.type)) {
    return;
  }
  for (const kid of elementsOf(node.content)) {
    dropLeft(writing, kid);
  }
};

const settleOverrides = (writing: Writing): void => {
  for (const [id, place] of writing.store.index.overrides()) {
    const entry = writing.store.blocks.get(id);

    if (!isEntry(entry)) {
      continue;
    }
    writePlace(writing, entry, id, place.parent, place.key);
  }
};

export const writeTree = (store: TreeStore, root: ElementNode, tag: string): void => {
  const writing: Writing = {
    store,
    tag,
    clock: store.index.clock() + 1,
    placed: new Set(),
    left: new Map(),
    changes: new Map(),
  };

  settleOverrides(writing);
  syncContainer(writing, ROOT_PARENT, root.content, store.cache.get(ROOT_PARENT)?.content ?? []);

  for (const node of writing.left.values()) {
    dropLeft(writing, node);
  }

  store.cache.set(ROOT_PARENT, root);
  store.index.update(writing.changes);
};
