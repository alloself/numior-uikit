import type { ContentNode, ElementNode } from '../../src';
import { fixtureSchema } from '../../src/fixtures';

const attrsText = (node: ElementNode): string => {
  const specs = fixtureSchema.nodes.get(node.type)?.attrs ?? {};

  const changed = Object.entries(node.attrs).filter(
    ([key, value]) => specs[key]?.default !== value && key !== 'src',
  );

  return changed.length === 0
    ? ''
    : `{${changed.map(([key, value]) => `${key}=${String(value)}`).join(',')}}`;
};

const outlineNode = (node: ContentNode): string => {
  if (node.kind === 'text') {
    const marks = node.marks.map((mark) => mark.type).join('+');

    return marks === '' ? JSON.stringify(node.text) : `${marks}:${JSON.stringify(node.text)}`;
  }
  const inner = node.content.map(outlineNode).join(' ');

  return `${node.type}${attrsText(node)}${node.leaf ? '' : `(${inner})`}`;
};

export const outlineOf = (root: ElementNode): string => root.content.map(outlineNode).join(' ');
