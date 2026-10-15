import type { Doc } from '../doc/doc.types';
import type { ContentNode } from '../model/node.types';
import { renderTree } from '../render/render-tree';
import type { Schema } from '../schema/schema.types';

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

const escapeHTML = (text: string): string =>
  text.replaceAll(/["&<>]/g, (char) => ESCAPES[char] ?? char);

const attrsOf = (attrs: Readonly<Record<string, string>>): string =>
  Object.entries(attrs)
    .map(([name, value]) => (value === '' ? ` ${name}` : ` ${name}="${escapeHTML(value)}"`))
    .join('');

const element = (
  tag: string,
  attrs: Readonly<Record<string, string>>,
  children: readonly string[],
): string =>
  VOID.has(tag)
    ? `<${tag}${attrsOf(attrs)}>`
    : `<${tag}${attrsOf(attrs)}>${children.join('')}</${tag}>`;

export const contentToHTML = (schema: Schema, content: readonly ContentNode[]): string =>
  renderTree(schema, content, { element, text: escapeHTML }).join('');

export const toHTML = (doc: Doc): string => contentToHTML(doc.schema, doc.root.content);
