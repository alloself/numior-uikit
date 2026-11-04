import type { Calculator } from '../../core/calc/calculator';
import type {
  ConditionalFormat,
  DifferentialStyle,
} from '../../core/conditional/conditional.types';
import type { PartXml, SheetXml } from '../../core/layout/fragments.types';
import type { FunctionRegistry } from '../../core/calc/calc.types';
import type { BookLocale } from '../../core/locale';
import type { SheetPivot, Workbook } from '../../core/workbook';
import type { Bytes, ZipCodec } from '../zip/zip.types';
import { OoxmlElement } from '../ooxml.types';

export type StyleSection = (typeof StyleSection)[keyof typeof StyleSection];

export type CellCapture = (typeof CellCapture)[keyof typeof CellCapture];

export type FormulaKind = (typeof FormulaKind)[keyof typeof FormulaKind];

export type XlsxLimitationCode = (typeof XlsxLimitationCode)[keyof typeof XlsxLimitationCode];

export interface XlsxLimitation {
  readonly code: XlsxLimitationCode;
  readonly severity: typeof LimitationSeverity.Info | typeof LimitationSeverity.ReadOnly;
  readonly count: number;
  readonly sheets: readonly string[];
  readonly names: readonly string[];
}

export interface LimitationsReport {
  readonly readOnly: boolean;
  readonly staleFormulas: number;
  readonly items: readonly XlsxLimitation[];
}

export interface OriginalSheet {
  readonly sheet: number;
  readonly name: string;
  readonly part: string;
  readonly sheetId: number;
  readonly hidden: boolean;
  readonly conditional: readonly ConditionalFormat[];
  readonly xml: SheetXml | undefined;
  readonly parts: readonly PartXml[];
}

export interface OriginalPackage {
  readonly bytes: Bytes;
  readonly readOnly: boolean;
  readonly workbook: string;
  readonly externalLinks: readonly string[];
  readonly differentials: readonly DifferentialStyle[];
  readonly sheets: readonly OriginalSheet[];
  readonly pivots: readonly SheetPivot[];
  readonly parts: readonly {
    readonly name: string;
    readonly kind: typeof XlsxPartKind.Parsed | typeof XlsxPartKind.Opaque;
  }[];
}

export type XlsxRejection = (typeof XlsxRejection)[keyof typeof XlsxRejection];

export type XlsxRead =
  | {
      readonly kind: typeof XlsxReadKind.Editable | typeof XlsxReadKind.ReadOnly;
      readonly book: Workbook;
      readonly calculator: Calculator;
      readonly report: LimitationsReport;
      readonly source: OriginalPackage;
    }
  | {
      readonly kind: typeof XlsxReadKind.Rejected;
      readonly reason: XlsxRejection;
      readonly detail?: string | undefined;
    };

export interface XlsxProgress {
  readonly phase: typeof ReadPhase.Read | typeof ReadPhase.Recalculate;
  readonly done: number;
  readonly total: number;
}

export interface ReadOptions {
  readonly locale?: BookLocale | undefined;
  readonly functions?: FunctionRegistry | undefined;
  readonly recalc?: typeof RecalcMode.None | typeof RecalcMode.Chunked | undefined;
  readonly codec?: ZipCodec | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((progress: XlsxProgress) => void) | undefined;
}

export const ExternalPartKind = { Book: 'book', Linked: 'linked' } as const;

export const XlsxLimitationCode = {
  Date1904: 'date-1904',
  ExternalLinks: 'external-links',
  ExternalTables: 'external-tables',
  LinkedObjects: 'linked-objects',
  PivotTables: 'pivot-tables',
  DataTables: 'data-tables',
  FormulaSyntax: 'formula-syntax',
  UnsupportedFunctions: 'unsupported-functions',
  CellStyles: 'cell-styles',
  RichText: 'rich-text',
  MergedCells: 'merged-cells',
  ConditionalFormats: 'conditional-formats',
  DataValidation: 'data-validation',
  Hyperlinks: 'hyperlinks',
  Drawings: 'drawings',
  Comments: 'comments',
  SheetLayout: 'sheet-layout',
  HiddenSheets: 'hidden-sheets',
  Protection: 'protection',
  Macros: 'macros',
  RecalcOnLoad: 'recalc-on-load',
  StrictFormat: 'strict-format',
  Tables: 'tables',
} as const;

export const XlsxRejection = {
  NotXlsx: 'not-xlsx',
  Encrypted: 'encrypted',
  Binary: 'binary',
  Damaged: 'damaged',
} as const;

export const LimitationSeverity = { Info: 'info', ReadOnly: 'read-only' } as const;

export const XlsxPartKind = { Parsed: 'parsed', Opaque: 'opaque' } as const;

export const XlsxReadKind = {
  Editable: 'editable',
  ReadOnly: 'read-only',
  Rejected: 'rejected',
} as const;

export const ReadPhase = { Read: 'read', Recalculate: 'recalculate' } as const;

export const RecalcMode = { None: 'none', Chunked: 'chunked' } as const;

export const FormulaKind = {
  Normal: 'normal',
  Shared: 'shared',
  Array: 'array',
  DataTable: 'dataTable',
} as const;

export const CellCapture = { Value: 'value', Formula: 'formula', Inline: 'inline' } as const;

export const StyleSection = {
  Fonts: OoxmlElement.Fonts,
  Fills: OoxmlElement.Fills,
  Borders: OoxmlElement.Borders,
  CellXfs: OoxmlElement.CellXfs,
  Dxfs: OoxmlElement.Dxfs,
  Other: 'other',
} as const;
