import { sameAttrs, sameMarks } from '../model/node';
import type { ContentNode, ElementNode, NodeId, TextNode } from '../model/node.types';
import type { NodeType, Schema } from '../schema/schema.types';
import { fillChunks, placeInChunks, tidyChunks } from './chunks';
import { renderLeaf, renderParent, type RenderedDom } from './render-dom';
import type { NodeView, NodeViewFactory } from './view.types';

export interface ElementDesc {
  readonly kind: 'element';
  node: ElementNode;
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement | null;
  readonly view: NodeView | undefined;
  children: Desc[];
  readonly parent: ElementDesc | null;
  index: number;
  hack: HTMLBRElement | null;
}

export interface TextDesc {
  readonly kind: 'text';
  node: TextNode;
  readonly dom: Text;
  readonly outer: ChildNode;
  readonly parent: ElementDesc;
  index: number;
}

export type Desc = ElementDesc | TextDesc;

export interface ViewContext {
  readonly document: Document;
  readonly schema: Schema;
  readonly descs: WeakMap<Node, Desc>;
  readonly byId: Map<NodeId, ElementDesc>;
  readonly chunks: WeakSet<Node>;
  readonly nodeViews: Readonly<Record<string, NodeViewFactory>>;
}

export const outerOf = (desc: Desc): ChildNode => (desc.kind === 'text' ? desc.outer : desc.dom);

const typeOf = (schema: Schema, name: string): NodeType => {
  const type = schema.nodes.get(name);

  if (type === undefined) {
    throw new RangeError(`The schema has no node type "${name}" to render`);
  }
  return type;
};

export const renderNodeDOM = (
  document: Document,
  schema: Schema,
  node: ElementNode,
): RenderedDom => {
  const type = typeOf(schema, node.type);
  const spec = type.render(node);

  return type.leaf
    ? { dom: renderLeaf(document, spec), contentDOM: null }
    : renderParent(document, spec);
};

const renderNode = (
  context: ViewContext,
  node: ElementNode,
): RenderedDom & { readonly view: NodeView | undefined } => {
  const factory = context.nodeViews[node.type];

  if (factory === undefined) {
    return { ...renderNodeDOM(context.document, context.schema, node), view: undefined };
  }
  const view = factory(node);

  return { dom: view.dom, contentDOM: view.contentDOM, view };
};

const isTextblock = (context: ViewContext, desc: ElementDesc): boolean =>
  desc.parent !== null && context.schema.nodes.get(desc.node.type)?.inlineContent === true;

const endsWithBreak = (desc: ElementDesc): boolean => {
  const last = desc.children.at(-1);

  return last === undefined || outerOf(last).nodeName === 'BR';
};

const syncHack = (context: ViewContext, desc: ElementDesc): void => {
  const content = desc.contentDOM;

  if (content === null) {
    return;
  }
  if (!isTextblock(context, desc) || !endsWithBreak(desc)) {
    desc.hack?.remove();
    desc.hack = null;
    return;
  }
  const hack = desc.hack ?? context.document.createElement('br');

  desc.hack = hack;
  if (content.lastChild !== hack) {
    content.append(hack);
  }
};

const createText = (
  context: ViewContext,
  node: TextNode,
  parent: ElementDesc,
  index: number,
): TextDesc => {
  const dom = context.document.createTextNode(node.text);
  let outer: ChildNode = dom;

  for (const mark of node.marks.toReversed()) {
    const type = context.schema.marks.get(mark.type);

    if (type === undefined) {
      throw new RangeError(`The schema has no mark type "${mark.type}" to render`);
    }
    const wrapper = renderParent(context.document, type.render(mark));

    wrapper.contentDOM?.append(outer);
    outer = wrapper.dom;
  }
  const desc: TextDesc = { kind: 'text', node, dom, outer, parent, index };

  for (let current: Node | null = dom; current !== null; current = current.parentNode) {
    context.descs.set(current, desc);
  }
  return desc;
};

const LINE_HEIGHT = 24;

const LINE_LENGTH = 80;

const estimateOf = (context: ViewContext, block: Element): number => {
  const desc = context.descs.get(block);
  const size = desc?.kind === 'element' ? desc.node.size : LINE_LENGTH;

  return Math.max(1, Math.ceil(size / LINE_LENGTH)) * LINE_HEIGHT;
};

