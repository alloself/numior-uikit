import {
  type AttrValue,
  type Attrs,
  type ContentNode,
  type Doc,
  type ElementNode,
  type Mark,
  type Schema,
  type TextNode,
  createDoc,
} from '@numior/editor-core';
import { XmlElement, XmlText, type XmlFragment } from 'yjs';

export interface DeltaRun {
  readonly text: string;
  readonly format: Readonly<Record<string, unknown>>;
}

export interface ReadContext {
  readonly schema: Schema;
  readonly known: WeakMap<XmlElement, ElementNode>;
}

type Fields = Readonly<Record<string, unknown>>;

export const ID_ATTRIBUTE = 'nui:id';

export const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null;

const isAttrValue = (value: unknown): value is AttrValue =>
  value === null || ['string', 'number', 'boolean'].includes(typeof value);

export const attrsFrom = (value: unknown): Attrs | undefined => {
  if (!isFields(value)) {
    return undefined;
  }

  const entries = Object.entries(value);

  return entries.every((entry): entry is [string, AttrValue] => isAttrValue(entry[1]))
    ? Object.fromEntries(entries)
    : undefined;
};

export const deltaRuns = (text: XmlText): readonly DeltaRun[] => {
  const delta: unknown = text.toDelta();

  return (Array.isArray(delta) ? delta : []).reduce<DeltaRun[]>((runs, item: unknown) => {
    if (isFields(item) && typeof item['insert'] === 'string') {
      const format = item['attributes'];

      runs.push({ text: item['insert'], format: isFields(format) ? format : {} });
    }
    return runs;
  }, []);
};

const marksOf = (schema: Schema, format: Fields): readonly Mark[] | undefined => {
  const order = Array.from(schema.marks.keys());

  const marks = Object.entries(format).reduce<Mark[] | undefined>((found, [type, value]) => {
    const attrs = attrsFrom(value);

    if (found === undefined || attrs === undefined || !schema.marks.has(type)) {
      return undefined;
    }
    found.push(schema.mark(type, attrs));
    return found;
  }, []);

  return marks?.toSorted((left, right) => order.indexOf(left.type) - order.indexOf(right.type));
};

const readText = (schema: Schema, text: XmlText): readonly TextNode[] | undefined =>
  deltaRuns(text).reduce<TextNode[] | undefined>((nodes, run) => {
    const marks = marksOf(schema, run.format);

    if (nodes === undefined || marks === undefined) {
      return undefined;
    }
    nodes.push(schema.text(run.text, marks));
    return nodes;
  }, []);

export const decodedValue = (encoded: string): unknown => {
  try {
    return JSON.parse(encoded);
  } catch {
    return undefined;
  }
};

const elementAttrs = (element: XmlElement): Attrs | undefined => {
  const { [ID_ATTRIBUTE]: _id, ...encoded } = element.getAttributes();

  return attrsFrom(
    Object.fromEntries(
      Object.entries(encoded).map(([key, value]) => [
        key,
        typeof value === 'string' ? decodedValue(value) : undefined,
      ]),
    ),
  );
};

const readElement = (context: ReadContext, element: XmlElement): ElementNode | undefined => {
  const known = context.known.get(element);

  if (known !== undefined) {
    return known;
  }

  const id: unknown = element.getAttribute(ID_ATTRIBUTE);
  const attrs = elementAttrs(element);
  const content = readChildren(context, element);

  if (
    typeof id !== 'string' ||
    attrs === undefined ||
    content === undefined ||
    !context.schema.nodes.has(element.nodeName)
  ) {
    return undefined;
  }

  const node = context.schema.element(element.nodeName, { id, attrs, content });

  context.known.set(element, node);
  return node;
};

const readChild = (
  context: ReadContext,
  child: ReturnType<XmlFragment['toArray']>[number],
): readonly ContentNode[] | undefined => {
  if (child instanceof XmlText) {
    return readText(context.schema, child);
  }
  if (!(child instanceof XmlElement)) {
    return undefined;
  }

  const node = readElement(context, child);

  return node === undefined ? undefined : [node];
};

export const readChildren = (
  context: ReadContext,
  parent: XmlFragment,
): readonly ContentNode[] | undefined => {
  return parent.toArray().reduce<ContentNode[] | undefined>((content, child) => {
    const read = readChild(context, child);

    if (content === undefined || read === undefined) {
      return undefined;
    }
    for (const entry of read) {
      content.push(entry);
    }
    return content;
  }, []);
};

export const documentOf = (schema: Schema, root: ElementNode): Doc => createDoc(schema, root);
