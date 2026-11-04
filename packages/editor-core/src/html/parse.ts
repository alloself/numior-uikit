import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { createEmptyDoc } from '../doc/empty';
import { createIdSource } from '../model/node';
import type { Mark } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import {
  addNode,
  addText,
  closeNode,
  closeTextblocks,
  createBuilder,
  finishBuilder,
  inCode,
  nodeMaker,
  openNode,
  type Builder,
} from './builder';
import {
  HtmlNodeKind,
  HtmlTag,
  HtmlWhitespace,
  PasteSource,
  type FromHTMLOptions,
  type HtmlElement,
  type HtmlNode,
} from './html.types';
import { marksOf, nodeCandidates, type NodeCandidate } from './rules';
import { detectPasteSource, normalizeSource } from './sources';
import { parseTree } from './tree';

interface Walk {
  readonly builder: Builder;
  marks: readonly Mark[];
  pre: boolean;
}

const IGNORED = new Set([
  'audio',
  'base',
  'button',
  'canvas',
  'colgroup',
  'datalist',
  'embed',
  'head',
  'iframe',
  'input',
  'link',
  'map',
  'math',
  'meta',
  'noembed',
  'noframes',
  'noscript',
  'object',
  'option',
  'script',
  'select',
  'style',
  'svg',
  'template',
  'textarea',
  'title',
  'video',
]);

const BLOCKS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'caption',
  'center',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'html',
  'legend',
  'li',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

const PRESERVED = new Set(['pre', 'pre-wrap', 'break-spaces']);

const keepsSpaces = (element: HtmlElement): boolean =>
  element.tag === HtmlTag.Pre || PRESERVED.has(element.style('white-space') ?? '');

const withMarks = (active: readonly Mark[], added: readonly Mark[]): readonly Mark[] =>
  added.length === 0
    ? active
    : [...active.filter((mark) => !added.some((item) => item.type === mark.type)), ...added];

const childrenOf = (element: HtmlElement): readonly HtmlNode[] => {
  const [first, ...rest] = element.children;

  return element.tag === HtmlTag.Pre &&
    first?.kind === HtmlNodeKind.Text &&
    first.text.startsWith('\n')
    ? [{ kind: 'text', text: first.text.slice(1) }, ...rest]
    : element.children;
};

const chooseCandidate = (walk: Walk, element: HtmlElement): NodeCandidate | undefined => {
  const candidates = nodeCandidates(walk.builder.schema, element);
  const top = walk.builder.stack.at(-1);

  return (
    candidates.find((candidate) => top?.match.next.has(candidate.type.name) === true) ??
    candidates[0]
  );
};

const walkChildren = (walk: Walk, element: HtmlElement, marks: readonly Mark[]): void => {
  const outer = { marks: walk.marks, pre: walk.pre };

  walk.marks = marks;
  walk.pre = walk.pre || keepsSpaces(element);
  for (const child of childrenOf(element)) {
    walkNode(walk, child);
  }
  walk.marks = outer.marks;
  walk.pre = outer.pre;
};

const walkTransparent = (walk: Walk, element: HtmlElement): void => {
  const block = BLOCKS.has(element.tag);

  if (block) {
    closeTextblocks(walk.builder);
  }
  walkChildren(walk, element, withMarks(walk.marks, marksOf(walk.builder.schema, element)));
  if (block) {
    closeTextblocks(walk.builder);
  }
};

const walkWhole = (walk: Walk, element: HtmlElement, candidate: NodeCandidate): boolean => {
  const content = candidate.read?.(element, nodeMaker(walk.builder));

  if (content === undefined || content === false) {
    return false;
  }
  addNode(walk.builder, candidate.type, candidate.attrs, content);
  return true;
};

const walkInto = (walk: Walk, element: HtmlElement, candidate: NodeCandidate): void => {
  if (candidate.type.leaf) {
    addNode(walk.builder, candidate.type, candidate.attrs);
    return;
  }
  if (candidate.read !== undefined) {
    if (!walkWhole(walk, element, candidate)) {
      walkTransparent(walk, element);
    }
    return;
  }
  const open = openNode(walk.builder, candidate.type, candidate.attrs);

  if (open === undefined) {
    walkTransparent(walk, element);
    return;
  }
  walkChildren(walk, element, withMarks(walk.marks, marksOf(walk.builder.schema, element)));
  closeNode(walk.builder, open);
};

const walkElement = (walk: Walk, element: HtmlElement): void => {
  if (IGNORED.has(element.tag)) {
    return;
  }
  if (element.tag === HtmlTag.Br && inCode(walk.builder)) {
    addText(walk.builder, '\n', walk.marks, true);
    return;
  }
  const candidate = chooseCandidate(walk, element);

  if (candidate === undefined) {
    walkTransparent(walk, element);
  } else {
    walkInto(walk, element, candidate);
  }
};

const walkNode = (walk: Walk, node: HtmlNode): void => {
  if (node.kind === HtmlNodeKind.Text) {
    addText(walk.builder, node.text, walk.marks, walk.pre);
  } else {
    walkElement(walk, node);
  }
};

const build = (
  schema: Schema,
  nodes: readonly HtmlNode[],
  options: FromHTMLOptions,
  preserve: boolean,
): Doc | undefined => {
  const ids = options.ids ?? createIdSource('h');

  const walk: Walk = {
    builder: createBuilder(schema, ids, preserve),
    marks: [],
    pre: false,
  };

  for (const node of nodes) {
    walkNode(walk, node);
  }
  const root = finishBuilder(walk.builder);

  return schema.check(root).ok ? createDoc(schema, root) : undefined;
};

export const fromHTML = (schema: Schema, html: string, options: FromHTMLOptions = {}): Doc => {
  const source = options.source ?? detectPasteSource(html);
  const whitespace = options.whitespace ?? (source === PasteSource.Own ? 'preserve' : 'collapse');
  const tree = normalizeSource(parseTree(html), source);

  return (
    build(schema, tree.children, options, whitespace === HtmlWhitespace.Preserve) ??
    createEmptyDoc(schema, options.ids)
  );
};
