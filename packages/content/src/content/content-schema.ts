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
import { LINK_NODES } from './content-links';
import { TABLE_NODES } from './content-table';
import type {
  NuiContentAlign,
  NuiContentColour,
  NuiContentTone,
  NuiContentWrap,
} from './content.types';

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

export const CONTENT_ALIGNS: readonly NuiContentAlign[] = ['start', 'center', 'end'];

export const CONTENT_WRAPS: readonly NuiContentWrap[] = ['inline', 'wrap', 'break'];

export const IMAGE_WIDTH = { min: 0.2, max: 1 } as const;

const SCHEME = /^([a-z][\d+.a-z-]*):/i;

const LINK_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

const IMAGE_SCHEMES = new Set(['http', 'https']);

const FILE_SCHEMES = new Set(['http', 'https']);

const PERCENT = /^\s*(\d+(?:\.\d+)?)%\s*$/u;

const DATA_IMAGE = /^data:image\/(?:png|jpeg|gif|webp|avif);/i;

const LANGUAGE = /^[\w#+.-]{1,32}$/u;

const BOLD = /^(?:bold|bolder|[6-9]00)$/u;

const NORMAL_WEIGHT = /^(?:normal|lighter|[1-4]00)$/u;

const isText = (value: AttrValue): boolean => typeof value === 'string';

const isFlag = (value: AttrValue): boolean => typeof value === 'boolean';

const isCount = (value: AttrValue): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

const MAX_SHARE = 20;

const isShare = (value: AttrValue): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_SHARE;

const shareOf = (value: string | undefined): number => {
  const share = Number.parseFloat(value ?? '');

  return isShare(share) ? share : 1;
};

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

const isFileLink = (value: AttrValue): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }
  const scheme = schemeOf(value);

  return scheme === undefined || FILE_SCHEMES.has(scheme);
};

const isWidth = (value: AttrValue): boolean =>
  value === null ||
  (typeof value === 'number' && value >= IMAGE_WIDTH.min && value <= IMAGE_WIDTH.max);

const isSize = (value: AttrValue): boolean =>
  value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0);

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

  return (first?.tag === 'input' && first.attr('type') === 'checkbox') ||
    first?.attr('role') === 'checkbox'
    ? first
    : undefined;
};

const isTask = (item: HtmlElement): boolean =>
  checkboxOf(item) !== undefined || item.attr('role') === 'checkbox';

const isChecked = (item: HtmlElement): boolean => {
  const box = checkboxOf(item);

  return (
    box?.attr('checked') !== undefined ||
    box?.attr('aria-checked') === 'true' ||
    item.attr('aria-checked') === 'true'
  );
};

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

const shareIn = (element: HtmlElement | undefined): number | null => {
  const match = PERCENT.exec(element?.style('inline-size') ?? element?.style('width') ?? '');
  const share = match?.[1] === undefined ? Number.NaN : Number.parseFloat(match[1]) / 100;

  return Number.isFinite(share)
    ? Math.min(IMAGE_WIDTH.max, Math.max(IMAGE_WIDTH.min, share))
    : null;
};

const alignIn = (figure: HtmlElement | undefined): string => {
  const align = figure?.classWith('nui-content__image--align-');

  return align !== undefined && CONTENT_ALIGNS.some((known) => known === align) ? align : 'center';
};

const wrapIn = (holder: HtmlElement | undefined): string => {
  const wrap = holder?.classWith('nui-content__image--wrap-');

  if (holder?.tag === 'figure') {
    return 'break';
  }
  return wrap !== undefined && CONTENT_WRAPS.some((known) => known === wrap) ? wrap : 'inline';
};

const captionIn = (holder: HtmlElement | undefined): string =>
  (
    holder?.find('figcaption') ??
    holder?.children.find(
      (child): child is HtmlElement =>
        child.kind === 'element' && child.hasClass('nui-content__caption'),
    )
  )
    ?.text()
    .trim() ?? '';

const imageAttrs = (image: HtmlElement | undefined, holder?: HtmlElement): ParsedAttrs => {
  const src = image?.attr('src');

  if (image === undefined || src === undefined) {
    return false;
  }
  return {
    src,
    alt: image.attr('alt') ?? '',
    width: shareIn(holder) ?? shareIn(image),
    caption: captionIn(holder),
    align: alignIn(holder),
    wrap: wrapIn(holder),
  };
};

const nameIn = (link: HtmlElement): string =>
  (
    link.children.find(
      (child): child is HtmlElement =>
        child.kind === 'element' && child.hasClass('nui-content__file-name'),
    ) ?? link
  )
    .text()
    .trim();

const fileAttrs = (link: HtmlElement): ParsedAttrs => {
  const url = link.attr('href');
  const size = Number.parseInt(link.attr('data-size') ?? '', 10);

  return link.hasClass('nui-content__file') && url !== undefined
    ? {
        url,
        name: link.attr('download') ?? nameIn(link),
        size: Number.isInteger(size) && size >= 0 ? size : null,
        type: link.attr('type') ?? '',
      }
    : false;
};

