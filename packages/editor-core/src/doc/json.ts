import { contentSize } from '../model/node';
import {
  ContentNodeKind,
  type Attrs,
  type AttrValue,
  type ContentNode,
  type ElementNode,
  type Mark,
  type TextNode,
} from '../model/node.types';
import {
  checkBuilt,
  checkIdentity,
  checkMark,
  checkResult,
  checkSlice,
  checkText,
  checkTop,
  createCheckContext,
  elementTypeOf,
  type CheckContext,
} from '../schema/check';
import type { AttrSpecs, NodeType, Schema } from '../schema/schema.types';
import { specEntries } from '../schema/spec-entries';
import { createDoc } from './doc';
import type { Doc, Slice } from './doc.types';
import type {
  DocJSON,
  DocJSONIssue,
  DocJSONResult,
  ElementJSON,
  MarkJSON,
  NodeJSON,
  SliceJSON,
} from './json.types';

type Fields = Readonly<Record<string, unknown>>;

interface Reader {
  readonly schema: Schema;
  readonly issues: DocJSONIssue[];
  readonly check: CheckContext;
}

const NO_ATTRS: Attrs = {};

const NO_MARKS: readonly MarkJSON[] = [];

const NO_NODES: readonly NodeJSON[] = [];

export const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isAttrValue = (value: unknown): value is AttrValue =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

const isStamp = (value: unknown): value is DocJSON['schema'] =>
  isFields(value) && typeof value.name === 'string' && typeof value.version === 'number';

const withAttrs = (attrs: Attrs): { readonly attrs?: Attrs } =>
  Object.keys(attrs).length === 0 ? {} : { attrs };

export const markToJSON = (mark: Mark): MarkJSON => ({ type: mark.type, ...withAttrs(mark.attrs) });

const nodeToJSON = (node: ContentNode): NodeJSON => {
  if (node.kind === ContentNodeKind.Text) {
    return node.marks.length === 0
      ? { text: node.text }
      : { text: node.text, marks: node.marks.map(markToJSON) };
  }
  return elementToJSON(node);
};

const written = new WeakMap<ElementNode, ElementJSON>();

const elementToJSON = (node: ElementNode): ElementJSON => {
  const known = written.get(node);

  if (known !== undefined) {
    return known;
  }

  const json: ElementJSON = {
    id: node.id,
    type: node.type,
    ...withAttrs(node.attrs),
    ...(node.content.length === 0 ? {} : { content: node.content.map(nodeToJSON) }),
  };

  written.set(node, json);
  return json;
};

export const toJSON = (doc: Doc): DocJSON => ({
  format: 1,
  schema: { name: doc.schema.name, version: doc.schema.version },
  root: elementToJSON(doc.root),
});

const shapeIssue = (reader: Reader, field: string): void => {
  reader.issues.push({ kind: 'shape', path: [...reader.check.path], field });
};

const readAttrs = (reader: Reader, value: unknown, specs: AttrSpecs): Attrs => {
  const attrs: Record<string, AttrValue> = {};

  if (value !== undefined && value !== null && !isFields(value)) {
    shapeIssue(reader, 'attrs');
    return {};
  }
  for (const [key, spec] of specEntries(specs)) {
    if (spec.default === undefined) {
      continue;
    }

    attrs[key] = spec.default;
  }
  if (!isFields(value)) {
    return attrs;
  }
  for (const key of Object.keys(value)) {
    const entry = value[key];

    if (!isAttrValue(entry)) {
      shapeIssue(reader, 'attrs');
      return {};
    }
    attrs[key] = entry;
  }
  return attrs;
};

const readMark = (reader: Reader, value: unknown): Mark | undefined => {
  if (!isFields(value) || typeof value.type !== 'string') {
    shapeIssue(reader, 'marks');
    return undefined;
  }
  const specs = reader.schema.marks.get(value.type)?.attrs ?? {};

  return { type: value.type, attrs: readAttrs(reader, value.attrs, specs) };
};

