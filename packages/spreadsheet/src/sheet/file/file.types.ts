import type { ComputedRef, Ref, ShallowRef } from 'vue';
import type { Calculator } from '../../core/calc/calculator';
import type { BookLocale } from '../../core/locale';
import type { Workbook } from '../../core/workbook';
import type { LimitationsReport, OriginalPackage } from '../../xlsx/read/read.types';
import type { WriteReport, XlsxLoss } from '../../xlsx/write/write.types';
import type { Bytes } from '../../xlsx/zip/zip.types';
import type { NuiSpreadsheetMessages } from '../spreadsheet.messages';

export type FileBusy = (typeof FileBusy)[keyof typeof FileBusy];

export type FileAsk =
  | { readonly kind: typeof FileAskKind.Losses; readonly losses: readonly XlsxLoss[] }
  | { readonly kind: typeof FileAskKind.Discard; readonly file: File };

export interface NuiSpreadsheetFile {
  readonly fileName: string;
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly report: LimitationsReport;
  readonly source: OriginalPackage;
}

export interface NuiSpreadsheetSaved {
  readonly name: string;
  readonly bytes: Bytes;
  readonly report: WriteReport;
}

export type NuiSpreadsheetSaveAdapter = (saved: NuiSpreadsheetSaved) => void | Promise<void>;

export interface SheetFileOptions {
  readonly book: () => Workbook;
  readonly calculator: () => Calculator;
  readonly source: () => OriginalPackage | undefined;
  readonly fileName: () => string | undefined;
  readonly locale: () => BookLocale;
  readonly adapter: () => NuiSpreadsheetSaveAdapter | undefined;
  readonly hotkeys: () => boolean;
  readonly messages: ComputedRef<NuiSpreadsheetMessages>;
  readonly commitDraft: () => void;
  readonly pick: () => void;
  readonly opened: (file: NuiSpreadsheetFile) => void;
  readonly saved: (saved: NuiSpreadsheetSaved) => void;
  readonly announce: (text: string) => void;
}

export interface SheetFile {
  readonly name: ComputedRef<string>;
  readonly busy: Readonly<Ref<FileBusy>>;
  readonly progress: Readonly<Ref<number>>;
  readonly edited: ComputedRef<boolean>;
  readonly failure: Readonly<Ref<string | undefined>>;
  readonly ask: Readonly<ShallowRef<FileAsk | undefined>>;
  readonly asking: Readonly<Ref<boolean>>;
  noteEdit(): void;
  save(): Promise<boolean>;
  open(file: File): Promise<boolean>;
  cancel(): void;
  confirm(): void;
  dismiss(): void;
  clearFailure(): void;
  onKeydown(event: KeyboardEvent): void;
}

export interface SheetFileViewProps {
  readonly file: SheetFile;
  readonly bar: boolean;
  readonly messages: NuiSpreadsheetMessages;
}

export interface SheetFileViewExposed {
  pick(): void;
}

export const FileAskKind = { Losses: 'losses', Discard: 'discard' } as const;

export const FileKey = { Save: 'KeyS', Open: 'KeyO' } as const;

export const FileBusy = { Idle: 'idle', Reading: 'reading', Saving: 'saving' } as const;
