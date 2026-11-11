import type { PartXml } from '../../core/layout/fragments.types';
import type { XmlName } from '../xml/xml.types';
import type { ZipArchive } from '../zip/zip.types';
import type { ElementSpecs } from './fragment.types';
import { createFragmentRecorder, type FragmentRecorder } from './fragment-part';
import {
  CHART_SPECS,
  COMMENT_SPECS,
  DRAWING_SPECS,
  THREAD_SPECS,
  VML_SPECS,
} from './fragment-specs';
import { readPart, readRelationships, type PartOptions, type Relationship } from './ooxml';
import { RelationshipKind } from '../ooxml.types';

const SHEET_PARTS: ReadonlyMap<string, ElementSpecs> = new Map([
  ['drawing', DRAWING_SPECS],
  ['comments', COMMENT_SPECS],
  ['vmlDrawing', VML_SPECS],
  ['threadedComment', THREAD_SPECS],
]);

const UNREADABLE = { pieces: [], group: false };

const inheritOf = (name: XmlName): string => (name.qname.includes(':') ? '' : name.uri);

const recordPart = async (
  archive: ZipArchive,
  path: string,
  specs: ElementSpecs,
  options: PartOptions,
): Promise<PartXml> => {
  let recorder: FragmentRecorder | undefined;
  let depth = 0;

  try {
    await readPart(
      archive,
      path,
      {
        open: (name, attributes) => {
          if (depth === 0) {
            recorder = createFragmentRecorder({ specs, inherit: inheritOf(name) });
          } else {
            recorder?.open(name, attributes);
          }
          depth += 1;
        },
        text: (text) => {
          if (depth < 2) {
            return;
          }

          recorder?.text(text);
        },
        close: (name) => {
          depth -= 1;
          if (depth < 1) {
            return;
          }

          recorder?.close(name);
        },
      },
      options,
    );
  } catch {
    return { path, root: UNREADABLE, opaque: ['unreadable'] };
  }

  const result = recorder?.result();

  return result === undefined
    ? { path, root: UNREADABLE, opaque: ['unreadable'] }
    : { path, root: result.head, opaque: result.opaque };
};

const chartsOf = async (
  archive: ZipArchive,
  drawing: string,
  options: PartOptions,
): Promise<PartXml[]> => {
  const relationships = await readRelationships(archive, drawing, options);
  const charts: PartXml[] = [];

  for (const relationship of relationships) {
    if (relationship.kind === RelationshipKind.ChartEx) {
      charts.push({ path: relationship.target, root: UNREADABLE, opaque: ['chartEx'] });
    } else if (
      relationship.kind === RelationshipKind.Chart &&
      !relationship.external &&
      archive.has(relationship.target)
    ) {
      charts.push(await recordPart(archive, relationship.target, CHART_SPECS, options));
    }
  }
  return charts;
};

export const readPositionalParts = async (
  archive: ZipArchive,
  relationships: readonly Relationship[],
  options: PartOptions,
): Promise<PartXml[]> => {
  const parts: PartXml[] = [];

  for (const relationship of relationships) {
    const specs = SHEET_PARTS.get(relationship.kind);

    if (specs === undefined || relationship.external || !archive.has(relationship.target)) {
      continue;
    }

    parts.push(await recordPart(archive, relationship.target, specs, options));

    if (relationship.kind !== RelationshipKind.Drawing) {
      continue;
    }

    for (const entry of await chartsOf(archive, relationship.target, options)) {
      parts.push(entry);
    }
  }
  return parts;
};
