import type { Calculator } from '../../core/calc/calculator';
import { nextTask } from '../../core/calc/tasks';
import type { ExternalBook, Sheet, SheetTable, Workbook } from '../../core/workbook';
import { readRelationships, relationshipsOf, type Relationship } from '../read/ooxml';
import type { OriginalPackage, OriginalSheet } from '../read/read.types';
import { readTablePart, type TableEntry } from '../read/table-part';
import { readZip } from '../zip/read-zip';
import { writeZip } from '../zip/write-zip';
import type { Bytes, ZipArchive, ZipWriteEntry } from '../zip/zip.types';
import {
  METADATA_XML,
  OFFICE,
  TYPES,
  contentTypesXml,
  externalLinkXml,
  relationshipsXml,
  relativeTarget,
  tableXml,
  workbookXml,
  type PlannedRelationship,
  type PlannedSheet,
} from './book-parts';
import { createStringTable, writeSheetPart, type StringTable } from './sheet-part';
import {
  elementSlice,
  partText,
  reachableParts,
  readContentTypes,
  readSheetExtras,
  type ContentTypes,
  type SheetExtras,
} from './source';
import { createStyleBook, type StyleBook } from './styles-part';
import type { WriteOptions, XlsxLoss, XlsxWrite } from './write.types';

interface Original {
  readonly archive: ZipArchive;
  readonly source: OriginalPackage;
  readonly types: ContentTypes;
  readonly workbookRelationships: readonly Relationship[];
}

interface SheetPlan {
  readonly sheet: Sheet;
  readonly original: OriginalSheet | undefined;
  readonly part: string;
  readonly extras: SheetExtras | undefined;
  readonly kept: readonly Relationship[];
  readonly tables: readonly Relationship[];
}

interface Output {
  readonly entries: ZipWriteEntry[];
  readonly overrides: Map<string, string>;
  readonly written: Set<string>;
  readonly roots: Relationship[];
}

const REGENERATED = new Set(['worksheet', 'styles', 'sharedStrings', 'calcChain', 'sheetMetadata']);

const KEEPS_POSITION = new Set([
  'pageMargins',
  'pageSetup',
  'printOptions',
  'headerFooter',
  'extLst',
  'sheetPr',
  'sheetFormatPr',
  'tabColor',
  'pageSetUpPr',
  'outlinePr',
  'ext',
]);

const FIRST_TABLE_ID = 1000;

const officeType = (kind: string): string => `${OFFICE}/${kind}`;

const encoder = new TextEncoder();

const textEntry = (name: string, text: string): ZipWriteEntry => ({
  name,
  data: encoder.encode(text),
});

const streamOfChunks = (chunks: readonly Bytes[]): ReadableStream<Bytes> => {
  let index = 0;

  return new ReadableStream<Bytes>({
    pull: (controller) => {
      const chunk = chunks[index];

      index += 1;
      if (chunk === undefined) {
        controller.close();
      } else {
        controller.enqueue(chunk);
      }
    },
  });
};

const freshName = (taken: Set<string>, pattern: (index: number) => string): string => {
  let index = 1;

  while (taken.has(pattern(index))) {
    index += 1;
  }
  taken.add(pattern(index));
  return pattern(index);
};

const freshId = (taken: Set<string>): string => freshName(taken, (index) => `rId${String(index)}`);

const elementNames = (text: string): string[] =>
  [...text.matchAll(/<(?:[\w.-]+:)?([\w.-]+)(?=[\s/>])/gu)].map((match) => match[1] ?? '');

const lossOf = (
  sheet: Sheet,
  original: OriginalSheet | undefined,
  extras: SheetExtras | undefined,
  charts: boolean,
): XlsxLoss | undefined => {
  if (original === undefined || extras === undefined) {
    return undefined;
  }

  const text = extras.before + extras.after;

  if (sheet.shifts > 0 && elementNames(text).some((name) => !KEEPS_POSITION.has(name))) {
    return { sheet: sheet.name, reason: 'moved-lines' };
  }
  return original.name !== sheet.name && (text.includes(`${original.name}!`) || charts)
    ? { sheet: sheet.name, reason: 'renamed-sheet' }
    : undefined;
};

const openOriginal = async (source: OriginalPackage): Promise<Original | undefined> => {
  const zip = readZip(source.bytes);

  return zip.ok
    ? {
        archive: zip.archive,
        source,
        types: await readContentTypes(zip.archive),
        workbookRelationships: await readRelationships(zip.archive, source.workbook),
      }
    : undefined;
};

