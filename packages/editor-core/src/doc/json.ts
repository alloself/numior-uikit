import { contentSize } from '../model/node';
import type {
  AttrValue,
  Attrs,
  ContentNode,
  ElementNode,
  Mark,
  TextNode,
} from '../model/node.types';
import type { AttrSpecs, Schema } from '../schema/schema.types';
import { createDoc } from './doc';
import type { Doc } from './doc.types';
import type {
  DocJSON,
  DocJSONIssue,
  DocJSONResult,
  ElementJSON,
  MarkJSON,
  NodeJSON,
} from './json.types';

type Fields = Readonly<Record<string, unknown>>;

interface Reader {
  readonly schema: Schema;
  readonly issues: DocJSONIssue[];
}

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAttrValue = (value: unknown): value is AttrValue =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

const isStamp = (value: unknown): value is DocJSON['schema'] =>
  isFields(value) && typeof value.name === 'string' && typeof value.version === 'number';

const withAttrs = (attrs: Attrs): { readonly attrs?: Attrs } =>
  Object.keys(attrs).length === 0 ? {} : { attrs };

const markToJSON = (mark: Mark): MarkJSON => ({ type: mark.type, ...withAttrs(mark.attrs) });

const nodeToJSON = (node: ContentNode): NodeJSON => {
  if (node.kind === 'text') {
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

const readAttrs = (
  reader: Reader,
  path: readonly number[],
  value: unknown,
  specs: AttrSpecs,
): Attrs => {
  const given = value ?? {};
  const attrs: Record<string, AttrValue> = {};

  if (!isFields(given) || !Object.values(given).every(isAttrValue)) {
    reader.issues.push({ kind: 'shape', path, field: 'attrs' });
    return attrs;
  }
  for (const [key, spec] of Object.entries(specs)) {
    if (spec.default !== undefined) {
      attrs[key] = spec.default;
    }
  }
  for (const [key, entry] of Object.entries(given)) {
    if (isAttrValue(entry)) {
      attrs[key] = entry;
    }
  }
  return attrs;
};

const readMark = (reader: Reader, path: readonly number[], value: unknown): Mark | undefined => {
  if (!isFields(value) || typeof value.type !== 'string') {
    reader.issues.push({ kind: 'shape', path, field: 'marks' });
    return undefined;
  }
  const specs = reader.schema.marks.get(value.type)?.attrs ?? {};

  return { type: value.type, attrs: readAttrs(reader, path, value.attrs, specs) };
};

const readText = (reader: Reader, path: readonly number[], value: Fields): TextNode => {
  const marks = value.marks ?? [];

  const rank = (mark: Mark): number =>
    reader.schema.marks.get(mark.type)?.rank ?? Number.POSITIVE_INFINITY;

  if (typeof value.text !== 'string') {
    reader.issues.push({ kind: 'shape', path, field: 'text' });
  }
  if (!Array.isArray(marks)) {
    reader.issues.push({ kind: 'shape', path, field: 'marks' });
  }
  return {
    kind: 'text',
    text: typeof value.text === 'string' ? value.text : '',
    marks: (Array.isArray(marks) ? marks : [])
      .flatMap((mark: unknown) => {
        const read = readMark(reader, path, mark);

        return read === undefined ? [] : [read];
      })
      .toSorted((left, right) => rank(left) - rank(right)),
  };
};

const readContent = (reader: Reader, path: readonly number[], value: unknown): ContentNode[] => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    reader.issues.push({ kind: 'shape', path, field: 'content' });
    return [];
  }
  return value.flatMap((child: unknown, index) => {
    const node = readNode(reader, [...path, index], child);

    return node === undefined ? [] : [node];
  });
};

const readElement = (reader: Reader, path: readonly number[], value: Fields): ElementNode => {
  const type = typeof value.type === 'string' ? value.type : '';
  const id = typeof value.id === 'string' ? value.id : '';
  const nodeType = reader.schema.nodes.get(type);
  const content = readContent(reader, path, value.content);

  for (const field of ['id', 'type'] as const) {
    if (typeof value[field] !== 'string') {
      reader.issues.push({ kind: 'shape', path, field });
    }
  }
  return {
    kind: 'element',
    id,
    type,
    attrs: readAttrs(reader, path, value.attrs, nodeType?.attrs ?? {}),
    content,
    leaf: nodeType?.leaf ?? false,
    size: nodeType?.leaf === true ? 1 : contentSize(content) + 2,
  };
};

const readNode = (
  reader: Reader,
  path: readonly number[],
  value: unknown,
): ContentNode | undefined => {
  if (!isFields(value)) {
    reader.issues.push({ kind: 'shape', path, field: 'node' });
    return undefined;
  }
  return Object.hasOwn(value, 'text')
    ? readText(reader, path, value)
    : readElement(reader, path, value);
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
  const reader: Reader = { schema, issues: headerIssues(schema, value) };
  const root = reader.issues.length === 0 ? readNode(reader, [], value.root) : undefined;

  if (root === undefined || root.kind !== 'element' || reader.issues.length > 0) {
    return {
      ok: false,
      issues:
        reader.issues.length > 0 ? reader.issues : [{ kind: 'shape', path: [], field: 'root' }],
    };
  }
  const check = schema.check(root);

  return check.ok
    ? { ok: true, doc: createDoc(schema, root) }
    : { ok: false, issues: check.issues };
};
