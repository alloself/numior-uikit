import type {
  Calculator,
  Workbook,
  WorkbookDocument,
  WorkbookPeer,
  WorkbookPlace,
  WorkbookUser,
} from '@numior/spreadsheet/core';
import type { Ref, ShallowRef } from 'vue';
import type { CollabFailureView, CollabStatus, CollabTransport } from '../client/client.types';

export interface UseCollabWorkbookOptions {
  readonly doc: string;
  readonly user: WorkbookUser;
  readonly transport: CollabTransport;
  readonly book: Workbook;
  readonly calculator: Calculator;
  readonly clientId?: string | undefined;
}

export interface CollabWorkbook {
  readonly document: WorkbookDocument;
  readonly ready: Readonly<Ref<boolean>>;
  readonly readOnly: Readonly<Ref<boolean>>;
  readonly status: Readonly<ShallowRef<CollabStatus>>;
  readonly peers: Readonly<ShallowRef<readonly WorkbookPeer[]>>;
  readonly failure: Readonly<ShallowRef<CollabFailureView | undefined>>;
  readonly sync: () => void;
  readonly sharePlace: (place: WorkbookPlace | undefined) => void;
  readonly rejoin: () => void;
}
