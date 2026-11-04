import type { ElementNode } from '../model/node.types';
import type { Transaction } from '../state/state.types';

export interface PendingUpload {
  readonly id: string;
  readonly pos: number;
  readonly at?: number | undefined;
}

export type PlaceBuilder = (tr: Transaction, alone: boolean) => ElementNode;

export type UploadChange =
  | { readonly kind: typeof UploadChangeKind.Add; readonly uploads: readonly PendingUpload[] }
  | { readonly kind: typeof UploadChangeKind.Drop; readonly ids: readonly string[] };

export const UploadChangeKind = { Add: 'add', Drop: 'drop' } as const;
