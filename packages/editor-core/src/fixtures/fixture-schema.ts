import type { AttrValue } from '../model/node.types';
import { createSchema } from '../schema/schema';

const LEVELS: ReadonlySet<AttrValue> = new Set([1, 2, 3]);

const isLevel = (value: AttrValue): boolean => LEVELS.has(value);

const isText = (value: AttrValue): boolean => typeof value === 'string';

export const fixtureSchema = createSchema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1, verify: isLevel } },
    },
    blockquote: { group: 'block', content: 'block+' },
    bullet_list: { group: 'block list', content: 'list_item+' },
    ordered_list: { group: 'block list', content: 'list_item+', attrs: { start: { default: 1 } } },
    todo_list: { group: 'block list', content: 'todo_item+' },
    list_item: { content: 'paragraph (paragraph | list)*' },
    todo_item: { content: 'paragraph (paragraph | list)*', attrs: { checked: { default: false } } },
    code_block: {
      group: 'block',
      content: 'text*',
      marks: '',
      attrs: { language: { default: null } },
    },
    divider: { group: 'block' },
    callout: { group: 'block', content: 'block+', attrs: { tone: { default: 'info' } } },
    toggle: { group: 'block', content: 'paragraph block*', attrs: { open: { default: false } } },
    image: {
      group: 'block',
      attrs: { src: { verify: isText }, alt: { default: '' }, width: { default: null } },
    },
    columns: { group: 'block', content: 'column{2,4}' },
    column: { content: 'block+' },
    table: { group: 'block', content: 'table_row+' },
    table_row: { content: 'table_cell+' },
    table_cell: {
      content: 'paragraph+',
      attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, header: { default: false } },
    },
    text: { group: 'inline', inline: true },
    hard_break: { group: 'inline', inline: true },
    mention: { group: 'inline', inline: true, attrs: { user: { verify: isText }, label: {} } },
  },
  marks: {
    bold: { group: 'format' },
    italic: { group: 'format' },
    underline: { group: 'format' },
    strike: { group: 'format' },
    code: {},
    link: { attrs: { href: { verify: isText } } },
    color: { attrs: { name: { verify: isText } } },
  },
});
