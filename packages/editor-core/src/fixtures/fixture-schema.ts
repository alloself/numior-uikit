import { HtmlNodeKind, HtmlTag, type HtmlElement } from '../html/html.types';
import { tableGrid, type HtmlTableCell } from '../html/table-grid';
import { ContentNodeKind, type AttrValue, type ElementNode } from '../model/node.types';
import { contentHole, renderTag } from '../render/render';
import type { RenderChild, RenderElement } from '../render/render.types';
import { createSchema } from '../schema/schema';
import type { NodeMaker, ParsedAttrs, ParsedContent } from '../schema/schema.types';

const LEVELS: ReadonlySet<AttrValue> = new Set([1, 2, 3]);

const isLevel = (value: AttrValue): boolean => LEVELS.has(value);

const isText = (value: AttrValue): boolean => typeof value === 'string';

const textOf = (value: AttrValue | undefined): string => (typeof value === 'string' ? value : '');

const mentionOf = (span: HtmlElement): ParsedAttrs => {
  const user = span.attr('data-user');

  return user === undefined ? false : { user, label: span.text().replace(/^@/u, '') };
};

const cellText = (value: AttrValue | undefined): string =>
  value === null || value === undefined ? '' : String(value);

const optionsOf = (cell: HtmlTableCell, make: NodeMaker): ElementNode[] =>
  (cell.element?.find('datalist')?.children ?? []).flatMap((option) =>
    option.kind === HtmlNodeKind.Element && option.tag === HtmlTag.Option
      ? [make('table_option', { label: option.attr('value') ?? '' })]
      : [],
  );

const keyAt = (index: number): string => `c${String(index)}`;

const elementsOf = (node: ElementNode | undefined): ElementNode[] =>
  (node?.content ?? []).filter(
    (child): child is ElementNode => child.kind === ContentNodeKind.Element,
  );

const renderOption = (node: ElementNode): RenderElement =>
  renderTag('option', { value: textOf(node.attrs.label) });

const renderColumn = (node: ElementNode, children: readonly RenderChild[]): RenderElement =>
  renderTag('th', {}, [
    renderTag('span', {}, [textOf(node.attrs.name)]),
    renderTag('datalist', {}, children),
  ]);

const renderLine = (row: ElementNode, columns: readonly ElementNode[]): RenderElement => {
  const values = new Map(elementsOf(row).map((cell) => [cell.attrs.column, cell.attrs.value]));

  return renderTag(
    'tr',
    {},
    columns.map((column) => renderTag('td', {}, [cellText(values.get(column.attrs.key))])),
  );
};

const renderTable = (table: ElementNode): RenderElement => {
  const [head, body] = elementsOf(table);
  const columns = elementsOf(head);

  return renderTag('table', {}, [
    renderTag('thead', {}, [
      renderTag(
        'tr',
        {},
        columns.map((column) => renderColumn(column, elementsOf(column).map(renderOption))),
      ),
    ]),
    renderTag(
      'tbody',
      {},
      elementsOf(body).map((row) => renderLine(row, columns)),
    ),
  ]);
};

const readTable = (table: HtmlElement, make: NodeMaker): ParsedContent => {
  const [head, ...rows] = tableGrid(table).rows;

  if (head === undefined || head.length === 0) {
    return false;
  }
  return [
    make(
      'table_head',
      {},
      head.map((cell, index) =>
        make('table_column', { key: keyAt(index), name: cell.text }, optionsOf(cell, make)),
      ),
    ),
    make(
      'table_body',
      {},
      rows.map((row) =>
        make(
          'table_row',
          {},
          row.map((cell, index) =>
            make('table_cell', {
              column: keyAt(index),
              value: cell.text === '' ? null : cell.text,
            }),
          ),
        ),
      ),
    ),
  ];
};

