import {
  createDoc,
  createIdSource,
  type ContentNode,
  type Doc,
  type ElementNode,
  type Mark,
} from '@numior/editor-core';
import { contentSchema } from '../../src';

type Child = ContentNode | string;

const ids = createIdSource('c');

export const node = (
  type: string,
  content: readonly Child[] = [],
  attrs: Readonly<Record<string, string | number | boolean | null>> = {},
): ElementNode =>
  contentSchema.element(type, {
    id: ids.next(),
    attrs,
    content: content.map((child) =>
      typeof child === 'string' ? contentSchema.text(child) : child,
    ),
  });

const text = (value: string, marks: readonly Mark[]): ContentNode =>
  contentSchema.text(value, marks);

const mark = (type: string, attrs: Readonly<Record<string, string>> = {}): Mark =>
  contentSchema.mark(type, attrs);

export const docOf = (...blocks: readonly ElementNode[]): Doc =>
  createDoc(contentSchema, node('doc', blocks));

const p = (...content: readonly Child[]): ElementNode => node('paragraph', content);

export const everyBlock = () =>
  docOf(
    node('heading', ['Title'], { level: 2 }),
    p(
      'plain ',
      text('both', [mark('bold'), mark('link', { href: 'https://numior.test' })]),
      node('mention', [], { user: 'u1', label: 'Ann' }),
      node('hard_break'),
    ),
    p(),
    node('bullet_list', [node('list_item', [p('one')])]),
    node('ordered_list', [node('list_item', [p('two')])], { start: 3 }),
    node('todo_list', [node('todo_item', [p('done')], { checked: true })]),
    node('code_block', ['let x']),
    node('divider'),
    node('callout', [p('Note')], { tone: 'warning' }),
    node('toggle', [p('Head'), p('Body')], { open: true }),
    node('image', [], { src: 'a.png', alt: 'A', caption: 'Cap' }),
    node('columns', [node('column', [p('L')]), node('column', [p('R')])]),
    node('table', [
      node('table_row', [
        node('table_cell', [p('H')], { header: true }),
        node('table_cell', [p('V')], { colspan: 2 }),
      ]),
    ]),
    p(text('hi', [mark('highlight', { name: 'yellow' }), mark('color', { name: 'red' })])),
  );

export const EVERY_BLOCK_MARKUP = [
  '<h2 class="nui-content__heading nui-content__heading--level-2">Title</h2>',
  '<p class="nui-content__paragraph">plain <a class="nui-content__link" href="https://numior.test"><strong class="nui-content__bold">both</strong></a><span class="nui-content__mention">@Ann</span><br><br></p>',
  '<p class="nui-content__paragraph"><br></p>',
  '<ul class="nui-content__list nui-content__list--bullet"><li class="nui-content__item"><p class="nui-content__paragraph">one</p></li></ul>',
  '<ol class="nui-content__list nui-content__list--ordered" start="3"><li class="nui-content__item"><p class="nui-content__paragraph">two</p></li></ol>',
  '<ul class="nui-content__list nui-content__list--todo"><li class="nui-content__todo nui-content__todo--checked"><input class="nui-content__check" type="checkbox" checked tabindex="-1" aria-readonly="true" aria-label="done"><div class="nui-content__todo-body"><p class="nui-content__paragraph">done</p></div></li></ul>',
  '<pre class="nui-content__code"><code>let x</code></pre>',
  '<hr class="nui-content__divider">',
  '<div class="nui-content__callout nui-content__callout--tone-warning" role="note"><p class="nui-content__paragraph">Note</p></div>',
  '<div class="nui-content__toggle nui-content__toggle--open"><p class="nui-content__paragraph">Head</p><p class="nui-content__paragraph">Body</p></div>',
  '<figure class="nui-content__image nui-content__image--align-center"><img class="nui-content__picture" src="a.png" alt="A" loading="lazy"><figcaption class="nui-content__caption">Cap</figcaption></figure>',
  '<div class="nui-content__columns"><div class="nui-content__column"><p class="nui-content__paragraph">L</p></div><div class="nui-content__column"><p class="nui-content__paragraph">R</p></div></div>',
  '<div class="nui-content__table"><table><tbody><tr><th class="nui-content__cell"><p class="nui-content__paragraph">H</p></th><td class="nui-content__cell" colspan="2"><p class="nui-content__paragraph">V</p></td></tr></tbody></table></div>',
  '<p class="nui-content__paragraph"><span class="nui-content__colour nui-content__colour--red"><mark class="nui-content__highlight nui-content__highlight--yellow">hi</mark></span></p>',
].join('');