const sameTable = (entry: TableEntry | undefined, table: SheetTable): boolean =>
  entry !== undefined &&
  entry.name === table.name &&
  entry.headers === table.headers &&
  entry.totals === table.totals &&
  entry.columns.join('\u0000') === table.columns.join('\u0000') &&
  entry.range.top === table.range.top &&
  entry.range.left === table.range.left &&
  entry.range.bottom === table.range.bottom &&
  entry.range.right === table.range.right;

const planSheet = async (
  sheet: Sheet,
  original: Original | undefined,
  context: { readonly lossy: boolean; readonly charts: boolean; readonly taken: Set<string> },
): Promise<{ readonly plan: SheetPlan; readonly loss: XlsxLoss | undefined }> => {
  const known = original?.source.sheets.find((entry) => entry.sheet === sheet.id);

  const part =
    known?.part ?? freshName(context.taken, (index) => `xl/worksheets/sheet${String(index)}.xml`);

  const extras =
    known === undefined || original === undefined
      ? undefined
      : await readSheetExtras(original.archive, part);

  const loss = lossOf(sheet, known, extras, context.charts);

  const relationships =
    known === undefined || original === undefined || loss !== undefined
      ? []
      : await readRelationships(original.archive, part);

  return {
    loss,
    plan: {
      sheet,
      original: known,
      part,
      extras: loss === undefined ? extras : undefined,
      kept: relationships.filter((relationship) => relationship.kind !== 'table'),
      tables: relationships.filter((relationship) => relationship.kind === 'table'),
    },
  };
};

const toPlanned = (relationship: Relationship, from: string): PlannedRelationship => ({
  id: relationship.id,
  type: relationship.type,
  target: relationship.external ? relationship.target : relativeTarget(from, relationship.target),
  external: relationship.external,
});

const writeTables = async (
  book: Workbook,
  plan: SheetPlan,
  original: Original | undefined,
  output: Output,
): Promise<PlannedRelationship[]> => {
  const ids = new Set(plan.kept.map((relationship) => relationship.id));

  const originals =
    original === undefined
      ? []
      : await Promise.all(
          plan.tables.map(async (relationship) => ({
            part: relationship.target,
            entry: await readTablePart(original.archive, relationship.target, {}),
          })),
        );

  return book.tables.on(plan.sheet).map((table) => {
    const reused = originals.find((candidate) => sameTable(candidate.entry, table))?.part;
    const raw = reused === undefined ? undefined : original?.archive.raw(reused);

    const part =
      reused ?? freshName(output.written, (index) => `xl/tables/table${String(index)}.xml`);

    output.written.add(part);
    output.overrides.set(part, TYPES.table);

    output.entries.push(
      raw === undefined
        ? textEntry(part, tableXml(table, FIRST_TABLE_ID + output.overrides.size))
        : { name: part, copy: raw },
    );

    return { id: freshId(ids), type: officeType('table'), target: relativeTarget(plan.part, part) };
  });
};

const targetOf = (original: Original | undefined, kind: string, fallback: string): string =>
  original?.workbookRelationships.find((relationship) => relationship.kind === kind)?.target ??
  fallback;

const copyParts = async (original: Original | undefined, output: Output): Promise<number> => {
  if (original === undefined) {
    return 0;
  }

  const parts = await reachableParts(original.archive, output.roots, output.written);

  parts.forEach((part) => {
    const raw = original.archive.raw(part);
    const type = original.types.overrides.get(part);

    if (raw !== undefined) {
      output.entries.push({ name: part, copy: raw });
    }
    if (type !== undefined) {
      output.overrides.set(part, type);
    }
  });

  return parts.size;
};

type GeneratedPart = readonly [part: string, kind: string, type: string, content: string | Bytes];

const metadataParts = (spills: number, part: string): GeneratedPart[] =>
  spills > 0 ? [[part, 'sheetMetadata', TYPES.metadata, METADATA_XML]] : [];

const rootEntry = (original: Original | undefined, workbookPart: string): ZipWriteEntry => {
  const raw = original?.archive.raw('_rels/.rels');

  return raw === undefined
    ? textEntry(
        '_rels/.rels',
        relationshipsXml([
          { id: 'rId1', type: officeType('officeDocument'), target: workbookPart },
        ]),
      )
    : { name: '_rels/.rels', copy: raw };
};

const defaultsOf = (original: Original | undefined, output: Output): Map<string, string> => {
  const defaults = new Map<string, string>([
    ['rels', TYPES.relationships],
    ['xml', TYPES.xml],
  ]);

  output.entries.forEach((entry) => {
    const extension = entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase();
    const type = original?.types.defaults.get(extension);

    if (type !== undefined && !defaults.has(extension)) {
      defaults.set(extension, type);
    }
  });

  return defaults;
};

