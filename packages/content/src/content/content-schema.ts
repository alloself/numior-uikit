import {
  contentHole,
  createSchema,
  inlineText,
  renderTag,
  type AttrValue,
  type ElementNode,
} from '@numior/editor-core';
import type { NuiContentAlign, NuiContentColour, NuiContentTone } from './content.types';

export const CONTENT_TONES: readonly NuiContentTone[] = ['info', 'success', 'warning', 'error'];

export const CONTENT_COLOURS: readonly NuiContentColour[] = [
  'gray',
  'brown',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'red',
];

const ALIGNS: readonly NuiContentAlign[] = ['center', 'start', 'end', 'wide'];

const SCHEME = /^([a-z][\d+.a-z-]*):/i;

const LINK_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

const IMAGE_SCHEMES = new Set(['http', 'https', 'blob']);

const DATA_IMAGE = /^data:image\/(?:png|jpeg|gif|webp|avif);/i;

const isText = (value: AttrValue): boolean => typeof value === 'string';

const isFlag = (value: AttrValue): boolean => typeof value === 'boolean';

const isCount = (value: AttrValue): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

const oneOf =
  (values: readonly AttrValue[]) =>
  (value: AttrValue): boolean =>
    values.includes(value);

const schemeOf = (value: string): string | undefined =>
  SCHEME.exec(value.trim())?.[1]?.toLowerCase();

const isLink = (value: AttrValue): boolean => {
  const scheme = typeof value === 'string' ? schemeOf(value) : undefined;

  return typeof value === 'string' && (scheme === undefined || LINK_SCHEMES.has(scheme));
};

const isImageSource = (value: AttrValue): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }
  const scheme = schemeOf(value);

  return scheme === undefined || IMAGE_SCHEMES.has(scheme) || DATA_IMAGE.test(value.trim());
};

const textOf = (value: AttrValue | undefined): string => (typeof value === 'string' ? value : '');

const part = (name: string, ...modifiers: readonly (string | false)[]): string =>
  [
    `nui-content__${name}`,
    ...modifiers
      .filter((modifier) => modifier !== false)
      .map((modifier) => `nui-content__${name}--${modifier}`),
  ].join(' ');

const firstText = (node: ElementNode): string => {
  const first = node.content[0];

  return first?.kind === 'element' ? inlineText(first).replaceAll('￼', '').trim() : '';
};

const renderImage = (node: ElementNode) => {
  const caption = textOf(node.attrs.caption);

  return renderTag('figure', { class: part('image', `align-${textOf(node.attrs.align)}`) }, [
    renderTag('img', {
      class: part('picture'),
      src: textOf(node.attrs.src),
      alt: textOf(node.attrs.alt),
      width: node.attrs.width,
      loading: 'lazy',
    }),
    ...(caption === '' ? [] : [renderTag('figcaption', { class: part('caption') }, [caption])]),
  ]);
};

