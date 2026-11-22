import type { Attrs, ContentNode, ElementNode } from '@numior/editor-core';
import { XmlElement } from 'yjs';
import { attrsFrom, decodedValue, isFields, readChildren } from './from-yjs';
import { isOrderKey } from './order-key';
import { ROOT_PARENT } from './tree-index';
import { EntryField, type Place, type PlaceOrigin, type TreeStore } from './yjs.types';

export const isEntry = (value: unknown): value is XmlElement => value instanceof XmlElement;

const isOwnField = (key: string): boolean => key.startsWith('nui:');

export const isInlineType = (store: TreeStore, type: string): boolean =>
  store.schema.nodes.get(type)?.inlineContent === true;

const originFrom = (value: unknown): PlaceOrigin | undefined =>
  isFields(value) && typeof value['parent'] === 'string' && isOrderKey(value['key'])
    ? { parent: value['parent'], key: value['key'] }
    : undefined;

export const placeFrom = (encoded: unknown): Place | undefined => {
  const value = typeof encoded === 'string' ? decodedValue(encoded) : undefined;
  const origin = originFrom(value);

  if (!isFields(value) || origin === undefined || typeof value['clock'] !== 'number') {
    return undefined;
  }

  const from = originFrom(value['from']);

  return from === undefined
    ? { ...origin, clock: value['clock'] }
    : { ...origin, clock: value['clock'], from };
};

const attrsOf = (entry: XmlElement): Attrs | undefined =>
  attrsFrom(
    Object.fromEntries(
      Object.entries(entry.getAttributes()).reduce<[string, unknown][]>((entries, [key, value]) => {
        if (!isOwnField(key)) {
          entries.push([key, typeof value === 'string' ? decodedValue(value) : undefined]);
        }
        return entries;
      }, []),
    ),
  );

const inlineOf = (store: TreeStore, entry: XmlElement): readonly ContentNode[] | undefined =>
  readChildren(store, entry);

const nodeOf = (store: TreeStore, id: string): ElementNode | undefined => {
  const cached = store.cache.get(id);

  if (cached !== undefined && !store.stale.has(id)) {
    return cached;
  }

  const entry = store.blocks.get(id);
  const type = isEntry(entry) ? entry.getAttribute(EntryField.Type) : undefined;
  const attrs = isEntry(entry) ? attrsOf(entry) : undefined;

  if (
    !isEntry(entry) ||
    typeof type !== 'string' ||
    attrs === undefined ||
    !store.schema.nodes.has(type)
  ) {
    return undefined;
  }

  const content = isInlineType(store, type) ? inlineOf(store, entry) : blockContent(store, id);

  if (content === undefined) {
    return undefined;
  }

  const node = store.schema.element(type, { id, attrs, content });

  store.cache.set(id, node);
  store.stale.delete(id);
  return node;
};

const blockContent = (store: TreeStore, parent: string): readonly ElementNode[] | undefined =>
  store.index.childrenOf(parent).reduce<ElementNode[] | undefined>((content, id) => {
    const node = content === undefined ? undefined : nodeOf(store, id);

    if (content === undefined || node === undefined) {
      return undefined;
    }
    content.push(node);
    return content;
  }, []);

export const rootOf = (store: TreeStore, shell: ElementNode): ElementNode | undefined => {
  const cached = store.cache.get(ROOT_PARENT);

  const content =
    cached !== undefined && !store.stale.has(ROOT_PARENT)
      ? cached.content
      : blockContent(store, ROOT_PARENT);

  if (content === undefined) {
    return undefined;
  }

  const root = store.schema.element(shell.type, { id: shell.id, attrs: shell.attrs, content });

  store.cache.set(ROOT_PARENT, root);
  store.stale.delete(ROOT_PARENT);
  return root;
};
