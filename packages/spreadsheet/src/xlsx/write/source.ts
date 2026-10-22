import {
  attributeOf,
  readPart,
  readRelationships,
  relationshipsOf,
  type Relationship,
} from '../read/ooxml';
import { concatBytes } from '../zip/streams';
import type { Bytes, ZipArchive } from '../zip/zip.types';

export interface ContentTypes {
  readonly defaults: ReadonlyMap<string, string>;
  readonly overrides: ReadonlyMap<string, string>;
}

export interface SheetExtras {
  readonly root: string;
  readonly prefix: string;
  readonly before: string;
  readonly after: string;
}

interface SheetHead {
  readonly root: string;
  readonly prefix: string;
  readonly before: string;
  readonly closed: boolean;
}

const CONTENT_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types';

const NAME = '(?:[\\w.-]+:)?';

const decoder = new TextDecoder();

const elementPattern = (local: string): RegExp =>
  new RegExp(`<(${NAME})${local}(?=[\\s/>])[^>]*?(?:/>|>[\\s\\S]*?</\\1${local}>)`, 'u');

const MAIN_DECLARATION =
  /xmlns:([\w.-]+)="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/u;

const unprefixed = (text: string, slice: string): string => {
  const prefix = MAIN_DECLARATION.exec(text)?.[1];

  return prefix === undefined
    ? slice
    : slice.replaceAll(new RegExp(`<(/?)${prefix}:`, 'gu'), '<$1');
};

export const elementSlice = (text: string, local: string): string | undefined => {
  const slice = elementPattern(local).exec(text)?.[0];

  return slice === undefined ? undefined : unprefixed(text, slice);
};

const withoutElement = (text: string, local: string): string =>
  text.replace(elementPattern(local), '');

export const partText = async (archive: ZipArchive, part: string): Promise<string> =>
  decoder.decode(await archive.bytes(part));

export const readContentTypes = async (archive: ZipArchive): Promise<ContentTypes> => {
  const defaults = new Map<string, string>();
  const overrides = new Map<string, string>();

  if (!archive.has('[Content_Types].xml')) {
    return { defaults, overrides };
  }

  await readPart(archive, '[Content_Types].xml', {
    open: (element, attributes) => {
      const type = attributeOf(attributes, 'ContentType') ?? '';

      if (element.uri !== CONTENT_TYPES) {
        return;
      }
      if (element.local === 'Default') {
        defaults.set((attributeOf(attributes, 'Extension') ?? '').toLowerCase(), type);
      } else if (element.local === 'Override') {
        overrides.set((attributeOf(attributes, 'PartName') ?? '').replace(/^\//u, ''), type);
      }
    },
  });

  return { defaults, overrides };
};

const headOf = (text: string): SheetHead | undefined => {
  const root = new RegExp(`<(${NAME})worksheet(?=[\\s/>])[^>]*>`, 'u').exec(text);
  const data = new RegExp(`<(${NAME})sheetData(?=[\\s/>])[^>]*?(/?)>`, 'u').exec(text);

  return root === null || data === null
    ? undefined
    : {
        root: root[0],
        prefix: root[1] ?? '',
        before: text.slice(root.index + root[0].length, data.index),
        closed: data[2] === '/',
      };
};

const matchesAt = (bytes: Uint8Array, pattern: Uint8Array, at: number): boolean => {
  for (let index = 0; index < pattern.length; index += 1) {
    if (bytes[at + index] !== pattern[index]) {
      return false;
    }
  }
  return true;
};

const lastIndexOfBytes = (bytes: Uint8Array, pattern: Uint8Array): number => {
  for (let at = bytes.length - pattern.length; at >= 0; at -= 1) {
    if (matchesAt(bytes, pattern, at)) {
      return at;
    }
  }
  return -1;
};

const tailOf = (bytes: Uint8Array, head: SheetHead): string | undefined => {
  const close = new TextEncoder().encode(`</${head.prefix}sheetData>`);
  const at = lastIndexOfBytes(bytes, close);

  if (at < 0) {
    return undefined;
  }

  const text = decoder.decode(bytes.subarray(at + close.length));

  return text.slice(0, Math.max(text.lastIndexOf(`</${head.prefix}worksheet>`), 0));
};

const closedTailOf = (text: string, head: SheetHead): string | undefined => {
  const rest = text.split(new RegExp(`<${head.prefix}sheetData[^>]*/>`, 'u'))[1];

  return rest?.slice(0, Math.max(rest.lastIndexOf(`</${head.prefix}worksheet>`), 0));
};

const chunksOf = async (stream: ReadableStream<Bytes>): Promise<Bytes[]> => {
  const chunks: Bytes[] = [];
  const reader = stream.getReader();

  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    chunks.push(next.value);
  }
  return chunks;
};

const joined = (chunks: readonly Bytes[], from: number, to: number): Bytes =>
  concatBytes(chunks.slice(from, to));

export const readSheetExtras = async (
  archive: ZipArchive,
  part: string,
): Promise<SheetExtras | undefined> => {
  const chunks = await chunksOf(archive.stream(part));
  let count = 1;
  let head = headOf(decoder.decode(joined(chunks, 0, count)));

  while (head === undefined && count < chunks.length) {
    count = Math.min(count * 2, chunks.length);
    head = headOf(decoder.decode(joined(chunks, 0, count)));
  }
  if (head === undefined) {
    return undefined;
  }

  let from = chunks.length - 1;

  let after = head.closed
    ? closedTailOf(decoder.decode(joined(chunks, 0, chunks.length)), head)
    : tailOf(joined(chunks, from, chunks.length), head);

  while (after === undefined && !head.closed && from > 0) {
    from = Math.max(from - (chunks.length - from), 0);
    after = tailOf(joined(chunks, from, chunks.length), head);
  }
  return after === undefined
    ? undefined
    : {
        root: head.root,
        prefix: head.prefix,
        before: withoutElement(withoutElement(head.before, 'dimension'), 'cols'),
        after: withoutElement(after, 'tableParts'),
      };
};

export const reachableParts = async (
  archive: ZipArchive,
  roots: readonly Relationship[],
  skip: ReadonlySet<string>,
): Promise<Set<string>> => {
  const found = new Set<string>();

  const queue = roots.reduce<string[]>((targets, relationship) => {
    if (!relationship.external) {
      targets.push(relationship.target);
    }
    return targets;
  }, []);

  for (let part = queue.pop(); part !== undefined; part = queue.pop()) {
    if (!found.has(part) && !skip.has(part) && archive.has(part)) {
      found.add(part);

      const rels = relationshipsOf(part);

      if (archive.has(rels)) {
        found.add(rels);

        (await readRelationships(archive, part)).forEach((relationship) => {
          if (!relationship.external) {
            queue.push(relationship.target);
          }
        });
      }
    }
  }
  return found;
};
