import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type Mark,
} from '../model/node.types';
import { contentHole, renderTag } from '../render/render';
import { createSchema } from '../schema/schema';
import type { Schema } from '../schema/schema.types';
import { DiffMark, InlineEditKind, type DocDiff } from './diff.types';

interface DiffContext {
  readonly before: Doc;
  readonly after: Doc;
  readonly schema: Schema;
  changes: number;
}

interface InlineToken {
  readonly key: string;
  readonly text: string;
  readonly marks: readonly Mark[];
  readonly element: ElementNode | undefined;
}

interface InlineEdit {
  readonly kind: InlineEditKind;
  readonly token: InlineToken;
}

const MAX_ALIGNED_CELLS = 1_000_000;

const WORDS = /\s+|\S+/gu;

const NO_MARKS: readonly Mark[] = [];

const schemas = new WeakMap<Schema, Schema>();

const buildDiffSchema = (schema: Schema): Schema =>
  createSchema({
    ...schema.spec,
    marks: {
      ...schema.spec.marks,
      [DiffMark.Added]: {
        render: () => renderTag('ins', { class: 'nui-diff nui-diff--added' }, [contentHole]),
      },
      [DiffMark.Removed]: {
        render: () => renderTag('del', { class: 'nui-diff nui-diff--removed' }, [contentHole]),
      },
    },
  });

export const diffSchema = (schema: Schema): Schema => {
  const known = schemas.get(schema) ?? buildDiffSchema(schema);

  schemas.set(schema, known);
  return known;
};

const tokensOf = (content: readonly ContentNode[]): readonly InlineToken[] =>
  content.flatMap<InlineToken>((node) =>
    node.kind === ContentNodeKind.Text
      ? (node.text.match(WORDS) ?? []).map((text) => ({
          key: text,
          text,
          marks: node.marks,
          element: undefined,
        }))
      : [
          {
            key: `\0${node.type}:${JSON.stringify(node.attrs)}`,
            text: '',
            marks: NO_MARKS,
            element: node,
          },
        ],
  );

const commonPrefix = (left: readonly InlineToken[], right: readonly InlineToken[]): number => {
  const limit = Math.min(left.length, right.length);
  let size = 0;

  while (size < limit && left[size]?.key === right[size]?.key) {
    size += 1;
  }
  return size;
};

const commonSuffix = (
  left: readonly InlineToken[],
  right: readonly InlineToken[],
  prefix: number,
): number => {
  const limit = Math.min(left.length, right.length) - prefix;
  let size = 0;

  while (
    size < limit &&
    left[left.length - 1 - size]?.key === right[right.length - 1 - size]?.key
  ) {
    size += 1;
  }
  return size;
};

const suffixTable = (left: readonly InlineToken[], right: readonly InlineToken[]): Uint32Array => {
  const width = right.length + 1;
  const table = new Uint32Array((left.length + 1) * width);

  for (let row = left.length - 1; row >= 0; row -= 1) {
    for (let column = right.length - 1; column >= 0; column -= 1) {
      table[row * width + column] =
        left[row]?.key === right[column]?.key
          ? (table[(row + 1) * width + column + 1] ?? 0) + 1
          : Math.max(table[(row + 1) * width + column] ?? 0, table[row * width + column + 1] ?? 0);
    }
  }
  return table;
};

const replacement = (
  left: readonly InlineToken[],
  right: readonly InlineToken[],
): readonly InlineEdit[] => [
  ...left.map<InlineEdit>((token) => ({ kind: InlineEditKind.Removed, token })),
  ...right.map<InlineEdit>((token) => ({ kind: InlineEditKind.Added, token })),
];

const aligned = (
  left: readonly InlineToken[],
  right: readonly InlineToken[],
): readonly InlineEdit[] => {
  if (left.length * right.length > MAX_ALIGNED_CELLS) {
    return replacement(left, right);
  }

  const width = right.length + 1;
  const table = suffixTable(left, right);
  const edits: InlineEdit[] = [];
  let row = 0;
  let column = 0;

  while (row < left.length && column < right.length) {
    const before = left[row];
    const after = right[column];

    if (before !== undefined && after !== undefined && before.key === after.key) {
      edits.push({ kind: InlineEditKind.Same, token: after });
      row += 1;
      column += 1;
    } else if (
      (table[(row + 1) * width + column] ?? 0) >= (table[row * width + column + 1] ?? 0) &&
      before !== undefined
    ) {
      edits.push({ kind: InlineEditKind.Removed, token: before });
      row += 1;
    } else if (after !== undefined) {
      edits.push({ kind: InlineEditKind.Added, token: after });
      column += 1;
    }
  }
  return [...edits, ...replacement(left.slice(row), right.slice(column))];
};

