import {
  contentHole,
  createSchema,
  inlineText,
  renderTag,
  type AttrValue,
  type ElementNode,
  type HtmlElement,
  type NodeSpec,
  type ParsedAttrs,
  type Schema,
  type SchemaSpec,
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

const LANGUAGE = /^[\w#+.-]{1,32}$/u;

const BOLD = /^(?:bold|bolder|[6-9]00)$/u;

const NORMAL_WEIGHT = /^(?:normal|lighter|[1-4]00)$/u;

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

const isLanguage = (value: AttrValue): boolean =>
  value === null || (typeof value === 'string' && LANGUAGE.test(value));

const textOf = (value: AttrValue | undefined): string => (typeof value === 'string' ? value : '');

const countOf = (value: string | undefined): number | undefined => {
  const count = Number.parseInt(value ?? '', 10);

  return Number.isInteger(count) && count >= 1 ? count : undefined;
};

const classed =
  (name: string, attrs: (element: HtmlElement) => ParsedAttrs = () => ({})) =>
  (element: HtmlElement): ParsedAttrs =>
    element.hasClass(name) ? attrs(element) : false;

const firstElement = (element: HtmlElement): HtmlElement | undefined =>
  element.children.find((child): child is HtmlElement => child.kind === 'element');

const checkboxOf = (item: HtmlElement): HtmlElement | undefined => {
  const first = firstElement(item);

  return first?.tag === 'input' && first.attr('type') === 'checkbox' ? first : undefined;
};

const isTask = (item: HtmlElement): boolean =>
  checkboxOf(item) !== undefined || item.attr('role') === 'checkbox';

const isChecked = (item: HtmlElement): boolean =>
  checkboxOf(item)?.attr('checked') !== undefined || item.attr('aria-checked') === 'true';

const isTodoList = (list: HtmlElement): boolean => {
  const items = list.children.filter(
    (child): child is HtmlElement => child.kind === 'element' && child.tag === 'li',
  );

  return (
    list.hasClass('nui-content__list--todo') ||
    list.hasClass('contains-task-list') ||
    (items.length > 0 && items.every(isTask))
  );
};

const languageOf = (pre: HtmlElement): ParsedAttrs => ({
  language: pre.classWith('language-') ?? pre.find('code')?.classWith('language-') ?? null,
});

const imageAttrs = (image: HtmlElement | undefined, figure?: HtmlElement): ParsedAttrs => {
  const src = image?.attr('src');

  if (image === undefined || src === undefined) {
    return false;
  }
  return {
    src,
    alt: image.attr('alt') ?? '',
    width: countOf(image.attr('width')) ?? null,
    caption: figure?.find('figcaption')?.text().trim() ?? '',
    align: figure?.classWith('nui-content__image--align-') ?? 'center',
  };
};

const cellAttrs = (cell: HtmlElement): ParsedAttrs => ({
  colspan: countOf(cell.attr('colspan')) ?? 1,
  rowspan: countOf(cell.attr('rowspan')) ?? 1,
  header: cell.tag === 'th',
});

const mentionAttrs = (span: HtmlElement): ParsedAttrs => {
  const user = span.attr('data-user');

  return span.hasClass('nui-content__mention') && user !== undefined
    ? { user, label: span.text().replace(/^@/u, '') }
    : false;
};

const styleIs =
  (property: string, test: (value: string) => boolean) =>
  (element: HtmlElement): ParsedAttrs =>
    test((element.style(property) ?? '').toLowerCase()) ? {} : false;

const decorated =
  (line: string) =>
  (element: HtmlElement): ParsedAttrs =>
    `${element.style('text-decoration') ?? ''} ${element.style('text-decoration-line') ?? ''}`.includes(
      line,
    )
      ? {}
      : false;

const presetOf =
  (prefix: string) =>
  (element: HtmlElement): ParsedAttrs => {
    const name = element.classWith(prefix);

    return name === undefined ? false : { name };
  };

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

const CONTENT_SPEC: SchemaSpec = {
  name: 'numior-content',
  version: 1,
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      render: () => renderTag('p', { class: part('paragraph') }),
      parse: [{ tag: 'p' }],
    },
    heading: {
      group: 'block',
      content: 'inline*',
      attrs: { level: { default: 1, verify: oneOf([1, 2, 3]) } },
      render: (node) =>
        renderTag(`h${String(node.attrs.level)}`, {
          class: part('heading', `level-${String(node.attrs.level)}`),
        }),
      parse: [1, 2, 3, 4, 5, 6].map((level) => ({
        tag: `h${String(level)}`,
        attrs: () => ({ level: Math.min(level, 3) }),
      })),
    },
    blockquote: {
      group: 'block',
      content: 'block+',
      render: () => renderTag('blockquote', { class: part('quote') }),
      parse: [{ tag: 'blockquote' }],
    },
    bullet_list: {
      group: 'block list',
      content: 'list_item+',
      render: () => renderTag('ul', { class: part('list', 'bullet') }),
      parse: [{ tag: 'ul' }],
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
      parse: [{ tag: 'ol', attrs: (list) => ({ start: countOf(list.attr('start')) ?? 1 }) }],
    },
    todo_list: {
      group: 'block list',
      content: 'todo_item+',
      render: () => renderTag('ul', { class: part('list', 'todo') }),
      parse: [{ tag: 'ul', priority: 1, attrs: (list) => (isTodoList(list) ? {} : false) }],
    },
    list_item: {
      content: 'paragraph (paragraph | list)*',
      render: () => renderTag('li', { class: part('item') }),
      parse: [{ tag: 'li' }],
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
      parse: [
        {
          tag: 'li',
          attrs: (item) => ({ checked: isChecked(item) }),
        },
      ],
    },
    code_block: {
      group: 'block',
      content: 'text*',
      marks: '',
      code: true,
      attrs: { language: { default: null, verify: isLanguage } },
      render: (node) =>
        renderTag('pre', { class: part('code') }, [
          renderTag(
            'code',
            {
              class:
                node.attrs.language === null ? null : `language-${textOf(node.attrs.language)}`,
            },
            [contentHole],
          ),
        ]),
      parse: [{ tag: 'pre', attrs: languageOf }],
    },
    divider: {
      group: 'block',
      render: () => renderTag('hr', { class: part('divider') }),
      parse: [{ tag: 'hr' }],
    },
    callout: {
      group: 'block',
      content: 'block+',
      attrs: { tone: { default: 'info', verify: oneOf(CONTENT_TONES) } },
      render: (node) =>
        renderTag('div', {
          class: part('callout', `tone-${textOf(node.attrs.tone)}`),
          role: 'note',
        }),
      parse: [
        {
          tag: 'div',
          attrs: classed('nui-content__callout', (callout) => ({
            tone: callout.classWith('nui-content__callout--tone-') ?? 'info',
          })),
        },
      ],
    },
    toggle: {
      group: 'block',
      content: 'paragraph block*',
      attrs: { open: { default: false, verify: isFlag } },
      render: (node) =>
        renderTag('div', { class: part('toggle', node.attrs.open === true && 'open') }, [
          renderTag('button', {
            type: 'button',
            class: part('toggle-button'),
            'aria-expanded': node.attrs.open === true ? 'true' : 'false',
            'aria-label': firstText(node),
          }),
          renderTag('div', { class: part('toggle-body') }, [contentHole]),
        ]),
      parse: [
        {
          tag: 'div',
          attrs: classed('nui-content__toggle', (toggle) => ({
            open: toggle.hasClass('nui-content__toggle--open'),
          })),
        },
        { tag: 'details', attrs: (details) => ({ open: details.attr('open') !== undefined }) },
      ],
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
      parse: [
        { tag: 'figure', attrs: (figure) => imageAttrs(figure.find('img'), figure) },
        { tag: 'img', attrs: (image) => imageAttrs(image) },
      ],
    },
    columns: {
      group: 'block',
      content: 'column{2,4}',
      render: () => renderTag('div', { class: part('columns') }),
      parse: [{ tag: 'div', attrs: classed('nui-content__columns') }],
    },
    column: {
      content: 'block+',
      render: () => renderTag('div', { class: part('column') }),
      parse: [{ tag: 'div', attrs: classed('nui-content__column') }],
    },
    table: {
      group: 'block',
      content: 'table_row+',
      render: () =>
        renderTag('div', { class: part('table') }, [
          renderTag('table', {}, [renderTag('tbody', {}, [contentHole])]),
        ]),
      parse: [{ tag: 'table' }],
    },
    table_row: { content: 'table_cell+', render: () => renderTag('tr'), parse: [{ tag: 'tr' }] },
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
      parse: [
        { tag: 'td', attrs: cellAttrs },
        { tag: 'th', attrs: cellAttrs },
      ],
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
      attrs: { user: { verify: isText }, label: { verify: isText } },
      render: (node) =>
        renderTag('span', { class: part('mention'), 'data-user': textOf(node.attrs.user) }, [
          `@${textOf(node.attrs.label)}`,
        ]),
      parse: [{ tag: 'span', attrs: mentionAttrs }],
    },
  },
  marks: {
    link: {
      attrs: { href: { verify: isLink } },
      render: (mark) => renderTag('a', { class: part('link'), href: textOf(mark.attrs.href) }),
      parse: [
        {
          tag: 'a',
          attrs: (link) => {
            const href = link.attr('href');

            return href === undefined ? false : { href };
          },
        },
      ],
    },
    bold: {
      group: 'format',
      render: () => renderTag('strong', { class: part('bold') }),
      parse: [
        { tag: 'strong' },
        { tag: 'b', attrs: styleIs('font-weight', (weight) => !NORMAL_WEIGHT.test(weight)) },
        { style: 'font-weight', attrs: styleIs('font-weight', (weight) => BOLD.test(weight)) },
      ],
    },
    italic: {
      group: 'format',
      render: () => renderTag('em', { class: part('italic') }),
      parse: [
        { tag: 'em' },
        { tag: 'i' },
        { style: 'font-style', attrs: styleIs('font-style', (style) => style !== 'normal') },
      ],
    },
    underline: {
      group: 'format',
      render: () => renderTag('u', { class: part('underline') }),
      parse: [
        { tag: 'u' },
        { tag: 'ins' },
        { style: 'text-decoration', attrs: decorated('underline') },
        { style: 'text-decoration-line', attrs: decorated('underline') },
      ],
    },
    strike: {
      group: 'format',
      render: () => renderTag('s', { class: part('strike') }),
      parse: [
        { tag: 's' },
        { tag: 'del' },
        { tag: 'strike' },
        { style: 'text-decoration', attrs: decorated('line-through') },
        { style: 'text-decoration-line', attrs: decorated('line-through') },
      ],
    },
    code: {
      render: () => renderTag('code', { class: part('code-inline') }),
      parse: [{ tag: 'code' }, { tag: 'kbd' }],
    },
    color: {
      attrs: { name: { verify: oneOf(CONTENT_COLOURS) } },
      render: (mark) => renderTag('span', { class: part('colour', textOf(mark.attrs.name)) }),
      parse: [{ tag: 'span', attrs: presetOf('nui-content__colour--') }],
    },
    highlight: {
      attrs: { name: { verify: oneOf(CONTENT_COLOURS) } },
      render: (mark) => renderTag('mark', { class: part('highlight', textOf(mark.attrs.name)) }),
      parse: [
        { tag: 'mark', attrs: presetOf('nui-content__highlight--') },
        { tag: 'mark', attrs: () => ({ name: 'yellow' }) },
      ],
    },
  },
};

export const contentSchema = createSchema(CONTENT_SPEC);

export const extendContentSchema = (nodes: Readonly<Record<string, NodeSpec>>): Schema =>
  createSchema({ ...CONTENT_SPEC, nodes: { ...CONTENT_SPEC.nodes, ...nodes } });
