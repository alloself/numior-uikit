import { contentSize, sameMarks } from '../model/node';
import { ContentNodeKind, type Attrs, type ElementNode, type TextNode } from '../model/node.types';
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
  for (const mark of node.marks) {
    const type = context.schema.marks.get(mark.type);

    if (type === undefined || !parent.marks.has(mark.type)) {
      context.issues.push({ kind: 'mark', path: at(), mark: mark.type });
    } else {
      checkAttrs(context, at(), type.attrs, mark.attrs);
    }
  }
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

export const checkOwn = (
  context: CheckContext,
  node: ElementNode,
  type: NodeType | undefined,
): void => {
  if (type === undefined) {
    context.issues.push({ kind: 'type', path: [...context.path], type: node.type });
    return;
  }
  checkAttrs(context, context.path, type.attrs, node.attrs);

  const expected = type.leaf ? 1 : contentSize(node.content) + 2;

  if (node.leaf !== type.leaf || node.size !== expected || (type.leaf && node.content.length > 0)) {
    context.issues.push({ kind: 'size', path: [...context.path] });
  }
  if (type.content.matchContent(node.content)?.validEnd !== true) {
    context.issues.push({ kind: 'content', path: [...context.path], type: node.type });
  }
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