export type NuiContentFileKind =
  | 'file'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'archive'
  | 'sheet'
  | 'text';

const KIND_BY_EXTENSION: Readonly<Record<string, NuiContentFileKind>> = {
  pdf: 'pdf',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  gz: 'archive',
  tar: 'archive',
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  ods: 'sheet',
  doc: 'text',
  docx: 'text',
  txt: 'text',
  md: 'text',
  rtf: 'text',
  odt: 'text',
};

export const fileKindOf = (type: string, name: string): NuiContentFileKind => {
  const family = type.split('/')[0] ?? '';

  if (family === 'image' || family === 'video' || family === 'audio') {
    return family;
  }
  return KIND_BY_EXTENSION[name.split('.').at(-1)?.toLowerCase() ?? ''] ?? 'file';
};

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

export const imageWidthStyle = (width: AttrValue | undefined): string | null =>
  typeof width === 'number' ? `inline-size: ${String(Math.round(width * 1000) / 10)}%;` : null;

const renderImage = (node: ElementNode) => {
  const wrap = textOf(node.attrs.wrap);
  const caption = wrap === 'inline' ? '' : textOf(node.attrs.caption);

  return renderTag(
    'span',
    {
      class: part('image', `wrap-${wrap}`, `align-${textOf(node.attrs.align)}`),
      style: imageWidthStyle(node.attrs.width),
    },
    [
      renderTag('img', {
        class: part('picture'),
        src: textOf(node.attrs.src),
        alt: textOf(node.attrs.alt),
        loading: 'lazy',
      }),
      ...(caption === '' ? [] : [renderTag('span', { class: part('caption') }, [caption])]),
    ],
  );
};

const renderFile = (node: ElementNode) => {
  const name = textOf(node.attrs.name);
  const size = node.attrs.size;

  return renderTag(
    'a',
    {
      class: part('file', `kind-${fileKindOf(textOf(node.attrs.type), name)}`),
      href: textOf(node.attrs.url),
      download: name,
      type: textOf(node.attrs.type) === '' ? null : textOf(node.attrs.type),
      'data-size': typeof size === 'number' ? String(size) : null,
    },
    [
      renderTag('span', { class: part('file-icon'), 'aria-hidden': 'true' }),
      renderTag('span', { class: part('file-name') }, [name]),
    ],
  );
};

const CONTENT_SPEC: SchemaSpec = {
  name: 'numior-content',
  version: 4,
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
      slots: 'rest',
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
          renderTag('span', {
            class: part('check'),
            role: 'checkbox',
            'aria-checked': node.attrs.checked === true ? 'true' : 'false',
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
      slots: 'rest',
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
      slots: 'rest',
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
      group: 'inline',
      inline: true,
      attrs: {
        src: { verify: isImageSource },
        alt: { default: '', verify: isText },
        caption: { default: '', verify: isText },
        width: { default: null, verify: isWidth },
        align: { default: 'center', verify: oneOf(CONTENT_ALIGNS) },
        wrap: { default: 'inline', verify: oneOf(CONTENT_WRAPS) },
      },
      render: renderImage,
      parse: [
        { tag: 'figure', attrs: (figure) => imageAttrs(figure.find('img'), figure) },
        {
          tag: 'span',
          priority: 1,
          attrs: (span) =>
            span.hasClass('nui-content__image') ? imageAttrs(span.find('img'), span) : false,
        },
        { tag: 'img', attrs: (image) => imageAttrs(image) },
      ],
    },
    file: {
      group: 'inline',
      inline: true,
      attrs: {
        url: { verify: isFileLink },
        name: { default: '', verify: isText },
        size: { default: null, verify: isSize },
        type: { default: '', verify: isText },
      },
      render: renderFile,
      parse: [{ tag: 'a', priority: 1, attrs: fileAttrs }],
    },
    columns: {
      group: 'block',
      content: 'column{2,4}',
      render: () =>
        renderTag('div', { class: part('columns') }, [
          renderTag('div', { class: part('columns-track') }, [contentHole]),
        ]),
      parse: [{ tag: 'div', attrs: classed('nui-content__columns') }],
    },
    column: {
      content: 'block+',
      slots: 'all',
      attrs: { width: { default: 1, verify: isShare } },
      render: (node) =>
        renderTag('div', {
          class: part('column'),
          style: node.attrs.width === 1 ? null : `flex-grow: ${String(node.attrs.width)};`,
        }),
      parse: [
        {
          tag: 'div',
          attrs: classed('nui-content__column', (column) => ({
            width: shareOf(column.style('flex-grow')),
          })),
        },
      ],
    },
    ...TABLE_NODES,
    ...LINK_NODES,
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
