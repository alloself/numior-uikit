import { nextTask } from '../../core/calc/tasks';
import { parseXmlStream } from '../xml/sax';
import { XmlBoolean, type XmlAttribute, type XmlFailure, type XmlHandlers } from '../xml/xml.types';
import type { ZipArchive } from '../zip/zip.types';
import { PathSegment } from '../write/write.types';
import { OoxmlElement, TargetMode } from '../ooxml.types';

export interface Relationship {
  readonly id: string;
  readonly type: string;
  readonly kind: string;
  readonly target: string;
  readonly external: boolean;
}

export interface PartOptions {
  readonly signal?: AbortSignal | undefined;
  readonly onBytes?: ((bytes: number) => void) | undefined;
}

export const MAIN = new Set([
  'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  'http://purl.oclc.org/ooxml/spreadsheetml/main',
]);

export const RELATIONSHIP_ATTRIBUTES = new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  'http://purl.oclc.org/ooxml/officeDocument/relationships',
]);

const PACKAGE_RELATIONSHIPS = 'http://schemas.openxmlformats.org/package/2006/relationships';

export class XlsxPartError extends Error {
  readonly part: string;
  readonly failure: XmlFailure;

  constructor(part: string, failure: XmlFailure) {
    super(`xlsx: ${part} ${failure.reason} at ${String(failure.position)}`);
    this.part = part;
    this.failure = failure;
  }
}

export const attributeOf = (
  attributes: readonly XmlAttribute[],
  local: string,
  uris?: ReadonlySet<string>,
): string | undefined =>
  attributes.find(
    (attribute) =>
      attribute.name.local === local &&
      (uris === undefined ? attribute.name.uri === '' : uris.has(attribute.name.uri)),
  )?.value;

export const numberOf = (text: string | undefined, fallback: number): number => {
  const value = text === undefined || text === '' ? Number.NaN : Number(text);

  return Number.isFinite(value) ? value : fallback;
};

export const truthy = (text: string | undefined): boolean =>
  text === XmlBoolean.One || text === XmlBoolean.True;

const relationKind = (type: string): string => type.slice(type.lastIndexOf('/') + 1);

const directoryOf = (part: string): string => part.slice(0, part.lastIndexOf('/') + 1);

const resolvePart = (from: string, target: string): string => {
  const joined = target.startsWith('/') ? target.slice(1) : directoryOf(from) + target;

  return joined
    .split('/')
    .reduce<string[]>((parts, segment) => {
      if (segment === PathSegment.Parent) {
        parts.pop();
      } else if (segment !== PathSegment.Current && segment !== '') {
        parts.push(segment);
      }
      return parts;
    }, [])
    .join('/');
};

export const relationshipsOf = (part: string): string =>
  `${directoryOf(part)}_rels/${part.slice(part.lastIndexOf('/') + 1)}.rels`;

export const readPart = async (
  archive: ZipArchive,
  part: string,
  handlers: XmlHandlers,
  options: PartOptions = {},
): Promise<void> => {
  const failure = await parseXmlStream(archive.stream(part), handlers, {
    signal: options.signal,
    onBytes: options.onBytes,
    budgetMs: 8,
    yieldTo: nextTask,
  });

  if (failure !== undefined) {
    throw new XlsxPartError(part, failure);
  }
};

export const readRelationships = async (
  archive: ZipArchive,
  part: string,
  options: PartOptions = {},
): Promise<Relationship[]> => {
  const path = part === '' ? '_rels/.rels' : relationshipsOf(part);
  const found: Relationship[] = [];

  if (!archive.has(path)) {
    return found;
  }

  await readPart(
    archive,
    path,
    {
      open: (name, attributes) => {
        if (name.uri !== PACKAGE_RELATIONSHIPS || name.local !== OoxmlElement.Relationship) {
          return;
        }

        const external = attributeOf(attributes, 'TargetMode') === TargetMode.External;
        const target = attributeOf(attributes, 'Target') ?? '';
        const type = attributeOf(attributes, 'Type') ?? '';

        found.push({
          id: attributeOf(attributes, 'Id') ?? '',
          type,
          kind: relationKind(type),
          target: external ? target : resolvePart(part, target),
          external,
        });
      },
    },
    options,
  );

  return found;
};
