import { normalizeContent } from '../model/node';
import {
  ContentNodeKind,
  type Attrs,
  type ContentNode,
  type ElementNode,
  type IdSource,
  type Mark,
} from '../model/node.types';
import type { ContentMatch, NodeMaker, NodeType, Schema } from '../schema/schema.types';
import { fillEnd, findWrapping } from './fit';
import { HtmlChar, HtmlTag } from './html.types';

export interface OpenNode {
  readonly type: NodeType;
  readonly attrs: Attrs;
  readonly content: ContentNode[];
  match: ContentMatch;
}

export interface Builder {
  readonly schema: Schema;
  readonly ids: IdSource;
  readonly preserve: boolean;
  readonly stack: OpenNode[];
}

const SPACES = /[\t\n\f\r ]+/gu;

export const createBuilder = (schema: Schema, ids: IdSource, preserve: boolean): Builder => ({
  schema,
  ids,
  preserve,
  stack: [{ type: schema.top, attrs: {}, content: [], match: schema.top.content }],
});

const topOf = (builder: Builder): OpenNode => {
  const top = builder.stack.at(-1);

  if (top === undefined) {
    throw new RangeError('The HTML builder lost its root');
  }
  return top;
};

const isBreak = (schema: Schema, node: ContentNode | undefined): boolean => {
  const type = node?.kind === ContentNodeKind.Element ? schema.nodes.get(node.type) : undefined;

  return (
    node?.kind === ContentNodeKind.Element &&
    type?.inline === true &&
    type.leaf &&
    type.render(node).tag === HtmlTag.Br
  );
};

const withoutTrail = (builder: Builder, open: OpenNode): ContentNode[] => {
  const { content } = open;
  const kept = isBreak(builder.schema, content.at(-1)) ? content.slice(0, -1) : content;
  const last = kept.at(-1);

  if (
    builder.preserve ||
    open.type.code ||
    last?.kind !== ContentNodeKind.Text ||
    !last.text.endsWith(' ')
  ) {
    return kept;
  }
  return normalizeContent([...kept.slice(0, -1), { ...last, text: last.text.trimEnd() }]);
};

const finalize = (builder: Builder, open: OpenNode): ElementNode => {
  const { schema, ids } = builder;
  const content = open.type.inlineContent ? withoutTrail(builder, open) : open.content;
  const match = open.type.content.matchContent(content);
  const filler = match === undefined ? undefined : fillEnd(schema, match, ids);

  return schema.element(open.type.name, {
    id: ids.next(),
    attrs: open.attrs,
    content: [...content, ...(filler ?? [])],
  });
};

const append = (open: OpenNode, node: ContentNode): void => {
  const last = open.content.at(-1);

  if (
    node.kind === ContentNodeKind.Text &&
    last?.kind === ContentNodeKind.Text &&
    normalizeContent([last, node]).length === 1
  ) {
    open.content.splice(-1, 1, { ...last, text: last.text + node.text });
    return;
  }
  open.content.push(node);

  open.match =
    open.match.matchType(node.kind === ContentNodeKind.Text ? 'text' : node.type) ?? open.match;
};

const closeTop = (builder: Builder): void => {
  const open = builder.stack.pop();
  const parent = builder.stack.at(-1);

  if (open !== undefined && parent !== undefined) {
    parent.content.push(finalize(builder, open));
  }
};

const closeTo = (builder: Builder, depth: number): void => {
  while (builder.stack.length > depth + 1) {
    closeTop(builder);
  }
};

const push = (builder: Builder, type: NodeType, attrs: Attrs): OpenNode => {
  const parent = topOf(builder);
  const open: OpenNode = { type, attrs, content: [], match: type.content };

  parent.match = parent.match.matchType(type.name) ?? parent.match;
  builder.stack.push(open);
  return open;
};

const place = (builder: Builder, name: string): boolean => {
  for (let depth = builder.stack.length - 1; depth >= 0; depth -= 1) {
    const open = builder.stack[depth];
    const wrap = open === undefined ? undefined : findWrapping(builder.schema, open.match, name);

    if (wrap !== undefined) {
      closeTo(builder, depth);
      for (const type of wrap) {
        push(builder, type, {});
      }
      return true;
    }
  }
  return false;
};

export const openNode = (builder: Builder, type: NodeType, attrs: Attrs): OpenNode | undefined =>
  place(builder, type.name) ? push(builder, type, attrs) : undefined;

export const closeNode = (builder: Builder, open: OpenNode): void => {
  const depth = builder.stack.indexOf(open);

  if (depth > 0) {
    closeTo(builder, depth - 1);
  }
};

export const addNode = (
  builder: Builder,
  type: NodeType,
  attrs: Attrs,
  content: readonly ContentNode[] = [],
): void => {
  if (place(builder, type.name)) {
    append(
      topOf(builder),
      builder.schema.element(type.name, { id: builder.ids.next(), attrs, content }),
    );
  }
};

export const nodeMaker =
  (builder: Builder): NodeMaker =>
  (type, attrs = {}, content = []) =>
    builder.schema.element(type, { id: builder.ids.next(), attrs, content });

export const closeTextblocks = (builder: Builder): void => {
  while (builder.stack.length > 1 && topOf(builder).type.inlineContent) {
    closeTop(builder);
  }
};

export const inCode = (builder: Builder): boolean => topOf(builder).type.code;

const atLineStart = (builder: Builder, open: OpenNode): boolean => {
  const last = open.content.at(-1);

  return (
    last === undefined ||
    (last.kind === ContentNodeKind.Text && last.text.endsWith(' ')) ||
    isBreak(builder.schema, last)
  );
};

const collapse = (builder: Builder, text: string): string => {
  const collapsed = text.replaceAll(SPACES, ' ');
  const top = topOf(builder);

  if (collapsed !== HtmlChar.Space) {
    return collapsed;
  }
  return top.type.inlineContent && !atLineStart(builder, top) ? ' ' : '';
};

const trimStart = (builder: Builder, text: string, preserve: boolean): string =>
  preserve || !atLineStart(builder, topOf(builder)) ? text : text.trimStart();

export const addText = (
  builder: Builder,
  raw: string,
  marks: readonly Mark[],
  pre: boolean,
): void => {
  const keep = pre || builder.preserve || inCode(builder);
  const text = keep ? raw.replaceAll(/\r\n?/gu, '\n') : collapse(builder, raw);

  if (text === '' || (text.trim() === '' && !topOf(builder).type.inlineContent)) {
    return;
  }
  if (!place(builder, 'text')) {
    return;
  }
  const top = topOf(builder);
  const value = top.type.code ? text : trimStart(builder, text, keep);

  if (value === '') {
    return;
  }

  const allowed = marks.filter((mark) => top.type.marks.has(mark.type));

  append(top, builder.schema.text(value, allowed));
};

export const finishBuilder = (builder: Builder): ElementNode => {
  closeTo(builder, 0);
  return finalize(builder, topOf(builder));
};
