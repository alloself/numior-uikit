import type { Slice } from '../doc/doc.types';
import { contentSize, nodeSize, sameMarks } from '../model/node';
import {
  ContentNodeKind,
  type Attrs,
  type ContentNode,
  type ElementNode,
  type Mark,
  type TextNode,
} from '../model/node.types';
import { specEntries } from './spec-entries';
import {
  NodeName,
  type AttrSpecs,
  type DocCheck,
  type DocIssue,
  type MarkType,
  type NodeType,
} from './schema.types';

interface SchemaShape {
  readonly top: NodeType;
  readonly nodes: ReadonlyMap<string, NodeType>;
  readonly marks: ReadonlyMap<string, MarkType>;
}

export interface CheckContext {
  readonly schema: SchemaShape;
  readonly issues: DocIssue[];
  readonly ids: Set<string>;
  readonly path: number[];
}

export const createCheckContext = (schema: SchemaShape): CheckContext => ({
  schema,
  issues: [],
  ids: new Set(),
  path: [],
});

const checkAttrs = (
  context: CheckContext,
  path: readonly number[],
  specs: AttrSpecs,
  attrs: Attrs,
): void => {
  for (const attr of Object.keys(attrs)) {
    if (!Object.hasOwn(specs, attr)) {
      context.issues.push({ kind: 'attr', path: [...path], attr, reason: 'unknown' });
    }
  }
  for (const [attr, spec] of specEntries(specs)) {
    const value = attrs[attr];

    if (value === undefined) {
      context.issues.push({ kind: 'attr', path: [...path], attr, reason: 'missing' });
    } else if (spec.verify !== undefined && !spec.verify(value)) {
      context.issues.push({ kind: 'attr', path: [...path], attr, reason: 'invalid' });
    }
  }
};

const checkMarks = (
  context: CheckContext,
  path: readonly number[],
  node: TextNode,
  parent: NodeType | undefined,
): void => {
  for (const mark of node.marks) {
    const type = context.schema.marks.get(mark.type);

    if (type === undefined || parent?.marks.has(mark.type) === false) {
      context.issues.push({ kind: 'mark', path: [...path], mark: mark.type });
    } else {
      checkAttrs(context, path, type.attrs, mark.attrs);
    }
  }
};

export const checkText = (
  context: CheckContext,
  index: number,
  node: TextNode,
  parent: NodeType,
  previous: TextNode | undefined,
): void => {
  const at = (): number[] => [...context.path, index];

  if (node.text === '') {
    context.issues.push({ kind: 'text', path: at(), reason: 'empty' });
  }
  if (previous !== undefined && sameMarks(previous.marks, node.marks)) {
    context.issues.push({ kind: 'text', path: at(), reason: 'unmerged' });
  }
  checkMarks(context, at(), node, parent);
};

export const checkIdentity = (context: CheckContext, id: string): void => {
  const known = context.ids.size;

  context.ids.add(id);

  if (id === '') {
    context.issues.push({ kind: 'id', path: [...context.path], id, reason: 'empty' });
  } else if (context.ids.size === known) {
    context.issues.push({ kind: 'id', path: [...context.path], id, reason: 'duplicate' });
  }
};

export const elementTypeOf = (context: CheckContext, type: string): NodeType | undefined =>
  type === NodeName.Text ? undefined : context.schema.nodes.get(type);

const checkContent = (context: CheckContext, node: ElementNode, type: NodeType): void => {
  if (type.content.matchContent(node.content)?.validEnd !== true) {
    context.issues.push({ kind: 'content', path: [...context.path], type: node.type });
  }
};

const checkOwn = (context: CheckContext, node: ElementNode, type: NodeType | undefined): void => {
  if (type === undefined) {
    context.issues.push({ kind: 'type', path: [...context.path], type: node.type });
    return;
  }
  checkAttrs(context, context.path, type.attrs, node.attrs);

  const expected = type.leaf ? 1 : contentSize(node.content) + 2;

  if (node.leaf !== type.leaf || node.size !== expected || (type.leaf && node.content.length > 0)) {
    context.issues.push({ kind: 'size', path: [...context.path] });
  }
  checkContent(context, node, type);
};

