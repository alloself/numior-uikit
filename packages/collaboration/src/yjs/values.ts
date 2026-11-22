import {
  createDoc,
  type AttrValue,
  type Attrs,
  type Doc,
  type ElementNode,
  type Schema,
} from '@numior/editor-core';
import type { Fields } from './yjs.types';

export const ID_ATTRIBUTE = 'nui:id';

export const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null;

const isAttrValue = (value: unknown): value is AttrValue =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

export const isOwnField = (key: string): boolean => key.startsWith('nui:');

const decodedValue = (encoded: string): unknown => {
  try {
    return JSON.parse(encoded);
  } catch {
    return undefined;
  }
};

export const attrsFrom = (value: unknown): Attrs | undefined => {
  if (!isFields(value)) {
    return undefined;
  }

  const attrs: Record<string, AttrValue> = {};

  for (const key in value) {
    const field = value[key];

    if (!isAttrValue(field)) {
      return undefined;
    }
    attrs[key] = field;
  }
  return attrs;
};

export const encodedAttrs = (fields: Fields): Attrs | undefined => {
  const attrs: Record<string, AttrValue> = {};

  for (const key in fields) {
    if (isOwnField(key)) {
      continue;
    }

    const field = fields[key];
    const decoded = typeof field === 'string' ? decodedValue(field) : undefined;

    if (!isAttrValue(decoded)) {
      return undefined;
    }
    attrs[key] = decoded;
  }
  return attrs;
};

export const documentOf = (schema: Schema, root: ElementNode): Doc => createDoc(schema, root);