interface Writing {
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly original: Original | undefined;
  readonly output: Output;
  readonly workbookPart: string;
  readonly workbookIds: Set<string>;
  readonly workbookRelationships: PlannedRelationship[];
  readonly sheets: PlannedSheet[];
  readonly styles: StyleBook;
  readonly strings: StringTable;
  readonly outdated: (sheet: Sheet, row: number, col: number) => boolean;
  readonly signal: AbortSignal | undefined;
  readonly totals: { stale: number; spills: number };
}

const planAll = async (
  book: Workbook,
  original: Original | undefined,
  lossy: boolean,
): Promise<{ readonly plans: SheetPlan[]; readonly losses: XlsxLoss[] }> => {
  const taken = new Set(original?.archive.names ?? []);
  const charts = original?.archive.names.some((name) => /\/(?:charts|pivot)/u.test(name)) ?? false;
  const plans: SheetPlan[] = [];
  const losses: XlsxLoss[] = [];

  for (const sheet of book.sheets) {
    const { plan, loss } = await planSheet(sheet, original, { lossy, charts, taken });

    plans.push(plan);
    if (loss !== undefined) {
      losses.push(loss);
    }
  }
  return { plans, losses };
};

const bookRelationship = (
  writing: Writing,
  kind: string,
  part: string,
  find: (item: Relationship) => boolean,
): void => {
  const id = writing.original?.workbookRelationships.find(find)?.id ?? freshId(writing.workbookIds);

  writing.workbookIds.add(id);

  writing.workbookRelationships.push({
    id,
    type: officeType(kind),
    target: relativeTarget(writing.workbookPart, part),
  });
};

const writeSheet = async (writing: Writing, plan: SheetPlan, firstNewId: number): Promise<void> => {
  const { output } = writing;
  const tables = await writeTables(writing.book, plan, writing.original, output);

  const sheetOutput = await writeSheetPart({
    book: writing.book,
    sheet: plan.sheet,
    calculator: writing.calculator,
    outdated: writing.outdated,
    styles: writing.styles,
    strings: writing.strings,
    extras: plan.extras,
    tables: tables.map((table) => table.id),
    signal: writing.signal,
  });

  const relationships = [...plan.kept.map((item) => toPlanned(item, plan.part)), ...tables];

  writing.totals.stale += sheetOutput.stale;
  writing.totals.spills += sheetOutput.spills;
  output.entries.push({ name: plan.part, data: streamOfChunks(sheetOutput.chunks) });
  output.overrides.set(plan.part, TYPES.worksheet);
  output.written.add(plan.part);
  output.roots.push(...plan.kept);
  if (relationships.length > 0) {
    output.entries.push(textEntry(relationshipsOf(plan.part), relationshipsXml(relationships)));
    output.written.add(relationshipsOf(plan.part));
  }
  bookRelationship(writing, 'worksheet', plan.part, (item) => item.target === plan.part);

  writing.sheets.push({
    name: plan.sheet.name,
    sheetId: plan.original?.sheetId ?? firstNewId + writing.sheets.length,
    relationship: writing.workbookRelationships.at(-1)?.id ?? '',
    hidden: plan.original?.hidden ?? false,
  });
};

const writeBookParts = async (writing: Writing): Promise<void> => {
  const { original, output } = writing;
  const stylesPart = targetOf(original, 'styles', 'xl/styles.xml');

  const stylesText =
    original !== undefined && original.archive.has(stylesPart)
      ? await partText(original.archive, stylesPart)
      : '';

  const generated: readonly GeneratedPart[] = [
    [
      stylesPart,
      'styles',
      TYPES.styles,
      writing.styles.xml({
        dxfs: elementSlice(stylesText, 'dxfs'),
        tableStyles: elementSlice(stylesText, 'tableStyles'),
        colors: elementSlice(stylesText, 'colors'),
      }),
    ],
    [
      targetOf(original, 'sharedStrings', 'xl/sharedStrings.xml'),
      'sharedStrings',
      TYPES.strings,
      await writing.strings.bytes(),
    ],
    ...metadataParts(writing.totals.spills, targetOf(original, 'sheetMetadata', 'xl/metadata.xml')),
  ];

  generated.forEach(([part, kind, type, content]) => {
    output.entries.push({
      name: part,
      data: typeof content === 'string' ? encoder.encode(content) : content,
    });

    output.overrides.set(part, type);
    output.written.add(part);
    bookRelationship(writing, kind, part, (item) => item.kind === kind);
  });
};