export const checkBuilt = (
  context: CheckContext,
  node: ElementNode,
  type: NodeType | undefined,
): void => {
  if (type === undefined) {
    context.issues.push({ kind: 'type', path: [...context.path], type: node.type });
    return;
  }
  checkAttrs(context, context.path, type.attrs, node.attrs);

  if (type.leaf && node.content.length > 0) {
    context.issues.push({ kind: 'size', path: [...context.path] });
  }
  checkContent(context, node, type);
};

export const checkTop = (context: CheckContext, root: ElementNode): void => {
  if (root.type !== context.schema.top.name) {
    context.issues.unshift({ kind: 'type', path: [], type: root.type });
  }
};

const checkElement = (context: CheckContext, node: ElementNode): void => {
  const type = elementTypeOf(context, node.type);

  checkIdentity(context, node.id);
  checkOwn(context, node, type);

  if (type === undefined) {
    return;
  }

  node.content.forEach((child, index) => {
    const previous = node.content[index - 1];

    if (child.kind === ContentNodeKind.Text) {
      checkText(
        context,
        index,
        child,
        type,
        previous?.kind === ContentNodeKind.Text ? previous : undefined,
      );
    } else {
      context.path.push(index);
      checkElement(context, child);
      context.path.pop();
    }
  });
};

const holeWithin = (
  hole: number | undefined,
  start: number,
  child: ElementNode,
): number | undefined =>
  hole !== undefined && start < hole && hole < start + nodeSize(child)
    ? hole - start - 1
    : undefined;

const checkSiblings = (
  context: CheckContext,
  nodes: readonly ContentNode[],
  parent: NodeType | undefined,
  openStart: number,
  openEnd: number,
  hole: number | undefined,
): void => {
  let offset = 0;

  nodes.forEach((child, index) => {
    const previous = nodes[index - 1];
    const childStart = offset;

    offset += nodeSize(child);

    if (child.kind === ContentNodeKind.Text) {
      if (parent === undefined) {
        checkMarks(context, [...context.path, index], child, undefined);
      } else {
        checkText(
          context,
          index,
          child,
          parent,
          previous?.kind === ContentNodeKind.Text ? previous : undefined,
        );
      }
      return;
    }

    const start = index === 0 ? openStart : 0;
    const end = index === nodes.length - 1 ? openEnd : 0;

    const inner = holeWithin(hole, childStart, child);

    context.path.push(index);

    if (start > 0 || end > 0 || inner !== undefined) {
      checkOpen(context, child, start, end, inner);
    } else {
      checkElement(context, child);
    }
    context.path.pop();
  });
};

const checkOpen = (
  context: CheckContext,
  node: ElementNode,
  openStart: number,
  openEnd: number,
  hole: number | undefined,
): void => {
  const type = elementTypeOf(context, node.type);

  if (type === undefined) {
    context.issues.push({ kind: 'type', path: [...context.path], type: node.type });
    return;
  }
  checkAttrs(context, context.path, type.attrs, node.attrs);
  checkSiblings(context, node.content, type, openStart - 1, openEnd - 1, hole);
};

export const checkResult = (context: CheckContext): DocCheck =>
  context.issues.length === 0 ? { ok: true } : { ok: false, issues: context.issues };

export const checkTree = (schema: SchemaShape, root: ElementNode): DocCheck => {
  const context = createCheckContext(schema);

  checkTop(context, root);
  checkElement(context, root);
  return checkResult(context);
};

export const checkNodes = (schema: SchemaShape, nodes: readonly ElementNode[]): DocCheck => {
  const context = createCheckContext(schema);

  nodes.forEach((node, index) => {
    context.path.push(index);
    checkElement(context, node);
    context.path.pop();
  });

  return checkResult(context);
};

export const checkSlice = (schema: SchemaShape, slice: Slice, insert?: number): DocCheck => {
  const context = createCheckContext(schema);
  const hole = insert === undefined ? undefined : insert + slice.openStart;

  checkSiblings(context, slice.content, undefined, slice.openStart, slice.openEnd, hole);
  return checkResult(context);
};

export const checkMark = (schema: SchemaShape, mark: Mark): DocCheck => {
  const context = createCheckContext(schema);
  const type = schema.marks.get(mark.type);

  if (type === undefined) {
    context.issues.push({ kind: 'mark', path: [], mark: mark.type });
  } else {
    checkAttrs(context, [], type.attrs, mark.attrs);
  }
  return checkResult(context);
};
