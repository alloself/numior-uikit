import { pixelsOfEmu } from '../../core/drawings/drawings';
import {
  DrawingAnchorKind,
  DrawingKind,
  DrawingPlacement,
  type DrawingAnchor,
  type DrawingContent,
  type DrawingMark,
  type SheetDrawing,
} from '../../core/drawings/drawing.types';
import type { XmlAttribute, XmlName } from '../xml/xml.types';
import type { ZipArchive } from '../zip/zip.types';
import { readChartPart } from './chart-part';
import {
  RELATIONSHIP_ATTRIBUTES,
  XlsxPartError,
  attributeOf,
  numberOf,
  readPart,
  readRelationships,
  type PartOptions,
  type Relationship,
} from './ooxml';
import { OoxmlAttribute, OoxmlElement, RelationshipKind } from '../ooxml.types';

interface MarkDraft {
  col: number;
  colOff: number;
  row: number;
  rowOff: number;
}

type ContentDraft =
  | { readonly kind: typeof DrawingKind.Picture; readonly relation: string }
  | { readonly kind: typeof DrawingKind.Chart; readonly relation: string }
  | { readonly kind: typeof DrawingKind.Foreign; readonly label: string };

type MarkField = keyof MarkDraft;

interface AnchorDraft {
  readonly kind: DrawingAnchorKind;
  readonly editAs: string | undefined;
  from: MarkDraft | undefined;
  to: MarkDraft | undefined;
  width: number;
  height: number;
  x: number;
  y: number;
  id: string;
  name: string;
  alt: string;
  content: ContentDraft | undefined;
}

const SPREADSHEET_DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';

const CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart';

const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';

const MARKUP = 'http://schemas.openxmlformats.org/markup-compatibility/2006';

const GRAPHICS: ReadonlyMap<string, string> = new Map([
  ['http://schemas.microsoft.com/office/drawing/2014/chartex', 'chartEx'],
  ['http://schemas.openxmlformats.org/drawingml/2006/diagram', 'smartArt'],
]);

const ANCHOR_KINDS: ReadonlyMap<string, DrawingAnchorKind> = new Map([
  [OoxmlElement.TwoCellAnchor, DrawingAnchorKind.Cells],
  [OoxmlElement.OneCellAnchor, DrawingAnchorKind.Cell],
  [OoxmlElement.AbsoluteAnchor, DrawingAnchorKind.Point],
]);

const MARK_FIELDS: ReadonlyMap<string, MarkField> = new Map([
  [OoxmlElement.Col, 'col'],
  [OoxmlElement.ColOff, 'colOff'],
  [OoxmlElement.Row, 'row'],
  [OoxmlElement.RowOff, 'rowOff'],
]);

const FOREIGN_SHAPES = new Set(['sp', 'grpSp', 'cxnSp', 'contentPart']);

const IMAGE_TYPES: ReadonlyMap<string, string> = new Map([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['bmp', 'image/bmp'],
  ['svg', 'image/svg+xml'],
  ['webp', 'image/webp'],
]);

const PLACEMENTS: ReadonlyMap<string | undefined, DrawingPlacement> = new Map([
  ['oneCell', DrawingPlacement.OneCell],
  ['absolute', DrawingPlacement.Absolute],
]);

const emptyMark = (): MarkDraft => ({ col: 0, colOff: 0, row: 0, rowOff: 0 });

const markOf = (draft: MarkDraft | undefined): DrawingMark => ({
  row: draft?.row ?? 0,
  col: draft?.col ?? 0,
  dx: pixelsOfEmu(draft?.colOff ?? 0),
  dy: pixelsOfEmu(draft?.rowOff ?? 0),
});

const anchorOf = (draft: AnchorDraft): DrawingAnchor => {
  const size = { width: pixelsOfEmu(draft.width), height: pixelsOfEmu(draft.height) };

  switch (draft.kind) {
    case DrawingAnchorKind.Cell:
      return { kind: DrawingAnchorKind.Cell, from: markOf(draft.from), ...size };
    case DrawingAnchorKind.Point:
      return {
        kind: DrawingAnchorKind.Point,
        x: pixelsOfEmu(draft.x),
        y: pixelsOfEmu(draft.y),
        ...size,
      };
    case DrawingAnchorKind.Cells:
      return {
        kind: DrawingAnchorKind.Cells,
        placement: PLACEMENTS.get(draft.editAs) ?? DrawingPlacement.TwoCell,
        from: markOf(draft.from),
        to: markOf(draft.to),
      };
  }
};

