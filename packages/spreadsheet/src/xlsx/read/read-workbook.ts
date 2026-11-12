import type { CellError } from '../../core/cell.types';
import { createCalculator, type Calculator } from '../../core/calc/calculator';
import type { FunctionRegistry } from '../../core/calc/calc.types';
import { BASE_FUNCTIONS } from '../../core/calc/functions';
import { createFunctionRegistry } from '../../core/calc/registry';
import { nextTask } from '../../core/calc/tasks';
import { mapReferences } from '../../core/formula/references';
import { FormulaReferenceKind, type FormulaNode } from '../../core/formula/formula.types';
import { EN_LOCALE } from '../../core/locale';
import { validColumns } from '../../core/tables';
import {
  createWorkbook,
  validDefinedName,
  validSheetName,
  type ExternalName,
  type Sheet,
  type SheetPivot,
  type Workbook,
} from '../../core/workbook';
import { readZip } from '../zip/read-zip';
import { ZipError } from '../zip/streams';
import { ZipFailure, type Bytes, type ZipArchive } from '../zip/zip.types';
import {
  XlsxPartError,
  readRelationships,
  relationshipsOf,
  type PartOptions,
  type Relationship,
} from './ooxml';
import {
  ExternalPartKind,
  LimitationSeverity,
  ReadPhase,
  RecalcMode,
  XlsxPartKind,
  type LimitationsReport,
  type ReadOptions,
  type XlsxLimitation,
  type XlsxLimitationCode,
  type XlsxRead,
  type XlsxRejection,
} from './read.types';
import { readExternalPart, type ExternalNameEntry } from './external-part';
import { readSharedStrings, type SharedStrings } from './shared-strings';
import { readPivotCache, readPivotTable, type CacheEntry } from './pivot-part';
import { pivotOf } from './pivot-model';
import { readPositionalParts } from './positional-parts';
import { readDrawings } from './drawing-part';
import { readSheetPart, type SheetCounts } from './sheet-part';
import { readValueErrors } from './value-errors';
import { readStyles, type CellStyles } from './styles';
import { readTheme } from './theme-part';
import { readTablePart } from './table-part';
import { readWorkbookPart, type SheetEntry, type WorkbookPart } from './workbook-part';
import { RelationshipKind } from '../ooxml.types';
import { parseFileFormula } from './file-formula';

interface Found {
  count: number;
  readonly sheets: Set<string>;
  readonly names: Set<string>;
}

interface Report {
  readonly add: (
    code: XlsxLimitationCode,
    count: number,
    sheet?: string,
    names?: Iterable<string>,
  ) => void;
  readonly build: (staleFormulas: number) => LimitationsReport;
}

interface Load {
  readonly archive: ZipArchive;
  readonly options: ReadOptions;
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly functions: FunctionRegistry;
  readonly report: Report;
  readonly parsed: Set<string>;
  readonly parts: PartOptions;
  readonly totals: {
    formulas: number;
    kept: number;
    external: number;
    linked: number;
    readonly unknown: Set<string>;
  };
}

interface BookContext {
  readonly strings: SharedStrings;
  readonly errors: readonly (CellError | undefined)[];
  readonly styles: CellStyles;
  readonly decorations: readonly number[];
}

interface SheetPart {
  readonly entry: SheetEntry;
  readonly part: string | undefined;
}

interface PivotLoad {
  readonly load: Load;
  readonly caches: Map<string, CacheEntry | undefined>;
  readonly cacheParts: ReadonlyMap<number, string | undefined>;
  readonly styles: CellStyles;
}

const COMPOUND_FILE = [0xd0, 0xcf, 0x11, 0xe0];

const READ_ONLY = new Set<XlsxLimitationCode>([
  'date-1904',
  'linked-objects',
  'pivot-tables',
  'data-tables',
  'formula-syntax',
  'strict-format',
]);