const chunked = (context: ViewContext, desc: ElementDesc): boolean =>
  desc.parent === null && context.schema.nodes.get(desc.node.type)?.inlineContent !== true;

const createElement = (
  context: ViewContext,
  node: ElementNode,
  parent: ElementDesc,
  index: number,
): ElementDesc => {
  const { dom, contentDOM, view } = renderNode(context, node);

  const desc: ElementDesc = {
    kind: 'element',
    node,
    dom,
    contentDOM,
    view,
    children: [],
    parent,
    index,
    hack: null,
  };

  context.descs.set(dom, desc);
  if (contentDOM !== null) {
    context.descs.set(contentDOM, desc);
  }
  context.byId.set(node.id, desc);
  fillChildren(context, desc);
  return desc;
};

const createDesc = (
  context: ViewContext,
  node: ContentNode,
  parent: ElementDesc,
  index: number,
): Desc =>
  node.kind === 'text'
    ? createText(context, node, parent, index)
    : createElement(context, node, parent, index);

const fillChildren = (context: ViewContext, desc: ElementDesc): void => {
  const content = desc.contentDOM;

  if (content === null) {
    return;
  }
  desc.children = desc.node.content.map((child, index) => createDesc(context, child, desc, index));
  if (chunked(context, desc)) {
    fillChunks(content, desc.children.map(outerOf), context.chunks, (block) =>
      estimateOf(context, block),
    );
  } else {
    content.replaceChildren(...desc.children.map(outerOf));
  }
  syncHack(context, desc);
};

export const redrawContent = (context: ViewContext, desc: ElementDesc): void => {
  for (const child of desc.children) {
    forget(context, child);
  }
  fillChildren(context, desc);
};

export const descAround = (context: ViewContext, node: Node | null): Desc | undefined => {
  for (let current = node; current !== null; current = current.parentNode) {
    const desc = context.descs.get(current);

    if (desc !== undefined) {
      return desc;
    }
  }
  return undefined;
};

export const textblockAround = (
  context: ViewContext,
  node: Node | null,
): ElementDesc | undefined => {
  const found = descAround(context, node);

  for (let desc = found?.kind === 'text' ? found.parent : found; desc !== undefined;) {
    if (desc.parent === null || isTextblock(context, desc)) {
      return desc;
    }
    desc = desc.parent;
  }
  return undefined;
};

export const createRootDesc = (
  context: ViewContext,
  dom: HTMLElement,
  node: ElementNode,
): ElementDesc => {
  const desc: ElementDesc = {
    kind: 'element',
    node,
    dom,
    contentDOM: dom,
    view: undefined,
    children: [],
    parent: null,
    index: 0,
    hack: null,
  };

  context.descs.set(dom, desc);
  context.byId.set(node.id, desc);
  fillChildren(context, desc);
  return desc;
};

export const widgetOwner = (
  context: ViewContext,
  target: EventTarget | null,
): ElementDesc | undefined => {
  for (let current = target instanceof Node ? target : null; current !== null;) {
    const desc = context.descs.get(current);

    if (desc !== undefined) {
      return desc.kind === 'element' &&
        desc.view !== undefined &&
        current === desc.dom &&
        current !== desc.contentDOM
        ? desc
        : undefined;
    }
    current = current.parentNode;
  }
  return undefined;
};

export const widgetAround = (context: ViewContext, target: EventTarget | null): boolean =>
  widgetOwner(context, target) !== undefined;

const forget = (context: ViewContext, desc: Desc): void => {
  if (desc.kind === 'text') {
    return;
  }
  desc.view?.destroy();
  if (context.byId.get(desc.node.id) === desc) {
    context.byId.delete(desc.node.id);
  }
  for (const child of desc.children) {
    forget(context, child);
  }
};

const elementsById = (children: readonly Desc[]): Map<NodeId, ElementDesc> => {
  const found = new Map<NodeId, ElementDesc>();

  for (const child of children) {
    if (child.kind === 'element') {
      found.set(child.node.id, child);
    }
  }
  return found;
};

const sameRender = (desc: ElementDesc, after: ElementNode): boolean =>
  desc.view === undefined
    ? desc.node.type === after.type && sameAttrs(desc.node.attrs, after.attrs)
    : desc.node.type === after.type && desc.view.update(after);

interface Matching {
  readonly previous: readonly Desc[];
  readonly reusable: ReadonlyMap<NodeId, ElementDesc>;
  readonly used: Set<Desc>;
  textFrom: number;
}

