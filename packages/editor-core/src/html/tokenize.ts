import { decodeEntities } from './entities';
import { HtmlChar, type HtmlTokenKind } from './html.types';

export type HtmlToken =
  | {
      readonly kind: typeof HtmlTokenKind.Open;
      readonly tag: string;
      readonly attrs: ReadonlyMap<string, string>;
      readonly closed: boolean;
    }
  | { readonly kind: typeof HtmlTokenKind.Close; readonly tag: string }
  | { readonly kind: typeof HtmlTokenKind.Text; readonly text: string };

interface Cursor {
  readonly html: string;
  readonly tokens: HtmlToken[];
  at: number;
}

const RAW = new Set([
  'script',
  'style',
  'textarea',
  'title',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
]);

const TAG_NAME = /[a-z][^\s/>]*/iy;

const SPACE = /\s*/y;

const ATTRIBUTE = /([^\s"'/=>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/y;

const pushText = (cursor: Cursor, text: string): void => {
  if (text !== '') {
    cursor.tokens.push({ kind: 'text', text: decodeEntities(text) });
  }
};

const skipTo = (cursor: Cursor, marker: string, from: number): void => {
  const end = cursor.html.indexOf(marker, from);

  cursor.at = end === -1 ? cursor.html.length : end + marker.length;
};

const nameAt = (cursor: Cursor, at: number): string | undefined => {
  TAG_NAME.lastIndex = at;
  return TAG_NAME.exec(cursor.html)?.[0];
};

const skipSpace = (cursor: Cursor): void => {
  SPACE.lastIndex = cursor.at;
  SPACE.exec(cursor.html);
  cursor.at = SPACE.lastIndex;
};

const readAttribute = (cursor: Cursor, attrs: Map<string, string>): void => {
  ATTRIBUTE.lastIndex = cursor.at;
  const match = ATTRIBUTE.exec(cursor.html);

  if (match === null) {
    cursor.at += 1;
    return;
  }
  const name = (match[1] ?? '').toLowerCase();

  if (!attrs.has(name)) {
    attrs.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ''));
  }
  cursor.at = ATTRIBUTE.lastIndex;
};

const closesTag = (html: string, at: number): boolean =>
  html[at] === undefined ||
  html[at] === HtmlChar.TagEnd ||
  (html[at] === HtmlChar.Slash && html[at + 1] === HtmlChar.TagEnd);

const readAttributes = (cursor: Cursor, attrs: Map<string, string>): boolean => {
  const { html } = cursor;

  skipSpace(cursor);

  while (!closesTag(html, cursor.at)) {
    if (html[cursor.at] === HtmlChar.Slash) {
      cursor.at += 1;
    } else {
      readAttribute(cursor, attrs);
    }
    skipSpace(cursor);
  }

  const selfClosing = html[cursor.at] === HtmlChar.Slash;

  cursor.at = Math.min(html.length, cursor.at + (selfClosing ? 2 : 1));
  return selfClosing;
};

const readRaw = (cursor: Cursor, tag: string): void => {
  const end = new RegExp(`</${tag}[\\s/>]`, 'giu');

  end.lastIndex = cursor.at;
  const found = end.exec(cursor.html);
  const stop = found === null ? cursor.html.length : found.index;

  pushText(cursor, cursor.html.slice(cursor.at, stop));
  cursor.at = stop;
};

const readOpen = (cursor: Cursor, name: string): void => {
  const attrs = new Map<string, string>();
  const tag = name.toLowerCase();

  cursor.at += name.length + 1;
  const closed = readAttributes(cursor, attrs);

  cursor.tokens.push({ kind: 'open', tag, attrs, closed });
  if (!closed && RAW.has(tag)) {
    readRaw(cursor, tag);
  }
};

const readClose = (cursor: Cursor): void => {
  const name = nameAt(cursor, cursor.at + 2);

  if (name !== undefined) {
    cursor.tokens.push({ kind: 'close', tag: name.toLowerCase() });
  }
  skipTo(cursor, '>', cursor.at + 2);
};

const readMarkup = (cursor: Cursor): void => {
  const { html, at } = cursor;
  const next = html[at + 1];

  if (html.startsWith('<!--', at)) {
    skipTo(cursor, '-->', at + 4);
  } else if (next === HtmlChar.Bang || next === HtmlChar.Question) {
    skipTo(cursor, '>', at + 1);
  } else if (next === HtmlChar.Slash) {
    readClose(cursor);
  } else {
    const name = nameAt(cursor, at + 1);

    if (name === undefined) {
      pushText(cursor, '<');
      cursor.at += 1;
    } else {
      readOpen(cursor, name);
    }
  }
};

export const tokenize = (html: string): HtmlToken[] => {
  const cursor: Cursor = { html, tokens: [], at: 0 };

  while (cursor.at < html.length) {
    const open = html.indexOf('<', cursor.at);
    const stop = open === -1 ? html.length : open;

    pushText(cursor, html.slice(cursor.at, stop));
    cursor.at = stop;
    if (open !== -1) {
      readMarkup(cursor);
    }
  }
  return cursor.tokens;
};
