import type { SchemaStamp } from '@numior/editor-core';
import type { ClientMessage, WireStep } from '../protocol/protocol.types';

export type CollabFailure = (typeof CollabFailure)[keyof typeof CollabFailure];

export type CollabStatus =
  | {
      readonly kind:
        | typeof CollabStatusKind.Connecting
        | typeof CollabStatusKind.Online
        | typeof CollabStatusKind.Offline;
    }
  | { readonly kind: typeof CollabStatusKind.Failed; readonly reason: CollabFailure };

export interface CollabBatch {
  readonly version: number;
  readonly clientId: string;
  readonly steps: readonly WireStep[];
}

export interface CollabDocument {
  readonly version: () => number | null;
  readonly pending: () => readonly WireStep[];
  readonly load: (snapshot: unknown, version: number) => boolean;
  readonly receive: (batch: CollabBatch) => boolean;
  readonly confirm: (count: number, version: number) => void;
}

export interface TransportListener {
  readonly opened: () => void;
  readonly message: (value: unknown) => void;
  readonly closed: () => void;
}

export interface TransportConnection {
  readonly send: (message: ClientMessage) => void;
  readonly close: () => void;
}

export interface CollabTransport {
  readonly open: (listener: TransportListener) => TransportConnection;
}

export interface CollabRetry {
  readonly base?: number | undefined;
  readonly max?: number | undefined;
}

export interface CollabClientOptions {
  readonly doc: string;
  readonly clientId: string;
  readonly schema: SchemaStamp;
  readonly transport: CollabTransport;
  readonly document: CollabDocument;
  readonly retry?: CollabRetry | undefined;
  readonly onStatus?: ((status: CollabStatus) => void) | undefined;
}

export interface CollabClient {
  readonly status: () => CollabStatus;
  readonly sync: () => void;
  readonly stop: () => void;
}

export const CollabStatusKind = {
  Connecting: 'connecting',
  Online: 'online',
  Offline: 'offline',
  Failed: 'failed',
} as const;

export const CollabFailure = {
  Schema: 'schema',
  Invalid: 'invalid',
  Protocol: 'protocol',
  Diverged: 'diverged',
  Document: 'document',
} as const;
