import type { Doc } from '../doc/doc.types';
import { childOffsets } from '../model/node';
import type { Desc, ElementDesc, ViewContext } from './desc';
import type { DomPoint } from './view.types';

const startOf = (desc: Desc): number => {
  const parent = desc.parent;

  if (parent === null) {
    return -1;
  }
  return contentStart(parent) + (childOffsets(parent.node)[desc.index] ?? 0);
};

export const contentStart = (desc: ElementDesc): number =>
  desc.parent === null ? 0 : startOf(desc) + 1;

const contentEnd = (desc: ElementDesc): number => contentStart(desc) + desc.node.size - 2;

const positionAtChild = (
  context: ViewContext,
  desc: ElementDesc,
  content: HTMLElement,
  index: number,
): number => {
  const nodes = content.childNodes;

  for (let at = index; at < nodes.length; at += 1) {
    const node = nodes[at];
    const child = node === undefined ? undefined : context.descs.get(node);

    if (child !== undefined && child.parent === desc) {
      return startOf(child);
    }
  }
  return contentEnd(desc);
};

const precedes = (container: Node, offset: number, content: HTMLElement): boolean => {
  const child = container.childNodes[offset];

  if (child === undefined) {
    return false;
  }
  return (
    child.contains(content) ||
    (child.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
};

const positionIn = (context: ViewContext, desc: Desc, node: Node, offset: number): number => {
  if (desc.kind === 'text') {
    if (node === desc.dom) {
      return startOf(desc) + Math.max(0, Math.min(offset, desc.dom.data.length));
    }
    return startOf(desc) + (offset === 0 ? 0 : desc.node.text.length);
  }
  const content = desc.contentDOM;

  if (content === null) {
    return startOf(desc) + (offset === 0 ? 0 : 1);
  }
  if (node === content) {
    return positionAtChild(context, desc, content, offset);
  }
  return precedes(node, offset, content) ? contentStart(desc) : contentEnd(desc);
};

const indexOf = (node: Node): number => {
  let index = 0;

  for (let sibling = node.previousSibling; sibling !== null; sibling = sibling.previousSibling) {
    index += 1;
  }
  return index;
};

export const posAtDOM = (context: ViewContext, node: Node, offset: number): number => {
  let current = node;
  let at = offset;

  for (;;) {
    const desc = context.descs.get(current);

    if (desc !== undefined) {
      return positionIn(context, desc, current, at);
    }
    const parent = current.parentNode;

    if (parent === null) {
      throw new RangeError('The DOM position lies outside the editor');
    }
    at = indexOf(current) + (at > 0 ? 1 : 0);
    current = parent;
  }
};

export const domAtPos = (root: ElementDesc, doc: Doc, pos: number): DomPoint => {
  const resolved = doc.resolve(pos);
  let desc = root;

  for (let depth = 0; depth < resolved.depth; depth += 1) {
    const child = desc.children[resolved.indexAt(depth)];

    if (child?.kind !== 'element') {
      throw new RangeError(`The view does not match the document at ${pos}`);
    }
    desc = child;
  }
  const child = desc.children[resolved.index];
  const before = desc.children[resolved.index - 1];

  if (resolved.textOffset > 0 && child?.kind === 'text') {
    return { node: child.dom, offset: resolved.textOffset };
  }
  if (before?.kind === 'text') {
    return { node: before.dom, offset: before.dom.data.length };
  }
  if (child?.kind === 'text') {
    return { node: child.dom, offset: 0 };
  }
  if (desc.contentDOM === null) {
    throw new RangeError(`Position ${pos} lies inside a leaf`);
  }
  return { node: desc.contentDOM, offset: resolved.index };
};