const SHEET_COUNTS: readonly (readonly [keyof Omit<SheetCounts, 'unknown'>, XlsxLimitationCode])[] =
  [
    ['unparsed', 'formula-syntax'],
    ['opaque', 'formula-kept'],
    ['dataTables', 'data-tables'],
    ['merges', 'merged-cells'],
    ['conditional', 'conditional-formats'],
    ['validations', 'data-validation'],
    ['hyperlinks', 'hyperlinks'],
    ['drawings', 'drawings'],
    ['comments', 'comments'],
    ['layout', 'sheet-layout'],
    ['protection', 'protection'],
    ['externalTables', 'external-tables'],
  ];

const rejected = (reason: XlsxRejection, detail?: string): XlsxRead => ({
  kind: 'rejected',
  reason,
  detail,
});

const compound = (bytes: Bytes): boolean =>
  COMPOUND_FILE.every((byte, index) => bytes[index] === byte);

const createReport = (): Report => {
  const found = new Map<XlsxLimitationCode, Found>();

  return {
    add: (code, count, sheet, names = []) => {
      if (count <= 0) {
        return;
      }

      const entry = found.get(code) ?? { count: 0, sheets: new Set(), names: new Set() };

      entry.count += count;
      if (sheet !== undefined) {
        entry.sheets.add(sheet);
      }
      for (const name of names) {
        entry.names.add(name);
      }
      found.set(code, entry);
    },
    build: (staleFormulas) => {
      const items = [...found].map(([code, entry]): XlsxLimitation => ({
        code,
        severity: READ_ONLY.has(code) ? 'read-only' : 'info',
        count: entry.count,
        sheets: [...entry.sheets],
        names: [...entry.names].toSorted(),
      }));

      return {
        readOnly: items.some((item) => item.severity === LimitationSeverity.ReadOnly),
        staleFormulas,
        items,
      };
    },
  };
};

const targetOf = (relationships: readonly Relationship[], kind: string): string | undefined =>
  relationships.find((relationship) => relationship.kind === kind && !relationship.external)
    ?.target;

const setNames = (calculator: Calculator, part: WorkbookPart, sheets: readonly Sheet[]): void => {
  part.names.forEach((entry) => {
    const parsed = parseFileFormula(entry.text);

    const scope = entry.sheet === undefined ? undefined : sheets[entry.sheet];

    if (!parsed.ok || !validDefinedName(entry.name)) {
      return;
    }

    calculator.setName(entry.name, scope, parsed.ast);
  });
};

const setTables = async (
  archive: ZipArchive,
  calculator: Calculator,
  sheet: Sheet,
  relationships: readonly Relationship[],
  options: PartOptions,
): Promise<number> => {
  let refused = 0;

  for (const relationship of relationships) {
    const table =
      relationship.kind === RelationshipKind.Table &&
      !relationship.external &&
      archive.has(relationship.target)
        ? await readTablePart(archive, relationship.target, options)
        : undefined;

    if (table !== undefined && validColumns(table) && validDefinedName(table.name)) {
      calculator.setTable(table.name, { ...table, sheet });
    } else if (relationship.kind === RelationshipKind.Table) {
      refused += 1;
    }
  }
  return refused;
};

const BROKEN: FormulaNode = { kind: 'error', code: '#REF!' };

const inBook = (ast: FormulaNode, book: number): FormulaNode =>
  mapReferences(ast, (reference) =>
    reference.kind === FormulaReferenceKind.Name ||
    reference.kind === FormulaReferenceKind.Structured
      ? BROKEN
      : { ...reference, book },
  );

const externalNames = (
  entries: readonly ExternalNameEntry[],
  sheets: readonly string[],
  book: number,
): ExternalName[] =>
  entries.map((entry) => {
    const parsed = parseFileFormula(entry.text);

    return {
      name: entry.name,
      sheet: entry.sheet === undefined ? undefined : sheets[entry.sheet],
      ast: parsed.ok ? inBook(parsed.ast, book) : undefined,
    };
  });