export const fixtureSchema = createSchema({
  name: 'fixture',
  version: 1,
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      render: () => renderTag('p'),
      parse: [{ tag: 'p' }],
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1, verify: isLevel } },
      render: (node) => renderTag(`h${String(node.attrs.level)}`),
      parse: [1, 2, 3].map((level) => ({ tag: `h${String(level)}`, attrs: () => ({ level }) })),
    },
    blockquote: {
      group: 'block',
      content: 'block+',
      slots: 'rest',
      render: () => renderTag('blockquote'),
      parse: [{ tag: 'blockquote' }],
    },
    bullet_list: {
      group: 'block list',
      content: 'list_item+',
      render: () => renderTag('ul'),
      parse: [{ tag: 'ul' }],
    },
    ordered_list: {
      group: 'block list',
      content: 'list_item+',
      attrs: { start: { default: 1 } },
      render: (node) =>
        renderTag('ol', { start: node.attrs.start === 1 ? null : node.attrs.start }),
      parse: [{ tag: 'ol', attrs: (list) => ({ start: Number(list.attr('start') ?? 1) }) }],
    },
    todo_list: { group: 'block list', content: 'todo_item+', render: () => renderTag('ul') },
    list_item: {
      content: 'paragraph (paragraph | list)*',
      render: () => renderTag('li'),
      parse: [{ tag: 'li' }],
    },
    todo_item: {
      content: 'paragraph (paragraph | list)*',
      attrs: { checked: { default: false } },
      render: (node) =>
        renderTag('li', {}, [
          renderTag('input', { type: 'checkbox', checked: node.attrs.checked === true }),
          renderTag('div', {}, [contentHole]),
        ]),
    },
    code_block: {
      group: 'block',
      content: 'text*',
      marks: '',
      code: true,
      attrs: { language: { default: null } },
      render: () => renderTag('pre', {}, [renderTag('code', {}, [contentHole])]),
      parse: [{ tag: 'pre' }],
    },
    divider: { group: 'block', render: () => renderTag('hr'), parse: [{ tag: 'hr' }] },
    callout: {
      group: 'block',
      content: 'block+',
      slots: 'rest',
      attrs: { tone: { default: 'info' } },
      render: () => renderTag('div', { role: 'note' }),
    },
    toggle: {
      group: 'block',
      content: 'paragraph block*',
      slots: 'rest',
      attrs: { open: { default: false } },
      render: () => renderTag('div'),
    },
    image: {
      group: 'block',
      attrs: { src: { verify: isText }, alt: { default: '' }, width: { default: null } },
      render: (node) =>
        renderTag('img', {
          src: textOf(node.attrs.src),
          alt: textOf(node.attrs.alt),
          width: node.attrs.width,
        }),
      parse: [{ tag: 'img', attrs: (image) => ({ src: image.attr('src') ?? null }) }],
    },
    columns: { group: 'block', content: 'column{2,4}', render: () => renderTag('div') },
    column: { content: 'block+', slots: 'all', render: () => renderTag('div') },
    table: {
      group: 'block',
      atom: true,
      content: 'table_head table_body',
      render: () => renderTag('table', {}, [contentHole]),
      renderSubtree: renderTable,
      parse: [{ tag: 'table', read: readTable }],
    },
    table_head: {
      content: 'table_column+',
      render: () => renderTag('thead', {}, [renderTag('tr', {}, [contentHole])]),
    },
    table_column: {
      content: 'table_option*',
      attrs: {
        key: { verify: isText },
        name: { default: '' },
        type: { default: 'text' },
        width: { default: null },
      },
      render: (node) => renderColumn(node, [contentHole]),
    },
    table_option: {
      attrs: { label: { verify: isText } },
      render: renderOption,
    },
    table_body: { content: 'table_row*', render: () => renderTag('tbody') },
    table_row: { content: 'table_cell*', render: () => renderTag('tr') },
    table_cell: {
      attrs: { column: { verify: isText }, value: { default: null } },
      render: (node) => renderTag('td', {}, [cellText(node.attrs.value)]),
    },
    text: { group: 'inline', inline: true },
    hard_break: {
      group: 'inline',
      inline: true,
      plainText: () => '\n',
      render: () => renderTag('br'),
      parse: [{ tag: 'br' }],
    },
    mention: {
      group: 'inline',
      inline: true,
      attrs: { user: { verify: isText }, label: {} },
      plainText: (node) => `@${textOf(node.attrs.label)}`,
      render: (node) =>
        renderTag('span', { 'data-user': textOf(node.attrs.user) }, [
          `@${textOf(node.attrs.label)}`,
        ]),
      parse: [{ tag: 'span', own: true, attrs: mentionOf }],
    },
  },
  marks: {
    bold: {
      group: 'format',
      render: () => renderTag('strong'),
      parse: [{ tag: 'strong' }, { tag: 'b' }],
    },
    italic: {
      group: 'format',
      render: () => renderTag('em'),
      parse: [{ tag: 'em' }, { tag: 'i' }],
    },
    underline: { group: 'format', render: () => renderTag('u'), parse: [{ tag: 'u' }] },
    strike: { group: 'format', render: () => renderTag('s'), parse: [{ tag: 's' }] },
    code: { render: () => renderTag('code'), parse: [{ tag: 'code' }] },
    link: {
      attrs: { href: { verify: isText } },
      render: (mark) => renderTag('a', { href: textOf(mark.attrs.href) }),
      parse: [{ tag: 'a', attrs: (link) => ({ href: link.attr('href') ?? null }) }],
    },
    color: {
      attrs: { name: { verify: isText } },
      render: (mark) => renderTag('span', { class: `colour-${textOf(mark.attrs.name)}` }),
    },
  },
});
