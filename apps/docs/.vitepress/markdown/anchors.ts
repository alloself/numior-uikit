import { isEnglishPage } from './env';

interface AnchorToken {
  readonly type: string;
  content: string;
  children: AnchorToken[] | null;
}

interface AnchorState {
  readonly tokens: AnchorToken[];
  readonly env: unknown;
  readonly Token: new (type: string, tag: string, nesting: 0 | 1 | -1) => AnchorToken;
}

const anchorLabel = (env: unknown, title: string): string =>
  isEnglishPage(env) ? `Link to "${title}"` : `Ссылка на «${title}»`;

const escapeAttribute = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

const textOf = (children: readonly AnchorToken[]): string =>
  children
    .filter((child) => child.type === 'text' || child.type === 'code_inline')
    .map((child) => child.content)
    .join('');

export const headingPermalink = (
  slug: string,
  _options: unknown,
  state: AnchorState,
  index: number,
): void => {
  const inline = state.tokens[index + 1];

  if (inline === undefined || inline.children === null) {
    return;
  }
  const anchor = new state.Token('html_inline', '', 0);
  const label = escapeAttribute(anchorLabel(state.env, textOf(inline.children)));

  anchor.content = ` <a class="nui-prose__anchor" href="#${slug}" aria-label="${label}">&ZeroWidthSpace;</a>`;
  inline.children.push(anchor);
};