const loadExternals = async (
  load: Load,
  links: readonly string[],
  relationships: readonly Relationship[],
  strings: readonly string[],
): Promise<void> => {
  for (const link of links) {
    const part = relationships.find((item) => item.id === link && !item.external)?.target;

    const read =
      part !== undefined && load.archive.has(part)
        ? await readExternalPart(load.archive, part, strings, load.parts)
        : { kind: 'linked' as const };

    if (part !== undefined) {
      load.parsed.add(part);
    }
    if (read.kind === ExternalPartKind.Book) {
      const book = load.book.externals.length + 1;

      const external = load.book.addExternal({
        target: read.target,
        sheets: read.sheets,
        names: externalNames(read.names, read.sheets, book),
      });

      read.cells.forEach((cell) => {
        external.sheets[cell.sheet]?.cells.set(cell.row, cell.col, cell.value);
      });
    } else {
      load.book.addExternal({ target: '', sheets: [], names: [] });
      load.totals.linked += 1;
    }
  }
};

const sizeOf = (archive: ZipArchive, part: string | undefined): number =>
  part === undefined ? 0 : (archive.raw(part)?.size ?? 0);

const progressOf = (
  archive: ZipArchive,
  parts: readonly (string | undefined)[],
  options: ReadOptions,
): PartOptions => {
  const total = parts.reduce((sum, part) => sum + sizeOf(archive, part), 0);
  let done = 0;

  return {
    signal: options.signal,
    onBytes: (bytesRead) => {
      done += bytesRead;
      options.onProgress?.({ phase: ReadPhase.Read, done, total });
    },
  };
};

const loadSheet = async (
  load: Load,
  sheet: Sheet,
  { entry, part }: SheetPart,
  context: BookContext,
): Promise<boolean> => {
  if (part === undefined || !load.archive.has(part)) {
    return false;
  }

  const relationships = await readRelationships(load.archive, part, load.options);

  const refused = await setTables(
    load.archive,
    load.calculator,
    sheet,
    relationships,
    load.options,
  );

  const counts = await readSheetPart(
    load.archive,
    part,
    {
      book: load.book,
      calculator: load.calculator,
      sheet,
      strings: context.strings.strings,
      errors: context.errors,
      formats: context.styles.formats,
      decorations: context.decorations,
      differentials: context.styles.differentials,
      known: (name) => load.functions.get(name) !== undefined,
      recalculate: load.options.recalc === RecalcMode.Chunked,
    },
    load.parts,
  );

  sheet.layout = {
    ...sheet.layout,
    parts: await readPositionalParts(load.archive, relationships, load.options),
    drawings: await readDrawings(load.archive, relationships, load.options),
  };

  load.parsed.add(part);
  load.totals.formulas += counts.formulas;
  load.totals.kept += counts.kept;
  load.totals.external += counts.externalTables;
  counts.unknown.forEach((name) => load.totals.unknown.add(name));
  load.report.add('tables', refused, entry.name);
  load.report.add('hidden-sheets', entry.hidden ? 1 : 0, entry.name);
  SHEET_COUNTS.forEach(([key, code]) => load.report.add(code, counts[key], entry.name));
  return true;
};

const addBookLimits = (load: Load, workbook: WorkbookPart, context: BookContext): void => {
  const { report } = load;

  report.add('date-1904', workbook.date1904 ? 1 : 0);
  report.add('recalc-on-load', workbook.recalcOnLoad ? 1 : 0);
  report.add('strict-format', workbook.strict ? 1 : 0);
  report.add('external-links', load.book.externals.length - load.totals.linked);
  report.add('linked-objects', load.totals.linked);
  report.add('unsupported-functions', load.totals.kept, undefined, load.totals.unknown);
  report.add('cell-styles', context.styles.unmodeled);
  report.add('rich-text', context.strings.rich);
  report.add('macros', load.archive.names.some((name) => name.endsWith('vbaProject.bin')) ? 1 : 0);
};

const pivotsOf = (book: Workbook): SheetPivot[] => {
  const pivots: SheetPivot[] = [];

  book.pivots.forEach((pivot) => {
    pivots.push(pivot);
  });

  return pivots;
};

const cachedEntry = async (
  load: Load,
  caches: Map<string, CacheEntry | undefined>,
  part: string | undefined,
): Promise<CacheEntry | undefined> => {
  if (part === undefined || !load.archive.has(part)) {
    return undefined;
  }
  if (!caches.has(part)) {
    caches.set(part, await readPivotCache(load.archive, part, load.options).catch(() => undefined));
    load.parsed.add(part);
  }
  return caches.get(part);
};

