import type { AttrValue, NodeId, SchemaStamp } from '@numior/editor-core';
import type { PresenceUser } from '../editor/presence.types';
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
  readonly settle: (count: number, steps: readonly WireStep[], version: number) => boolean;
}

export interface CollabAlternative {
  readonly version: number;
  readonly nodeId: NodeId;
  readonly attr: string;
  readonly value: AttrValue;
  readonly clientId: string;
  readonly author: PresenceUser | undefined;
  readonly createdAt: string;
}

export type CollabBlock =
  | {
      readonly kind: typeof CollabBlockKind.Version;
      readonly subject: string;
      readonly stored: number;
      readonly current: number;
    }
  | { readonly kind: typeof CollabBlockKind.Step; readonly subject: string }
  | { readonly kind: typeof CollabBlockKind.Damaged };

export interface CollabReport {
  readonly blocks: readonly CollabBlock[];
  readonly unsent: number;
}

export interface CollabBlocked {
  readonly kind: typeof CollabRestoreKind.Blocked;
  readonly version: number;
  readonly snapshot: unknown;
  readonly report: CollabReport;
}

export type CollabRestoration = CollabRestored | CollabBlocked;

export interface CollabRestored {
  readonly kind: typeof CollabRestoreKind.Ready;
  readonly clientId: string;
  readonly version: number;
  readonly snapshot: unknown;
  readonly pending: readonly WireStep[];
  readonly alternatives: readonly CollabAlternative[];
}

export interface CollabTracking {
  readonly document: CollabDocument;
  readonly changed: () => void;
  readonly record: (found: readonly CollabAlternative[]) => void;
  readonly forget: (alternative: CollabAlternative) => void;
}

export interface CollabPersistence {
  readonly restore: () => Promise<CollabRestoration | undefined>;
  readonly track: (document: CollabDocument, clientId: string) => CollabTracking | undefined;
  readonly close: () => Promise<void>;
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
  readonly onPresence?: ((peers: ReadonlyMap<string, unknown>) => void) | undefined;
}

export interface CollabClient {
  readonly status: () => CollabStatus;
  readonly sync: () => void;
  readonly refresh: () => void;
  readonly setPresence: (state: unknown) => void;
  readonly stop: () => void;
}

export const CollabRestoreKind = { Ready: 'ready', Blocked: 'blocked' } as const;

export const CollabBlockKind = {
  Version: 'version',
  Step: 'step',
  Damaged: 'damaged',
} as const;

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
