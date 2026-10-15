import type { IdSource } from '../model/node.types';

export interface HtmlElement {
  readonly kind: 'element';
  readonly tag: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: readonly HtmlNode[];
  attr(name: string): string | undefined;
  hasClass(name: string): boolean;
  classWith(prefix: string): string | undefined;
  style(property: string): string | undefined;
  text(): string;
  find(tag: string): HtmlElement | undefined;
}

export interface HtmlText {
  readonly kind: 'text';
  readonly text: string;
}

export type HtmlNode = HtmlElement | HtmlText;

export type HtmlWhitespace = 'collapse' | 'preserve';

export type PasteSource = 'own' | 'word' | 'google-docs' | 'excel' | 'sheets' | 'html' | 'text';

export interface FromHTMLOptions {
  readonly ids?: IdSource | undefined;
  readonly whitespace?: HtmlWhitespace | undefined;
  readonly source?: PasteSource | undefined;
}