export const contentSchema = createSchema({
  name: 'numior-content',
  version: 1,
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      render: () => renderTag('p', { class: part('paragraph') }),
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1, verify: oneOf([1, 2, 3]) } },
      render: (node) =>
        renderTag(`h${String(node.attrs.level)}`, {
          class: part('heading', `level-${String(node.attrs.level)}`),
        }),
    },
    blockquote: {
      group: 'block',
      content: 'block+',
      render: () => renderTag('blockquote', { class: part('quote') }),
    },
    bullet_list: {
      group: 'block list',
      content: 'list_item+',
      render: () => renderTag('ul', { class: part('list', 'bullet') }),
    },
    ordered_list: {
      group: 'block list',
      content: 'list_item+',
      attrs: { start: { default: 1, verify: isCount } },
      render: (node) =>
        renderTag('ol', {
          class: part('list', 'ordered'),
          start: node.attrs.start === 1 ? null : node.attrs.start,
        }),
    },
    todo_list: {
      group: 'block list',
      content: 'todo_item+',
      render: () => renderTag('ul', { class: part('list', 'todo') }),
    },
    list_item: {
      content: 'paragraph (paragraph | list)*',
      render: () => renderTag('li', { class: part('item') }),
    },
    todo_item: {
      content: 'paragraph (paragraph | list)*',
      attrs: { checked: { default: false, verify: isFlag } },
      render: (node) =>
        renderTag('li', { class: part('todo', node.attrs.checked === true && 'checked') }, [
          renderTag('input', {
            class: part('check'),
            type: 'checkbox',
            checked: node.attrs.checked === true,
            tabindex: -1,
            'aria-readonly': 'true',
            'aria-label': firstText(node),
          }),
          renderTag('div', { class: part('todo-body') }, [contentHole]),
        ]),
    },
    code_block: {
      group: 'block',
      content: 'text*',
      marks: '',
      code: true,
      attrs: { language: { default: null } },
      render: () =>
        renderTag('pre', { class: part('code') }, [renderTag('code', {}, [contentHole])]),
    },
    divider: { group: 'block', render: () => renderTag('hr', { class: part('divider') }) },
    callout: {
      group: 'block',
      content: 'block+',
      attrs: { tone: { default: 'info', verify: oneOf(CONTENT_TONES) } },
      render: (node) =>
        renderTag('div', {
          class: part('callout', `tone-${textOf(node.attrs.tone)}`),
          role: 'note',
        }),
    },
    toggle: {
      group: 'block',
      content: 'paragraph block*',
      attrs: { open: { default: false, verify: isFlag } },
      render: (node) =>
        renderTag('div', { class: part('toggle', node.attrs.open === true && 'open') }),
    },
    image: {
      group: 'block',
      attrs: {
        src: { verify: isImageSource },
        alt: { default: '', verify: isText },
        caption: { default: '', verify: isText },
        width: { default: null, verify: (value) => value === null || isCount(value) },
        align: { default: 'center', verify: oneOf(ALIGNS) },
      },
      render: renderImage,
    },
    columns: {
      group: 'block',
      content: 'column{2,4}',
      render: () => renderTag('div', { class: part('columns') }),
    },
    column: { content: 'block+', render: () => renderTag('div', { class: part('column') }) },
    table: {
      group: 'block',
      content: 'table_row+',
      render: () =>
        renderTag('div', { class: part('table') }, [
          renderTag('table', {}, [renderTag('tbody', {}, [contentHole])]),
        ]),
    },
    table_row: { content: 'table_cell+', render: () => renderTag('tr') },
    table_cell: {
      content: 'paragraph+',
      attrs: {
        colspan: { default: 1, verify: isCount },
        rowspan: { default: 1, verify: isCount },
        header: { default: false, verify: isFlag },
      },
      render: (node) =>
        renderTag(node.attrs.header === true ? 'th' : 'td', {
          class: part('cell'),
          colspan: node.attrs.colspan === 1 ? null : node.attrs.colspan,
          rowspan: node.attrs.rowspan === 1 ? null : node.attrs.rowspan,
        }),
    },
    text: { group: 'inline', inline: true },
    hard_break: { group: 'inline', inline: true, render: () => renderTag('br') },
    mention: {
      group: 'inline',
      inline: true,
      attrs: { user: { verify: isText }, label: { verify: isText } },
      render: (node) =>
        renderTag('span', { class: part('mention') }, [`@${textOf(node.attrs.label)}`]),
    },
  },
  marks: {
    link: {
      attrs: { href: { verify: isLink } },
      render: (mark) => renderTag('a', { class: part('link'), href: textOf(mark.attrs.href) }),
    },
    bold: { group: 'format', render: () => renderTag('strong', { class: part('bold') }) },
    italic: { group: 'format', render: () => renderTag('em', { class: part('italic') }) },
    underline: { group: 'format', render: () => renderTag('u', { class: part('underline') }) },
    strike: { group: 'format', render: () => renderTag('s', { class: part('strike') }) },
    code: { render: () => renderTag('code', { class: part('code-inline') }) },
    color: {
      attrs: { name: { verify: oneOf(CONTENT_COLOURS) } },
      render: (mark) => renderTag('span', { class: part('colour', textOf(mark.attrs.name)) }),
    },
    highlight: {
      attrs: { name: { verify: oneOf(CONTENT_COLOURS) } },
      render: (mark) => renderTag('mark', { class: part('highlight', textOf(mark.attrs.name)) }),
    },
  },
});