interface TextMatch {
  readonly desc: TextDesc;
  readonly at: number;
}

const findText = (matching: Matching, node: TextNode): TextMatch | undefined => {
  for (let at = matching.textFrom; at < matching.previous.length; at += 1) {
    const desc = matching.previous[at];

    if (
      desc?.kind === 'text' &&
      !matching.used.has(desc) &&
      sameMarks(desc.node.marks, node.marks)
    ) {
      return { desc, at };
    }
  }
  return undefined;
};

const syncText = (desc: TextDesc, node: TextNode, index: number): void => {
  desc.node = node;
  desc.index = index;
  if (desc.dom.data !== node.text) {
    desc.dom.data = node.text;
  }
};

const matchText = (
  context: ViewContext,
  parent: ElementDesc,
  matching: Matching,
  node: TextNode,
  index: number,
): Desc => {
  const match = findText(matching, node);

  if (match === undefined) {
    return createText(context, node, parent, index);
  }
  matching.used.add(match.desc);
  matching.textFrom = match.at + 1;
  syncText(match.desc, node, index);
  return match.desc;
};

const matchElement = (
  context: ViewContext,
  parent: ElementDesc,
  matching: Matching,
  node: ElementNode,
  index: number,
): Desc => {
  const found = matching.reusable.get(node.id);

  if (found === undefined || matching.used.has(found) || !sameRender(found, node)) {
    return createElement(context, node, parent, index);
  }
  matching.used.add(found);
  found.index = index;
  syncElement(context, found, node);
  return found;
};

const sharedPrefix = (previous: readonly Desc[], next: readonly ContentNode[]): number => {
  const limit = Math.min(previous.length, next.length);
  let count = 0;

  while (count < limit && previous[count]?.node === next[count]) {
    count += 1;
  }
  return count;
};

const sharedSuffix = (
  previous: readonly Desc[],
  next: readonly ContentNode[],
  prefix: number,
): number => {
  const limit = Math.min(previous.length, next.length) - prefix;
  let count = 0;

  while (count < limit && previous.at(-1 - count)?.node === next.at(-1 - count)) {
    count += 1;
  }
  return count;
};

const reconcile = (
  context: ViewContext,
  parent: ElementDesc,
  previous: readonly Desc[],
  nodes: readonly ContentNode[],
  from: number,
): Desc[] => {
  const matching: Matching = {
    previous,
    reusable: elementsById(previous),
    used: new Set(),
    textFrom: 0,
  };

  const next = nodes.map((node, offset) =>
    node.kind === 'element'
      ? matchElement(context, parent, matching, node, from + offset)
      : matchText(context, parent, matching, node, from + offset),
  );

  for (const child of previous) {
    if (!matching.used.has(child)) {
      outerOf(child).remove();
      forget(context, child);
    }
  }
  return next;
};

const placeBefore = (
  content: HTMLElement,
  children: readonly Desc[],
  anchor: ChildNode | null,
): void => {
  let next = anchor;

  for (const child of children.toReversed()) {
    const outer = outerOf(child);

    if (outer.parentNode !== content || outer.nextSibling !== next) {
      content.insertBefore(outer, next);
    }
    next = outer;
  }
};

export const syncElement = (context: ViewContext, desc: ElementDesc, node: ElementNode): void => {
  const content = desc.contentDOM;

  if (desc.node === node) {
    return;
  }
  desc.node = node;
  if (content === null) {
    return;
  }
  const previous = desc.children;
  const prefix = sharedPrefix(previous, node.content);
  const suffix = sharedSuffix(previous, node.content, prefix);
  const kept = previous.slice(previous.length - suffix);

  const middle = reconcile(
    context,
    desc,
    previous.slice(prefix, previous.length - suffix),
    node.content.slice(prefix, node.content.length - suffix),
    prefix,
  );

  kept.forEach((child, offset) => {
    child.index = node.content.length - suffix + offset;
  });

  const anchor = kept[0] === undefined ? null : outerOf(kept[0]);

  if (chunked(context, desc)) {
    placeInChunks(content, middle.map(outerOf), anchor, context.chunks);
    tidyChunks(content, context.chunks, (block) => estimateOf(context, block));
  } else {
    placeBefore(content, middle, anchor);
  }
  desc.children = [...previous.slice(0, prefix), ...middle, ...kept];
  syncHack(context, desc);
};
