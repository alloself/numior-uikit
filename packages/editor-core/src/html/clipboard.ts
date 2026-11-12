import type { ContentNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { contentToHTML } from './serialize';

const OWN = 'data-numior-editor';

const STORE = 'numior-editor-clipboard';

const MARKED = /data-numior-editor="([\da-f]+)"/u;

const TOKEN = /^[\da-f]{32}$/u;

const TOKEN_BYTES = 16;

const memory = { token: '' };

const stored = (): string | undefined => {
  try {
    return globalThis.localStorage.getItem(STORE) ?? undefined;
  } catch {
    return undefined;
  }
};

const kept = (token: string): string => {
  memory.token = token;

  try {
    globalThis.localStorage.setItem(STORE, token);
    return token;
  } catch {
    return token;
  }
};

const fresh = (): string =>
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

const clipboardToken = (): string => {
  const known = stored();

  return known !== undefined && TOKEN.test(known)
    ? known
    : kept(memory.token === '' ? fresh() : memory.token);
};

export const clipboardHTML = (schema: Schema, content: readonly ContentNode[]): string =>
  `<div ${OWN}="${clipboardToken()}">${contentToHTML(schema, content)}</div>`;

export const isOwnClipboard = (html: string): boolean => {
  const token = MARKED.exec(html)?.[1];

  return token !== undefined && token === clipboardToken();
};
