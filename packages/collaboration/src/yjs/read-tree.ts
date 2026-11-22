import type { AttrValue, Attrs, ContentNode, ElementNode } from '@numior/editor-core';
import { XmlElement } from 'yjs';
import { decodedValue, isAttrValue, readChildren } from './from-yjs';
import { isOrderKey } from './order-key';
import { ROOT_PARENT } from './tree-index';
import { EntryField, type Place, type TreeStore } from './yjs.types';

export const isEntry = (value: unknown): value is XmlElement => value instanceof XmlElement;

const isOwnField = (key: string): boolean => key.startsWith('nui:');

export const isInlineType = (store: TreeStore, type: string): boolean =>
  store.schema.nodes.get(type)?.inlineContent === true;

export const placeCode = ({ clock, key, parent, from }: Place): string =>
  JSON.stringify(
    from === undefined ? [clock, key, parent] : [clock, key, parent, from.key, from.parent],
  );

const fieldsOf = (encoded: unknown): readonly unknown[] => {
  const value = typeof encoded === 'string' ? decodedValue(encoded) : undefined;

  return Array.isArray(value) ? value : [];
};

export const placeFrom = (encoded: unknown): Place | undefined => {
  const [clock, key, parent, fromKey, fromParent] = fieldsOf(encoded);

  if (typeof clock !== 'number' || typeof parent !== 'string' || !isOrderKey(key)) {
    return undefined;
  }

  return typeof fromParent === 'string' && isOrderKey(fromKey)
    ? { parent, key, clock, from: { parent: fromParent, key: fromKey } }
    : { parent, key, clock };
};

const attrsOf = (attributes: Readonly<Record<string, unknown>>): Attrs | undefined => {
  const attrs: Record<string, AttrValue> = {};

  for (const key in attributes) {
    if (isOwnField(key)) {
      continue;
    }

    const value = attributes[key];
    const decoded = typeof value === 'string' ? decodedValue(value) : undefined;

    if (!isAttrValue(decoded)) {
      return undefined;
    }
    attrs[key] = decoded;
  }
  return attrs;
};

const inlineOf = (store: TreeStore, entry: XmlElement): readonly ContentNode[] | undefined =>
  readChildren(store, entry);

const nodeOf = (store: TreeStore, id: string): ElementNode | undefined => {
  const cached = store.cache.get(id);

  if (cached !== undefined && !store.stale.has(id)) {
    return cached;
  }

  const entry = store.blocks.get(id);

  if (!isEntry(entry)) {
    return undefined;
  }

  const attributes = entry.getAttributes();
  const type = attributes[EntryField.Type];
  const attrs = attrsOf(attributes);

  if (typeof type !== 'string' || attrs === undefined || !store.schema.nodes.has(type)) {
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
