import { childOffsets, sameAttrs, sameMarks } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type NodeId,
  type TextNode,
} from '../model/node.types';
import type { NodeType, Schema } from '../schema/schema.types';
import { appendChunk, fillChunks, placeInChunks, tidyChunks, type ChunkSet } from './chunks';
import { segmentsOf, type BlockDecorations, type LocalDecoration } from './decorate';
import { renderLeaf, renderParent, type RenderedDom } from './render-dom';
import { DescKind, DomName, type NodeView, type NodeViewFactory } from './view.types';

export interface ElementDesc {
  readonly kind: typeof DescKind.Element;
  node: ElementNode;
  readonly dom: HTMLElement;
  readonly contentDOM: HTMLElement | null;
  readonly view: NodeView | undefined;
  children: Desc[];
  readonly parent: ElementDesc | null;
  index: number;
  hack: HTMLBRElement | null;
}

export interface TextPart {
  readonly dom: Text;
  readonly start: number;
}

export interface TextDesc {
  readonly kind: typeof DescKind.Text;
  node: TextNode;
  readonly parts: readonly TextPart[];
  readonly decorated: boolean;
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
  readonly chunks: ChunkSet;
  readonly nodeViews: Readonly<Record<string, NodeViewFactory>>;
  readonly widget: (key: string) => HTMLElement | undefined;
  readonly widgets: WeakSet<Node>;
  readonly placed: Map<string, HTMLElement>;
  readonly redraw: Set<NodeId>;
  readonly stale: Map<ElementDesc, ElementNode>;
  visible: (desc: ElementDesc) => boolean;
  decorations: BlockDecorations;
}

interface TextBody {
  readonly inner: ChildNode;
  readonly parts: readonly TextPart[];
}

export interface RootFill {
  readonly remaining: number;
  readonly covered: number;
  readonly height: number;
  fill(count: number): void;
  resume(node: ElementNode): number | undefined;
}

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

export const outerOf = (desc: Desc): ChildNode =>
  desc.kind === DescKind.Text ? desc.outer : desc.dom;

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

  if (type.leaf) {
    return { dom: renderLeaf(document, spec), contentDOM: null };
  }
  const rendered = renderParent(document, spec);

  if (type.atom) {
    rendered.dom.setAttribute('contenteditable', 'false');
  }
  return rendered;
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

  return last === undefined || outerOf(last).nodeName === DomName.Br;
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

const plainBody = (context: ViewContext, text: string): TextBody => {
  const dom = context.document.createTextNode(text);

  return { inner: dom, parts: [{ dom, start: 0 }] };
};

const decoratedBody = (
  context: ViewContext,
  local: readonly LocalDecoration[],
  text: string,
  start: number,
): TextBody => {
  const container = context.document.createElement('span');
  const parts: TextPart[] = [];

  for (const segment of segmentsOf(local, start, text.length)) {
    const dom = context.document.createTextNode(text.slice(segment.from, segment.to));

    parts.push({ dom, start: segment.from });
    if (segment.classes.length === 0) {
      container.append(dom);
    } else {
      const wrapper = context.document.createElement(segment.tag);

      wrapper.className = segment.classes.join(' ');
      wrapper.append(dom);
      container.append(wrapper);
    }
  }
  return { inner: container, parts };
};

const bodyOf = (
  context: ViewContext,
  node: TextNode,
  parent: ElementDesc,
  index: number,
): TextBody => {
  const local = context.decorations.get(parent.node.id);

  return local === undefined
    ? plainBody(context, node.text)
    : decoratedBody(context, local, node.text, childOffsets(parent.node)[index] ?? 0);
};

const createText = (
  context: ViewContext,
  node: TextNode,
  parent: ElementDesc,
  index: number,
): TextDesc => {
  const body = bodyOf(context, node, parent, index);
  let outer: ChildNode = body.inner;

  for (const mark of node.marks.toReversed()) {
    const type = context.schema.marks.get(mark.type);

    if (type === undefined) {
      throw new RangeError(`The schema has no mark type "${mark.type}" to render`);
    }
    const wrapper = renderParent(context.document, type.render(mark));

    wrapper.contentDOM?.append(outer);
    outer = wrapper.dom;
  }

  const desc: TextDesc = {
    kind: 'text',
    node,
    parts: body.parts,
    decorated: context.decorations.has(parent.node.id),
    outer,
    parent,
    index,
  };

  for (const part of body.parts) {
    for (let current: Node | null = part.dom; current !== null; current = current.parentNode) {
      context.descs.set(current, desc);
    }
  }
  return desc;
};

const LINE_HEIGHT = 24;

const LINE_LENGTH = 80;

const heightOf = (size: number): number => Math.max(1, Math.ceil(size / LINE_LENGTH)) * LINE_HEIGHT;

const estimateOf = (context: ViewContext, block: Element): number => {
  const desc = context.descs.get(block);

  return heightOf(desc?.kind === DescKind.Element ? desc.node.size : LINE_LENGTH);
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
  node.kind === ContentNodeKind.Text
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

  for (let desc = found?.kind === DescKind.Text ? found.parent : found; desc !== undefined;) {
    if (desc.parent === null || isTextblock(context, desc)) {
      return desc;
    }
    desc = desc.parent;
  }
  return undefined;
};

const CHUNK_BLOCKS = 32;