const rankOf = (schema: Schema, mark: Mark): number =>
  schema.marks.get(mark.type)?.rank ?? Number.POSITIVE_INFINITY;

const readMarks = (reader: Reader, marks: readonly unknown[]): Mark[] => {
  const read = marks.reduce<Mark[]>((found, mark) => {
    const next = readMark(reader, mark);

    if (next !== undefined) {
      found.push(next);
    }
    return found;
  }, []);

  return read.length > 1
    ? read.toSorted((left, right) => rankOf(reader.schema, left) - rankOf(reader.schema, right))
    : read;
};

const readText = (reader: Reader, value: Fields): TextNode => {
  const marks = value.marks ?? [];

  if (typeof value.text !== 'string') {
    shapeIssue(reader, 'text');
  }
  if (!Array.isArray(marks)) {
    shapeIssue(reader, 'marks');
  }
  return {
    kind: 'text',
    text: typeof value.text === 'string' ? value.text : '',
    marks: Array.isArray(marks) && marks.length > 0 ? readMarks(reader, marks) : [],
  };
};

const readContent = (
  reader: Reader,
  value: unknown,
  parent: NodeType | undefined,
): ContentNode[] => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    shapeIssue(reader, 'content');
    return [];
  }
  const content: ContentNode[] = [];

  value.forEach((child: unknown, index) => {
    reader.check.path.push(index);

    const node = readNode(reader, child, parent !== undefined);

    reader.check.path.pop();
    if (node === undefined) {
      return;
    }
    if (parent !== undefined && node.kind === ContentNodeKind.Text) {
      const previous = content.at(-1);

      checkText(
        reader.check,
        index,
        node,
        parent,
        previous?.kind === ContentNodeKind.Text ? previous : undefined,
      );
    }
    content.push(node);
  });

  return content;
};

const checkOwnAt = (
  context: CheckContext,
  node: ElementNode,
  type: NodeType | undefined,
  mark: number,
): void => {
  const before = context.issues.length;

  checkBuilt(context, node, type);

  if (context.issues.length <= before || before <= mark) {
    return;
  }

  const own = context.issues.splice(before);
  const nested = context.issues.splice(mark);

  for (const issue of [...own, ...nested]) {
    context.issues.push(issue);
  }
};

const readElement = (reader: Reader, value: Fields, checking: boolean): ElementNode => {
  const type = typeof value.type === 'string' ? value.type : '';
  const id = typeof value.id === 'string' ? value.id : '';
  const nodeType = elementTypeOf(reader.check, type);
  const checked = checking ? nodeType : undefined;

  if (checking) {
    checkIdentity(reader.check, id);
  }

  const mark = reader.check.issues.length;
  const content = readContent(reader, value.content, checked);

  if (typeof value.id !== 'string') {
    shapeIssue(reader, 'id');
  }
  if (typeof value.type !== 'string') {
    shapeIssue(reader, 'type');
  }

  const node: ElementNode = {
    kind: 'element',
    id,
    type,
    attrs: readAttrs(reader, value.attrs, nodeType?.attrs ?? {}),
    content,
    leaf: nodeType?.leaf ?? false,
    size: nodeType?.leaf === true ? 1 : contentSize(content) + 2,
  };

  if (checking) {
    checkOwnAt(reader.check, node, checked, mark);
  }
  return node;
};

const readNode = (reader: Reader, value: unknown, checking: boolean): ContentNode | undefined => {
  if (!isFields(value)) {
    shapeIssue(reader, 'node');
    return undefined;
  }
  return Object.hasOwn(value, 'text')
    ? readText(reader, value)
    : readElement(reader, value, checking);
};

const stampIssue = (schema: Schema, found: unknown): DocJSONIssue | undefined => {
  const expected = { name: schema.name, version: schema.version };

  if (!isStamp(found)) {
    return { kind: 'shape', path: [], field: 'schema' };
  }
  return found.name === expected.name && found.version === expected.version
    ? undefined
    : { kind: 'schema', expected, found: { name: found.name, version: found.version } };
};