const relationOf = (attributes: readonly XmlAttribute[], local: string): string =>
  attributeOf(attributes, local, RELATIONSHIP_ATTRIBUTES) ?? '';

const typeOf = (path: string): string | undefined =>
  IMAGE_TYPES.get(path.slice(path.lastIndexOf('.') + 1).toLowerCase());

const pictureOf = async (
  archive: ZipArchive,
  target: Relationship | undefined,
): Promise<DrawingContent> => {
  const type = target === undefined ? undefined : typeOf(target.target);

  if (
    target === undefined ||
    target.external ||
    type === undefined ||
    !archive.has(target.target)
  ) {
    return { kind: DrawingKind.Foreign, label: 'picture' };
  }
  return {
    kind: DrawingKind.Picture,
    media: target.target,
    type,
    bytes: await archive.bytes(target.target),
  };
};

const chartOf = async (
  archive: ZipArchive,
  target: Relationship | undefined,
  options: PartOptions,
): Promise<DrawingContent> => {
  if (
    target === undefined ||
    target.external ||
    target.kind !== RelationshipKind.Chart ||
    !archive.has(target.target)
  ) {
    return { kind: DrawingKind.Foreign, label: target?.kind ?? 'chart' };
  }

  const reading = await readChartPart(archive, target.target, options);

  return reading.ok
    ? { kind: DrawingKind.Chart, chart: reading.chart }
    : { kind: DrawingKind.Foreign, label: reading.label };
};

const contentOf = async (
  archive: ZipArchive,
  draft: ContentDraft | undefined,
  relations: ReadonlyMap<string, Relationship>,
  options: PartOptions,
): Promise<DrawingContent> => {
  switch (draft?.kind) {
    case undefined:
      return { kind: DrawingKind.Foreign, label: 'shape' };
    case DrawingKind.Foreign:
      return draft;
    case DrawingKind.Picture:
      return pictureOf(archive, relations.get(draft.relation));
    case DrawingKind.Chart:
      return chartOf(archive, relations.get(draft.relation), options);
  }
};

const graphicLabel = (uri: string): string =>
  GRAPHICS.get(uri) ?? (uri.slice(uri.lastIndexOf('/') + 1) || 'graphic');

const isDrawing = (name: XmlName): boolean => name.uri === SPREADSHEET_DRAWING;

const isFallback = (name: XmlName): boolean =>
  name.uri === MARKUP && name.local === OoxmlElement.Fallback;

const isMarkEnd = (local: string): boolean =>
  local === OoxmlElement.From || local === OoxmlElement.To;

const newAnchor = (kind: DrawingAnchorKind, attributes: readonly XmlAttribute[]): AnchorDraft => ({
  kind,
  editAs: attributeOf(attributes, OoxmlAttribute.EditAs),
  from: undefined,
  to: undefined,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  id: '',
  name: '',
  alt: '',
  content: undefined,
});

const readNames = (current: AnchorDraft, attributes: readonly XmlAttribute[]): void => {
  if (current.id === '') {
    current.id = attributeOf(attributes, OoxmlAttribute.Id) ?? '';
    current.name = attributeOf(attributes, OoxmlAttribute.Name) ?? '';
    current.alt = attributeOf(attributes, OoxmlAttribute.Descr) ?? '';
  }
};

const graphicContent = (
  name: XmlName,
  attributes: readonly XmlAttribute[],
): ContentDraft | undefined => {
  if (name.uri === DRAWING && name.local === OoxmlElement.GraphicData) {
    const uri = attributeOf(attributes, OoxmlAttribute.Uri) ?? '';

    return uri === CHART ? undefined : { kind: DrawingKind.Foreign, label: graphicLabel(uri) };
  }
  if (name.uri === DRAWING && name.local === OoxmlElement.Blip) {
    return { kind: DrawingKind.Picture, relation: relationOf(attributes, OoxmlAttribute.Embed) };
  }
  if (name.uri === CHART && name.local === OoxmlElement.Chart) {
    return { kind: DrawingKind.Chart, relation: relationOf(attributes, OoxmlAttribute.Id) };
  }
  return undefined;
};

