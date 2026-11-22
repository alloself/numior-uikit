import { ContentNodeKind, type ContentNode, type ElementNode } from '@numior/editor-core';
import { Array as YArray, Map as YMap, XmlText } from 'yjs';
import {
  fits,
  holdsChildren,
  isLine,
  kindOf,
  listIn,
  listOf,
  ROOT_PARENT,
  writeAttrs,
  writeType,
} from './entries';
import { commonRun } from './common-run';
import { writeLine } from './line';
import { risingRun } from './rising-run';
import { EntryField, EntryKind, type Entry, type TreeStore } from './yjs.types';

interface Window {
  readonly start: number;
  readonly end: number;
}

interface Left {
  readonly node: ElementNode;
  readonly from: string;
}

interface Writing {
  readonly store: TreeStore;
  readonly left: Map<string, Left>;
}

const elementsOf = (content: readonly ContentNode[]): readonly ElementNode[] =>
  content.reduce<ElementNode[]>((elements, node) => {
    if (node.kind === ContentNodeKind.Element) {
      elements.push(node);
    }
    return elements;
  }, []);

const sameIds = (next: readonly ElementNode[], previous: readonly ElementNode[]): boolean =>
  next.length === previous.length && next.every((node, at) => node.id === previous[at]?.id);

const removeOthers = (
  list: YArray<unknown>,
  start: number,
  kept: ReadonlySet<number>,
  count: number,
): void => {
  let end = count;

  for (let index = count - 1; index >= -1; index -= 1) {
    if (index >= 0 && !kept.has(index)) {
      continue;
    }
    if (end - index > 1) {
      list.delete(start + index + 1, end - index - 1);
    }
    end = index;
  }
};

const insertMissing = (
  list: YArray<unknown>,
  start: number,
  next: readonly ElementNode[],
  remaining: readonly unknown[],
): void => {
  const at = new Map(remaining.map((item, index) => [item, index]));
  const runs: { readonly index: number; readonly ids: string[] }[] = [];
  let run: string[] = [];

  for (const node of next) {
    const index = at.get(node.id);

    if (index === undefined) {
      run.push(node.id);
      continue;
    }
    if (run.length > 0) {
      runs.push({ index, ids: run });
    }
    run = [];
  }
  if (run.length > 0) {
    runs.push({ index: remaining.length, ids: run });
  }
  for (const { index, ids } of runs.toReversed()) {
    list.insert(start + index, ids);
  }
};

const syncList = (
  store: TreeStore,
  list: YArray<unknown>,
  next: readonly ElementNode[],
  window: Window,
): void => {
  const current = list.slice(window.start, window.end);
  const position = new Map(next.map((node, at) => [node.id, at]));
  const counted = new Set<string>();

  const targets = current.map((item) => {
    if (typeof item !== 'string' || counted.has(item)) {
      return -1;
    }
    counted.add(item);
    return position.get(item) ?? -1;
  });

  const rising = risingRun(targets);

  const kept = current.reduce<Set<number>>((indices, item, index) => {
    const unknown = typeof item === 'string' && !position.has(item) && !store.blocks.has(item);

    if (rising.has(index) || unknown) {
      indices.add(index);
    }
    return indices;
  }, new Set());

  const remaining = current.filter((_item, index) => kept.has(index));

  removeOthers(list, window.start, kept, current.length);
  insertMissing(list, window.start, next, remaining);
};

const wholeList = (list: YArray<unknown>): Window => ({ start: 0, end: list.length });

