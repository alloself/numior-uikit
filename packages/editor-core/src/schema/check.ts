import { contentSize, sameMarks } from '../model/node';
import type { Attrs, ElementNode, TextNode } from '../model/node.types';
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
  path: readonly number[],
  specs: AttrSpecs,
  attrs: Attrs,
): void => {
  for (const attr of Object.keys(attrs)) {
    if (!Object.hasOwn(specs, attr)) {
      context.issues.push({ kind: 'attr', path, attr, reason: 'unknown' });
    }
  }
  for (const [attr, spec] of Object.entries(specs)) {
    const value = attrs[attr];

    if (value === undefined) {
      context.issues.push({ kind: 'attr', path, attr, reason: 'missing' });
    } else if (spec.verify !== undefined && !spec.verify(value)) {
      context.issues.push({ kind: 'attr', path, attr, reason: 'invalid' });
    }
  }
};

const checkText = (
  context: CheckContext,
  path: readonly number[],
  node: TextNode,
  parent: NodeType,
  previous: TextNode | undefined,
): void => {
  if (node.text === '') {
    context.issues.push({ kind: 'text', path, reason: 'empty' });
  }
  if (previous !== undefined && sameMarks(previous.marks, node.marks)) {
    context.issues.push({ kind: 'text', path, reason: 'unmerged' });
  }
  for (const mark of node.marks) {
    const type = context.schema.marks.get(mark.type);

    if (type === undefined || !parent.marks.has(mark.type)) {
      context.issues.push({ kind: 'mark', path, mark: mark.type });
    } else {
      checkAttrs(context, path, type.attrs, mark.attrs);
    }
  }
};

const checkIdentity = (context: CheckContext, path: readonly number[], node: ElementNode): void => {
  if (node.id === '') {
    context.issues.push({ kind: 'id', path, id: node.id, reason: 'empty' });
  } else if (context.ids.has(node.id)) {
    context.issues.push({ kind: 'id', path, id: node.id, reason: 'duplicate' });
  }
  context.ids.add(node.id);
};

const checkShape = (
  context: CheckContext,
  path: readonly number[],
  node: ElementNode,
  type: NodeType,
): void => {
  const expected = type.leaf ? 1 : contentSize(node.content) + 2;

  if (node.leaf !== type.leaf || node.size !== expected || (type.leaf && node.content.length > 0)) {
    context.issues.push({ kind: 'size', path });
  }
  if (type.content.matchContent(node.content)?.validEnd !== true) {
    context.issues.push({ kind: 'content', path, type: node.type });
  }
};

const checkElement = (context: CheckContext, path: readonly number[], node: ElementNode): void => {
  const type = node.type === 'text' ? undefined : context.schema.nodes.get(node.type);

  checkIdentity(context, path, node);

  if (type === undefined) {
    context.issues.push({ kind: 'type', path, type: node.type });
    return;
  }
  checkAttrs(context, path, type.attrs, node.attrs);
  checkShape(context, path, node, type);

  node.content.forEach((child, index) => {
    const previous = node.content[index - 1];

    if (child.kind === 'text') {
      checkText(
        context,
        [...path, index],
        child,
        type,
        previous?.kind === 'text' ? previous : undefined,
      );
    } else {
      checkElement(context, [...path, index], child);
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
  checkElement(context, [], root);
  return resultOf(context);
};

export const checkNodes = (schema: SchemaShape, nodes: readonly ElementNode[]): DocCheck => {
  const context: CheckContext = { schema, issues: [], ids: new Set() };

  nodes.forEach((node, index) => {
    checkElement(context, [index], node);
  });

  return resultOf(context);
};