const createDrafter = () => {
  const anchors: AnchorDraft[] = [];
  let anchor: AnchorDraft | undefined;
  let mark: MarkDraft | undefined;
  let field: MarkField | undefined;
  let text = '';
  let fallback = 0;

  const openMark = (current: AnchorDraft, local: string): void => {
    mark = emptyMark();
    if (local === OoxmlElement.From) {
      current.from = mark;
    } else {
      current.to = mark;
    }
  };

  const openDrawingChild = (
    current: AnchorDraft,
    local: string,
    attributes: readonly XmlAttribute[],
  ): void => {
    const markField = MARK_FIELDS.get(local);

    if (isMarkEnd(local)) {
      openMark(current, local);
    } else if (local === OoxmlElement.Ext) {
      current.width = numberOf(attributeOf(attributes, OoxmlAttribute.Cx), 0);
      current.height = numberOf(attributeOf(attributes, OoxmlAttribute.Cy), 0);
    } else if (local === OoxmlElement.Pos) {
      current.x = numberOf(attributeOf(attributes, OoxmlAttribute.X), 0);
      current.y = numberOf(attributeOf(attributes, OoxmlAttribute.Y), 0);
    } else if (local === OoxmlElement.CNvPr) {
      readNames(current, attributes);
    } else if (markField !== undefined && mark !== undefined) {
      field = markField;
      text = '';
    } else if (FOREIGN_SHAPES.has(local) && current.content === undefined) {
      current.content = { kind: DrawingKind.Foreign, label: local };
    }
  };

  const closeDrawing = (local: string): void => {
    if (field !== undefined && MARK_FIELDS.get(local) === field && mark !== undefined) {
      mark[field] = numberOf(text.trim(), 0);
      field = undefined;
    } else if (isMarkEnd(local)) {
      mark = undefined;
    } else if (ANCHOR_KINDS.has(local) && anchor !== undefined) {
      anchors.push(anchor);
      anchor = undefined;
    }
  };

  return {
    anchors,
    open: (name: XmlName, attributes: readonly XmlAttribute[]): void => {
      if (isFallback(name)) {
        fallback += 1;
      }

      const kind = isDrawing(name) ? ANCHOR_KINDS.get(name.local) : undefined;

      if (fallback > 0) {
        return;
      }
      if (kind !== undefined) {
        anchor = newAnchor(kind, attributes);
      } else if (anchor !== undefined && isDrawing(name)) {
        openDrawingChild(anchor, name.local, attributes);
      } else if (anchor !== undefined && anchor.content === undefined) {
        anchor.content = graphicContent(name, attributes);
      }
    },
    text: (chunk: string): void => {
      if (field !== undefined) {
        text += chunk;
      }
    },
    close: (name: XmlName): void => {
      if (isFallback(name)) {
        fallback -= 1;
      } else if (fallback === 0 && isDrawing(name)) {
        closeDrawing(name.local);
      }
    },
  };
};

const drawingsOfPart = async (
  archive: ZipArchive,
  path: string,
  options: PartOptions,
): Promise<SheetDrawing[]> => {
  const drafter = createDrafter();

  await readPart(archive, path, drafter, options);

  const relations = new Map(
    (await readRelationships(archive, path, options)).map((relation) => [relation.id, relation]),
  );

  const drawings: SheetDrawing[] = [];

  for (const [index, draft] of drafter.anchors.entries()) {
    drawings.push({
      id: `${path}#${draft.id === '' ? String(index) : draft.id}`,
      name: draft.name,
      alt: draft.alt,
      anchor: anchorOf(draft),
      content: await contentOf(archive, draft.content, relations, options),
    });
  }
  return drawings;
};

export const readDrawings = async (
  archive: ZipArchive,
  relationships: readonly Relationship[],
  options: PartOptions,
): Promise<SheetDrawing[]> => {
  const drawings: SheetDrawing[] = [];

  for (const relationship of relationships) {
    if (
      relationship.kind === RelationshipKind.Drawing &&
      !relationship.external &&
      archive.has(relationship.target)
    ) {
      try {
        drawings.push(...(await drawingsOfPart(archive, relationship.target, options)));
      } catch (error) {
        if (!(error instanceof XlsxPartError)) {
          throw error;
        }
      }
    }
  }
  return drawings;
};
