import type { ElementNode } from '../model/node.types';
import type { Transaction } from '../state/state.types';

export interface PendingUpload {
  readonly id: string;
  readonly pos: number;
  readonly at?: number | undefined;
}

export type PlaceBuilder = (tr: Transaction, alone: boolean) => ElementNode;

export type UploadChange =
  | { readonly kind: 'add'; readonly uploads: readonly PendingUpload[] }
  | { readonly kind: 'drop'; readonly ids: readonly string[] };
