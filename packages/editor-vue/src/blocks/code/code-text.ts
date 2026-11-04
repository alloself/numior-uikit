import { ContentNodeKind, type ElementNode } from '@numior/editor-core';

export const codeTextOf = (node: ElementNode): string =>
  node.content.map((child) => (child.kind === ContentNodeKind.Text ? child.text : '')).join('');
