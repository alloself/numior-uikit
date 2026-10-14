import type { Doc } from '@numior/editor-core';
import { buildContent } from './content-tree';
import type { NuiContentSize } from './content.types';

export interface RenderContentOptions {
  readonly size?: NuiContentSize | undefined;
}

const VOID = new Set([
  'area',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'source',
  'track',
  'wbr',
]);

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const escape = (text: string): string =>
  text.replaceAll(/["&<>]/g, (char) => ESCAPES[char] ?? char);

const attrsOf = (attrs: Readonly<Record<string, string>>): string =>
  Object.entries(attrs)
    .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${escape(value)}"`))
    .join('');

const element = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  children: readonly string[],
): string =>
  VOID.has(tag)
    ? `<${tag}${attrsOf(attrs)}>`
    : `<${tag}${attrsOf(attrs)}>${children.join('')}</${tag}>`;

export const renderContent = (doc: Doc, options: RenderContentOptions = {}): string => {
  const blocks = buildContent(doc.schema, doc.root, { element, text: escape }).join('');

  const root = ['nui-content', `nui-content--size-${options.size ?? 'md'}`].join(' ');

  return element('div', { class: root }, [blocks]);
};
