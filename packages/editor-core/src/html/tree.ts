import { openElement, type OpenElement } from './element';
import { HtmlNodeKind, HtmlTag, HtmlTokenKind, type HtmlElement } from './html.types';
import { tokenize, type HtmlToken } from './tokenize';

interface Implied {
  readonly closes: ReadonlySet<string>;
  readonly scope: ReadonlySet<string>;
}

const MAX_DEPTH = 256;

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const PARAGRAPH_CLOSERS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'ul',
]);

const SCOPE = new Set(['#root', 'table', 'td', 'th', 'caption', 'button', 'template', 'object']);

const LIST_SCOPE = new Set([...SCOPE, 'ul', 'ol', 'menu']);

const ROW_SCOPE = new Set([...SCOPE, 'tr']);

const IMPLIED: ReadonlyMap<string, Implied> = new Map([
  ['li', { closes: new Set(['li']), scope: LIST_SCOPE }],
  ['dt', { closes: new Set(['dt', 'dd']), scope: new Set([...SCOPE, 'dl']) }],
  ['dd', { closes: new Set(['dt', 'dd']), scope: new Set([...SCOPE, 'dl']) }],
  ['tr', { closes: new Set(['tr']), scope: new Set(['#root', 'table']) }],
  ['td', { closes: new Set(['td', 'th']), scope: ROW_SCOPE }],
  ['th', { closes: new Set(['td', 'th']), scope: ROW_SCOPE }],
  ['tbody', { closes: new Set(['thead', 'tbody', 'tfoot']), scope: new Set(['#root', 'table']) }],
  ['thead', { closes: new Set(['thead', 'tbody', 'tfoot']), scope: new Set(['#root', 'table']) }],
  ['tfoot', { closes: new Set(['thead', 'tbody', 'tfoot']), scope: new Set(['#root', 'table']) }],
]);

const PARAGRAPH: Implied = { closes: new Set(['p']), scope: SCOPE };

const closeNearest = (stack: OpenElement[], implied: Implied): void => {
  for (let at = stack.length - 1; at > 0; at -= 1) {
    const tag = stack[at]?.element.tag ?? '';

    if (implied.closes.has(tag)) {
      stack.length = at;
      return;
    }
    if (implied.scope.has(tag)) {
      return;
    }
  }
};

const top = (stack: readonly OpenElement[]): OpenElement | undefined => stack.at(-1);

const appendText = (stack: readonly OpenElement[], text: string): void => {
  const children = top(stack)?.children;
  const last = children?.at(-1);

  if (last?.kind === HtmlNodeKind.Text) {
    children?.splice(-1, 1, { kind: 'text', text: last.text + text });
  } else {
    children?.push({ kind: 'text', text });
  }
};

const open = (stack: OpenElement[], token: Extract<HtmlToken, { kind: 'open' }>): void => {
  if (stack.length > MAX_DEPTH) {
    return;
  }
  const implied = IMPLIED.get(token.tag);

  if (implied !== undefined) {
    closeNearest(stack, implied);
  }
  if (PARAGRAPH_CLOSERS.has(token.tag)) {
    closeNearest(stack, PARAGRAPH);
  }
  const opened = openElement(token.tag, token.attrs);

  top(stack)?.children.push(opened.element);
  if (!token.closed && !VOID.has(token.tag)) {
    stack.push(opened);
  }
};

const close = (stack: OpenElement[], tag: string): void => {
  if (tag === HtmlTag.Br) {
    open(stack, { kind: 'open', tag, attrs: new Map(), closed: true });
    return;
  }
  for (let at = stack.length - 1; at > 0; at -= 1) {
    if (stack[at]?.element.tag === tag) {
      stack.length = at;
      return;
    }
  }
};

export const parseTree = (html: string): HtmlElement => {
  const root = openElement('#root', new Map());
  const stack: OpenElement[] = [root];

  for (const token of tokenize(html)) {
    switch (token.kind) {
      case HtmlTokenKind.Text:
        appendText(stack, token.text);
        break;
      case HtmlTokenKind.Open:
        open(stack, token);
        break;
      case HtmlTokenKind.Close:
        close(stack, token.tag);
        break;
    }
  }
  return root.element;
};
