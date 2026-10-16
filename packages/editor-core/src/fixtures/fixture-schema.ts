import type { HtmlElement } from '../html/html.types';
import { tableGrid, type HtmlTableCell } from '../html/table-grid';
import type { AttrValue, ElementNode } from '../model/node.types';
import { contentHole, renderTag } from '../render/render';
import { createSchema } from '../schema/schema';
import type { NodeMaker, ParsedContent } from '../schema/schema.types';

const LEVELS: ReadonlySet<AttrValue> = new Set([1, 2, 3]);

const isLevel = (value: AttrValue): boolean => LEVELS.has(value);

const isText = (value: AttrValue): boolean => typeof value === 'string';

const textOf = (value: AttrValue | undefined): string => (typeof value === 'string' ? value : '');

const cellText = (value: AttrValue | undefined): string =>
  value === null || value === undefined ? '' : String(value);

const optionsOf = (cell: HtmlTableCell, make: NodeMaker): ElementNode[] =>
  (cell.element?.find('datalist')?.children ?? []).flatMap((option) =>
    option.kind === 'element' && option.tag === 'option'
      ? [make('table_option', { label: option.attr('value') ?? '' })]
      : [],
  );

const readTable = (table: HtmlElement, make: NodeMaker): ParsedContent => {
  const [head, ...rows] = tableGrid(table).rows;

  if (head === undefined || head.length === 0) {
    return false;
  }
  return [
    make(
      'table_head',
      {},
      head.map((cell) => make('table_column', { name: cell.text }, optionsOf(cell, make))),
    ),
    make(
      'table_body',
      {},
      rows.map((row) =>
        make(
          'table_row',
          {},
          row.map((cell) => make('table_cell', { value: cell.text === '' ? null : cell.text })),
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
      parse: [{ tag: 'table', read: readTable }],
    },
    table_head: {
      content: 'table_column+',
      render: () => renderTag('thead', {}, [renderTag('tr', {}, [contentHole])]),
    },
    table_column: {
      content: 'table_option*',
      attrs: { name: { default: '' }, type: { default: 'text' }, width: { default: null } },
      render: (node) =>
        renderTag('th', {}, [
          renderTag('span', {}, [textOf(node.attrs.name)]),
          renderTag('datalist', {}, [contentHole]),
        ]),
    },
    table_option: {
      attrs: { label: { verify: isText } },
      render: (node) => renderTag('option', { value: textOf(node.attrs.label) }),
    },
    table_body: { content: 'table_row*', render: () => renderTag('tbody') },
    table_row: { content: 'table_cell+', render: () => renderTag('tr') },
    table_cell: {
      attrs: { value: { default: null } },
      render: (node) => renderTag('td', {}, [cellText(node.attrs.value)]),
    },
    text: { group: 'inline', inline: true },
    hard_break: {
      group: 'inline',
      inline: true,
      render: () => renderTag('br'),
      parse: [{ tag: 'br' }],
    },
    mention: {
      group: 'inline',
      inline: true,
      attrs: { user: { verify: isText }, label: {} },
      render: (node) => renderTag('span', {}, [`@${textOf(node.attrs.label)}`]),
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