const writeExternal = (writing: Writing, external: ExternalBook): string => {
  const { output } = writing;
  const taken = new Set([...(writing.original?.archive.names ?? []), ...output.written]);
  const part = freshName(taken, (index) => `xl/externalLinks/externalLink${String(index)}.xml`);

  output.entries.push(
    textEntry(part, externalLinkXml(external)),
    textEntry(
      relationshipsOf(part),
      relationshipsXml([
        {
          id: 'rId1',
          type: officeType('externalLinkPath'),
          target: external.target,
          external: true,
        },
      ]),
    ),
  );

  output.overrides.set(part, TYPES.externalLink);
  output.written.add(part);
  output.written.add(relationshipsOf(part));
  bookRelationship(writing, 'externalLink', part, () => false);
  return writing.workbookRelationships.at(-1)?.id ?? '';
};

const writeExternals = (writing: Writing): string[] => {
  const kept = writing.original?.source.externalLinks ?? [];

  return writing.book.externals.map(
    (external, index) => kept[index] ?? writeExternal(writing, external),
  );
};

const writeWorkbookPart = async (writing: Writing): Promise<void> => {
  const { original, output, workbookPart } = writing;
  const workbookText = original === undefined ? '' : await partText(original.archive, workbookPart);

  const keptBook = (original?.workbookRelationships ?? []).filter(
    (item) => !REGENERATED.has(item.kind),
  );

  const rootRelationships =
    original === undefined ? [] : await readRelationships(original.archive, '');

  writing.workbookRelationships.push(...keptBook.map((item) => toPlanned(item, workbookPart)));

  const externals = writeExternals(writing);

  output.roots.push(
    ...keptBook,
    ...rootRelationships.filter((item) => item.kind !== 'officeDocument'),
  );

  output.entries.push(
    textEntry(
      workbookPart,
      workbookXml(writing.book, writing.sheets, {
        properties: elementSlice(workbookText, 'workbookPr'),
        recalculate: writing.totals.stale > 0,
        externals,
      }),
    ),
    textEntry(relationshipsOf(workbookPart), relationshipsXml(writing.workbookRelationships)),
    rootEntry(original, workbookPart),
  );

  output.overrides.set(workbookPart, original?.types.overrides.get(workbookPart) ?? TYPES.workbook);

  [workbookPart, relationshipsOf(workbookPart), '_rels/.rels'].forEach((part) =>
    output.written.add(part),
  );
};

export const writeWorkbook = async (
  book: Workbook,
  calculator: Calculator,
  options: WriteOptions = {},
): Promise<XlsxWrite> => {
  const { source } = options;

  if (source?.readOnly === true) {
    return {
      ok: true,
      bytes: source.bytes,
      report: { staleFormulas: 0, losses: [], copiedParts: source.parts.length },
    };
  }
  await nextTask();

  const original = source === undefined ? undefined : await openOriginal(source);
  const { plans, losses } = await planAll(book, original, options.lossy === true);

  if (losses.length > 0 && options.lossy !== true) {
    return { ok: false, report: { staleFormulas: 0, losses, copiedParts: 0 } };
  }

  const writing: Writing = {
    book,
    calculator,
    original,
    output: { entries: [], overrides: new Map(), written: new Set(), roots: [] },
    workbookPart: source?.workbook ?? 'xl/workbook.xml',
    workbookIds: new Set(original?.workbookRelationships.map((item) => item.id) ?? []),
    workbookRelationships: [],
    sheets: [],
    styles: createStyleBook(book, calculator.locale.numbers),
    strings: createStringTable(),
    outdated: calculator.outdated(),
    signal: options.signal,
    totals: { stale: 0, spills: 0 },
  };

  const firstNewId = Math.max(0, ...(source?.sheets.map((entry) => entry.sheetId) ?? [])) + 1;

  for (const plan of plans) {
    await writeSheet(writing, plan, firstNewId);
  }
  await writeBookParts(writing);
  await writeWorkbookPart(writing);

  const copiedParts = await copyParts(original, writing.output);

  writing.output.entries.unshift(
    textEntry(
      '[Content_Types].xml',
      contentTypesXml(defaultsOf(original, writing.output), writing.output.overrides),
    ),
  );

  return {
    ok: true,
    bytes: await writeZip(writing.output.entries, { codec: options.codec, signal: options.signal }),
    report: { staleFormulas: writing.totals.stale, losses, copiedParts },
  };
};
