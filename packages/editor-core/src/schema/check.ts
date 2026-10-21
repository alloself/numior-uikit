import { contentSize, sameMarks } from '../model/node';
import type { Attrs, ElementNode, TextNode } from '../model/node.types';
import { childLink, pathOf, type PathLink } from '../model/path';
import { specEntries } from './spec-entries';
import type { AttrSpecs, DocCheck, DocIssue, MarkType, NodeType } from './schema.types';

interface SchemaShape {
  readonly top: NodeType;
  readonly nodes: ReadonlyMap<string, NodeType>;
  readonly marks: ReadonlyMap<string, MarkType>;
}

interface CheckContext {
  readonly schema: SchemaShape;
  readonly issues: DocIssue[];
  readonly ids: Set<string>;
}

const checkAttrs = (
  context: CheckContext,
  at: PathLink | undefined,
  specs: AttrSpecs,
  attrs: Attrs,
): void => {
  for (const attr of Object.keys(attrs)) {
    if (!Object.hasOwn(specs, attr)) {
      context.issues.push({ kind: 'attr', path: pathOf(at), attr, reason: 'unknown' });
    }
  }
  for (const [attr, spec] of specEntries(specs)) {
    const value = attrs[attr];

    if (value === undefined) {
      context.issues.push({ kind: 'attr', path: pathOf(at), attr, reason: 'missing' });
    } else if (spec.verify !== undefined && !spec.verify(value)) {
      context.issues.push({ kind: 'attr', path: pathOf(at), attr, reason: 'invalid' });
    }
  }
};

const checkText = (
  context: CheckContext,
  parentAt: PathLink | undefined,
  index: number,
  node: TextNode,
  parent: NodeType,
  previous: TextNode | undefined,
): void => {
  const at = (): PathLink => childLink(parentAt, index);

  if (node.text === '') {
    context.issues.push({ kind: 'text', path: pathOf(at()), reason: 'empty' });
  }
  if (previous !== undefined && sameMarks(previous.marks, node.marks)) {
    context.issues.push({ kind: 'text', path: pathOf(at()), reason: 'unmerged' });
  }
  for (const mark of node.marks) {
    const type = context.schema.marks.get(mark.type);

    if (type === undefined || !parent.marks.has(mark.type)) {
      context.issues.push({ kind: 'mark', path: pathOf(at()), mark: mark.type });
    } else {
      checkAttrs(context, at(), type.attrs, mark.attrs);
    }
  }
};

const checkIdentity = (
  context: CheckContext,
  at: PathLink | undefined,
  node: ElementNode,
): void => {
  if (node.id === '') {
    context.issues.push({ kind: 'id', path: pathOf(at), id: node.id, reason: 'empty' });
  } else if (context.ids.has(node.id)) {
    context.issues.push({ kind: 'id', path: pathOf(at), id: node.id, reason: 'duplicate' });
  }
  context.ids.add(node.id);
};

const checkShape = (
  context: CheckContext,
  at: PathLink | undefined,
  node: ElementNode,
  type: NodeType,
): void => {
  const expected = type.leaf ? 1 : contentSize(node.content) + 2;

  if (node.leaf !== type.leaf || node.size !== expected || (type.leaf && node.content.length > 0)) {
    context.issues.push({ kind: 'size', path: pathOf(at) });
  }
  if (type.content.matchContent(node.content)?.validEnd !== true) {
    context.issues.push({ kind: 'content', path: pathOf(at), type: node.type });
  }
};

const checkElement = (context: CheckContext, at: PathLink | undefined, node: ElementNode): void => {
  const type = node.type === 'text' ? undefined : context.schema.nodes.get(node.type);

  checkIdentity(context, at, node);

  if (type === undefined) {
    context.issues.push({ kind: 'type', path: pathOf(at), type: node.type });
    return;
  }
  checkAttrs(context, at, type.attrs, node.attrs);
  checkShape(context, at, node, type);

  node.content.forEach((child, index) => {
    const previous = node.content[index - 1];

    if (child.kind === 'text') {
      checkText(context, at, index, child, type, previous?.kind === 'text' ? previous : undefined);
    } else {
      checkElement(context, childLink(at, index), child);
    }
  });
};

const resultOf = (context: CheckContext): DocCheck =>
  context.issues.length === 0 ? { ok: true } : { ok: false, issues: context.issues };

export const checkTree = (schema: SchemaShape, root: ElementNode): DocCheck => {
  const context: CheckContext = { schema, issues: [], ids: new Set() };

  if (root.type !== schema.top.name) {
    context.issues.push({ kind: 'type', path: [], type: root.type });
  }
  checkElement(context, undefined, root);
  return resultOf(context);
};

export const checkNodes = (schema: SchemaShape, nodes: readonly ElementNode[]): DocCheck => {
  const context: CheckContext = { schema, issues: [], ids: new Set() };

  nodes.forEach((node, index) => {
    checkElement(context, childLink(undefined, index), node);
  });

  return resultOf(context);
};