const headerIssues = (schema: Schema, value: Fields): DocJSONIssue[] => {
  const stamp = stampIssue(schema, value.schema);

  if (value.format !== 1) {
    return [{ kind: 'format' }];
  }
  return stamp === undefined ? [] : [stamp];
};

export const fromJSON = (schema: Schema, value: unknown): DocJSONResult => {
  if (!isFields(value)) {
    return { ok: false, issues: [{ kind: 'format' }] };
  }

  const reader: Reader = {
    schema,
    issues: headerIssues(schema, value),
    check: createCheckContext(schema),
  };

  const root = reader.issues.length === 0 ? readNode(reader, value.root, true) : undefined;

  if (root === undefined || root.kind !== ContentNodeKind.Element || reader.issues.length > 0) {
    return {
      ok: false,
      issues:
        reader.issues.length > 0 ? reader.issues : [{ kind: 'shape', path: [], field: 'root' }],
    };
  }
  checkTop(reader.check, root);

  const check = checkResult(reader.check);

  return check.ok
    ? { ok: true, doc: createDoc(schema, root) }
    : { ok: false, issues: check.issues };
};

const partReader = (schema: Schema): Reader => ({
  schema,
  issues: [],
  check: createCheckContext(schema),
});

const isDepth = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

export const sliceToJSON = (slice: Slice): SliceJSON => ({
  content: slice.content.map(nodeToJSON),
  openStart: slice.openStart,
  openEnd: slice.openEnd,
});

export const sliceFromJSON = (
  schema: Schema,
  value: unknown,
  insert?: number,
): Slice | undefined => {
  if (!isFields(value) || !isDepth(value.openStart) || !isDepth(value.openEnd)) {
    return undefined;
  }

  const reader = partReader(schema);

  const slice: Slice = {
    content: readContent(reader, value.content, undefined),
    openStart: value.openStart,
    openEnd: value.openEnd,
  };

  return reader.issues.length === 0 && checkSlice(schema, slice, insert).ok ? slice : undefined;
};

export const markFromJSON = (schema: Schema, value: unknown): Mark | undefined => {
  const reader = partReader(schema);
  const mark = readMark(reader, value);

  return mark !== undefined && reader.issues.length === 0 && checkMark(schema, mark).ok
    ? mark
    : undefined;
};

const sameAttrs = (one: Attrs = NO_ATTRS, other: Attrs = NO_ATTRS): boolean => {
  const keys = Object.keys(one);

  return keys.length === Object.keys(other).length && keys.every((key) => one[key] === other[key]);
};

const sameMarkList = (
  one: readonly MarkJSON[] = NO_MARKS,
  other: readonly MarkJSON[] = NO_MARKS,
): boolean =>
  one.length === other.length &&
  one.every((mark, index) => {
    const peer = other[index];

    return peer !== undefined && mark.type === peer.type && sameAttrs(mark.attrs, peer.attrs);
  });

const sameNodeJSON = (one: NodeJSON, other: NodeJSON): boolean => {
  if (one === other) {
    return true;
  }

  if ('text' in one || 'text' in other) {
    return (
      'text' in one &&
      'text' in other &&
      one.text === other.text &&
      sameMarkList(one.marks, other.marks)
    );
  }
  const left = one.content ?? NO_NODES;
  const right = other.content ?? NO_NODES;

  return (
    one.id === other.id &&
    one.type === other.type &&
    left.length === right.length &&
    sameAttrs(one.attrs, other.attrs) &&
    left.every((node, index) => {
      const peer = right[index];

      return peer !== undefined && sameNodeJSON(node, peer);
    })
  );
};

export const sameDocJSON = (one: DocJSON, other: DocJSON): boolean =>
  one === other ||
  (one.format === other.format &&
    one.schema.name === other.schema.name &&
    one.schema.version === other.schema.version &&
    sameNodeJSON(one.root, other.root));
