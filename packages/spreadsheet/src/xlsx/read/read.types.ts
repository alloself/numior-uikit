import type { Calculator } from '../../core/calc/calculator';
import type {
  ConditionalFormat,
  DifferentialStyle,
} from '../../core/conditional/conditional.types';
import type { PartXml, SheetXml } from '../../core/layout/fragments.types';
import type { FunctionRegistry } from '../../core/calc/calc.types';
import type { BookLocale } from '../../core/locale';
import type { Workbook } from '../../core/workbook';
import type { Bytes, ZipCodec } from '../zip/zip.types';

export type XlsxLimitationCode =
  | 'date-1904'
  | 'external-links'
  | 'external-tables'
  | 'linked-objects'
  | 'pivot-tables'
  | 'data-tables'
  | 'formula-syntax'
  | 'unsupported-functions'
  | 'cell-styles'
  | 'rich-text'
  | 'merged-cells'
  | 'conditional-formats'
  | 'data-validation'
  | 'hyperlinks'
  | 'drawings'
  | 'comments'
  | 'sheet-layout'
  | 'hidden-sheets'
  | 'protection'
  | 'macros'
  | 'recalc-on-load'
  | 'strict-format'
  | 'tables';

export interface XlsxLimitation {
  readonly code: XlsxLimitationCode;
  readonly severity: 'info' | 'read-only';
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
  readonly parts: readonly { readonly name: string; readonly kind: 'parsed' | 'opaque' }[];
}

export type XlsxRejection = 'not-xlsx' | 'encrypted' | 'binary' | 'damaged';

export type XlsxRead =
  | {
      readonly kind: 'editable' | 'read-only';
      readonly book: Workbook;
      readonly calculator: Calculator;
      readonly report: LimitationsReport;
      readonly source: OriginalPackage;
    }
  | {
      readonly kind: 'rejected';
      readonly reason: XlsxRejection;
      readonly detail?: string | undefined;
    };

export interface XlsxProgress {
  readonly phase: 'read' | 'recalculate';
  readonly done: number;
  readonly total: number;
}

export interface ReadOptions {
  readonly locale?: BookLocale | undefined;
  readonly functions?: FunctionRegistry | undefined;
  readonly recalc?: 'none' | 'chunked' | undefined;
  readonly codec?: ZipCodec | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((progress: XlsxProgress) => void) | undefined;
}
