import type { AttrValue } from '../model/node.types';
import { contentHole, renderTag } from '../render/render';
import { createSchema } from '../schema/schema';

const LEVELS: ReadonlySet<AttrValue> = new Set([1, 2, 3]);

const isLevel = (value: AttrValue): boolean => LEVELS.has(value);

const isText = (value: AttrValue): boolean => typeof value === 'string';

const textOf = (value: AttrValue | undefined): string => (typeof value === 'string' ? value : '');

const spanOf = (value: AttrValue | undefined): number | undefined =>
  typeof value === 'number' && value > 1 ? value : undefined;

export const fixtureSchema = createSchema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*', render: () => renderTag('p') },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1, verify: isLevel } },
      render: (node) => renderTag(`h${String(node.attrs.level)}`),
    },
    blockquote: { group: 'block', content: 'block+', render: () => renderTag('blockquote') },
    bullet_list: { group: 'block list', content: 'list_item+', render: () => renderTag('ul') },
    ordered_list: {
      group: 'block list',
      content: 'list_item+',
      attrs: { start: { default: 1 } },
      render: (node) =>
        renderTag('ol', { start: node.attrs.start === 1 ? null : node.attrs.start }),
    },
    todo_list: { group: 'block list', content: 'todo_item+', render: () => renderTag('ul') },
    list_item: { content: 'paragraph (paragraph | list)*', render: () => renderTag('li') },
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
    },
    divider: { group: 'block', render: () => renderTag('hr') },
    callout: {
      group: 'block',
      content: 'block+',
      attrs: { tone: { default: 'info' } },
      render: () => renderTag('div', { role: 'note' }),
    },
    toggle: {
      group: 'block',
      content: 'paragraph block*',
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
    },
    columns: { group: 'block', content: 'column{2,4}', render: () => renderTag('div') },
    column: { content: 'block+', render: () => renderTag('div') },
    table: {
      group: 'block',
      content: 'table_row+',
      render: () => renderTag('table', {}, [renderTag('tbody', {}, [contentHole])]),
    },
    table_row: { content: 'table_cell+', render: () => renderTag('tr') },
    table_cell: {
      content: 'paragraph+',
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, header: { default: false } },
      render: (node) =>
        renderTag(node.attrs.header === true ? 'th' : 'td', {
          colspan: spanOf(node.attrs.colspan),
          rowspan: spanOf(node.attrs.rowspan),
        }),
    },
    text: { group: 'inline', inline: true },
    hard_break: { group: 'inline', inline: true, render: () => renderTag('br') },
    mention: {
      group: 'inline',
      inline: true,
      attrs: { user: { verify: isText }, label: {} },
      render: (node) => renderTag('span', {}, [`@${textOf(node.attrs.label)}`]),
    },
  },
  marks: {
    bold: { group: 'format', render: () => renderTag('strong') },
    italic: { group: 'format', render: () => renderTag('em') },
    underline: { group: 'format', render: () => renderTag('u') },
    strike: { group: 'format', render: () => renderTag('s') },
    code: { render: () => renderTag('code') },
    link: {
      attrs: { href: { verify: isText } },
      render: (mark) => renderTag('a', { href: textOf(mark.attrs.href) }),
    },
    color: {
      attrs: { name: { verify: isText } },
      render: (mark) => renderTag('span', { class: `colour-${textOf(mark.attrs.name)}` }),
    },
  },
});