const editsOf = (
  left: readonly InlineToken[],
  right: readonly InlineToken[],
): readonly InlineEdit[] => {
  const prefix = commonPrefix(left, right);
  const suffix = commonSuffix(left, right, prefix);

  return [
    ...right.slice(0, prefix).map<InlineEdit>((token) => ({ kind: InlineEditKind.Same, token })),
    ...aligned(
      left.slice(prefix, left.length - suffix),
      right.slice(prefix, right.length - suffix),
    ),
    ...right
      .slice(right.length - suffix)
      .map<InlineEdit>((token) => ({ kind: InlineEditKind.Same, token })),
  ];
};

const sameMarks = (left: readonly Mark[], right: readonly Mark[]): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const appendText = (
  schema: Schema,
  nodes: ContentNode[],
  text: string,
  marks: readonly Mark[],
): void => {
  const last = nodes.at(-1);

  if (last?.kind === ContentNodeKind.Text && sameMarks(last.marks, marks)) {
    nodes[nodes.length - 1] = schema.text(last.text + text, marks);
  } else {
    nodes.push(schema.text(text, marks));
  }
};

const marksOfEdit = (schema: Schema, edit: InlineEdit): readonly Mark[] => {
  switch (edit.kind) {
    case InlineEditKind.Same:
      return edit.token.marks;
    case InlineEditKind.Added:
      return [...edit.token.marks, schema.mark(DiffMark.Added)];
    case InlineEditKind.Removed:
      return [...edit.token.marks, schema.mark(DiffMark.Removed)];
  }
};

const inlineOf = (context: DiffContext, edits: readonly InlineEdit[]): readonly ContentNode[] =>
  edits.reduce<ContentNode[]>((nodes, edit) => {
    context.changes += edit.kind === InlineEditKind.Same ? 0 : 1;

    if (edit.token.element === undefined) {
      appendText(context.schema, nodes, edit.token.text, marksOfEdit(context.schema, edit));
    } else if (edit.kind !== InlineEditKind.Removed) {
      nodes.push(edit.token.element);
    }
    return nodes;
  }, []);

const copied = (context: DiffContext, node: ElementNode, content: readonly ContentNode[]) =>
  context.schema.element(node.type, { id: node.id, attrs: node.attrs, content });

const marked = (context: DiffContext, node: ContentNode, mark: DiffMark): ContentNode => {
  if (node.kind === ContentNodeKind.Text) {
    return context.schema.text(node.text, [...node.marks, context.schema.mark(mark)]);
  }

  const kept = node.content.filter(
    (child) =>
      mark === DiffMark.Added ||
      child.kind === ContentNodeKind.Text ||
      context.after.byId(child.id) === undefined,
  );

  return copied(
    context,
    node,
    kept.map((child) => marked(context, child, mark)),
  );
};

const holdsInline = (schema: Schema, node: ElementNode): boolean =>
  schema.nodes.get(node.type)?.inlineContent ?? false;

const removedByAnchor = (
  context: DiffContext,
  before: ElementNode,
  after: ElementNode,
): ReadonlyMap<string | undefined, readonly ContentNode[]> => {
  const own = new Set(after.content.flatMap((child) => ('id' in child ? [child.id] : [])));
  const groups = new Map<string | undefined, ContentNode[]>();
  let anchor: string | undefined;

  before.content.forEach((child) => {
    if (child.kind === ContentNodeKind.Text) {
      return;
    }
    if (own.has(child.id)) {
      anchor = child.id;
    } else if (context.after.byId(child.id) === undefined) {
      context.changes += 1;

      if (!child.leaf) {
        groups.set(anchor, [
          ...(groups.get(anchor) ?? []),
          marked(context, child, DiffMark.Removed),
        ]);
      }
    }
  });

  return groups;
};

const mergedBlocks = (
  context: DiffContext,
  before: ElementNode,
  after: ElementNode,
): readonly ContentNode[] => {
  const removed = removedByAnchor(context, before, after);

  return [
    ...(removed.get(undefined) ?? []),
    ...after.content.flatMap((child) =>
      child.kind === ContentNodeKind.Text
        ? [child]
        : [mergedNode(context, child), ...(removed.get(child.id) ?? [])],
    ),
  ];
};

const mergedNode = (context: DiffContext, node: ElementNode): ContentNode => {
  const previous = context.before.byId(node.id);

  if (node.leaf) {
    context.changes += previous === undefined ? 1 : 0;
    return node;
  }
  if (
    previous === undefined ||
    holdsInline(context.schema, previous) !== holdsInline(context.schema, node)
  ) {
    context.changes += 1;
    return marked(context, node, DiffMark.Added);
  }

  return copied(
    context,
    node,
    holdsInline(context.schema, node)
      ? inlineOf(context, editsOf(tokensOf(previous.content), tokensOf(node.content)))
      : mergedBlocks(context, previous, node),
  );
};

export const diffDocs = (before: Doc, after: Doc): DocDiff => {
  const schema = diffSchema(after.schema);
  const context: DiffContext = { before, after, schema, changes: 0 };
  const content = mergedBlocks(context, before.root, after.root);

  return {
    doc: createDoc(schema, copied(context, after.root, content)),
    changes: context.changes,
  };
};
