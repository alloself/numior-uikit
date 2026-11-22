import type { Attrs, Schema } from '@numior/editor-core';
import { Array as YArray, Map as YMap, XmlText } from 'yjs';
import { isOwnField } from './values';
import { EntryField, EntryKind, type Entry, type Fields, type TreeStore } from './yjs.types';

export const ROOT_PARENT = '';

export const isLine = (value: unknown): value is XmlText => value instanceof XmlText;

export const isHolder = (value: unknown): value is YMap<unknown> => value instanceof YMap;

export const isEntry = (value: unknown): value is Entry => isLine(value) || isHolder(value);

export const kindOf = (schema: Schema, type: string): EntryKind =>
  schema.nodes.get(type)?.inlineContent === true ? EntryKind.Line : EntryKind.Holder;

export const holdsChildren = (schema: Schema, type: string): boolean => {
  const node = schema.nodes.get(type);

  return node !== undefined && !node.leaf && !node.inlineContent;
};

export const fits = (entry: unknown, kind: EntryKind): entry is Entry =>
  kind === EntryKind.Line ? isLine(entry) : isHolder(entry);

const fieldOf = (entry: Entry, key: string): unknown =>
  isLine(entry) ? entry.getAttribute(key) : entry.get(key);

const setField = (entry: Entry, key: string, value: string): void => {
  if (isLine(entry)) {
    entry.setAttribute(key, value);
    return;
  }
  entry.set(key, value);
};

const removeField = (entry: Entry, key: string): void => {
  if (isLine(entry)) {
    entry.removeAttribute(key);
    return;
  }
  entry.delete(key);
};

export const fieldsOf = (entry: Entry): Fields => {
  if (isLine(entry)) {
    return entry.getAttributes();
  }

  const fields: Record<string, unknown> = {};

  entry.forEach((value, key) => {
    fields[key] = value;
  });

  return fields;
};

const typeOf = (entry: Entry): unknown => fieldOf(entry, EntryField.Type);

export const listIn = (entry: unknown): YArray<unknown> | undefined => {
  const list = isHolder(entry) ? entry.get(EntryField.Children) : undefined;

  return list instanceof YArray ? list : undefined;
};

export const listOf = (store: TreeStore, parent: string): YArray<unknown> | undefined =>
  parent === ROOT_PARENT ? store.root : listIn(store.blocks.get(parent));

export const writeType = (store: TreeStore, entry: Entry, type: string): void => {
  const written = typeOf(entry);

  if (isLine(entry) && type === store.plain) {
    if (written === undefined) {
      return;
    }
    removeField(entry, EntryField.Type);
    return;
  }
  if (written === type) {
    return;
  }
  setField(entry, EntryField.Type, type);
};

export const entryType = (store: TreeStore, entry: Entry, fields: Fields): unknown =>
  fields[EntryField.Type] ?? (isLine(entry) ? store.plain : undefined);

export const writeAttrs = (entry: Entry, attrs: Attrs): void => {
  for (const key of Object.keys(fieldsOf(entry))) {
    if (isOwnField(key) || Object.hasOwn(attrs, key)) {
      continue;
    }
    removeField(entry, key);
  }
  for (const [key, value] of Object.entries(attrs)) {
    const encoded = JSON.stringify(value);

    if (fieldOf(entry, key) === encoded) {
      continue;
    }
    setField(entry, key, encoded);
  }
};
