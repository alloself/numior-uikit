import type { IdSource } from '../model/node.types';

export interface HtmlElement {
  readonly kind: typeof HtmlNodeKind.Element;
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
  readonly kind: typeof HtmlNodeKind.Text;
  readonly text: string;
}

export type HtmlNode = HtmlElement | HtmlText;

export type HtmlWhitespace = (typeof HtmlWhitespace)[keyof typeof HtmlWhitespace];

export type PasteSource = (typeof PasteSource)[keyof typeof PasteSource];

export interface FromHTMLOptions {
  readonly ids?: IdSource | undefined;
  readonly whitespace?: HtmlWhitespace | undefined;
  readonly source?: PasteSource | undefined;
}

export const HtmlWhitespace = { Collapse: 'collapse', Preserve: 'preserve' } as const;

export const PasteSource = {
  Own: 'own',
  Word: 'word',
  GoogleDocs: 'google-docs',
  Excel: 'excel',
  Sheets: 'sheets',
  Html: 'html',
  Text: 'text',
} as const;

export const HtmlNodeKind = { Element: 'element', Text: 'text' } as const;

export const HtmlTokenKind = { Open: 'open', Close: 'close', Text: 'text' } as const;

export const HtmlTag = {
  Br: 'br',
  Img: 'img',
  Option: 'option',
  Pre: 'pre',
  Style: 'style',
  Th: 'th',
  Thead: 'thead',
  Tr: 'tr',
} as const;

export const HtmlChar = { Bang: '!', Question: '?', Slash: '/', TagEnd: '>', Space: ' ' } as const;

export const PasteMarker = { Checkbox: 'checkbox', Ignore: 'ignore' } as const;