const rootFill = (context: ViewContext, desc: ElementDesc, from: number): RootFill => {
  let content = desc.node.content;
  let next = from;

  let height = content
    .slice(from)
    .reduce(
      (total, child) =>
        total + heightOf(child.kind === ContentNodeKind.Element ? child.size : LINE_LENGTH),
      0,
    );

  return {
    get remaining() {
      return content.length - next;
    },
    get covered() {
      return next;
    },
    get height() {
      return height;
    },
    resume: (node) => {
      const waiting = content[next];

      const at =
        waiting?.kind === ContentNodeKind.Element
          ? node.content.findIndex(
              (child) => child.kind === ContentNodeKind.Element && child.id === waiting.id,
            )
          : -1;

      if (at < 0 || node.content.length - at !== content.length - next) {
        return undefined;
      }
      content = node.content;
      next = at;
      return at;
    },
    fill: (count) => {
      const end = Math.min(content.length, next + count);

      while (next < end) {
        const blocks: ChildNode[] = [];

        for (const child of content.slice(next, Math.min(end, next + CHUNK_BLOCKS))) {
          const made = createDesc(context, child, desc, next);

          desc.children.push(made);
          blocks.push(outerOf(made));
          height -= heightOf(child.kind === ContentNodeKind.Element ? child.size : LINE_LENGTH);
          next += 1;
        }
        appendChunk(desc.dom, blocks, context.chunks, (block) => estimateOf(context, block), null);
      }
    },
  };
};

export const createRootDesc = (
  context: ViewContext,
  dom: HTMLElement,
  node: ElementNode,
  first = Number.POSITIVE_INFINITY,
): { readonly desc: ElementDesc; readonly rest: RootFill | undefined } => {
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
  if (!chunked(context, desc) || node.content.length <= first) {
    fillChildren(context, desc);
    return { desc, rest: undefined };
  }
  dom.replaceChildren();

  const rest = rootFill(context, desc, 0);

  rest.fill(first);
  return { desc, rest };
};

export const widgetOwner = (
  context: ViewContext,
  target: EventTarget | null,
): ElementDesc | undefined => {
  for (let current = target instanceof Node ? target : null; current !== null;) {
    const desc = context.descs.get(current);

    if (desc !== undefined) {
      return desc.kind === DescKind.Element &&
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

const insideWidget = (context: ViewContext, target: EventTarget | null): boolean => {
  for (let current = target instanceof Node ? target : null; current !== null;) {
    if (context.widgets.has(current)) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
};

export const widgetAround = (context: ViewContext, target: EventTarget | null): boolean =>
  widgetOwner(context, target) !== undefined || insideWidget(context, target);

const forget = (context: ViewContext, desc: Desc): void => {
  if (desc.kind === DescKind.Text) {
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
    if (child.kind === DescKind.Element) {
      found.set(child.node.id, child);
    }
  }
  return found;
};

const sameRender = (desc: ElementDesc, after: ElementNode): boolean =>
  desc.view === undefined
    ? desc.node.type === after.type && sameAttrs(desc.node.attrs, after.attrs)
    : desc.node.type === after.type && desc.view.update(after);

const findText = (matching: Matching, node: TextNode): TextMatch | undefined => {
  for (let at = matching.textFrom; at < matching.previous.length; at += 1) {
    const desc = matching.previous[at];

    if (
      desc?.kind === DescKind.Text &&
      !desc.decorated &&
      !matching.used.has(desc) &&
      sameMarks(desc.node.marks, node.marks)
    ) {
      return { desc, at };
    }
  }
  return undefined;
};

const syncText = (desc: TextDesc, node: TextNode, index: number): void => {
  const part = desc.parts[0];

  desc.node = node;
  desc.index = index;
  if (part !== undefined && part.dom.data !== node.text) {
    part.dom.data = node.text;
  }
};

const matchText = (
  context: ViewContext,
  parent: ElementDesc,
  matching: Matching,
  node: TextNode,
  index: number,
): Desc => {
  const match = context.decorations.has(parent.node.id) ? undefined : findText(matching, node);

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
  if (parent.parent === null && found.node !== node && !context.visible(found)) {
    context.stale.set(found, node);
  } else {
    context.stale.delete(found);
    syncElement(context, found, node);
  }
  return found;
};

export const freshen = (context: ViewContext, desc: ElementDesc): void => {
  const node = context.stale.get(desc);

  if (node !== undefined) {
    context.stale.delete(desc);
    syncElement(context, desc, node);
  }
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
    node.kind === ContentNodeKind.Element
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

const syncContent = (
  context: ViewContext,
  desc: ElementDesc,
  content: HTMLElement,
  nodes: readonly ContentNode[],
): void => {
  const previous = desc.children;
  const prefix = sharedPrefix(previous, nodes);
  const suffix = sharedSuffix(previous, nodes, prefix);
  const kept = previous.slice(previous.length - suffix);

  const middle = reconcile(
    context,
    desc,
    previous.slice(prefix, previous.length - suffix),
    nodes.slice(prefix, nodes.length - suffix),
    prefix,
  );

  kept.forEach((child, offset) => {
    child.index = nodes.length - suffix + offset;
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

export const syncElement = (context: ViewContext, desc: ElementDesc, node: ElementNode): void => {
  const content = desc.contentDOM;

  if (desc.node === node) {
    return;
  }
  desc.node = node;
  if (context.redraw.delete(node.id)) {
    redrawContent(context, desc);
    return;
  }
  if (content !== null) {
    syncContent(context, desc, content, node.content);
  }
};

export const syncRootPrefix = (
  context: ViewContext,
  desc: ElementDesc,
  node: ElementNode,
  end: number,
): void => {
  if (desc.node !== node) {
    desc.node = node;
    syncContent(context, desc, desc.dom, node.content.slice(0, end));
  }
};
