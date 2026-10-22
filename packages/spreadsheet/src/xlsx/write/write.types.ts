import type { OriginalPackage } from '../read/read.types';
import type { Bytes, ZipCodec } from '../zip/zip.types';

export interface WriteOptions {
  readonly source?: OriginalPackage | undefined;
  readonly lossy?: boolean | undefined;
  readonly codec?: ZipCodec | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly recalculateOnOpen?: boolean | undefined;
}

export interface XlsxLoss {
  readonly sheet: string;
  readonly reason: 'moved-lines' | 'renamed-sheet';
}

export interface WriteReport {
  readonly staleFormulas: number;
  readonly losses: readonly XlsxLoss[];
  readonly copiedParts: number;
}

export type XlsxWrite =
  | { readonly ok: true; readonly bytes: Bytes; readonly report: WriteReport }
  | { readonly ok: false; readonly report: WriteReport };