const loadPivot = async (
  context: PivotLoad,
  sheet: Sheet,
  part: string,
): Promise<string | undefined> => {
  const { load } = context;
  const table = await readPivotTable(load.archive, part, load.options).catch(() => undefined);

  const cache = await cachedEntry(
    load,
    context.caches,
    table === undefined ? undefined : context.cacheParts.get(table.cacheId),
  );

  const reading =
    table === undefined || cache === undefined
      ? undefined
      : pivotOf(table, cache, {
          book: load.book,
          sheet,
          numberFormat: context.styles.numberFormat,
        });

  load.parsed.add(part);
  if (reading?.ok === true) {
    load.book.pivots.set(reading.pivot);
    return undefined;
  }
  return table?.name ?? part;
};

const loadPivots = async (
  load: Load,
  workbook: WorkbookPart,
  context: { readonly relationships: readonly Relationship[]; readonly styles: CellStyles },
  sheets: readonly { readonly sheet: Sheet; readonly part: string | undefined }[],
): Promise<string[]> => {
  const refused: string[] = [];

  const pivots: PivotLoad = {
    load,
    caches: new Map(),
    styles: context.styles,
    cacheParts: new Map(
      workbook.pivotCaches.map((entry) => [
        entry.cacheId,
        context.relationships.find((relationship) => relationship.id === entry.relationship)
          ?.target,
      ]),
    ),
  };

  for (const { sheet, part } of sheets) {
    const relationships =
      part === undefined ? [] : await readRelationships(load.archive, part, load.options);

    for (const relationship of relationships) {
      const failed =
        relationship.kind === RelationshipKind.PivotTable && load.archive.has(relationship.target)
          ? await loadPivot(pivots, sheet, relationship.target)
          : undefined;

      if (failed === undefined) {
        continue;
      }

      refused.push(failed);
    }
  }
  return refused;
};

const recalculated = async (load: Load): Promise<void> => {
  if (load.options.recalc !== RecalcMode.Chunked) {
    return;
  }

  const run = load.calculator.recalculate({ budgetMs: 8, yieldTo: nextTask });

  load.options.onProgress?.({ phase: ReadPhase.Recalculate, done: 0, total: run.total });
  await run.settled;
  load.options.onProgress?.({ phase: ReadPhase.Recalculate, done: run.total, total: run.total });
};

const officeOf = async (archive: ZipArchive, options: ReadOptions): Promise<string | XlsxRead> => {
  const office = targetOf(await readRelationships(archive, '', options), 'officeDocument');

  if (office === undefined || !archive.has(office)) {
    return rejected(archive.has('xl/workbook.bin') ? 'binary' : 'damaged', 'workbook');
  }
  return office.endsWith('.bin') ? rejected('binary') : office;
};

