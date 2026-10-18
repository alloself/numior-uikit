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
    p(node('image', [], { src: 'a.png', alt: 'A', caption: 'Cap', wrap: 'break' })),
    p(
      'Text ',
      node('image', [], { src: 'b.png', width: 0.45, align: 'start', wrap: 'wrap', caption: 'C' }),
      ' around',
    ),
    p(
      'See ',
      node('file', [], { url: 'https://numior.test/r.pdf', name: 'Report.pdf', size: 2_516_582 }),
      ' now',
    ),
    node('embed', [], {
      url: 'https://youtu.be/dQw4w9WgXcQ',
      provider: 'youtube',
      caption: 'Talk',
    }),
    node('bookmark', [], {
      url: 'https://numior.test/blog',
      title: 'Blog',
      description: 'News',
      image: 'https://numior.test/cover.png',
      icon: 'https://numior.test/icon.png',
      site: 'numior.test',
    }),
    node('columns', [node('column', [p('L')], { width: 1.5 }), node('column', [p('R')])]),
    node('table', [
      node('table_head', [
        node('table_column', [], { name: 'Name' }),
        node('table_column', [], { name: 'Sum', type: 'number', width: 120 }),
        node('table_column', [], { name: 'Paid', type: 'boolean' }),
        node('table_column', [node('table_option', [], { label: 'Open' })], {
          name: 'State',
          type: 'select',
        }),
      ]),
      node('table_body', [
        node('table_row', [
          node('table_cell', [], { value: 'Ann' }),
          node('table_cell', [], { value: 12.5 }),
          node('table_cell', [], { value: true }),
          node('table_cell', [], { value: 'Open' }),
        ]),
      ]),
    ]),
    p(text('hi', [mark('highlight', { name: 'yellow' }), mark('color', { name: 'red' })])),
  );

export const EVERY_BLOCK_MARKUP = [
  '<h2 class="nui-content__heading nui-content__heading--level-2">Title</h2>',
  '<p class="nui-content__paragraph">plain <a class="nui-content__link" href="https://numior.test"><strong class="nui-content__bold">both</strong></a><span class="nui-content__mention" data-user="u1">@Ann</span><br><br></p>',
  '<p class="nui-content__paragraph"><br></p>',
  '<ul class="nui-content__list nui-content__list--bullet"><li class="nui-content__item"><p class="nui-content__paragraph">one</p></li></ul>',
  '<ol class="nui-content__list nui-content__list--ordered" start="3"><li class="nui-content__item"><p class="nui-content__paragraph">two</p></li></ol>',
  '<ul class="nui-content__list nui-content__list--todo"><li class="nui-content__todo nui-content__todo--checked"><span class="nui-content__check" role="checkbox" aria-checked="true" aria-readonly="true" aria-label="done"></span><div class="nui-content__todo-body"><p class="nui-content__paragraph">done</p></div></li></ul>',
  '<pre class="nui-content__code"><code>let x</code></pre>',
  '<hr class="nui-content__divider">',
  '<div class="nui-content__callout nui-content__callout--tone-warning" role="note"><p class="nui-content__paragraph">Note</p></div>',
  '<div class="nui-content__toggle nui-content__toggle--open"><button type="button" class="nui-content__toggle-button" aria-expanded="true" aria-label="Head"></button>',
  '<div class="nui-content__toggle-body"><p class="nui-content__paragraph">Head</p><p class="nui-content__paragraph">Body</p></div></div>',
  '<p class="nui-content__paragraph"><span class="nui-content__image nui-content__image--wrap-break nui-content__image--align-center"><img class="nui-content__picture" src="a.png" alt="A" loading="lazy"><span class="nui-content__caption">Cap</span></span></p>',
  '<p class="nui-content__paragraph">Text <span class="nui-content__image nui-content__image--wrap-wrap nui-content__image--align-start" style="inline-size: 45%;"><img class="nui-content__picture" src="b.png" alt loading="lazy"><span class="nui-content__caption">C</span></span> around</p>',
  '<p class="nui-content__paragraph">See <a class="nui-content__file nui-content__file--kind-pdf" href="https://numior.test/r.pdf" download="Report.pdf" data-size="2516582"><span class="nui-content__file-icon" aria-hidden="true"></span><span class="nui-content__file-name">Report.pdf</span></a> now</p>',
  '<figure class="nui-content__embed nui-content__embed--provider-youtube"><a class="nui-content__embed-link" href="https://youtu.be/dQw4w9WgXcQ">YouTube</a><figcaption class="nui-content__caption">Talk</figcaption></figure>',
  '<div class="nui-content__bookmark"><a class="nui-content__bookmark-link" href="https://numior.test/blog"><span class="nui-content__bookmark-body"><span class="nui-content__bookmark-title">Blog</span><span class="nui-content__bookmark-description">News</span><span class="nui-content__bookmark-site"><img class="nui-content__bookmark-icon" src="https://numior.test/icon.png" alt loading="lazy">numior.test</span></span><img class="nui-content__bookmark-image" src="https://numior.test/cover.png" alt loading="lazy"></a></div>',
  '<div class="nui-content__columns"><div class="nui-content__columns-track"><div class="nui-content__column" style="flex-grow: 1.5;"><p class="nui-content__paragraph">L</p></div>',
  '<div class="nui-content__column"><p class="nui-content__paragraph">R</p></div></div></div>',
  '<div class="nui-content__table"><table class="nui-content__grid"><thead><tr>',
  '<th class="nui-content__table-column nui-content__table-column--type-text"><span>Name</span><datalist></datalist></th>',
  '<th class="nui-content__table-column nui-content__table-column--type-number" style="width: 120px;"><span>Sum</span><datalist></datalist></th>',
  '<th class="nui-content__table-column nui-content__table-column--type-boolean"><span>Paid</span><datalist></datalist></th>',
  '<th class="nui-content__table-column nui-content__table-column--type-select"><span>State</span><datalist><option value="Open"></option></datalist></th>',
  '</tr></thead><tbody><tr><td class="nui-content__table-cell">Ann</td><td class="nui-content__table-cell nui-content__table-cell--number">12.5</td>',
  '<td class="nui-content__table-cell"><input type="checkbox" checked disabled tabindex="-1"></td><td class="nui-content__table-cell">Open</td></tr></tbody></table></div>',
  '<p class="nui-content__paragraph"><span class="nui-content__colour nui-content__colour--red"><mark class="nui-content__highlight nui-content__highlight--yellow">hi</mark></span></p>',
].join('');