const syncContainer = (
  writing: Writing,
  parent: string,
  content: readonly ContentNode[],
  previousContent: readonly ContentNode[],
): void => {
  const { store } = writing;
  const limit = Math.min(content.length, previousContent.length);
  const head = commonRun(limit, (at) => content[at] === previousContent[at]);

  const tail = commonRun(
    limit - head,
    (at) => content[content.length - 1 - at] === previousContent[previousContent.length - 1 - at],
  );

  const next = elementsOf(content.slice(head, content.length - tail));
  const previous = elementsOf(previousContent.slice(head, previousContent.length - tail));
  const ids = new Set(next.map((node) => node.id));

  for (const node of previous) {
    if (ids.has(node.id)) {
      continue;
    }
    writing.left.set(node.id, { node, from: parent });
  }

  const list = listOf(store, parent);

  if (list !== undefined && store.loose.has(parent)) {
    syncList(store, list, elementsOf(content), wholeList(list));
    store.loose.delete(parent);
    store.copies.delete(parent);
  } else if (list !== undefined && !sameIds(next, previous)) {
    syncList(store, list, next, { start: head, end: head + previous.length });
  }
  for (const node of next) {
    store.parents.set(node.id, parent);
    syncEntry(writing, node);
  }
};

const fillEntry = (
  writing: Writing,
  entry: Entry,
  node: ElementNode,
  previous: readonly ContentNode[],
): void => {
  if (isLine(entry)) {
    writeLine(writing.store.known, entry, node.content);
    return;
  }
  if (!holdsChildren(writing.store.schema, node.type)) {
    return;
  }
  if (listIn(entry) === undefined) {
    entry.set(EntryField.Children, new YArray<unknown>());
  }
  syncContainer(writing, node.id, node.content, previous);
};

const createEntry = (writing: Writing, node: ElementNode, before: unknown): void => {
  const { store } = writing;
  const cached = store.cache.get(node.id);

  if (listIn(before) !== undefined) {
    for (const kid of elementsOf(cached?.content ?? [])) {
      writing.left.set(kid.id, { node: kid, from: node.id });
    }
  }

  const entry: Entry =
    kindOf(store.schema, node.type) === EntryKind.Line ? new XmlText() : new YMap<unknown>();

  store.blocks.set(node.id, entry);
  writeType(store, entry, node.type);
  writeAttrs(entry, node.attrs);
  fillEntry(writing, entry, node, []);
  store.cache.set(node.id, node);
};

const syncEntry = (writing: Writing, node: ElementNode): void => {
  const { store } = writing;
  const previous = store.cache.get(node.id);

  if (previous === node) {
    return;
  }

  const entry = store.blocks.get(node.id);

  if (!fits(entry, kindOf(store.schema, node.type))) {
    createEntry(writing, node, entry);
    return;
  }
  writeType(store, entry, node.type);
  writeAttrs(entry, node.attrs);
  fillEntry(writing, entry, node, previous?.content ?? []);
  store.cache.set(node.id, node);
};

const dropLeft = (writing: Writing, node: ElementNode, from: string): void => {
  const { store } = writing;

  if (store.parents.get(node.id) !== from) {
    return;
  }

  store.blocks.delete(node.id);
  store.cache.delete(node.id);
  store.stale.delete(node.id);
  store.parents.delete(node.id);
  store.loose.delete(node.id);
  store.copies.delete(node.id);

  if (!holdsChildren(store.schema, node.type)) {
    return;
  }
  for (const kid of elementsOf(node.content)) {
    dropLeft(writing, kid, node.id);
  }
};

export const dropCopies = (store: TreeStore): void => {
  for (const id of Array.from(store.copies)) {
    const node = store.cache.get(id);
    const list = listOf(store, id);

    store.copies.delete(id);
    store.loose.delete(id);

    if (node === undefined || list === undefined) {
      continue;
    }
    syncList(store, list, elementsOf(node.content), wholeList(list));
  }
};

export const writeTree = (store: TreeStore, root: ElementNode): void => {
  const writing: Writing = { store, left: new Map() };

  syncContainer(writing, ROOT_PARENT, root.content, store.cache.get(ROOT_PARENT)?.content ?? []);
  dropCopies(store);

  for (const { node, from } of writing.left.values()) {
    dropLeft(writing, node, from);
  }
  store.cache.set(ROOT_PARENT, root);
};