const readBook = async (
  archive: ZipArchive,
  bytes: Bytes,
  options: ReadOptions,
): Promise<XlsxRead> => {
  const office = await officeOf(archive, options);

  if (typeof office !== 'string') {
    return office;
  }

  const locale = options.locale ?? EN_LOCALE;
  const functions = options.functions ?? createFunctionRegistry(BASE_FUNCTIONS);
  const book: Workbook = createWorkbook();
  const relationships = await readRelationships(archive, office, options);
  const workbook = await readWorkbookPart(archive, office, options);
  const stringsPart = targetOf(relationships, 'sharedStrings');
  const stylesPart = targetOf(relationships, 'styles');
  const themePart = targetOf(relationships, 'theme');

  const sheetParts: SheetPart[] = workbook.sheets.map((entry) => ({
    entry,
    part: relationships.find((relationship) => relationship.id === entry.relationship)?.target,
  }));

  if (sheetParts.some(({ entry }) => !validSheetName(entry.name))) {
    return rejected('damaged', 'sheet names');
  }

  const load: Load = {
    archive,
    options: { ...options, recalc: options.recalc ?? (workbook.recalcOnLoad ? 'chunked' : 'none') },
    book,
    calculator: createCalculator(book, { locale, functions }),
    functions,
    report: createReport(),
    parsed: new Set(['_rels/.rels', office, relationshipsOf(office)]),
    parts: progressOf(
      archive,
      [stringsPart, stylesPart, ...sheetParts.map(({ part }) => part)],
      options,
    ),
    totals: { formulas: 0, kept: 0, external: 0, linked: 0, unknown: new Set() },
  };

  const sheets = sheetParts.map(({ entry }) => book.addSheet(entry.name));

  const strings = await readSharedStrings(archive, stringsPart, load.parts);
  const styles = await readStyles(archive, stylesPart, locale.numbers, load.parts);

  const errorParts = {
    metadata: targetOf(relationships, 'sheetMetadata'),
    values: targetOf(relationships, 'rdRichValue'),
    structures: targetOf(relationships, 'rdRichValueStructure'),
  };

  const context: BookContext = {
    strings,
    errors: await readValueErrors(archive, errorParts, load.parts),
    styles,
    decorations: styles.decorations.map((decoration) => book.decorations.id(decoration)),
  };

  book.decorations.defaultFont = styles.defaultFont ?? book.decorations.defaultFont;
  book.decorations.theme = await readTheme(archive, themePart, load.parts);

  const richParts = [...Object.values(errorParts), targetOf(relationships, 'rdRichValueTypes')];

  [stringsPart, stylesPart, ...richParts].forEach((part) => {
    if (part === undefined) {
      return;
    }

    load.parsed.add(part);
  });

  await loadExternals(load, workbook.externalLinks, relationships, strings.strings);
  setNames(load.calculator, workbook, sheets);

  for (const [index, sheet] of sheets.entries()) {
    const part = sheetParts[index];

    if (part === undefined || !(await loadSheet(load, sheet, part, context))) {
      return rejected('damaged', sheet.name);
    }
  }

  const refusedPivots = await loadPivots(
    load,
    workbook,
    { relationships, styles },
    sheets.map((sheet, index) => ({ sheet, part: sheetParts[index]?.part })),
  );

  load.report.add('pivot-tables', refusedPivots.length, undefined, refusedPivots);
  addBookLimits(load, workbook, context);
  await recalculated(load);

  const summary = load.report.build(
    load.options.recalc === RecalcMode.Chunked
      ? load.totals.kept + load.totals.external
      : load.totals.formulas,
  );

  return {
    kind: summary.readOnly ? 'read-only' : 'editable',
    book,
    calculator: load.calculator,
    report: summary,
    source: {
      bytes,
      readOnly: summary.readOnly,
      workbook: office,
      externalLinks: workbook.externalLinks,
      sheets: sheets.map((sheet, index) => ({
        sheet: sheet.id,
        name: sheet.name,
        part: sheetParts[index]?.part ?? '',
        sheetId: sheetParts[index]?.entry.sheetId ?? index + 1,
        hidden: sheetParts[index]?.entry.hidden ?? false,
        conditional: sheet.conditional,
        xml: sheet.layout.xml,
        parts: sheet.layout.parts,
      })),
      differentials: styles.differentials,
      pivots: pivotsOf(book),
      parts: archive.names.map((name) => ({
        name,
        kind: load.parsed.has(name) ? XlsxPartKind.Parsed : XlsxPartKind.Opaque,
      })),
    },
  };
};

export const readWorkbook = async (bytes: Bytes, options: ReadOptions = {}): Promise<XlsxRead> => {
  if (compound(bytes)) {
    return rejected('encrypted');
  }

  const zip = readZip(bytes, options.codec);

  if (!zip.ok) {
    return rejected(zip.reason === ZipFailure.NotZip ? 'not-xlsx' : 'damaged', zip.reason);
  }
  try {
    return await readBook(zip.archive, bytes, options);
  } catch (error) {
    if (error instanceof XlsxPartError) {
      return rejected('damaged', error.message);
    }
    if (error instanceof ZipError) {
      return rejected(
        error.reason === ZipFailure.Encrypted ? 'encrypted' : 'damaged',
        error.reason,
      );
    }
    throw error;
  }
};
